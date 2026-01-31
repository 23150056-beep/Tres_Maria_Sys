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
  draft: 'bg-gray-500/20 text-gray-400',
  approved: 'bg-blue-500/20 text-blue-400',
  executing: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400'
};

const allocationStatusColors = {
  pending: 'bg-gray-500/20 text-gray-400',
  allocated: 'bg-blue-500/20 text-blue-400',
  picked: 'bg-yellow-500/20 text-yellow-400',
  shipped: 'bg-purple-500/20 text-purple-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400'
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
        <div className="spinner h-12 w-12"></div>
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
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{plan.plan_number}</h1>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusColors[plan.status]}`}>
                {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
              </span>
            </div>
            <p className="text-white/60 mt-1">
              Created on {new Date(plan.created_at).toLocaleDateString('en-PH')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {plan.status === 'draft' && (
            <>
              <button
                onClick={handleApprove}
                className="btn-primary"
              >
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Approve
              </button>
              <button
                onClick={handleCancel}
                className="btn-secondary"
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
        <div className="glass-card p-6">
          <div className="flex items-center">
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <CubeIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white/60">Total Orders</p>
              <p className="text-2xl font-bold text-white">{plan.total_orders || 0}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center">
            <div className="bg-green-500/20 p-3 rounded-lg">
              <TruckIcon className="h-6 w-6 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white/60">Total Value</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(plan.total_value)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center">
            <div className="bg-purple-500/20 p-3 rounded-lg">
              <MapPinIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white/60">Warehouse</p>
              <p className="text-xl font-bold text-white">{plan.warehouse_name || 'All'}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center">
            <div className="bg-yellow-500/20 p-3 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white/60">Plan Date</p>
              <p className="text-xl font-bold text-white">
                {new Date(plan.plan_date).toLocaleDateString('en-PH')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {plan.notes && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Notes</h3>
          <p className="text-white/60">{plan.notes}</p>
        </div>
      )}

      {/* Allocations */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Allocations</h3>
          <p className="text-sm text-white/60 mt-1">Order allocations for this distribution plan</p>
        </div>

        {allocations.length === 0 ? (
          <div className="p-12 text-center text-white/60">
            <CubeIcon className="h-12 w-12 mx-auto mb-4 text-white/40" />
            <p>No allocations yet. Execute the plan to create allocations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="glass-table">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Allocated At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {allocations.map((allocation) => (
                  <tr key={allocation.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-white">{allocation.order_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-white/60">{allocation.client_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-white/60">{allocation.warehouse_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-white/60">{allocation.priority_score?.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${allocationStatusColors[allocation.status]}`}>
                        {allocation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
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
