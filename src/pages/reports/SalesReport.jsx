import { useState, useEffect } from 'react';
import { DocumentArrowDownIcon, CalendarIcon, ChartBarIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function SalesReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    groupBy: 'day'
  });

  useEffect(() => { fetchReport(); }, [filters]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const res = await api.get(`/reports/sales?${params}`);
      setData(res.data);
    } catch (e) { toast.error('Failed to load sales report'); }
    finally { setLoading(false); }
  };

  const exportReport = async (format) => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ ...filters, reportType: 'sales' });
      const res = await api.get(`/reports/export/${format}/sales?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales-report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (e) { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v || 0);
  const formatNumber = (n) => new Intl.NumberFormat('en-PH').format(n || 0);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  if (loading && !data) return <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales Report</h1>
          <p className="text-white/60">Analyze sales performance and trends</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportReport('excel')} disabled={exporting} className="inline-flex items-center px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-50">
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />Excel
          </button>
          <button onClick={() => exportReport('pdf')} disabled={exporting} className="inline-flex items-center px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <FunnelIcon className="h-5 w-5 text-white/40" />
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-white/40" />
            <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="px-3 py-1.5 border border-white/10 rounded-lg text-sm bg-white/5 text-white" />
            <span className="text-white/40">to</span>
            <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="px-3 py-1.5 border border-white/10 rounded-lg text-sm bg-white/5 text-white" />
          </div>
          <select value={filters.groupBy} onChange={(e) => setFilters({ ...filters, groupBy: e.target.value })} className="px-3 py-1.5 border border-white/10 rounded-lg text-sm bg-white/5 text-white">
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-white/60">Total Sales</p>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(data?.summary?.totalSales)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-white/60">Total Orders</p>
          <p className="text-2xl font-bold text-white">{formatNumber(data?.summary?.totalOrders)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-white/60">Avg Order Value</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(data?.summary?.avgOrderValue)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-white/60">Items Sold</p>
          <p className="text-2xl font-bold text-white">{formatNumber(data?.summary?.totalItems)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white"><ChartBarIcon className="h-5 w-5 mr-2 text-blue-400" />Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data?.dailySales || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(d) => new Date(d).toLocaleDateString('en-PH')} contentStyle={{ backgroundColor: 'rgba(15, 15, 35, 0.95)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: '500' }} labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '4px' }} />
              <Area type="monotone" dataKey="total" stroke="#3B82F6" fill="#93C5FD" name="Sales" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sales by Category */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data?.byCategory || []} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {(data?.byCategory || []).map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: 'rgba(15, 15, 35, 0.95)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: '500' }} labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '4px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products & Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Top Selling Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.topProducts?.slice(0, 10) || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: 'rgba(15, 15, 35, 0.95)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: '500' }} labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '4px' }} />
              <Bar dataKey="total" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Clients */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Top Clients</h3>
          <div className="space-y-3">
            {(data?.topClients || []).slice(0, 10).map((client, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">{idx + 1}</span>
                  <div>
                    <p className="font-medium text-sm text-white">{client.name}</p>
                    <p className="text-xs text-white/60">{client.orders} orders</p>
                  </div>
                </div>
                <span className="font-semibold text-green-400">{formatCurrency(client.total)}</span>
              </div>
            ))}
            {(!data?.topClients || data.topClients.length === 0) && (
              <p className="text-center text-white/60 py-4">No data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
