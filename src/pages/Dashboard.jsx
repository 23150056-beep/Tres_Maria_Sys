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

// Colors for pie chart - matching the ethereal design
const COLORS = ['#A855F7', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

// Glassmorphism card component
function GlassCard({ children, className = '', gradient = false, gradientColors = '' }) {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl 
      ${gradient 
        ? `bg-gradient-to-br ${gradientColors}` 
        : 'bg-white/10 backdrop-blur-xl border border-white/20'
      }
      shadow-xl
      ${className}
    `}>
      {children}
    </div>
  );
}

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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-PH').format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center -m-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto"></div>
          <p className="text-white/70 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const totalRevenue = kpis?.thisMonth?.revenue_this_month || 0;
  const todayRevenue = kpis?.today?.revenue_today || 0;
  const pendingOrders = kpis?.pendingOrders?.pending || 0;
  const monthOrders = kpis?.thisMonth?.orders_this_month || 0;
  const totalExpenses = totalRevenue * 0.65; // Simulated expenses (65% of revenue)
  const profit = totalRevenue - totalExpenses;

  // Calculate expense split for pie chart
  const expenseSplit = [
    { name: 'Operations', value: totalExpenses * 0.35, percent: 35 },
    { name: 'Inventory', value: totalExpenses * 0.30, percent: 30 },
    { name: 'Delivery', value: totalExpenses * 0.20, percent: 20 },
    { name: 'Misc', value: totalExpenses * 0.15, percent: 15 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 -m-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">My Dashboard</h1>
          <p className="text-white/50 mt-1">Tres Marias Distribution System</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white/60 text-sm bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
            <ClockIcon className="h-4 w-4" />
            <span>{new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Column - Main Balance Card */}
        <div className="col-span-12 lg:col-span-4">
          <GlassCard gradient gradientColors="from-lime-400 via-green-400 to-emerald-500" className="p-6 h-full">
            <div className="flex flex-col h-full">
              <p className="text-green-900/70 text-sm font-medium">Total Revenue</p>
              <h2 className="text-4xl font-bold text-green-900 mt-2">
                {formatCurrency(totalRevenue).replace('₱', '')}
                <span className="text-lg align-top">₱</span>
              </h2>
              <p className="text-green-800/60 text-sm mt-1">+{formatCurrency(todayRevenue)} revenue today</p>
              
              <div className="flex gap-3 mt-6">
                <Link to="/orders/create" className="flex-1 bg-green-900/80 hover:bg-green-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium text-center transition-colors">
                  New Order
                </Link>
                <Link to="/reports/sales" className="flex-1 bg-white/30 hover:bg-white/40 text-green-900 px-4 py-2.5 rounded-xl text-sm font-medium text-center transition-colors">
                  View Report
                </Link>
              </div>

              {/* Mini Stats */}
              <div className="grid grid-cols-2 gap-3 mt-auto pt-6">
                <div className="bg-green-900/20 rounded-xl p-3">
                  <p className="text-green-900/70 text-xs">Orders</p>
                  <p className="text-green-900 font-bold text-lg">{monthOrders}</p>
                </div>
                <div className="bg-green-900/20 rounded-xl p-3">
                  <p className="text-green-900/70 text-xs">Clients</p>
                  <p className="text-green-900 font-bold text-lg">{kpis?.activeClients || 0}</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Middle Column */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Income & Expense Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Income Card */}
            <GlassCard className="p-5">
              <p className="text-white/60 text-sm">Income</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-white">+{formatNumber(todayRevenue)}</span>
                <span className="text-white/50 text-sm">₱</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs text-green-400 bg-green-400/20 px-2 py-0.5 rounded-full flex items-center">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  +15.7%
                </span>
                <span className="text-white/40 text-xs">vs last week</span>
              </div>
            </GlassCard>

            {/* Expense Card */}
            <GlassCard className="p-5">
              <p className="text-white/60 text-sm">Expenses</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-white">-{formatNumber(totalExpenses * 0.1)}</span>
                <span className="text-white/50 text-sm">₱</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs text-red-400 bg-red-400/20 px-2 py-0.5 rounded-full flex items-center">
                  <ArrowDownIcon className="h-3 w-3 mr-1" />
                  -10.7%
                </span>
                <span className="text-white/40 text-xs">vs last week</span>
              </div>
            </GlassCard>
          </div>

          {/* Revenue Flow Chart */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Revenue Flow</h3>
              <span className="text-white/50 text-sm bg-white/10 px-3 py-1 rounded-full">Monthly</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData.slice(-7)}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A855F7" />
                      <stop offset="100%" stopColor="#6366F1" />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="label" 
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 15, 35, 0.9)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Revenue indicators */}
            <div className="flex items-center gap-2 mt-2">
              <div className="h-3 w-3 rounded-full bg-green-400"></div>
              <span className="text-white/70 text-sm">{formatCurrency(totalRevenue)}</span>
              <span className="text-green-400 text-xs ml-2">↑ 16%</span>
            </div>
          </GlassCard>
        </div>

        {/* Right Column - Stats & Quick Actions */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          {/* Quick Stats Cards */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Quick Stats</h3>
              <span className="text-white/30 text-xs">{kpis?.activeProducts || 0} products</span>
            </div>
            <div className="space-y-3">
              {/* Today Orders */}
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <ShoppingCartIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Today's Orders</p>
                    <p className="text-white font-semibold">{kpis?.today?.orders_today || 0}</p>
                  </div>
                </div>
              </div>

              {/* Deliveries */}
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <TruckIcon className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Deliveries Today</p>
                    <p className="text-white font-semibold">{kpis?.today?.completed_deliveries_today || 0}/{kpis?.today?.deliveries_today || 0}</p>
                  </div>
                </div>
              </div>

              {/* Pending */}
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <ClockIcon className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Pending Orders</p>
                    <p className="text-white font-semibold">{pendingOrders}</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Stock Alerts */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Stock Alerts</h3>
              <Link to="/inventory/alerts" className="text-purple-400 text-xs hover:text-purple-300">Manage</Link>
            </div>
            <div className="space-y-2">
              {kpis?.alerts?.low_stock_alerts > 0 && (
                <div className="flex items-center justify-between bg-yellow-500/10 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />
                    <span className="text-yellow-400 text-sm">Low Stock</span>
                  </div>
                  <span className="text-yellow-400 font-bold">{kpis.alerts.low_stock_alerts}</span>
                </div>
              )}
              {kpis?.alerts?.out_of_stock_alerts > 0 && (
                <div className="flex items-center justify-between bg-red-500/10 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 text-sm">Out of Stock</span>
                  </div>
                  <span className="text-red-400 font-bold">{kpis.alerts.out_of_stock_alerts}</span>
                </div>
              )}
              {!kpis?.alerts?.low_stock_alerts && !kpis?.alerts?.out_of_stock_alerts && (
                <div className="flex items-center gap-2 text-green-400 bg-green-500/10 p-3 rounded-xl">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span className="text-sm">All stock healthy</span>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Bottom Row - Expense Split & Top Products */}
        <div className="col-span-12 lg:col-span-4">
          <GlassCard className="p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Expense Split</h3>
              <span className="text-white/50 text-sm">Monthly</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseSplit}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {expenseSplit.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-white/50 text-xs">Total</span>
                  <span className="text-white font-bold text-sm">{formatCurrency(totalExpenses).replace('₱', '').slice(0, 7)}₱</span>
                </div>
              </div>
              <div className="space-y-2 flex-1">
                {expenseSplit.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                      <span className="text-white/70 text-xs">{item.name}</span>
                    </div>
                    <span className="text-white text-xs">{item.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Top Products */}
        <div className="col-span-12 lg:col-span-4">
          <GlassCard className="p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Top Products</h3>
              <Link to="/products" className="text-purple-400 text-xs hover:text-purple-300">See All</Link>
            </div>
            <div className="space-y-3">
              {topProducts.slice(0, 4).map((product, index) => (
                <div key={index} className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center">
                      <CubeIcon className="h-5 w-5 text-purple-300" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium truncate max-w-[120px]">{product.name}</p>
                      <p className="text-white/40 text-xs">{product.quantity || 0} sold</p>
                    </div>
                  </div>
                  <span className="text-green-400 font-semibold text-sm">{formatCurrency(product.revenue)}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Sales by Category */}
        <div className="col-span-12 lg:col-span-4">
          <GlassCard className="p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Sales by Category</h3>
              <Link to="/reports/sales" className="text-purple-400 text-xs hover:text-purple-300">Report</Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-28 h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={2}
                      dataKey="revenue"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 flex-1 max-h-28 overflow-y-auto">
                {categoryData.slice(0, 5).map((cat, index) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-white/70 text-xs truncate max-w-[80px]">{cat.name}</span>
                    </div>
                    <span className="text-white text-xs">{((cat.revenue / categoryData.reduce((a, b) => a + b.revenue, 0)) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Recent Transactions */}
        <div className="col-span-12">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold">Recent Transactions</h3>
                <span className="text-white/30 text-xs bg-white/10 px-2 py-0.5 rounded-full">{recentActivity.length}</span>
              </div>
              <Link to="/orders" className="text-purple-400 text-sm hover:text-purple-300 flex items-center gap-1">
                See All <EyeIcon className="h-4 w-4" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-white/40 text-xs border-b border-white/10">
                    <th className="text-left pb-3 font-medium">Transaction</th>
                    <th className="text-left pb-3 font-medium">Details</th>
                    <th className="text-left pb-3 font-medium">Date & Time</th>
                    <th className="text-left pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((activity, index) => (
                    <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                            activity.type === 'order' ? 'bg-blue-500/20' :
                            activity.type === 'delivery' ? 'bg-purple-500/20' :
                            activity.type === 'purchase_order' ? 'bg-orange-500/20' :
                            'bg-green-500/20'
                          }`}>
                            {activity.type === 'order' && <ShoppingCartIcon className="h-4 w-4 text-blue-400" />}
                            {activity.type === 'delivery' && <TruckIcon className="h-4 w-4 text-purple-400" />}
                            {activity.type === 'purchase_order' && <ClipboardDocumentListIcon className="h-4 w-4 text-orange-400" />}
                            {activity.type === 'inventory' && <CubeIcon className="h-4 w-4 text-green-400" />}
                          </div>
                          <span className="text-white text-sm font-medium">{activity.reference}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="text-white/60 text-sm">
                          {activity.client_name || activity.driver_name || activity.supplier_name || '-'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-white/50 text-sm">
                          {new Date(activity.timestamp).toLocaleString('en-PH', { 
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                          })}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          activity.status === 'delivered' || activity.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          activity.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          activity.status === 'failed' || activity.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {activity.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recentActivity.length === 0 && (
                <div className="py-8 text-center text-white/50">No recent transactions</div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
