import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCartIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  EyeIcon,
  ChartBarIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

const statusColors = {
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500' },
  confirmed: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
  processing: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
  picking: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500' },
  packed: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500' },
  shipped: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500' },
  delivered: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' },
  cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' },
  failed: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' }
};

const CHART_COLORS = ['#FBBF24', '#3B82F6', '#F97316', '#A855F7', '#6366F1', '#06B6D4', '#10B981', '#EF4444'];

function GlassCard({ children, className = '' }) {
  return (
    <div className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl ${className}`}>
      {children}
    </div>
  );
}

export default function OrderDashboard() {
  const [loading, setLoading] = useState(true);
  const [orderVisibility, setOrderVisibility] = useState(null);
  const [orderPipeline, setOrderPipeline] = useState(null);
  const [duplicateAlerts, setDuplicateAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [visibilityRes, pipelineRes, duplicatesRes] = await Promise.all([
        api.get('/dashboard/order-visibility'),
        api.get('/dashboard/order-pipeline?period=7days'),
        api.get('/dashboard/duplicate-alerts')
      ]);

      setOrderVisibility(visibilityRes.data);
      setOrderPipeline(pipelineRes.data);
      setDuplicateAlerts(duplicatesRes.data);
    } catch (error) {
      toast.error('Failed to load order dashboard');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto"></div>
          <p className="text-white/70 mt-4">Loading order dashboard...</p>
        </div>
      </div>
    );
  }

  const { statusCounts, todaySummary, attentionRequired, recentActivity } = orderVisibility || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <EyeIcon className="h-7 w-7 text-purple-400" />
            Order Visibility Dashboard
          </h1>
          <p className="text-white/60 mt-1">Real-time order status tracking and management</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/orders/create" className="btn-primary">
            New Order
          </Link>
        </div>
      </div>

      {/* Today's Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/20 rounded-xl">
              <ClockIcon className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Pending</p>
              <p className="text-2xl font-bold text-white">{todaySummary?.pending || 0}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <ArrowPathIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">In Progress</p>
              <p className="text-2xl font-bold text-white">{todaySummary?.in_progress || 0}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 rounded-xl">
              <TruckIcon className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Dispatched</p>
              <p className="text-2xl font-bold text-white">{todaySummary?.dispatched || 0}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <CheckCircleIcon className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Delivered</p>
              <p className="text-2xl font-bold text-white">{todaySummary?.delivered || 0}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Status Distribution */}
        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-purple-400" />
            Order Status Distribution (Last 30 Days)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {statusCounts?.map((status, index) => (
              <div
                key={status.status}
                className={`p-3 rounded-xl ${statusColors[status.status]?.bg || 'bg-gray-500/20'}`}
              >
                <p className={`text-sm font-medium ${statusColors[status.status]?.text || 'text-gray-400'}`}>
                  {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                </p>
                <p className="text-xl font-bold text-white">{status.count}</p>
                <p className="text-xs text-white/50">{formatCurrency(status.total_value)}</p>
              </div>
            ))}
          </div>
          
          {/* Status Flow Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="status" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Bar dataKey="count" fill="#A855F7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Attention Required */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BellAlertIcon className="h-5 w-5 text-red-400" />
            Attention Required
            {attentionRequired?.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {attentionRequired.length}
              </span>
            )}
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {attentionRequired?.length > 0 ? (
              attentionRequired.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="block p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{order.order_number}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[order.status]?.bg} ${statusColors[order.status]?.text}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-white/60 mt-1">{order.client_name}</p>
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <ExclamationTriangleIcon className="h-3 w-3" />
                    {order.attention_reason === 'pending_too_long' && 'Pending > 24 hours'}
                    {order.attention_reason === 'delivery_failed' && 'Delivery failed'}
                    {order.attention_reason === 'overdue' && 'Past required date'}
                  </p>
                </Link>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-2" />
                <p className="text-white/60">All orders are on track!</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Pipeline Flow */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Order Flow (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={orderPipeline?.dailyFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.5)"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-PH', { weekday: 'short' })}
                />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Area type="monotone" dataKey="created" stackId="1" stroke="#FBBF24" fill="#FBBF24" fillOpacity={0.3} name="Created" />
                <Area type="monotone" dataKey="confirmed" stackId="2" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Confirmed" />
                <Area type="monotone" dataKey="delivered" stackId="3" stroke="#10B981" fill="#10B981" fillOpacity={0.3} name="Delivered" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Recent Activity */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Order Activity</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentActivity?.slice(0, 10).map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${statusColors[activity.status]?.bg?.replace('/20', '')}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    <span className="font-medium">{activity.order_number}</span>
                    {' → '}
                    <span className={statusColors[activity.status]?.text}>{activity.status}</span>
                  </p>
                  <p className="text-xs text-white/50 truncate">{activity.client_name}</p>
                </div>
                <p className="text-xs text-white/40">
                  {new Date(activity.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Duplicate Order Alerts */}
      {duplicateAlerts?.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            Recent Duplicate Order Checks
          </h3>
          <div className="overflow-x-auto">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Confirmed By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {duplicateAlerts.slice(0, 10).map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <Link to={`/orders/${alert.order_id}`} className="text-purple-400 hover:text-purple-300">
                        {alert.order_number}
                      </Link>
                    </td>
                    <td>{alert.client_name}</td>
                    <td className="font-medium text-green-400">{formatCurrency(alert.total_amount)}</td>
                    <td>
                      <span className={`badge ${statusColors[alert.status]?.bg} ${statusColors[alert.status]?.text}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td>{alert.is_confirmed ? alert.confirmed_by_name : <span className="text-white/40">Auto-created</span>}</td>
                    <td className="text-white/60">{new Date(alert.created_at).toLocaleDateString('en-PH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Processing Time Stats */}
      {orderPipeline?.processingTimes && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-5">
            <p className="text-white/60 text-sm">Avg. Confirmation Time</p>
            <p className="text-2xl font-bold text-white mt-1">
              {Math.round(orderPipeline.processingTimes.avg_confirmation_hours || 0)}h
            </p>
            <p className="text-xs text-white/40">From order to confirmation</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-white/60 text-sm">Avg. Ship Time</p>
            <p className="text-2xl font-bold text-white mt-1">
              {Math.round(orderPipeline.processingTimes.avg_ship_hours || 0)}h
            </p>
            <p className="text-xs text-white/40">From order to dispatch</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-white/60 text-sm">Avg. Delivery Time</p>
            <p className="text-2xl font-bold text-white mt-1">
              {Math.round(orderPipeline.processingTimes.avg_delivery_hours || 0)}h
            </p>
            <p className="text-xs text-white/40">From order to delivery</p>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
