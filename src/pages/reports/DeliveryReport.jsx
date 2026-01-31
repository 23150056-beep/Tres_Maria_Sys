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

  if (loading && !data) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

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
          <h1 className="text-2xl font-bold text-gray-900">Delivery Performance Report</h1>
          <p className="text-gray-500">Track delivery efficiency and driver performance</p>
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
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-gray-400" />
            <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
            <span className="text-gray-400">to</span>
            <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
          </div>
          <select value={filters.driver_id} onChange={(e) => setFilters({ ...filters, driver_id: e.target.value })} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
            <option value="">All Drivers</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <TruckIcon className="h-6 w-6 text-blue-600 mb-2" />
          <p className="text-sm text-gray-500">Total Deliveries</p>
          <p className="text-2xl font-bold">{formatNumber(data?.summary?.total)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <CheckCircleIcon className="h-6 w-6 text-green-600 mb-2" />
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{formatNumber(data?.summary?.delivered)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <XCircleIcon className="h-6 w-6 text-red-600 mb-2" />
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-2xl font-bold text-red-600">{formatNumber(data?.summary?.failed)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Success Rate</p>
          <p className="text-2xl font-bold text-blue-600">{formatPercent(data?.summary?.successRate)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <ClockIcon className="h-6 w-6 text-purple-600 mb-2" />
          <p className="text-sm text-gray-500">Avg. Time</p>
          <p className="text-2xl font-bold">{data?.summary?.avgDeliveryTime || '0'} min</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Delivery Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {statusData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Deliveries */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Delivery Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.dailyDeliveries || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} />
              <YAxis />
              <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString('en-PH')} />
              <Legend />
              <Bar dataKey="delivered" name="Delivered" fill="#10B981" />
              <Bar dataKey="failed" name="Failed" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Driver Performance */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Driver Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase">Delivered</th>
                <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase">Failed</th>
                <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Time</th>
                <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(data?.driverPerformance || []).map((driver, idx) => {
                const successRate = driver.total > 0 ? (driver.delivered / driver.total) * 100 : 0;
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-4 font-medium">{driver.name}</td>
                    <td className="py-4 text-right">{formatNumber(driver.total)}</td>
                    <td className="py-4 text-right text-green-600">{formatNumber(driver.delivered)}</td>
                    <td className="py-4 text-right text-red-600">{formatNumber(driver.failed)}</td>
                    <td className="py-4 text-right font-medium">{formatPercent(successRate)}</td>
                    <td className="py-4 text-right">{driver.avgTime || 0} min</td>
                    <td className="py-4">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${successRate >= 90 ? 'bg-green-500' : successRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(successRate, 100)}%` }}></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!data?.driverPerformance || data.driverPerformance.length === 0) && (
                <tr><td colSpan="7" className="py-8 text-center text-gray-500">No driver data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delivery by Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center"><MapPinIcon className="h-5 w-5 mr-2 text-blue-600" />Deliveries by Area</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.byArea || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="area" width={100} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" name="Deliveries" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Delivery Time Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data?.timeTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} />
              <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
              <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString('en-PH')} />
              <Line type="monotone" dataKey="avgTime" stroke="#8B5CF6" name="Avg. Time (min)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Failed Deliveries */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold flex items-center"><XCircleIcon className="h-5 w-5 mr-2 text-red-600" />Failed Delivery Reasons</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(data?.failureReasons || []).map((reason, idx) => (
              <div key={idx} className="p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{formatNumber(reason.count)}</p>
                <p className="text-sm text-gray-600">{reason.reason}</p>
              </div>
            ))}
            {(!data?.failureReasons || data.failureReasons.length === 0) && (
              <p className="col-span-full text-center text-gray-500 py-4">No failed deliveries in this period</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
