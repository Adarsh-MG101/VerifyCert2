const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { tenantScope, verifyOwnership } = require('../middleware/tenantScope');

// All routes require authentication + tenant scope
router.use(auth, tenantScope);

// ============================================================
// 1. GET /api/organizations/me — Get current user's organization
// ============================================================
router.get('/me', async (req, res) => {
    try {
        if (req.isSuperAdmin) {
            return res.json({ organization: null, message: 'Superadmin — no org scope' });
        }

        const org = await Organization.findById(req.organizationId)
            .populate('owner', 'name email');

        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Get member count
        const memberCount = await User.countDocuments({ organization: org._id });

        res.json({
            organization: {
                _id: org._id,
                name: org.name,
                slug: org.slug,
                logoUrl: org.logoUrl,
                owner: org.owner,
                isActive: org.isActive,
                memberCount,
                createdAt: org.createdAt
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// 2. PUT /api/organizations/me — Update org profile
//    Only org owners and admins can update
// ============================================================
router.put('/me', async (req, res) => {
    try {
        if (req.isSuperAdmin) {
            return res.status(400).json({ error: 'Superadmin does not belong to an organization' });
        }

        // Check orgRole
        if (!['owner', 'admin'].includes(req.user.orgRole)) {
            return res.status(403).json({ error: 'Only organization owners and admins can update the organization' });
        }

        const { name, logoUrl } = req.body;
        const org = await Organization.findById(req.organizationId);
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        if (name) {
            org.name = name;
            // Regenerate slug
            org.slug = name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
        }
        if (logoUrl !== undefined) org.logoUrl = logoUrl;

        await org.save();
        res.json({ success: true, organization: org });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// 3. GET /api/organizations/me/members — List org members
// ============================================================
router.get('/me/members', async (req, res) => {
    try {
        if (req.isSuperAdmin) {
            return res.status(400).json({ error: 'Superadmin does not belong to an organization' });
        }

        const members = await User.find({ organization: req.organizationId })
            .select('-password')
            .sort({ createdAt: 1 });

        res.json({ members });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// 4. POST /api/organizations/me/invite — Invite a user
//    Only org owners and admins can invite
// ============================================================
router.post('/me/invite', async (req, res) => {
    try {
        if (req.isSuperAdmin) {
            return res.status(400).json({ error: 'Superadmin does not belong to an organization' });
        }

        if (!['owner', 'admin'].includes(req.user.orgRole)) {
            return res.status(403).json({ error: 'Only organization owners and admins can invite members' });
        }

        const { name, email, password, orgRole } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'A user with this email already exists' });
        }

        const newUser = new User({
            name,
            email,
            password,
            role: 'user',
            orgRole: orgRole || 'member',
            organization: req.organizationId
        });

        await newUser.save();
        res.status(201).json({
            success: true,
            message: `${name} has been added to the organization`,
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                orgRole: newUser.orgRole
            }
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// 5. PATCH /api/organizations/me/members/:userId — Change role
//    Only org owners can change roles
// ============================================================
router.patch('/me/members/:userId', async (req, res) => {
    try {
        if (req.isSuperAdmin) {
            return res.status(400).json({ error: 'Superadmin does not belong to an organization' });
        }

        if (req.user.orgRole !== 'owner') {
            return res.status(403).json({ error: 'Only the organization owner can change member roles' });
        }

        const { orgRole } = req.body;
        if (!orgRole || !['owner', 'admin', 'member'].includes(orgRole)) {
            return res.status(400).json({ error: 'Valid orgRole is required (owner, admin, member)' });
        }

        const member = await User.findOne({
            _id: req.params.userId,
            organization: req.organizationId
        });

        if (!member) {
            return res.status(404).json({ error: 'Member not found in this organization' });
        }

        // Can't change own role
        if (member._id.toString() === req.user.userId) {
            return res.status(400).json({ error: 'You cannot change your own role' });
        }

        member.orgRole = orgRole;
        await member.save();

        res.json({
            success: true,
            message: `${member.name}'s role updated to ${orgRole}`,
            user: {
                _id: member._id,
                name: member.name,
                email: member.email,
                orgRole: member.orgRole
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// 6. DELETE /api/organizations/me/members/:userId — Remove member
//    Only org owners and admins can remove members
// ============================================================
router.delete('/me/members/:userId', async (req, res) => {
    try {
        if (req.isSuperAdmin) {
            return res.status(400).json({ error: 'Superadmin does not belong to an organization' });
        }

        if (!['owner', 'admin'].includes(req.user.orgRole)) {
            return res.status(403).json({ error: 'Only organization owners and admins can remove members' });
        }

        const member = await User.findOne({
            _id: req.params.userId,
            organization: req.organizationId
        });

        if (!member) {
            return res.status(404).json({ error: 'Member not found in this organization' });
        }

        // Can't remove yourself
        if (member._id.toString() === req.user.userId) {
            return res.status(400).json({ error: 'You cannot remove yourself' });
        }

        // Can't remove the owner
        if (member.orgRole === 'owner') {
            return res.status(400).json({ error: 'Cannot remove the organization owner' });
        }

        // Admins can't remove other admins
        if (req.user.orgRole === 'admin' && member.orgRole === 'admin') {
            return res.status(403).json({ error: 'Admins cannot remove other admins' });
        }

        await User.findByIdAndDelete(member._id);

        res.json({
            success: true,
            message: `${member.name} has been removed from the organization`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// SUPERADMIN ONLY ROUTES
// ============================================================

// 7. GET /api/organizations — List all organizations (Superadmin Only)
router.get('/', async (req, res) => {
    try {
        console.log(`🔍 Superadmin ${req.user.email} is fetching all organizations...`);
        if (!req.isSuperAdmin) {
            console.warn(`⚠️ Non-superadmin access attempt to /api/organizations by ${req.user.email}`);
            return res.status(403).json({ error: 'Access denied: Superadmin only' });
        }

        const organizations = await Organization.find()
            .populate('owner', 'name email')
            .sort({ createdAt: -1 });

        console.log(`📦 Found ${organizations.length} organizations. Calculating member counts...`);
        // Augment with member counts
        const orgsWithCounts = await Promise.all(organizations.map(async (org) => {
            const memberCount = await User.countDocuments({ organization: org._id });
            return {
                ...org.toObject(),
                memberCount
            };
        }));

        console.log(`✅ Successfully returning ${orgsWithCounts.length} organizations with counts.`);
        res.json({ organizations: orgsWithCounts });
    } catch (err) {
        console.error('❌ Error in GET /api/organizations:', err);
        res.status(500).json({ error: err.message });
    }
});

// 8. GET /api/organizations/:id/users — List all users in an org (Superadmin Only)
router.get('/:id/users', async (req, res) => {
    try {
        if (!req.isSuperAdmin) {
            return res.status(403).json({ error: 'Access denied: Superadmin only' });
        }

        const users = await User.find({ organization: req.params.id })
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9. PATCH /api/organizations/:id — Rename organization (Superadmin Only)
router.patch('/:id', async (req, res) => {
    try {
        if (!req.isSuperAdmin) {
            return res.status(403).json({ error: 'Access denied: Superadmin only' });
        }

        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Organization name is required' });

        const org = await Organization.findById(req.params.id);
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        org.name = name;
        // Update slug too
        org.slug = name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();

        await org.save();
        res.json({ success: true, organization: org });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 10. DELETE /api/organizations/users/:userId — Delete any user (Superadmin Only)
router.delete('/users/:userId', async (req, res) => {
    try {
        if (!req.isSuperAdmin) {
            return res.status(403).json({ error: 'Access denied: Superadmin only' });
        }

        const userToDelete = await User.findById(req.params.userId);
        if (!userToDelete) return res.status(404).json({ error: 'User not found' });

        // Prevent superadmin from deleting themselves if they try
        if (userToDelete._id.toString() === req.user.userId) {
            return res.status(400).json({ error: 'You cannot delete yourself' });
        }

        await User.findByIdAndDelete(req.params.userId);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 11. DELETE /api/organizations/:id — Delete entire organization (Superadmin Only)
router.delete('/:id', async (req, res) => {
    try {
        if (!req.isSuperAdmin) {
            return res.status(403).json({ error: 'Access denied: Superadmin only' });
        }

        const orgId = req.params.id;
        const org = await Organization.findById(orgId);
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        // 1. Delete all users belonging to this organization
        await User.deleteMany({ organization: orgId });

        // 2. Delete the organization itself
        await Organization.findByIdAndDelete(orgId);

        // Note: For a truly thorough cleanup, we could also delete Templates and Documents,
        // but typically users/orgs are the primary cleanup target.

        console.log(`🗑️ Superadmin ${req.user.email} deleted organization "${org.name}" and all its users.`);

        res.json({
            success: true,
            message: `Organization "${org.name}" and all its members have been permanently deleted.`
        });
    } catch (err) {
        console.error('❌ Error in DELETE /api/organizations/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
