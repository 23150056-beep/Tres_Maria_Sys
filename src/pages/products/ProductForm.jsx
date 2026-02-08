import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchCategories();
    if (isEdit) fetchProduct();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      toast.error('Failed to load categories');
    }
  };

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      reset(response.data.product || response.data);
    } catch (error) {
      toast.error('Failed to load product');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/products/${id}`, data);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', data);
        toast.success('Product created successfully');
      }
      navigate('/products');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/products')} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Product' : 'New Product'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="glass-card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">SKU *</label>
            <input {...register('sku', { required: 'SKU is required' })} className="form-input" />
            {errors.sku && <p className="mt-1 text-sm text-red-600">{errors.sku.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Name *</label>
            <input {...register('name', { required: 'Name is required' })} className="form-input" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Category</label>
            <select {...register('category_id')} className="form-select">
              <option value="">Select category</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Brand</label>
            <input {...register('brand')} className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Cost Price</label>
            <input type="number" step="0.01" {...register('cost_price')} className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Unit Price *</label>
            <input type="number" step="0.01" {...register('unit_price', { required: 'Price is required' })} className="form-input" />
            {errors.unit_price && <p className="mt-1 text-sm text-red-600">{errors.unit_price.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Unit</label>
            <input {...register('unit')} placeholder="e.g., pcs, kg, box" className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Reorder Point</label>
            <input type="number" {...register('reorder_point')} className="form-input" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Description</label>
            <textarea {...register('description')} rows={3} className="form-input" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" {...register('is_active')} defaultChecked className="h-4 w-4 text-primary-600 rounded bg-slate-100 border-slate-200" />
            <label className="ml-2 text-sm text-slate-600">Active</label>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
          <button type="button" onClick={() => navigate('/products')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting ? 'Saving...' : (isEdit ? 'Update Product' : 'Create Product')}
          </button>
        </div>
      </form>
    </div>
  );
}
