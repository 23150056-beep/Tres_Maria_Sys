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
    admin: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    warehouse_staff: 'bg-green-100 text-green-800',
    sales: 'bg-yellow-100 text-yellow-800',
    driver: 'bg-orange-100 text-orange-800',
    accountant: 'bg-cyan-100 text-cyan-800',
  };

  const roles = ['admin', 'manager', 'warehouse_staff', 'sales', 'driver', 'accountant'];
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading && users.length === 0) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <Link to="/users/new" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <PlusIcon className="h-5 w-5 mr-2" />Add User
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <UserIcon className="h-8 w-8 text-blue-600 mb-2" />
          <p className="text-2xl font-bold">{pagination.total}</p>
          <p className="text-sm text-gray-500">Total Users</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <ShieldCheckIcon className="h-8 w-8 text-green-600 mb-2" />
          <p className="text-2xl font-bold">{users.filter(u => u.is_active).length}</p>
          <p className="text-sm text-gray-500">Active</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
          <p className="text-sm text-gray-500">Admins</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-bold">{users.filter(u => u.role === 'driver').length}</p>
          <p className="text-sm text-gray-500">Drivers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input type="text" placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
        </form>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">All Roles</option>
          {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ').charAt(0).toUpperCase() + r.replace('_', ' ').slice(1)}</option>)}
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No users found</td></tr>
            ) : users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-medium">{user.name?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}>
                    {user.role?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{user.warehouse?.name || 'All'}</td>
                <td className="px-6 py-4">
                  <button onClick={() => toggleUserStatus(user)} className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(user.last_login)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link to={`/users/${user.id}/edit`} className="p-1 text-gray-500 hover:text-blue-600" title="Edit">
                      <PencilIcon className="h-5 w-5" />
                    </Link>
                    <button onClick={() => setResetModal({ open: true, user })} className="p-1 text-gray-500 hover:text-yellow-600" title="Reset Password">
                      <KeyIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => setDeleteModal({ open: true, user })} className="p-1 text-gray-500 hover:text-red-600" title="Delete">
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
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
            <p className="text-sm text-gray-600">Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1} className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
              <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= totalPages} className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setDeleteModal({ open: false, user: null })}></div>
            <div className="relative bg-white rounded-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Delete User</h2>
              <p className="text-gray-600 mb-6">Are you sure you want to delete <span className="font-semibold">{deleteModal.user?.name}</span>? This action cannot be undone.</p>
              <div className="flex justify-end gap-4">
                <button onClick={() => setDeleteModal({ open: false, user: null })} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
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
            <div className="relative bg-white rounded-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Reset Password</h2>
              <p className="text-gray-600 mb-6">Send a password reset email to <span className="font-semibold">{resetModal.user?.email}</span>?</p>
              <div className="flex justify-end gap-4">
                <button onClick={() => setResetModal({ open: false, user: null })} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleResetPassword} disabled={deleting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{deleting ? 'Sending...' : 'Send Reset Email'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
