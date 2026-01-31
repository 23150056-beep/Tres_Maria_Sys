import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeftIcon, UserIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function UserForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [warehouses, setWarehouses] = useState([]);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: { name: '', username: '', email: '', password: '', role: 'sales', warehouse_id: '', phone: '', is_active: true }
  });

  const role = watch('role');

  useEffect(() => {
    fetchWarehouses();
    if (isEdit) fetchUser();
  }, [id]);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouse');
      setWarehouses(res.data.warehouses || []);
    } catch (e) { console.error(e); }
  };

  const fetchUser = async () => {
    try {
      const res = await api.get(`/users/${id}`);
      reset({
        name: res.data.name || '',
        username: res.data.username || '',
        email: res.data.email || '',
        password: '',
        role: res.data.role || 'sales',
        warehouse_id: res.data.warehouse_id || '',
        phone: res.data.phone || '',
        is_active: res.data.is_active ?? true
      });
    } catch (e) { toast.error('Failed to load user'); navigate('/users'); }
    finally { setLoading(false); }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = { ...data };
      // Don't send empty password on edit
      if (isEdit && !payload.password) delete payload.password;
      // Handle empty warehouse
      if (!payload.warehouse_id) payload.warehouse_id = null;

      if (isEdit) {
        await api.put(`/users/${id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/users', payload);
        toast.success('User created');
      }
      navigate('/users');
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to save user'); }
    finally { setSubmitting(false); }
  };

  const roles = [
    { value: 'admin', label: 'Administrator', description: 'Full system access' },
    { value: 'manager', label: 'Manager', description: 'Manage operations and staff' },
    { value: 'warehouse_staff', label: 'Warehouse Staff', description: 'Inventory and warehouse operations' },
    { value: 'sales', label: 'Sales', description: 'Orders and client management' },
    { value: 'driver', label: 'Driver', description: 'Delivery operations' },
    { value: 'accountant', label: 'Accountant', description: 'Financial reports and transactions' },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/users')} className="p-2 text-white/60 hover:bg-white/10 rounded-lg">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit User' : 'Add New User'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <UserIcon className="h-5 w-5 mr-2 text-purple-400" />Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Full Name *</label>
              <input type="text" {...register('name', { required: 'Name is required' })} className="form-input" placeholder="Juan Dela Cruz" />
              {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Username *</label>
              <input type="text" {...register('username', { required: 'Username is required', minLength: { value: 3, message: 'Min 3 characters' } })} className="form-input" placeholder="jdelacruz" />
              {errors.username && <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Email *</label>
              <input type="email" {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })} className="form-input" placeholder="juan@tresmarias.com" />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Phone</label>
              <input type="text" {...register('phone')} className="form-input" placeholder="+63 9XX XXX XXXX" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white/60 mb-1">{isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} {...register('password', isEdit ? {} : { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })} className="form-input pr-10" placeholder={isEdit ? 'Enter new password' : 'Enter password'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40">
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
            </div>
          </div>
        </div>

        {/* Role Selection */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Role & Permissions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map(r => (
              <label key={r.value} className={`relative flex items-start p-4 border rounded-lg cursor-pointer ${role === r.value ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:bg-white/5'}`}>
                <input type="radio" {...register('role', { required: true })} value={r.value} className="sr-only" />
                <div>
                  <p className="font-medium text-white">{r.label}</p>
                  <p className="text-sm text-white/60">{r.description}</p>
                </div>
                {role === r.value && (
                  <div className="absolute top-2 right-2 h-5 w-5 bg-purple-600 rounded-full flex items-center justify-center">
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Assignment */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Assignment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Assigned Warehouse</label>
              <select {...register('warehouse_id')} className="form-select">
                <option value="">All Warehouses (Admin/Manager)</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
              </select>
              <p className="mt-1 text-xs text-white/40">Warehouse staff should be assigned to a specific warehouse</p>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" {...register('is_active')} className="h-5 w-5 text-purple-600 rounded" />
                <div>
                  <p className="font-medium text-white">Active Account</p>
                  <p className="text-sm text-white/60">Inactive users cannot log in</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate('/users')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">{submitting ? 'Saving...' : (isEdit ? 'Update User' : 'Create User')}</button>
        </div>
      </form>
    </div>
  );
}
