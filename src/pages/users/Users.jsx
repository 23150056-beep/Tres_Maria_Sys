import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon, UserIcon, ShieldCheckIcon, PencilIcon, TrashIcon, KeyIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
  const [resetModal, setResetModal] = useState({ open: false, user: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchUsers(); }, [pagination.page, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pagination.page, limit: pagination.limit });
      if (roleFilter) params.append('role', roleFilter);
      if (search) params.append('search', search);
      const res = await api.get(`/users?${params}`);
      setUsers(res.data.users || []);
      setPagination(prev => ({ ...prev, total: res.data.total || 0 }));
    } catch (e) { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  const handleDelete = async () => {
    if (!deleteModal.user) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteModal.user.id}`);
      toast.success('User deleted');
      setDeleteModal({ open: false, user: null });
      fetchUsers();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to delete user'); }
    finally { setDeleting(false); }
  };

  const handleResetPassword = async () => {
    if (!resetModal.user) return;
    setDeleting(true);
    try {
      await api.post(`/users/${resetModal.user.id}/reset-password`);
      toast.success('Password reset email sent');
      setResetModal({ open: false, user: null });
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to reset password'); }
    finally { setDeleting(false); }
  };

  const toggleUserStatus = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { is_active: !user.is_active });
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (error) { toast.error('Failed to update status'); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  const roleColors = {
    admin: 'bg-purple-500/20 text-purple-400',
    manager: 'bg-blue-500/20 text-blue-400',
    warehouse_staff: 'bg-green-500/20 text-green-400',
    sales: 'bg-yellow-500/20 text-yellow-400',
    driver: 'bg-orange-500/20 text-orange-400',
    accountant: 'bg-cyan-500/20 text-cyan-400',
  };

  const roles = ['admin', 'manager', 'warehouse_staff', 'sales', 'driver', 'accountant'];
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading && users.length === 0) return <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <Link to="/users/new" className="btn-primary inline-flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />Add User
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <UserIcon className="h-8 w-8 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-white">{pagination.total}</p>
          <p className="text-sm text-white/60">Total Users</p>
        </div>
        <div className="glass-card p-4">
          <ShieldCheckIcon className="h-8 w-8 text-green-400 mb-2" />
          <p className="text-2xl font-bold text-white">{users.filter(u => u.is_active).length}</p>
          <p className="text-sm text-white/60">Active</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-white">{users.filter(u => u.role === 'admin').length}</p>
          <p className="text-sm text-white/60">Admins</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-white">{users.filter(u => u.role === 'driver').length}</p>
          <p className="text-sm text-white/60">Drivers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
          <input type="text" placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-input pl-10" />
        </form>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="form-select">
          <option value="">All Roles</option>
          {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ').charAt(0).toUpperCase() + r.replace('_', ' ').slice(1)}</option>)}
        </select>
      </div>

      {/* Users Table */}
      <div className="glass-table overflow-hidden">
        <table className="min-w-full divide-y divide-white/10">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Warehouse</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Last Login</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {users.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-12 text-center text-white/60">No users found</td></tr>
            ) : users.map(user => (
              <tr key={user.id} className="hover:bg-white/5">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <span className="text-purple-400 font-medium">{user.name?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-white">{user.name}</p>
                      <p className="text-sm text-white/60">@{user.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-white/60">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role] || 'bg-white/10 text-white/60'}`}>
                    {user.role?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-white/60">{user.warehouse?.name || 'All'}</td>
                <td className="px-6 py-4">
                  <button onClick={() => toggleUserStatus(user)} className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-white/60">{formatDate(user.last_login)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link to={`/users/${user.id}/edit`} className="p-1 text-white/60 hover:text-purple-400" title="Edit">
                      <PencilIcon className="h-5 w-5" />
                    </Link>
                    <button onClick={() => setResetModal({ open: true, user })} className="p-1 text-white/60 hover:text-yellow-400" title="Reset Password">
                      <KeyIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => setDeleteModal({ open: true, user })} className="p-1 text-white/60 hover:text-red-400" title="Delete">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center">
            <p className="text-sm text-white/60">Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1} className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
              <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= totalPages} className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setDeleteModal({ open: false, user: null })}></div>
            <div className="relative glass-card max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-white mb-4">Delete User</h2>
              <p className="text-white/60 mb-6">Are you sure you want to delete <span className="font-semibold text-white">{deleteModal.user?.name}</span>? This action cannot be undone.</p>
              <div className="flex justify-end gap-4">
                <button onClick={() => setDeleteModal({ open: false, user: null })} className="btn-secondary">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal.open && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setResetModal({ open: false, user: null })}></div>
            <div className="relative glass-card max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-white mb-4">Reset Password</h2>
              <p className="text-white/60 mb-6">Send a password reset email to <span className="font-semibold text-white">{resetModal.user?.email}</span>?</p>
              <div className="flex justify-end gap-4">
                <button onClick={() => setResetModal({ open: false, user: null })} className="btn-secondary">Cancel</button>
                <button onClick={handleResetPassword} disabled={deleting} className="btn-primary disabled:opacity-50">{deleting ? 'Sending...' : 'Send Reset Email'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
