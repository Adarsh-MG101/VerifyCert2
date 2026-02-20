/**
 * Organization Service
 * Handles all organization-related API calls
 */

import { get, post, put, patch, del } from './apiService';

/**
 * Get current user's organization
 */
export const getMyOrganization = async () => {
    return get('/api/organizations/me');
};

/**
 * Update organization profile
 */
export const updateOrganization = async (data) => {
    return put('/api/organizations/me', data);
};

/**
 * Get organization members
 */
export const getMembers = async () => {
    return get('/api/organizations/me/members');
};

/**
 * Invite a new member to the organization
 */
export const inviteMember = async (name, email, password, orgRole = 'member') => {
    return post('/api/organizations/me/invite', { name, email, password, orgRole });
};

/**
 * Change a member's role
 */
export const changeMemberRole = async (userId, orgRole) => {
    return patch(`/api/organizations/me/members/${userId}`, { orgRole });
};

/**
 * Remove a member from the organization
 */
export const removeMember = async (userId) => {
    return del(`/api/organizations/me/members/${userId}`);
};

// ============================================================
// SUPERADMIN ONLY FUNCTIONS
// ============================================================

/**
 * List all organizations (Superadmin only)
 */
export const getAllOrganizations = async () => {
    return get('/api/organizations');
};

/**
 * List all users in a specific organization (Superadmin only)
 */
export const getOrgUsers = async (orgId) => {
    return get(`/api/organizations/${orgId}/users`);
};

/**
 * Update any organization by ID (Superadmin only)
 */
export const updateOrgAsAdmin = async (orgId, data) => {
    return patch(`/api/organizations/${orgId}`, data);
};

/**
 * Delete any user by ID (Superadmin only)
 */
export const deleteUserAsAdmin = async (userId) => {
    return del(`/api/organizations/users/${userId}`);
};

/**
 * Delete an entire organization (Superadmin only)
 */
export const deleteOrganizationAsAdmin = async (orgId) => {
    return del(`/api/organizations/${orgId}`);
};

export default {
    getMyOrganization,
    updateOrganization,
    getMembers,
    inviteMember,
    changeMemberRole,
    removeMember,
    getAllOrganizations,
    getOrgUsers,
    updateOrgAsAdmin,
    deleteUserAsAdmin,
    deleteOrganizationAsAdmin
};
