import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  ArrowLeftIcon,
  SparklesIcon,
  CubeIcon,
  TruckIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function CreateDistributionPlan() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [optimizing, setOptimizing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(1);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      plan_date: new Date().toISOString().split('T')[0],
      warehouse_id: '',
      priority: 'normal',
      notes: ''
    }
  });

  const warehouseId = watch('warehouse_id');

  useEffect(() => {
    fetchWarehouses();
    fetchPendingOrders();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouse');
      setWarehouses(response.data.warehouses);
    } catch (error) {
      toast.error('Failed to load warehouses');
    }
  };

  const fetchPendingOrders = async () => {
    try {
      const response = await api.get('/orders?status=confirmed&status=processing');
      setPendingOrders(response.data.orders || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectAllOrders = () => {
    if (selectedOrders.length === pendingOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(pendingOrders.map(o => o.id));
    }
  };

  const onSubmit = async (data) => {
    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order');
      return;
    }

    setCreating(true);
    try {
      const response = await api.post('/distribution/plans', {
        ...data,
        order_ids: selectedOrders
      });
      
      toast.success('Distribution plan created successfully');
      navigate(`/distribution/${response.data.plan.id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  };

  const handleOptimize = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders to optimize');
      return;
    }

    setOptimizing(true);
    try {
      const response = await api.post('/distribution/plans/optimize', {
        order_ids: selectedOrders,
        warehouse_id: warehouseId || null
      });
      
      toast.success('Optimization complete!');
      // Could display optimization results here
    } catch (error) {
      toast.error('Optimization failed');
    } finally {
      setOptimizing(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(value || 0);
  };

  const totalValue = pendingOrders
    .filter(o => selectedOrders.includes(o.id))
    .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/distribution')}
          className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Distribution Plan</h1>
          <p className="text-white/60 mt-1">Optimize and allocate orders for distribution</p>
        </div>
      </div>

      {/* Steps */}
      <div className="glass-card p-4">
        <div className="flex items-center">
          <div className={`flex items-center ${step >= 1 ? 'text-purple-400' : 'text-white/40'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-purple-600 text-white' : 'bg-white/10'}`}>
              1
            </div>
            <span className="ml-2 font-medium">Plan Details</span>
          </div>
          <div className={`flex-1 h-0.5 mx-4 ${step >= 2 ? 'bg-purple-600' : 'bg-white/10'}`} />
          <div className={`flex items-center ${step >= 2 ? 'text-purple-400' : 'text-white/40'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-purple-600 text-white' : 'bg-white/10'}`}>
              2
            </div>
            <span className="ml-2 font-medium">Select Orders</span>
          </div>
          <div className={`flex-1 h-0.5 mx-4 ${step >= 3 ? 'bg-purple-600' : 'bg-white/10'}`} />
          <div className={`flex items-center ${step >= 3 ? 'text-purple-400' : 'text-white/40'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-purple-600 text-white' : 'bg-white/10'}`}>
              3
            </div>
            <span className="ml-2 font-medium">Review & Create</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Plan Details */}
        {step === 1 && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Plan Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">
                  Plan Date
                </label>
                <input
                  type="date"
                  {...register('plan_date', { required: 'Plan date is required' })}
                  className="form-input"
                />
                {errors.plan_date && (
                  <p className="mt-1 text-sm text-red-400">{errors.plan_date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">
                  Warehouse (Optional)
                </label>
                <select
                  {...register('warehouse_id')}
                  className="form-select"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">
                  Priority
                </label>
                <select
                  {...register('priority')}
                  className="form-select"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white/60 mb-1">
                  Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="form-input"
                  placeholder="Add any notes or special instructions..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-primary"
              >
                Next: Select Orders
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Orders */}
        {step === 2 && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Select Orders</h2>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={selectAllOrders}
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  {selectedOrders.length === pendingOrders.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={handleOptimize}
                  disabled={optimizing || selectedOrders.length === 0}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  {optimizing ? 'Optimizing...' : 'Optimize'}
                </button>
              </div>
            </div>

            <div className="mb-4 p-4 bg-purple-500/20 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-purple-400">Selected: {selectedOrders.length} orders</span>
                <span className="text-purple-400 font-medium">Total Value: {formatCurrency(totalValue)}</span>
              </div>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="text-center py-12 text-white/60">
                <CubeIcon className="h-12 w-12 mx-auto mb-4 text-white/40" />
                <p>No pending orders available for distribution</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pendingOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => toggleOrderSelection(order.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedOrders.includes(order.id)
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`h-5 w-5 rounded border flex items-center justify-center mr-3 ${
                          selectedOrders.includes(order.id)
                            ? 'bg-purple-600 border-purple-600'
                            : 'border-white/20'
                        }`}>
                          {selectedOrders.includes(order.id) && (
                            <CheckCircleIcon className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">{order.order_number}</p>
                          <p className="text-sm text-white/60">{order.client_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-white">{formatCurrency(order.total_amount)}</p>
                        <p className="text-sm text-white/60">{order.total_items} items</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={selectedOrders.length === 0}
                className="btn-primary disabled:opacity-50"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Review & Create</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-500/20 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <CubeIcon className="h-5 w-5 text-blue-400 mr-2" />
                  <span className="text-sm font-medium text-blue-400">Orders</span>
                </div>
                <p className="text-2xl font-bold text-blue-400">{selectedOrders.length}</p>
              </div>
              <div className="bg-green-500/20 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <TruckIcon className="h-5 w-5 text-green-400 mr-2" />
                  <span className="text-sm font-medium text-green-400">Total Value</span>
                </div>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(totalValue)}</p>
              </div>
              <div className="bg-purple-500/20 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <SparklesIcon className="h-5 w-5 text-purple-400 mr-2" />
                  <span className="text-sm font-medium text-purple-400">Status</span>
                </div>
                <p className="text-2xl font-bold text-purple-400">Ready</p>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <h3 className="text-sm font-medium text-white mb-4">Selected Orders</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingOrders
                  .filter(o => selectedOrders.includes(o.id))
                  .map(order => (
                    <div key={order.id} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded">
                      <span className="text-sm font-medium text-white">{order.order_number}</span>
                      <span className="text-sm text-white/60">{order.client_name}</span>
                      <span className="text-sm font-medium text-white">{formatCurrency(order.total_amount)}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-secondary"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Distribution Plan'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
