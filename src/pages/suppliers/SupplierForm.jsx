import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => { if (isEdit) fetchSupplier(); }, [id]);

  const fetchSupplier = async () => {
    try {
      const response = await api.get(`/suppliers/${id}`);
      reset(response.data.supplier || response.data);
    } catch (error) {
      toast.error('Failed to load supplier');
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (isEdit) { await api.put(`/suppliers/${id}`, data); toast.success('Supplier updated'); }
      else { await api.post('/suppliers', data); toast.success('Supplier created'); }
      navigate('/suppliers');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => navigate('/suppliers')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><ArrowLeftIcon className="h-5 w-5" /></button><h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Supplier' : 'New Supplier'}</h1></div>
      <form onSubmit={handleSubmit(onSubmit)} className="glass-card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className="block text-sm font-medium text-slate-500 mb-1">Name *</label><input {...register('name', { required: 'Required' })} className="form-input w-full" />{errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}</div>
          <div><label className="block text-sm font-medium text-slate-500 mb-1">Contact Person</label><input {...register('contact_person')} className="form-input w-full" /></div>
          <div><label className="block text-sm font-medium text-slate-500 mb-1">Phone</label><input {...register('phone')} className="form-input w-full" /></div>
          <div><label className="block text-sm font-medium text-slate-500 mb-1">Email</label><input type="email" {...register('email')} className="form-input w-full" /></div>
          <div><label className="block text-sm font-medium text-slate-500 mb-1">Payment Terms</label><select {...register('payment_terms')} className="form-input w-full"><option value="cod">COD</option><option value="net_7">Net 7</option><option value="net_15">Net 15</option><option value="net_30">Net 30</option></select></div>
          <div><label className="block text-sm font-medium text-slate-500 mb-1">Lead Time (days)</label><input type="number" {...register('lead_time_days')} className="form-input w-full" /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-500 mb-1">Address</label><textarea {...register('address')} rows={2} className="form-input w-full" /></div>
          <div className="flex items-center"><input type="checkbox" {...register('is_active')} defaultChecked className="h-4 w-4 text-primary-600 rounded bg-slate-100 border-slate-200" /><label className="ml-2 text-sm text-slate-500">Active</label></div>
        </div>
        <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
          <button type="button" onClick={() => navigate('/suppliers')} className="px-6 py-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">{submitting ? 'Saving...' : (isEdit ? 'Update' : 'Create')}</button>
        </div>
      </form>
    </div>
  );
}
