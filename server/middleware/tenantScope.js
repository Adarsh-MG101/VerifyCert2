const mongoose = require('mongoose');

/**
 * Tenant Scope Middleware
 * Must run AFTER auth middleware.
 * 
 * Attaches tenant-scoping helpers to the request:
 * - req.organizationId   — the ObjectId of the user's organization
 * - req.tenantFilter()   — returns a MongoDB filter { organization: <id> }
 *                          For superadmins, returns {} (no filter — sees all orgs)
 * - req.isSuperAdmin     — boolean shortcut
 */
const tenantScope = (req, res, next) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        req.isSuperAdmin = user.role === 'superadmin';

        if (req.isSuperAdmin) {
            req.organizationId = null;
            req.tenantFilter = () => ({});
        } else {
            if (!user.organization) {
                console.error(`❌ Tenant Scope Error: User ${user.email} (ID: ${user._id || user.userId}) has no organization assigned.`);
                return res.status(403).json({ error: 'Your account is not associated with any organization. Please contact support.' });
            }
            try {
                req.organizationId = new mongoose.Types.ObjectId(user.organization);
                req.tenantFilter = () => ({ organization: req.organizationId });
            } catch (err) {
                console.error(`❌ Tenant Scope Error: Invalid organization ID for user ${user.email}`);
                return res.status(400).json({ error: 'Invalid organization ID associated with your account' });
            }
        }

        next();
    } catch (err) {
        console.error('❌ Tenant Scope Middleware Error:', err);
        return res.status(500).json({ error: 'Internal server error during tenant scoping' });
    }
};

/**
 * Ownership check helper.
 * Verifies that a resource belongs to the current user's organization.
 * Superadmins bypass this check.
 */
const verifyOwnership = (resource, req) => {
    if (req.isSuperAdmin) return true;
    if (!resource.organization) return false;
    return resource.organization.toString() === req.organizationId.toString();
};

module.exports = { tenantScope, verifyOwnership };
