import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
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

const statusIcons = {
  draft: ClockIcon,
  approved: CheckCircleIcon,
  executing: ArrowPathIcon,
  completed: CheckCircleIcon,
  cancelled: XCircleIcon
};

export default function DistributionPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchPlans();
  }, [statusFilter]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await api.get(`/distribution/plans?${params}`);
      setPlans(response.data.plans);
    } catch (error) {
      toast.error('Failed to load distribution plans');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans.filter(plan => 
    plan.plan_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Distribution Plans</h1>
          <p className="text-white/60 mt-1">Dynamic Centralized Distribution System</p>
        </div>
        <Link
          to="/distribution/create"
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Plan
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <input
              type="text"
              placeholder="Search plans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-white/40" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="executing">Executing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button
            onClick={fetchPlans}
            className="px-4 py-2 text-white/60 hover:text-white"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner h-12 w-12"></div>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="h-16 w-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClockIcon className="h-8 w-8 text-white/40" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No distribution plans found</h3>
          <p className="text-white/60 mb-4">Get started by creating your first distribution plan</p>
          <Link
            to="/distribution/create"
            className="btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Plan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => {
            const StatusIcon = statusIcons[plan.status] || ClockIcon;
            return (
              <Link
                key={plan.id}
                to={`/distribution/${plan.id}`}
                className="glass-card p-6 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[plan.status]}`}>
                    <StatusIcon className="h-3.5 w-3.5 mr-1" />
                    {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                  </span>
                  <span className="text-sm text-white/60">
                    {new Date(plan.plan_date).toLocaleDateString('en-PH')}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">{plan.plan_number}</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Total Orders</span>
                    <span className="font-medium text-white">{plan.total_orders || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Total Value</span>
                    <span className="font-medium text-white">{formatCurrency(plan.total_value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Warehouse</span>
                    <span className="font-medium text-white">{plan.warehouse_name || 'All'}</span>
                  </div>
                </div>

                {plan.status === 'approved' && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <button className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                      <PlayIcon className="h-4 w-4 mr-2" />
                      Execute Plan
                    </button>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
