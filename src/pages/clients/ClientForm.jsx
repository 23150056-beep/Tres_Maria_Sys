import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [pricingTiers, setPricingTiers] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchPricingTiers();
    if (isEdit) fetchClient();
  }, [id]);

  const fetchPricingTiers = async () => {
    try {
      const response = await api.get('/clients/pricing-tiers');
      setPricingTiers(response.data.tiers || response.data || []);
    } catch (error) { console.error(error); }
  };

  const fetchClient = async () => {
    try {
      const response = await api.get(`/clients/${id}`);
      reset(response.data.client || response.data);
    } catch (error) {
      toast.error('Failed to load client');
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/clients/${id}`, data);
        toast.success('Client updated');
      } else {
        await api.post('/clients', data);
        toast.success('Client created');
      }
      navigate('/clients');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save client');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/clients')} className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg"><ArrowLeftIcon className="h-5 w-5" /></button>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Client' : 'New Client'}</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="glass-card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className="block text-sm font-medium text-white/80 mb-1">Business Name *</label><input {...register('business_name', { required: 'Required' })} className="form-input" />{errors.business_name && <p className="mt-1 text-sm text-red-400">{errors.business_name.message}</p>}</div>
          <div><label className="block text-sm font-medium text-white/80 mb-1">Client Type</label><select {...register('client_type')} className="form-select"><option value="retailer">Retailer</option><option value="wholesaler">Wholesaler</option><option value="distributor">Distributor</option><option value="institution">Institution</option></select></div>
          <div><label className="block text-sm font-medium text-white/80 mb-1">Contact Person</label><input {...register('contact_person')} className="form-input" /></div>
          <div><label className="block text-sm font-medium text-white/80 mb-1">Phone</label><input {...register('phone')} className="form-input" /></div>
          <div><label className="block text-sm font-medium text-white/80 mb-1">Email</label><input type="email" {...register('email')} className="form-input" /></div>
          <div><label className="block text-sm font-medium text-white/80 mb-1">Pricing Tier</label><select {...register('pricing_tier')} className="form-select"><option value="">Standard</option>{pricingTiers.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-white/80 mb-1">Credit Limit</label><input type="number" step="0.01" {...register('credit_limit')} className="form-input" /></div>
          <div><label className="block text-sm font-medium text-white/80 mb-1">Payment Terms</label><select {...register('payment_terms')} className="form-select"><option value="cod">COD</option><option value="net_7">Net 7</option><option value="net_15">Net 15</option><option value="net_30">Net 30</option></select></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium text-white/80 mb-1">Address</label><textarea {...register('address')} rows={2} className="form-input" /></div>
          <div className="flex items-center"><input type="checkbox" {...register('is_active')} defaultChecked className="h-4 w-4 text-purple-600 rounded bg-white/10 border-white/20" /><label className="ml-2 text-sm text-white/80">Active</label></div>
        </div>
        <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
          <button type="button" onClick={() => navigate('/clients')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">{submitting ? 'Saving...' : (isEdit ? 'Update' : 'Create')}</button>
        </div>
      </form>
    </div>
  );
}
