import { useState, useEffect } from 'react';
import { DocumentArrowDownIcon, CubeIcon, ExclamationTriangleIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function InventoryReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => { fetchFilters(); }, []);
  useEffect(() => { fetchReport(); }, [warehouseFilter, categoryFilter]);

  const fetchFilters = async () => {
    try {
      const [whRes, catRes] = await Promise.all([api.get('/warehouse'), api.get('/categories')]);
      setWarehouses(whRes.data.warehouses || []);
      setCategories(catRes.data.categories || []);
    } catch (e) { console.error(e); }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (warehouseFilter) params.append('warehouse_id', warehouseFilter);
      if (categoryFilter) params.append('category_id', categoryFilter);
      const res = await api.get(`/reports/inventory?${params}`);
      setData(res.data);
    } catch (e) { toast.error('Failed to load inventory report'); }
    finally { setLoading(false); }
  };

  const exportReport = async (format) => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ reportType: 'inventory' });
      if (warehouseFilter) params.append('warehouse_id', warehouseFilter);
      const res = await api.get(`/reports/export/${format}/inventory?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory-report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (e) { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v || 0);
  const formatNumber = (n) => new Intl.NumberFormat('en-PH').format(n || 0);

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899'];

  if (loading && !data) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  // Stock status data for pie chart
  const stockStatusData = [
    { name: 'Healthy', value: data?.summary?.healthyStock || 0 },
    { name: 'Low Stock', value: data?.summary?.lowStock || 0 },
    { name: 'Out of Stock', value: data?.summary?.outOfStock || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Report</h1>
          <p className="text-gray-500">Stock levels, valuation, and movement analysis</p>
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
          <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
            <option value="">All Warehouses</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <CubeIcon className="h-6 w-6 text-blue-600 mb-2" />
          <p className="text-sm text-gray-500">Total SKUs</p>
          <p className="text-2xl font-bold">{formatNumber(data?.summary?.totalProducts)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Total Units</p>
          <p className="text-2xl font-bold">{formatNumber(data?.summary?.totalUnits)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(data?.summary?.totalValue)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mb-2" />
          <p className="text-sm text-gray-500">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-600">{formatNumber(data?.summary?.lowStock)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mb-2" />
          <p className="text-sm text-gray-500">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{formatNumber(data?.summary?.outOfStock)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Stock Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={stockStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                <Cell fill="#10B981" />
                <Cell fill="#F59E0B" />
                <Cell fill="#EF4444" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Value by Category */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Inventory Value by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.byCategory || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stock by Warehouse */}
      {!warehouseFilter && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Stock Distribution by Warehouse</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.byWarehouse || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" tickFormatter={(v) => formatNumber(v)} />
              <YAxis yAxisId="right" orientation="right" stroke="#10B981" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v, name) => name === 'value' ? formatCurrency(v) : formatNumber(v)} />
              <Legend />
              <Bar yAxisId="left" dataKey="units" fill="#3B82F6" name="Units" />
              <Bar yAxisId="right" dataKey="value" fill="#10B981" name="Value" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Low Stock Items */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold flex items-center"><ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-600" />Low Stock Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reorder Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(data?.lowStockItems || []).slice(0, 15).map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{item.product}</td>
                  <td className="px-6 py-4 text-gray-500">{item.category || '-'}</td>
                  <td className="px-6 py-4 text-gray-500">{item.warehouse || '-'}</td>
                  <td className={`px-6 py-4 text-right font-medium ${item.quantity === 0 ? 'text-red-600' : 'text-yellow-600'}`}>{formatNumber(item.quantity)}</td>
                  <td className="px-6 py-4 text-right">{formatNumber(item.reorder_level)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.quantity === 0 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {item.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                    </span>
                  </td>
                </tr>
              ))}
              {(!data?.lowStockItems || data.lowStockItems.length === 0) && (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No low stock items</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Movement Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center"><ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-green-600" />Stock In (This Month)</h3>
          <div className="space-y-3">
            {(data?.recentMovement?.stockIn || []).slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium text-sm">{item.product}</span>
                <span className="text-green-600 font-semibold">+{formatNumber(item.quantity)}</span>
              </div>
            ))}
            {(!data?.recentMovement?.stockIn || data.recentMovement.stockIn.length === 0) && (
              <p className="text-center text-gray-500 py-4">No recent stock in</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center"><ArrowTrendingDownIcon className="h-5 w-5 mr-2 text-red-600" />Stock Out (This Month)</h3>
          <div className="space-y-3">
            {(data?.recentMovement?.stockOut || []).slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="font-medium text-sm">{item.product}</span>
                <span className="text-red-600 font-semibold">-{formatNumber(item.quantity)}</span>
              </div>
            ))}
            {(!data?.recentMovement?.stockOut || data.recentMovement.stockOut.length === 0) && (
              <p className="text-center text-gray-500 py-4">No recent stock out</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
