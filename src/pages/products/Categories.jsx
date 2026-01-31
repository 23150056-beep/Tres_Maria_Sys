import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, FolderIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', parent_id: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, formData);
        toast.success('Category updated');
      } else {
        await api.post('/categories', formData);
        toast.success('Category created');
      }
      setShowModal(false);
      setFormData({ name: '', description: '', parent_id: '' });
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || '', parent_id: category.parent_id || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-white/60 mt-1">Organize your products</p>
        </div>
        <button onClick={() => { setShowModal(true); setEditingCategory(null); setFormData({ name: '', description: '', parent_id: '' }); }} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Category
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-white/60">No categories yet</div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Products</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <FolderIcon className="h-5 w-5 text-white/40 mr-2" />
                      <span className="font-medium text-white">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/60">{cat.description || '-'}</td>
                  <td className="px-6 py-4 text-sm text-white/60">{cat.product_count || 0}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleEdit(cat)} className="text-purple-400 hover:text-purple-300"><PencilIcon className="h-5 w-5 inline" /></button>
                    <button onClick={() => handleDelete(cat.id)} className="text-red-400 hover:text-red-300"><TrashIcon className="h-5 w-5 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Name *</label>
                <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="form-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="form-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Parent Category</label>
                <select value={formData.parent_id} onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })} className="form-select">
                  <option value="">None (Top Level)</option>
                  {categories.filter(c => c.id !== editingCategory?.id).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingCategory ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
