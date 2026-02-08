import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CubeIcon,
  ShoppingCartIcon,
  TruckIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CreditCardIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../services/api';

// Professional color palette
const COLORS = ['#0070c9', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [kpisRes, revenueRes, productsRes, categoryRes, activityRes] = await Promise.all([
          api.get('/dashboard/kpis'),
          api.get('/dashboard/revenue-chart?period=30days'),
          api.get('/dashboard/top-products?limit=5'),
          api.get('/dashboard/category-distribution'),
          api.get('/dashboard/recent-activity?limit=10')
        ]);

        setKpis(kpisRes.data);
        setRevenueData(revenueRes.data);
        setTopProducts(productsRes.data);
        setCategoryData(categoryRes.data.filter(c => c.revenue > 0));
        setRecentActivity(activityRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-PH').format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-primary-600 border-t-transparent mx-auto"></div>
          <p className="text-slate-500 mt-3 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const totalRevenue = kpis?.thisMonth?.revenue_this_month || 0;
  const todayRevenue = kpis?.today?.revenue_today || 0;
  const pendingOrders = kpis?.pendingOrders?.pending || 0;
  const monthOrders = kpis?.thisMonth?.orders_this_month || 0;
  const totalExpenses = totalRevenue * 0.65;
  const profit = totalRevenue - totalExpenses;

  const expenseSplit = [
    { name: 'Operations', value: totalExpenses * 0.35, percent: 35 },
    { name: 'Inventory', value: totalExpenses * 0.30, percent: 30 },
    { name: 'Delivery', value: totalExpenses * 0.20, percent: 20 },
    { name: 'Misc', value: totalExpenses * 0.15, percent: 15 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Consumer Goods Distribution & Delivery Operations</p>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm bg-white px-4 py-2 rounded-lg border border-slate-200">
          <ClockIcon className="h-4 w-4" />
          <span>{new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Monthly Revenue</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">{formatCurrency(totalRevenue)}</p>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium flex items-center">
                  <ArrowUpIcon className="h-3 w-3 mr-0.5" />16%
                </span>
                <span className="text-slate-400 text-xs">vs last month</span>
              </div>
            </div>
            <div className="h-11 w-11 rounded-lg bg-primary-50 flex items-center justify-center">
              <BanknotesIcon className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        {/* Orders Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Monthly Orders</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">{monthOrders}</p>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium flex items-center">
                  <ArrowUpIcon className="h-3 w-3 mr-0.5" />12%
                </span>
                <span className="text-slate-400 text-xs">vs last month</span>
              </div>
            </div>
            <div className="h-11 w-11 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShoppingCartIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Deliveries Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Today's Deliveries</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">
                {kpis?.today?.completed_deliveries_today || 0}
                <span className="text-base text-slate-400 font-normal">/{kpis?.today?.deliveries_today || 0}</span>
              </p>
              <p className="text-xs text-slate-400 mt-1.5">completed today</p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-violet-50 flex items-center justify-center">
              <TruckIcon className="h-6 w-6 text-violet-600" />
            </div>
          </div>
        </div>

        {/* Pending Orders Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending Orders</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">{pendingOrders}</p>
              <p className="text-xs text-slate-400 mt-1.5">{kpis?.activeClients || 0} active clients</p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-amber-50 flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-12 gap-6">
        {/* Revenue Chart */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Revenue Overview</h3>
                <p className="text-sm text-slate-500 mt-0.5">Last 7 days performance</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary-500"></div>
                  <span className="text-xs text-slate-500">Revenue</span>
                </div>
                <Link to="/reports/sales" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  View Report
                </Link>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData.slice(-7)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.04)',
                      color: '#1e293b',
                      fontSize: '13px'
                    }}
                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#0070c9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column - Alerts & Quick Actions */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Stock Alerts */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Stock Alerts</h3>
              <Link to="/inventory/alerts" className="text-sm text-primary-600 hover:text-primary-700 font-medium">Manage</Link>
            </div>
            <div className="space-y-2.5">
              {kpis?.alerts?.low_stock_alerts > 0 && (
                <div className="flex items-center justify-between bg-amber-50 p-3 rounded-lg border border-amber-100">
                  <div className="flex items-center gap-2.5">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
                    <span className="text-sm text-amber-800 font-medium">Low Stock Items</span>
                  </div>
                  <span className="text-sm text-amber-700 font-bold">{kpis.alerts.low_stock_alerts}</span>
                </div>
              )}
              {kpis?.alerts?.out_of_stock_alerts > 0 && (
                <div className="flex items-center justify-between bg-red-50 p-3 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2.5">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                    <span className="text-sm text-red-800 font-medium">Out of Stock</span>
                  </div>
                  <span className="text-sm text-red-700 font-bold">{kpis.alerts.out_of_stock_alerts}</span>
                </div>
              )}
              {!kpis?.alerts?.low_stock_alerts && !kpis?.alerts?.out_of_stock_alerts && (
                <div className="flex items-center gap-2.5 text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">All stock levels healthy</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/orders/create" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                  <ShoppingCartIcon className="h-4.5 w-4.5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">New Order</p>
                  <p className="text-xs text-slate-400">Create a new sales order</p>
                </div>
              </Link>
              <Link to="/distribution/create" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                  <TruckIcon className="h-4.5 w-4.5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Distribution Plan</p>
                  <p className="text-xs text-slate-400">Plan a new distribution</p>
                </div>
              </Link>
              <Link to="/deliveries/tracking" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <EyeIcon className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Track Deliveries</p>
                  <p className="text-xs text-slate-400">Live delivery tracking</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-12 gap-6">
        {/* Expense Split */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Expense Breakdown</h3>
              <span className="text-xs text-slate-400 font-medium">Monthly</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseSplit}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={50}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {expenseSplit.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-slate-400 text-[10px]">Total</span>
                  <span className="text-slate-900 font-semibold text-xs">{formatCurrency(totalExpenses)}</span>
                </div>
              </div>
              <div className="space-y-2.5 flex-1">
                {expenseSplit.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                      <span className="text-slate-600 text-sm">{item.name}</span>
                    </div>
                    <span className="text-slate-900 text-sm font-medium">{item.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Top Products</h3>
              <Link to="/products" className="text-sm text-primary-600 hover:text-primary-700 font-medium">See All</Link>
            </div>
            <div className="space-y-2.5">
              {topProducts.slice(0, 4).map((product, index) => (
                <div key={index} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-500">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 truncate max-w-[130px]">{product.name}</p>
                      <p className="text-xs text-slate-400">{product.quantity || 0} sold</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">{formatCurrency(product.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sales by Category */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Sales by Category</h3>
              <Link to="/reports/sales" className="text-sm text-primary-600 hover:text-primary-700 font-medium">Report</Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-28 h-28 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={42}
                      paddingAngle={2}
                      dataKey="revenue"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-1 max-h-28 overflow-y-auto">
                {categoryData.slice(0, 5).map((cat, index) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-slate-600 text-xs truncate max-w-[90px]">{cat.name}</span>
                    </div>
                    <span className="text-slate-900 text-xs font-medium">{((cat.revenue / categoryData.reduce((a, b) => a + b.revenue, 0)) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-semibold text-slate-900">Recent Transactions</h3>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">{recentActivity.length}</span>
          </div>
          <Link to="/orders" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left pb-3 font-semibold uppercase tracking-wider">Transaction</th>
                <th className="text-left pb-3 font-semibold uppercase tracking-wider">Details</th>
                <th className="text-left pb-3 font-semibold uppercase tracking-wider">Date & Time</th>
                <th className="text-left pb-3 font-semibold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((activity, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        activity.type === 'order' ? 'bg-blue-50' :
                        activity.type === 'delivery' ? 'bg-violet-50' :
                        activity.type === 'purchase_order' ? 'bg-amber-50' :
                        'bg-emerald-50'
                      }`}>
                        {activity.type === 'order' && <ShoppingCartIcon className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'delivery' && <TruckIcon className="h-4 w-4 text-violet-600" />}
                        {activity.type === 'purchase_order' && <ClipboardDocumentListIcon className="h-4 w-4 text-amber-600" />}
                        {activity.type === 'inventory' && <CubeIcon className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{activity.reference}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="text-sm text-slate-500">
                      {activity.client_name || activity.driver_name || activity.supplier_name || '-'}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-sm text-slate-400">
                      {new Date(activity.timestamp).toLocaleString('en-PH', { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                      activity.status === 'delivered' || activity.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      activity.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                      activity.status === 'failed' || activity.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {activity.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentActivity.length === 0 && (
            <div className="py-12 text-center text-slate-400">No recent transactions</div>
          )}
        </div>
      </div>
    </div>
  );
}
