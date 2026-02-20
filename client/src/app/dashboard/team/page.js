"use client";
import { useState, useEffect } from 'react';
import { Card, Button, Input } from '@/components';
import { getMembers, inviteMember, changeMemberRole, removeMember, getMyOrganization } from '@/services/organizationService';

export default function TeamPage() {
    const [members, setMembers] = useState([]);
    const [organization, setOrganization] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteData, setInviteData] = useState({ name: '', email: '', password: '', orgRole: 'member' });
    const [inviteLoading, setInviteLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};

    const fetchData = async () => {
        try {
            setLoading(true);
            const [membersRes, orgRes] = await Promise.all([getMembers(), getMyOrganization()]);
            setMembers(membersRes.members || []);
            setOrganization(orgRes.organization);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load team data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInvite = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setInviteLoading(true);

        try {
            const res = await inviteMember(inviteData.name, inviteData.email, inviteData.password, inviteData.orgRole);
            setSuccess(res.message);
            setInviteData({ name: '', email: '', password: '', orgRole: 'member' });
            setShowInviteForm(false);
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to invite member');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        setError('');
        setSuccess('');
        try {
            const res = await changeMemberRole(userId, newRole);
            setSuccess(res.message);
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to change role');
        }
    };

    const handleRemove = async (userId, memberName) => {
        if (!confirm(`Remove ${memberName} from the organization?`)) return;
        setError('');
        setSuccess('');
        try {
            const res = await removeMember(userId);
            setSuccess(res.message);
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to remove member');
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'owner': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Organization Header */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground font-header">
                            {organization?.name || 'Your Organization'}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {members.length} member{members.length !== 1 ? 's' : ''} &bull; Created {organization?.createdAt ? new Date(organization.createdAt).toLocaleDateString() : ''}
                        </p>
                    </div>
                    {['owner', 'admin'].includes(currentUser?.orgRole) && (
                        <Button
                            onClick={() => setShowInviteForm(!showInviteForm)}
                            className="text-white text-sm"
                        >
                            {showInviteForm ? 'Cancel' : '+ Add Member'}
                        </Button>
                    )}
                </div>
            </Card>

            {/* Status Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm animate-fade-in">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm animate-fade-in">
                    {success}
                </div>
            )}

            {/* Invite Form */}
            {showInviteForm && (
                <Card className="p-6 animate-fade-in border-2 border-primary/20">
                    <h3 className="text-lg font-semibold mb-4 font-header">Add New Member</h3>
                    <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Full Name"
                            type="text"
                            placeholder="Member's name"
                            value={inviteData.name}
                            onChange={(e) => setInviteData(prev => ({ ...prev, name: e.target.value }))}
                            required
                        />
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="member@email.com"
                            value={inviteData.email}
                            onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                            required
                        />
                        <Input
                            label="Temporary Password"
                            type="password"
                            placeholder="Set a temporary password"
                            value={inviteData.password}
                            onChange={(e) => setInviteData(prev => ({ ...prev, password: e.target.value }))}
                            required
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select
                                value={inviteData.orgRole}
                                onChange={(e) => setInviteData(prev => ({ ...prev, orgRole: e.target.value }))}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                            >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <Button type="submit" disabled={inviteLoading} className="text-white text-sm">
                                {inviteLoading ? 'Adding...' : 'Add Member'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Members List */}
            <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                    <h3 className="text-lg font-semibold font-header">Team Members</h3>
                </div>
                <div className="divide-y divide-border">
                    {members.map((member) => (
                        <div key={member._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                    {member.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div>
                                    <div className="font-medium text-foreground flex items-center gap-2">
                                        {member.name}
                                        {member._id === currentUser?.id && (
                                            <span className="text-xs text-gray-400">(You)</span>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500">{member.email}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getRoleBadgeColor(member.orgRole)}`}>
                                    {member.orgRole?.charAt(0).toUpperCase() + member.orgRole?.slice(1)}
                                </span>

                                {/* Role change & remove — only visible to owners, and not for themselves */}
                                {currentUser?.orgRole === 'owner' && member._id !== currentUser?.id && (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={member.orgRole}
                                            onChange={(e) => handleRoleChange(member._id, e.target.value)}
                                            className="text-xs rounded border border-gray-200 px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                                        >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                            <option value="owner">Owner</option>
                                        </select>
                                        <button
                                            onClick={() => handleRemove(member._id, member.name)}
                                            className="text-red-400 hover:text-red-600 transition-colors p-1"
                                            title="Remove member"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </div>
                                )}

                                {/* Admins can remove members (but not other admins or owner) */}
                                {currentUser?.orgRole === 'admin' && member._id !== currentUser?.id && member.orgRole === 'member' && (
                                    <button
                                        onClick={() => handleRemove(member._id, member.name)}
                                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                                        title="Remove member"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {members.length === 0 && (
                        <div className="px-6 py-12 text-center text-gray-400">
                            No team members found
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
