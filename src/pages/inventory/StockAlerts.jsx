import { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

const alertTypeColors = {
  low_stock: { bg: 'bg-amber-50', text: 'text-amber-600', icon: ExclamationTriangleIcon },
  out_of_stock: { bg: 'bg-red-50', text: 'text-red-600', icon: ExclamationTriangleIcon },
  expiring: { bg: 'bg-orange-50', text: 'text-orange-600', icon: ClockIcon },
  expired: { bg: 'bg-red-50', text: 'text-red-600', icon: ExclamationTriangleIcon }
};

export default function StockAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, typeFilter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      
      const response = await api.get(`/inventory/alerts?${params}`);
      setAlerts(response.data.alerts || []);
    } catch (error) {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await api.put(`/inventory/alerts/${alertId}`, { status: 'resolved' });
      toast.success('Alert marked as resolved');
      fetchAlerts();
    } catch (error) {
      toast.error('Failed to resolve alert');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Stock Alerts</h1>
        <p className="text-slate-500 mt-1">Monitor low stock, expiring items, and inventory issues</p>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="form-input"
          >
            <option value="">All Types</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="expiring">Expiring</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner"></div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircleIcon className="h-12 w-12 mx-auto mb-4 text-emerald-600" />
            <p className="text-slate-500">No active alerts</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {alerts.map((alert) => {
              const typeStyle = alertTypeColors[alert.alert_type] || alertTypeColors.low_stock;
              const Icon = typeStyle.icon;
              return (
                <div key={alert.id} className="p-6 hover:bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <div className={`p-2 rounded-lg ${typeStyle.bg}`}>
                        <Icon className={`h-5 w-5 ${typeStyle.text}`} />
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-slate-900">{alert.product_name}</h3>
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
                            {alert.alert_type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{alert.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span>Warehouse: {alert.warehouse_name}</span>
                          <span>Current: {alert.current_quantity}</span>
                          <span>Threshold: {alert.threshold_quantity}</span>
                        </div>
                      </div>
                    </div>
                    {alert.status === 'active' && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-300"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
