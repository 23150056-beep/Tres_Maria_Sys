import { useState, useEffect } from 'react';
import { DocumentArrowDownIcon, TruckIcon, CheckCircleIcon, XCircleIcon, ClockIcon, CalendarIcon, FunnelIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function DeliveryReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    driver_id: ''
  });
  const [drivers, setDrivers] = useState([]);

  useEffect(() => { fetchFilters(); }, []);
  useEffect(() => { fetchReport(); }, [filters]);

  const fetchFilters = async () => {
    try {
      // Mock drivers for now
      setDrivers([
        { id: 1, name: 'Juan Dela Cruz' },
        { id: 2, name: 'Pedro Santos' },
        { id: 3, name: 'Maria Garcia' },
      ]);
    } catch (e) { console.error(e); }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const res = await api.get(`/reports/delivery-performance?${params}`);
      setData(res.data);
    } catch (e) { toast.error('Failed to load delivery report'); }
    finally { setLoading(false); }
  };

  const exportReport = async (format) => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ ...filters, reportType: 'delivery' });
      const res = await api.get(`/reports/export/${format}/delivery?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `delivery-report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (e) { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const formatNumber = (n) => new Intl.NumberFormat('en-PH').format(n || 0);
  const formatPercent = (n) => `${(n || 0).toFixed(1)}%`;

  const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'];

  if (loading && !data) return <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div>;

  // Status distribution
  const statusData = [
    { name: 'Delivered', value: data?.summary?.delivered || 0 },
    { name: 'Failed', value: data?.summary?.failed || 0 },
    { name: 'In Transit', value: data?.summary?.inTransit || 0 },
    { name: 'Pending', value: data?.summary?.pending || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Delivery Performance Report</h1>
          <p className="text-white/60">Track delivery efficiency and driver performance</p>
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
          <select value={filters.driver_id} onChange={(e) => setFilters({ ...filters, driver_id: e.target.value })} className="px-3 py-1.5 border border-white/10 rounded-lg text-sm bg-white/5 text-white">
            <option value="">All Drivers</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4">
          <TruckIcon className="h-6 w-6 text-blue-400 mb-2" />
          <p className="text-sm text-white/60">Total Deliveries</p>
          <p className="text-2xl font-bold text-white">{formatNumber(data?.summary?.total)}</p>
        </div>
        <div className="glass-card p-4">
          <CheckCircleIcon className="h-6 w-6 text-green-400 mb-2" />
          <p className="text-sm text-white/60">Completed</p>
          <p className="text-2xl font-bold text-green-400">{formatNumber(data?.summary?.delivered)}</p>
        </div>
        <div className="glass-card p-4">
          <XCircleIcon className="h-6 w-6 text-red-400 mb-2" />
          <p className="text-sm text-white/60">Failed</p>
          <p className="text-2xl font-bold text-red-400">{formatNumber(data?.summary?.failed)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-white/60">Success Rate</p>
          <p className="text-2xl font-bold text-blue-400">{formatPercent(data?.summary?.successRate)}</p>
        </div>
        <div className="glass-card p-4">
          <ClockIcon className="h-6 w-6 text-purple-400 mb-2" />
          <p className="text-sm text-white/60">Avg. Time</p>
          <p className="text-2xl font-bold text-white">{data?.summary?.avgDeliveryTime || '0'} min</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Delivery Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {statusData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 15, 35, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
              <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Deliveries */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Daily Delivery Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.dailyDeliveries || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString('en-PH')} contentStyle={{ backgroundColor: 'rgba(15, 15, 35, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
              <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
              <Bar dataKey="delivered" name="Delivered" fill="#10B981" />
              <Bar dataKey="failed" name="Failed" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Driver Performance */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Driver Performance</h3>
        <div className="overflow-x-auto">
          <table className="glass-table min-w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 text-left text-xs font-medium text-white/60 uppercase">Driver</th>
                <th className="py-3 text-right text-xs font-medium text-white/60 uppercase">Total</th>
                <th className="py-3 text-right text-xs font-medium text-white/60 uppercase">Delivered</th>
                <th className="py-3 text-right text-xs font-medium text-white/60 uppercase">Failed</th>
                <th className="py-3 text-right text-xs font-medium text-white/60 uppercase">Success Rate</th>
                <th className="py-3 text-right text-xs font-medium text-white/60 uppercase">Avg Time</th>
                <th className="py-3 text-left text-xs font-medium text-white/60 uppercase">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(data?.driverPerformance || []).map((driver, idx) => {
                const successRate = driver.total > 0 ? (driver.delivered / driver.total) * 100 : 0;
                return (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="py-4 font-medium text-white">{driver.name}</td>
                    <td className="py-4 text-right text-white">{formatNumber(driver.total)}</td>
                    <td className="py-4 text-right text-green-400">{formatNumber(driver.delivered)}</td>
                    <td className="py-4 text-right text-red-400">{formatNumber(driver.failed)}</td>
                    <td className="py-4 text-right font-medium text-white">{formatPercent(successRate)}</td>
                    <td className="py-4 text-right text-white">{driver.avgTime || 0} min</td>
                    <td className="py-4">
                      <div className="w-24 bg-white/10 rounded-full h-2">
                        <div className={`h-2 rounded-full ${successRate >= 90 ? 'bg-green-500' : successRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(successRate, 100)}%` }}></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!data?.driverPerformance || data.driverPerformance.length === 0) && (
                <tr><td colSpan="7" className="py-8 text-center text-white/60">No driver data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delivery by Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white"><MapPinIcon className="h-5 w-5 mr-2 text-blue-400" />Deliveries by Area</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.byArea || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis type="category" dataKey="area" width={100} tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 15, 35, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="count" fill="#3B82F6" name="Deliveries" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Delivery Time Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data?.timeTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)' }} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString('en-PH')} contentStyle={{ backgroundColor: 'rgba(15, 15, 35, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
              <Line type="monotone" dataKey="avgTime" stroke="#8B5CF6" name="Avg. Time (min)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Failed Deliveries */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold flex items-center text-white"><XCircleIcon className="h-5 w-5 mr-2 text-red-400" />Failed Delivery Reasons</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(data?.failureReasons || []).map((reason, idx) => (
              <div key={idx} className="p-4 bg-red-500/20 rounded-lg">
                <p className="text-2xl font-bold text-red-400">{formatNumber(reason.count)}</p>
                <p className="text-sm text-white/60">{reason.reason}</p>
              </div>
            ))}
            {(!data?.failureReasons || data.failureReasons.length === 0) && (
              <p className="col-span-full text-center text-white/60 py-4">No failed deliveries in this period</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
