"use client";
import { useState, useEffect } from 'react';
import { Card, Button, Input } from '@/components';
import { getAllOrganizations, getOrgUsers, updateOrgAsAdmin, deleteUserAsAdmin, deleteOrganizationAsAdmin } from '@/services/organizationService';

export default function OrganizationsPage() {
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [orgUsers, setOrgUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [editingOrg, setEditingOrg] = useState(null);
    const [newName, setNewName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchOrgs = async () => {
        try {
            setLoading(true);
            const res = await getAllOrganizations();
            setOrganizations(res.organizations || []);
        } catch (err) {
            console.error('❌ Failed to fetch organizations:', err);
            setError(err.response?.data?.error || 'Failed to load organizations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrgs();
    }, []);

    const handleSelectOrg = async (org) => {
        setSelectedOrg(org);
        setOrgUsers([]);
        setUsersLoading(true);
        setError('');
        try {
            const res = await getOrgUsers(org._id);
            setOrgUsers(res.users || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load organization members');
        } finally {
            setUsersLoading(false);
        }
    };

    const handleRename = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setError('');
        setSuccess('');
        try {
            await updateOrgAsAdmin(editingOrg._id, { name: newName.trim() });
            setSuccess(`Organization renamed to "${newName.trim()}"`);
            setEditingOrg(null);
            setNewName('');
            await fetchOrgs();
            if (selectedOrg?._id === editingOrg._id) {
                setSelectedOrg(prev => ({ ...prev, name: newName.trim() }));
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to rename organization');
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        if (!confirm(`Are you sure you want to PERMANENTLY delete user "${userName}"? This cannot be undone.`)) return;

        setError('');
        setSuccess('');
        try {
            await deleteUserAsAdmin(userId);
            setSuccess(`User "${userName}" has been deleted`);
            setOrgUsers(prev => prev.filter(u => u._id !== userId));
            // Update counts in main list
            setOrganizations(prev => prev.map(org => {
                if (org._id === selectedOrg?._id) {
                    return { ...org, memberCount: org.memberCount - 1 };
                }
                return org;
            }));
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete user');
        }
    };

    const handleDeleteOrg = async (e, orgId, orgName) => {
        e.stopPropagation(); // Don't select the org when clicking delete

        const confirmMsg = `⚠️ DANGER: Are you sure you want to PERMANENTLY delete organization "${orgName}"?\n\nThis will delete ALL users belonging to this organization. This action cannot be undone.`;
        if (!confirm(confirmMsg)) return;

        setError('');
        setSuccess('');
        try {
            const res = await deleteOrganizationAsAdmin(orgId);
            setSuccess(res.message);
            if (selectedOrg?._id === orgId) {
                setSelectedOrg(null);
                setOrgUsers([]);
            }
            await fetchOrgs();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete organization');
        }
    };

    const filteredOrgs = organizations.filter(org =>
        org.name.toLowerCase().includes(search.toLowerCase()) ||
        org.owner?.name?.toLowerCase().includes(search.toLowerCase()) ||
        org.owner?.email?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-foreground font-header">Organization Management</h1>
                <div className="w-64">
                    <Input
                        placeholder="Search organizations..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="text-sm"
                    />
                </div>
            </div>

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Organizations List */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-muted/10 flex items-center justify-between">
                            <h3 className="font-semibold font-header">All Organizations</h3>
                            <span className="text-xs text-gray-400 font-medium">{filteredOrgs.length} Total</span>
                        </div>
                        <div className="divide-y divide-border overflow-y-auto max-h-[600px] custom-scrollbar">
                            {filteredOrgs.map((org) => (
                                <div
                                    key={org._id}
                                    className={`px-6 py-4 flex items-center justify-between hover:bg-muted/5 transition-colors cursor-pointer ${selectedOrg?._id === org._id ? 'bg-primary/5 border-l-4 border-primary' : ''}`}
                                    onClick={() => handleSelectOrg(org)}
                                >
                                    <div>
                                        <div className="font-bold text-foreground flex items-center gap-2">
                                            {editingOrg?._id === org._id ? (
                                                <form onSubmit={handleRename} className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        autoFocus
                                                        value={newName}
                                                        onChange={(e) => setNewName(e.target.value)}
                                                        className="px-2 py-1 border border-primary rounded text-sm focus:outline-none"
                                                    />
                                                    <button type="submit" className="text-green-600 hover:text-green-800"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
                                                    <button onClick={() => setEditingOrg(null)} className="text-red-600 hover:text-red-800"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                                                </form>
                                            ) : (
                                                <>
                                                    {org.name}
                                                    <button
                                                        className="text-gray-400 hover:text-primary transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingOrg(org);
                                                            setNewName(org.name);
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            Owner: {org.owner?.name || 'Unknown'} ({org.owner?.email || 'N/A'})
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                                                {org.memberCount} Members
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">
                                                Created {new Date(org.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => handleDeleteOrg(e, org._id, org.name)}
                                            className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="Delete Organization"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {filteredOrgs.length === 0 && (
                                <div className="px-6 py-12 text-center text-gray-400">
                                    No organizations found matching your search
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Organization Users (Detail Panel) */}
                <div>
                    <Card className="sticky top-24 min-h-[400px] flex flex-col">
                        <div className="px-6 py-4 border-b border-border bg-primary/5">
                            <h3 className="font-semibold font-header">
                                {selectedOrg ? `${selectedOrg.name} Users` : 'Select an Organization'}
                            </h3>
                            {selectedOrg && <p className="text-[10px] text-gray-400 uppercase">Manage organization members</p>}
                        </div>

                        <div className="flex-1">
                            {!selectedOrg ? (
                                <div className="h-full flex flex-col items-center justify-center p-10 text-center text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="mb-4 opacity-20" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    <p className="text-sm">Click on an organization to manage its users</p>
                                </div>
                            ) : usersLoading ? (
                                <div className="h-full flex items-center justify-center py-20">
                                    <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {orgUsers.map(user => (
                                        <div key={user._id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/5 transition-all">
                                            <div className="overflow-hidden mr-2">
                                                <div className="text-sm font-medium text-foreground truncate">{user.name}</div>
                                                <div className="text-[11px] text-gray-500 truncate">{user.email}</div>
                                                <div className="mt-1 flex gap-2">
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${user.orgRole === 'owner' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        user.orgRole === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            'bg-gray-50 text-gray-700 border-gray-200'
                                                        }`}>
                                                        {user.orgRole}
                                                    </span>
                                                    {user.role === 'superadmin' && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200 uppercase font-black tracking-tighter">
                                                            Superadmin
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDeleteUser(user._id, user.name)}
                                                className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete User Permanently"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                            </button>
                                        </div>
                                    ))}

                                    {orgUsers.length === 0 && (
                                        <div className="px-6 py-10 text-center text-gray-400 text-xs italic">
                                            No users found for this organization
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
