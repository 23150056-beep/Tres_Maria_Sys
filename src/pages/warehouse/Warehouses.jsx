import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon, BuildingStorefrontIcon, MapPinIcon, CubeIcon, UsersIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '', city: '', province: '', manager_name: '', phone: '', capacity: '', is_active: true });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { fetchWarehouses(); }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouse');
      setWarehouses(res.data.warehouses || []);
    } catch (e) { toast.error('Failed to load warehouses'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.code) { toast.error('Name and code are required'); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/warehouse/${editingId}`, form);
        toast.success('Warehouse updated');
      } else {
        await api.post('/warehouse', form);
        toast.success('Warehouse created');
      }
      setCreateModal(false);
      resetForm();
      fetchWarehouses();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to save warehouse'); }
    finally { setSubmitting(false); }
  };

  const openEdit = (warehouse) => {
    setForm({ ...warehouse });
    setEditingId(warehouse.id);
    setCreateModal(true);
  };

  const resetForm = () => {
    setForm({ name: '', code: '', address: '', city: '', province: '', manager_name: '', phone: '', capacity: '', is_active: true });
    setEditingId(null);
  };

  const filtered = warehouses.filter(w =>
    w.name?.toLowerCase().includes(search.toLowerCase()) ||
    w.code?.toLowerCase().includes(search.toLowerCase()) ||
    w.city?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
        <button onClick={() => { resetForm(); setCreateModal(true); }} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <PlusIcon className="h-5 w-5 mr-2" />Add Warehouse
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <BuildingStorefrontIcon className="h-8 w-8 text-blue-600 mb-2" />
          <p className="text-2xl font-bold">{warehouses.length}</p>
          <p className="text-sm text-gray-500">Total Warehouses</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <CubeIcon className="h-8 w-8 text-green-600 mb-2" />
          <p className="text-2xl font-bold">{warehouses.filter(w => w.is_active).length}</p>
          <p className="text-sm text-gray-500">Active</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <MapPinIcon className="h-8 w-8 text-purple-600 mb-2" />
          <p className="text-2xl font-bold">{[...new Set(warehouses.map(w => w.province))].length}</p>
          <p className="text-sm text-gray-500">Provinces Covered</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <UsersIcon className="h-8 w-8 text-orange-600 mb-2" />
          <p className="text-2xl font-bold">{warehouses.reduce((sum, w) => sum + (w.staff_count || 0), 0)}</p>
          <p className="text-sm text-gray-500">Total Staff</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input type="text" placeholder="Search warehouses..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm">No warehouses found</div>
        ) : filtered.map(warehouse => (
          <div key={warehouse.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{warehouse.name}</h3>
                  <p className="text-sm text-gray-500">{warehouse.code}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${warehouse.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {warehouse.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start">
                  <MapPinIcon className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                  <span className="text-gray-600">{warehouse.address || '-'}, {warehouse.city}, {warehouse.province}</span>
                </div>
                <div className="flex items-center">
                  <UsersIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Manager: {warehouse.manager_name || '-'}</span>
                </div>
                {warehouse.capacity && (
                  <div className="flex items-center">
                    <CubeIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">Capacity: {warehouse.capacity} units</span>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
              <button onClick={() => openEdit(warehouse)} className="text-sm text-blue-600 hover:text-blue-700">Edit</button>
              <Link to={`/warehouse/${warehouse.id}`} className="text-sm text-blue-600 hover:text-blue-700">View Details →</Link>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setCreateModal(false)}></div>
            <div className="relative bg-white rounded-xl max-w-lg w-full p-6">
              <h2 className="text-xl font-bold mb-6">{editingId ? 'Edit Warehouse' : 'Add New Warehouse'}</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Name *</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Main Warehouse" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                    <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="WH-001" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="San Fernando City" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                    <input type="text" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="La Union" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manager Name</label>
                    <input type="text" value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (units)</label>
                    <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div className="flex items-center pt-6">
                    <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 text-blue-600 rounded mr-2" />
                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button onClick={() => setCreateModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
