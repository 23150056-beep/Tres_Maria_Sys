import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm({ defaultValues: { supplier_id: '', expected_date: '', notes: '', items: [] } });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => { fetchSuppliers(); fetchProducts(); }, []);

  const fetchSuppliers = async () => { try { const res = await api.get('/suppliers'); setSuppliers(res.data.suppliers || []); } catch (e) { toast.error('Failed to load suppliers'); } };
  const fetchProducts = async () => { try { const res = await api.get('/products?limit=500'); setProducts(res.data.products || []); } catch (e) { toast.error('Failed to load products'); } };

  const addItem = () => { append({ product_id: '', quantity: 1, unit_cost: 0 }); };
  const items = watch('items');
  const total = items.reduce((sum, item) => sum + (parseFloat(item.unit_cost || 0) * parseInt(item.quantity || 0)), 0);
  const formatCurrency = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0);

  const onSubmit = async (data) => {
    if (data.items.length === 0) { toast.error('Add at least one item'); return; }
    setSubmitting(true);
    try {
      await api.post('/purchase-orders', { ...data, items: data.items.map(i => ({ product_id: parseInt(i.product_id), quantity: parseInt(i.quantity), unit_cost: parseFloat(i.unit_cost) })) });
      toast.success('Purchase order created');
      navigate('/purchasing');
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to create PO'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => navigate('/purchasing')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><ArrowLeftIcon className="h-5 w-5" /></button><h1 className="text-2xl font-bold text-slate-900">Create Purchase Order</h1></div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="glass-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-slate-500 mb-1">Supplier *</label><select {...register('supplier_id', { required: 'Required' })} className="form-select"><option value="">Select supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{errors.supplier_id && <p className="mt-1 text-sm text-red-600">{errors.supplier_id.message}</p>}</div>
            <div><label className="block text-sm font-medium text-slate-500 mb-1">Expected Date</label><input type="date" {...register('expected_date')} className="form-input" /></div>
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-semibold text-slate-900">Items</h2><button type="button" onClick={addItem} className="btn-primary inline-flex items-center"><PlusIcon className="h-5 w-5 mr-2" />Add Item</button></div>
          {fields.length === 0 ? <div className="text-center py-12 text-slate-500">No items added</div> : (
            <table className="min-w-full"><thead><tr className="border-b border-slate-200"><th className="py-2 text-left text-sm font-medium text-slate-500">Product</th><th className="py-2 text-left text-sm font-medium text-slate-500 w-24">Qty</th><th className="py-2 text-left text-sm font-medium text-slate-500 w-32">Unit Cost</th><th className="py-2 text-right text-sm font-medium text-slate-500 w-32">Total</th><th className="py-2 w-10"></th></tr></thead>
              <tbody>{fields.map((field, index) => (
                <tr key={field.id} className="border-b border-slate-200">
                  <td className="py-3"><select {...register(`items.${index}.product_id`, { required: true })} className="form-select"><option value="">Select</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
                  <td className="py-3"><input type="number" min="1" {...register(`items.${index}.quantity`, { required: true, min: 1 })} className="form-input w-20" /></td>
                  <td className="py-3"><input type="number" step="0.01" {...register(`items.${index}.unit_cost`, { required: true, min: 0 })} className="form-input w-28" /></td>
                  <td className="py-3 text-right font-medium text-slate-900">{formatCurrency((items[index]?.unit_cost || 0) * (items[index]?.quantity || 0))}</td>
                  <td className="py-3"><button type="button" onClick={() => remove(index)} className="text-red-600 hover:text-red-300"><TrashIcon className="h-5 w-5" /></button></td>
                </tr>
              ))}</tbody>
            </table>
          )}
          <div className="mt-6 pt-6 border-t border-slate-200 text-right"><span className="text-lg font-bold text-slate-900">Total: {formatCurrency(total)}</span></div>
        </div>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate('/purchasing')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">{submitting ? 'Creating...' : 'Create PO'}</button>
        </div>
      </form>
    </div>
  );
}
