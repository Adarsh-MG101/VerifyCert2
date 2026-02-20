const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Activity = require('../models/Activity');

// Register — creates an Organization and the User as owner
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, organizationName } = req.body;

        if (!organizationName || organizationName.trim().length === 0) {
            return res.status(400).json({ error: 'Organization name is required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create Organization first (use a temporary owner, will update after user creation)
        const org = new Organization({
            name: organizationName.trim(),
            owner: new (require('mongoose').Types.ObjectId)() // Temporary, will update below
        });

        // Create user
        const user = new User({
            name,
            email,
            password,
            role: 'user',
            orgRole: 'owner',
            organization: org._id
        });

        // Set the org owner to the user
        org.owner = user._id;

        await org.save();
        await user.save();

        res.status(201).json({ success: true, message: 'Registration successful. Organization created.' });
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        // Handle duplicate slug
        if (err.code === 11000 && err.keyPattern?.slug) {
            return res.status(400).json({ error: 'An organization with a similar name already exists. Please choose a different name.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user and populate organization
        const user = await User.findOne({ email }).populate('organization', 'name slug logoUrl isActive');
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if org is active (skip for superadmins who have no org)
        if (user.organization && !user.organization.isActive) {
            return res.status(403).json({ error: 'Your organization has been deactivated. Contact support.' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT — include orgRole in the payload
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role,
                orgRole: user.orgRole,
                organization: user.organization?._id || null
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Log Activity
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const activity = new Activity({
            userId: user._id,
            ipAddress: ip,
            userAgent: req.headers['user-agent'],
            type: 'login'
        });
        await activity.save();

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                orgRole: user.orgRole,
                organization: user.organization ? {
                    _id: user.organization._id,
                    name: user.organization.name,
                    slug: user.organization.slug,
                    logoUrl: user.organization.logoUrl
                } : null
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Verify token (for frontend to check if logged in)
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId)
            .select('-password')
            .populate('organization', 'name slug logoUrl isActive');

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                ...user.toObject(),
                organization: user.organization ? {
                    _id: user.organization._id,
                    name: user.organization.name,
                    slug: user.organization.slug,
                    logoUrl: user.organization.logoUrl
                } : null
            }
        });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

const auth = require('../middleware/auth');

// Change Password
router.post('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Find user
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check current password (optional if disabled on frontend)
        if (currentPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: 'Incorrect current password' });
            }
        }

        // Update password (middleware in User model handles hashing)
        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Activity Logs
router.get('/activity', auth, async (req, res) => {
    try {
        const activities = await Activity.find({ userId: req.user.userId })
            .sort({ timestamp: -1 })
            .limit(50);
        res.json({ success: true, activities });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Logout
router.post('/logout', auth, async (req, res) => {
    try {
        const lastSession = await Activity.findOne({
            userId: req.user.userId,
            type: 'login',
            endedAt: { $exists: false }
        }).sort({ timestamp: -1 });

        if (lastSession) {
            lastSession.endedAt = Date.now();
            await lastSession.save();
        }

        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
