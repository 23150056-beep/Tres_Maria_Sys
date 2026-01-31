import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  PlayIcon,
  CheckCircleIcon,
  XMarkIcon,
  TruckIcon,
  CubeIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-blue-100 text-blue-700',
  executing: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700'
};

const allocationStatusColors = {
  pending: 'bg-gray-100 text-gray-700',
  allocated: 'bg-blue-100 text-blue-700',
  picked: 'bg-yellow-100 text-yellow-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700'
};

export default function DistributionPlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    fetchPlanDetail();
  }, [id]);

  const fetchPlanDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/distribution/plans/${id}`);
      setPlan(response.data.plan);
      setAllocations(response.data.allocations || []);
    } catch (error) {
      toast.error('Failed to load plan details');
      navigate('/distribution');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!window.confirm('Are you sure you want to execute this distribution plan?')) {
      return;
    }

    setExecuting(true);
    try {
      await api.post(`/distribution/plans/${id}/execute`);
      toast.success('Distribution plan execution started');
      fetchPlanDetail();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to execute plan');
    } finally {
      setExecuting(false);
    }
  };

  const handleApprove = async () => {
    try {
      await api.put(`/distribution/plans/${id}`, { status: 'approved' });
      toast.success('Plan approved');
      fetchPlanDetail();
    } catch (error) {
      toast.error('Failed to approve plan');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this plan?')) {
      return;
    }

    try {
      await api.put(`/distribution/plans/${id}`, { status: 'cancelled' });
      toast.success('Plan cancelled');
      fetchPlanDetail();
    } catch (error) {
      toast.error('Failed to cancel plan');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/distribution')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{plan.plan_number}</h1>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusColors[plan.status]}`}>
                {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
              </span>
            </div>
            <p className="text-gray-600 mt-1">
              Created on {new Date(plan.created_at).toLocaleDateString('en-PH')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {plan.status === 'draft' && (
            <>
              <button
                onClick={handleApprove}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Approve
              </button>
              <button
                onClick={handleCancel}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <XMarkIcon className="h-5 w-5 mr-2" />
                Cancel
              </button>
            </>
          )}
          {plan.status === 'approved' && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <PlayIcon className="h-5 w-5 mr-2" />
              {executing ? 'Executing...' : 'Execute Plan'}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <CubeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{plan.total_orders || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <TruckIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(plan.total_value)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <MapPinIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Warehouse</p>
              <p className="text-xl font-bold text-gray-900">{plan.warehouse_name || 'All'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Plan Date</p>
              <p className="text-xl font-bold text-gray-900">
                {new Date(plan.plan_date).toLocaleDateString('en-PH')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {plan.notes && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
          <p className="text-gray-600">{plan.notes}</p>
        </div>
      )}

      {/* Allocations */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Allocations</h3>
          <p className="text-sm text-gray-500 mt-1">Order allocations for this distribution plan</p>
        </div>

        {allocations.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CubeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No allocations yet. Execute the plan to create allocations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allocated At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allocations.map((allocation) => (
                  <tr key={allocation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{allocation.order_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{allocation.client_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{allocation.warehouse_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{allocation.priority_score?.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${allocationStatusColors[allocation.status]}`}>
                        {allocation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {allocation.allocated_at 
                        ? new Date(allocation.allocated_at).toLocaleString('en-PH')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
