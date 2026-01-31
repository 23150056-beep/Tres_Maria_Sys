import { useState, useEffect } from 'react';
import { DocumentArrowDownIcon, BanknotesIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, CalendarIcon, FunnelIcon, ReceiptPercentIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, ComposedChart, Line } from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function FinancialReport() {
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
      const res = await api.get(`/reports/financial?${params}`);
      setData(res.data);
    } catch (e) { toast.error('Failed to load financial report'); }
    finally { setLoading(false); }
  };

  const exportReport = async (format) => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ ...filters, reportType: 'financial' });
      const res = await api.get(`/reports/export/${format}/financial?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial-report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (e) { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v || 0);
  const formatNumber = (n) => new Intl.NumberFormat('en-PH').format(n || 0);
  const formatPercent = (n) => `${(n || 0).toFixed(1)}%`;

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (loading && !data) return <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Report</h1>
          <p className="text-white/60">Revenue, expenses, and profitability analysis</p>
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
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-5 text-white">
          <BanknotesIcon className="h-8 w-8 mb-2 opacity-80" />
          <p className="text-sm opacity-80">Total Revenue</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.summary?.totalRevenue)}</p>
          <p className="text-xs mt-1 opacity-70">
            <ArrowTrendingUpIcon className="h-3 w-3 inline mr-1" />
            {formatPercent(data?.summary?.revenueGrowth)} vs prev period
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-sm p-5 text-white">
          <CreditCardIcon className="h-8 w-8 mb-2 opacity-80" />
          <p className="text-sm opacity-80">Total Expenses</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.summary?.totalExpenses)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-5 text-white">
          <ReceiptPercentIcon className="h-8 w-8 mb-2 opacity-80" />
          <p className="text-sm opacity-80">Gross Profit</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.summary?.grossProfit)}</p>
          <p className="text-xs mt-1 opacity-70">Margin: {formatPercent(data?.summary?.grossMargin)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-5 text-white">
          <ArrowTrendingUpIcon className="h-8 w-8 mb-2 opacity-80" />
          <p className="text-sm opacity-80">Net Profit</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.summary?.netProfit)}</p>
          <p className="text-xs mt-1 opacity-70">Margin: {formatPercent(data?.summary?.netMargin)}</p>
        </div>
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Revenue vs Expenses Trend</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data?.trend || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
            <YAxis yAxisId="left" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
            <Tooltip formatter={(v, name) => name === 'Profit Margin' ? `${v}%` : formatCurrency(v)} labelFormatter={(d) => new Date(d).toLocaleDateString('en-PH')} contentStyle={{ backgroundColor: 'rgba(15, 15, 35, 0.95)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: '500' }} labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '4px' }} />
            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
            <Bar yAxisId="left" dataKey="revenue" fill="#10B981" name="Revenue" />
            <Bar yAxisId="left" dataKey="expenses" fill="#EF4444" name="Expenses" />
            <Line yAxisId="right" type="monotone" dataKey="profitMargin" stroke="#8B5CF6" name="Profit Margin" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Source */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Revenue by Source</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data?.revenueBySource || []} dataKey="value" nameKey="source" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {(data?.revenueBySource || []).map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: 'rgba(15, 15, 35, 0.95)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: '500' }} labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '4px' }} />
              <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Expenses Breakdown */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Expense Categories</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.expensesByCategory || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: 'rgba(15, 15, 35, 0.95)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: '500' }} labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '4px' }} />
              <Bar dataKey="amount" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Accounts Receivable & Payable */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
            <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-green-400" />
            Accounts Receivable
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-green-500/20 rounded-lg">
              <span className="text-white/60">Outstanding Amount</span>
              <span className="text-xl font-bold text-green-400">{formatCurrency(data?.receivables?.total)}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white/5 rounded-lg text-center">
                <p className="text-xs text-white/60">Current</p>
                <p className="font-semibold text-green-400">{formatCurrency(data?.receivables?.current)}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg text-center">
                <p className="text-xs text-white/60">30+ Days</p>
                <p className="font-semibold text-yellow-400">{formatCurrency(data?.receivables?.days30)}</p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-lg text-center">
                <p className="text-xs text-white/60">60+ Days</p>
                <p className="font-semibold text-red-400">{formatCurrency(data?.receivables?.days60)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
            <ArrowTrendingDownIcon className="h-5 w-5 mr-2 text-red-400" />
            Accounts Payable
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-red-500/20 rounded-lg">
              <span className="text-white/60">Outstanding Amount</span>
              <span className="text-xl font-bold text-red-400">{formatCurrency(data?.payables?.total)}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white/5 rounded-lg text-center">
                <p className="text-xs text-white/60">Current</p>
                <p className="font-semibold text-white">{formatCurrency(data?.payables?.current)}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg text-center">
                <p className="text-xs text-white/60">30+ Days</p>
                <p className="font-semibold text-yellow-400">{formatCurrency(data?.payables?.days30)}</p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-lg text-center">
                <p className="text-xs text-white/60">60+ Days</p>
                <p className="font-semibold text-red-400">{formatCurrency(data?.payables?.days60)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Cash Flow</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data?.cashFlow || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
            <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
            <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(d) => new Date(d).toLocaleDateString('en-PH')} contentStyle={{ backgroundColor: 'rgba(15, 15, 35, 0.95)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: '500' }} labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '4px' }} />
            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
            <Area type="monotone" dataKey="inflow" stackId="1" stroke="#10B981" fill="#86EFAC" name="Cash In" />
            <Area type="monotone" dataKey="outflow" stackId="2" stroke="#EF4444" fill="#FCA5A5" name="Cash Out" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top Transactions */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Recent Large Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="glass-table min-w-full">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Client/Supplier</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(data?.recentTransactions || []).slice(0, 10).map((tx, idx) => (
                <tr key={idx} className="hover:bg-white/5">
                  <td className="px-6 py-4 text-sm text-white">{new Date(tx.date).toLocaleDateString('en-PH')}</td>
                  <td className="px-6 py-4 font-medium text-white">{tx.description}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${tx.type === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/60">{tx.entity || '-'}</td>
                  <td className={`px-6 py-4 text-right font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                  </td>
                </tr>
              ))}
              {(!data?.recentTransactions || data.recentTransactions.length === 0) && (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-white/60">No transactions in this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
