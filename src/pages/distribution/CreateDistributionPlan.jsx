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
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Distribution Plan</h1>
          <p className="text-gray-600 mt-1">Optimize and allocate orders for distribution</p>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center">
          <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <span className="ml-2 font-medium">Plan Details</span>
          </div>
          <div className={`flex-1 h-0.5 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span className="ml-2 font-medium">Select Orders</span>
          </div>
          <div className={`flex-1 h-0.5 mx-4 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              3
            </div>
            <span className="ml-2 font-medium">Review & Create</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Plan Details */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Plan Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Date
                </label>
                <input
                  type="date"
                  {...register('plan_date', { required: 'Plan date is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.plan_date && (
                  <p className="mt-1 text-sm text-red-500">{errors.plan_date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warehouse (Optional)
                </label>
                <select
                  {...register('warehouse_id')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  {...register('priority')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes or special instructions..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next: Select Orders
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Orders */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Select Orders</h2>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={selectAllOrders}
                  className="text-sm text-blue-600 hover:text-blue-800"
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

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">Selected: {selectedOrders.length} orders</span>
                <span className="text-blue-700 font-medium">Total Value: {formatCurrency(totalValue)}</span>
              </div>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CubeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
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
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`h-5 w-5 rounded border flex items-center justify-center mr-3 ${
                          selectedOrders.includes(order.id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        }`}>
                          {selectedOrders.includes(order.id) && (
                            <CheckCircleIcon className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{order.order_number}</p>
                          <p className="text-sm text-gray-500">{order.client_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatCurrency(order.total_amount)}</p>
                        <p className="text-sm text-gray-500">{order.total_items} items</p>
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
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={selectedOrders.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Review & Create</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <CubeIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-900">Orders</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{selectedOrders.length}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <TruckIcon className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-900">Total Value</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <SparklesIcon className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="text-sm font-medium text-purple-900">Status</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">Ready</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Selected Orders</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingOrders
                  .filter(o => selectedOrders.includes(o.id))
                  .map(order => (
                    <div key={order.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium text-gray-900">{order.order_number}</span>
                      <span className="text-sm text-gray-600">{order.client_name}</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(order.total_amount)}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
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
