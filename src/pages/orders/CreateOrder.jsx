import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { ArrowLeftIcon, PlusIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function CreateOrder() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      client_id: '',
      payment_terms: 'net_30',
      notes: '',
      items: []
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    fetchClients();
    fetchProducts();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients?limit=100');
      setClients(response.data.clients || []);
    } catch (error) {
      toast.error('Failed to load clients');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products?limit=500');
      setProducts(response.data.products || []);
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === parseInt(clientId));
    setSelectedClient(client);
    setValue('client_id', clientId);
  };

  const addProduct = (product) => {
    const existingIndex = fields.findIndex(f => f.product_id === product.id);
    if (existingIndex >= 0) {
      const currentQty = watch(`items.${existingIndex}.quantity`);
      setValue(`items.${existingIndex}.quantity`, currentQty + 1);
    } else {
      const price = selectedClient?.pricing_tier_id 
        ? (product.tier_prices?.[selectedClient.pricing_tier_id] || product.unit_price)
        : product.unit_price;
      
      append({
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        unit_price: price,
        quantity: 1
      });
    }
    setProductSearch('');
    setShowProductSearch(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const items = watch('items');
  const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const tax = subtotal * 0.12; // 12% VAT
  const total = subtotal + tax;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0);
  };

  const onSubmit = async (data) => {
    if (data.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        client_id: parseInt(data.client_id),
        payment_terms: data.payment_terms,
        notes: data.notes,
        items: data.items.map(item => ({
          product_id: item.product_id,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price)
        }))
      };

      const response = await api.post('/orders', payload);
      toast.success('Order created successfully');
      navigate(`/orders/${response.data.order.id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/orders')} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Order</h1>
          <p className="text-slate-500 mt-1">Create a new sales order</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Client Selection */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Customer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Client *</label>
              <select
                {...register('client_id', { required: 'Client is required' })}
                onChange={(e) => handleClientChange(e.target.value)}
                className="form-select"
              >
                <option value="">Select a client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.business_name}</option>
                ))}
              </select>
              {errors.client_id && <p className="mt-1 text-sm text-red-600">{errors.client_id.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Payment Terms</label>
              <select
                {...register('payment_terms')}
                className="form-select"
              >
                <option value="cod">Cash on Delivery</option>
                <option value="net_7">Net 7</option>
                <option value="net_15">Net 15</option>
                <option value="net_30">Net 30</option>
                <option value="net_60">Net 60</option>
              </select>
            </div>

            {selectedClient && (
              <div className="md:col-span-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Code:</span>
                    <p className="font-medium text-slate-900">{selectedClient.code}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Pricing Tier:</span>
                    <p className="font-medium text-slate-900">{selectedClient.pricing_tier_name || 'Standard'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Credit Limit:</span>
                    <p className="font-medium text-slate-900">{formatCurrency(selectedClient.credit_limit)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Balance:</span>
                    <p className="font-medium text-slate-900">{formatCurrency(selectedClient.current_balance)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Order Items</h2>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProductSearch(!showProductSearch)}
                className="btn-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Product
              </button>

              {showProductSearch && (
                <div className="absolute right-0 top-full mt-2 w-96 glass-card border border-slate-200 z-50">
                  <div className="p-3 border-b border-slate-200">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="form-input pl-10"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredProducts.slice(0, 20).map(product => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProduct(product)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.sku}</p>
                        </div>
                        <span className="text-sm font-medium text-slate-900">{formatCurrency(product.unit_price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No items added yet. Click "Add Product" to start.
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 text-left text-sm font-medium text-slate-500">Product</th>
                  <th className="py-2 text-left text-sm font-medium text-slate-500 w-24">Qty</th>
                  <th className="py-2 text-left text-sm font-medium text-slate-500 w-32">Price</th>
                  <th className="py-2 text-right text-sm font-medium text-slate-500 w-32">Total</th>
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id} className="border-b border-slate-200">
                    <td className="py-3">
                      <p className="font-medium text-slate-900">{field.product_name}</p>
                      <p className="text-sm text-slate-500">{field.sku}</p>
                    </td>
                    <td className="py-3">
                      <input
                        type="number"
                        min="1"
                        {...register(`items.${index}.quantity`, { required: true, min: 1 })}
                        className="form-input w-20 px-2 py-1"
                      />
                    </td>
                    <td className="py-3">
                      <input
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.unit_price`, { required: true, min: 0 })}
                        className="form-input w-28 px-2 py-1"
                      />
                    </td>
                    <td className="py-3 text-right font-medium text-slate-900">
                      {formatCurrency(items[index]?.unit_price * items[index]?.quantity)}
                    </td>
                    <td className="py-3">
                      <button type="button" onClick={() => remove(index)} className="text-red-600 hover:text-red-300">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Order Summary */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="w-64 ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">VAT (12%)</span>
                <span className="font-medium text-slate-900">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2 text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="glass-card p-6">
          <label className="block text-sm font-medium text-slate-600 mb-1">Order Notes</label>
          <textarea
            {...register('notes')}
            rows={3}
            className="form-input"
            placeholder="Add any notes or special instructions..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
