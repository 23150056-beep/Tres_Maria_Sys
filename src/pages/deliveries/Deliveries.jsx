import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon, TruckIcon, MapPinIcon, ClockIcon, CheckCircleIcon, XCircleIcon, FunnelIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  useEffect(() => { fetchDeliveries(); }, [pagination.page, statusFilter]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pagination.page, limit: pagination.limit });
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      const res = await api.get(`/deliveries?${params}`);
      setDeliveries(res.data.deliveries || []);
      setPagination(prev => ({ ...prev, total: res.data.total || 0 }));
    } catch (e) { toast.error('Failed to load deliveries'); }
    finally { setLoading(false); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '-';
  const formatCurrency = (v) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v || 0);

  const statusConfig = {
    pending: { color: 'bg-slate-100 text-slate-600', icon: ClockIcon },
    assigned: { color: 'bg-blue-50 text-blue-700', icon: TruckIcon },
    'in-transit': { color: 'bg-amber-50 text-amber-700', icon: TruckIcon },
    delivered: { color: 'bg-emerald-50 text-emerald-700', icon: CheckCircleIcon },
    failed: { color: 'bg-red-50 text-red-700', icon: XCircleIcon },
    returned: { color: 'bg-orange-50 text-orange-700', icon: XCircleIcon },
  };

  const statuses = ['pending', 'assigned', 'in-transit', 'delivered', 'failed', 'returned'];
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchDeliveries();
  };

  if (loading && deliveries.length === 0) return <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Deliveries</h1>
        <div className="flex gap-2">
          <Link to="/deliveries/routes" className="btn-secondary inline-flex items-center">
            <MapPinIcon className="h-5 w-5 mr-2" />Route Planning
          </Link>
          <Link to="/deliveries/new" className="btn-primary inline-flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />New Delivery
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Today\'s Deliveries', value: deliveries.filter(d => new Date(d.scheduled_date).toDateString() === new Date().toDateString()).length, color: 'text-blue-600' },
          { label: 'In Transit', value: deliveries.filter(d => d.status === 'in-transit').length, color: 'text-amber-600' },
          { label: 'Delivered', value: deliveries.filter(d => d.status === 'delivered').length, color: 'text-emerald-600' },
          { label: 'Failed', value: deliveries.filter(d => d.status === 'failed').length, color: 'text-red-600' },
        ].map((stat, idx) => (
          <div key={idx} className="glass-card p-4">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input type="text" placeholder="Search delivery# or client..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-input pl-10" />
        </form>
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-slate-400" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="form-input">
            <option value="">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="glass-card overflow-hidden">
        <table className="glass-table">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Delivery #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Destination</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Scheduled</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Driver</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {deliveries.length === 0 ? (
              <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-500">No deliveries found</td></tr>
            ) : deliveries.map(delivery => {
              const config = statusConfig[delivery.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <tr key={delivery.id}>
                  <td className="px-6 py-4">
                    <Link to={`/deliveries/${delivery.id}`} className="text-primary-600 hover:text-primary-700 font-medium">{delivery.delivery_number || `DEL-${String(delivery.id).padStart(6, '0')}`}</Link>
                  </td>
                  <td className="px-6 py-4">
                    {delivery.order ? <Link to={`/orders/${delivery.order_id}`} className="text-primary-600 hover:text-primary-700">{delivery.order.order_number}</Link> : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-900">{delivery.order?.client?.business_name || '-'}</p>
                      <p className="text-sm text-slate-500">{delivery.order?.client?.contact_person || ''}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 text-slate-400 mr-1" />
                      <span className="text-sm text-slate-500 truncate max-w-xs">{delivery.delivery_address || delivery.order?.client?.address || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-slate-900">{formatDate(delivery.scheduled_date)}</p>
                      <p className="text-xs text-slate-500">{formatTime(delivery.scheduled_date)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-900">{delivery.driver?.name || delivery.driver_name || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                      <StatusIcon className="h-3.5 w-3.5 mr-1" />
                      {delivery.status?.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(delivery.order?.total_amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center">
            <p className="text-sm text-slate-500">Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1} className="btn-secondary px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
              <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= totalPages} className="btn-secondary px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
