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
  CheckCircleIcon
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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function StatCard({ title, value, icon: Icon, trend, trendValue, color, link }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500'
  };

  const content = (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`${colorClasses[color]} p-3 rounded-lg`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
      </div>
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
}

function AlertCard({ alerts }) {
  const alertTypes = {
    low_stock: { label: 'Low Stock', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    expiring: { label: 'Expiring Soon', color: 'text-orange-600', bg: 'bg-orange-50' },
    out_of_stock: { label: 'Out of Stock', color: 'text-red-600', bg: 'bg-red-50' }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Stock Alerts</h3>
        <Link to="/inventory/alerts" className="text-sm text-blue-600 hover:text-blue-800">
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {alerts.low_stock_alerts > 0 && (
          <div className={`flex items-center justify-between p-3 rounded-lg ${alertTypes.low_stock.bg}`}>
            <div className="flex items-center">
              <ExclamationTriangleIcon className={`h-5 w-5 mr-2 ${alertTypes.low_stock.color}`} />
              <span className={`text-sm font-medium ${alertTypes.low_stock.color}`}>Low Stock Items</span>
            </div>
            <span className={`text-lg font-bold ${alertTypes.low_stock.color}`}>{alerts.low_stock_alerts}</span>
          </div>
        )}
        {alerts.expiring_alerts > 0 && (
          <div className={`flex items-center justify-between p-3 rounded-lg ${alertTypes.expiring.bg}`}>
            <div className="flex items-center">
              <ClockIcon className={`h-5 w-5 mr-2 ${alertTypes.expiring.color}`} />
              <span className={`text-sm font-medium ${alertTypes.expiring.color}`}>Expiring Soon</span>
            </div>
            <span className={`text-lg font-bold ${alertTypes.expiring.color}`}>{alerts.expiring_alerts}</span>
          </div>
        )}
        {alerts.out_of_stock_alerts > 0 && (
          <div className={`flex items-center justify-between p-3 rounded-lg ${alertTypes.out_of_stock.bg}`}>
            <div className="flex items-center">
              <ExclamationTriangleIcon className={`h-5 w-5 mr-2 ${alertTypes.out_of_stock.color}`} />
              <span className={`text-sm font-medium ${alertTypes.out_of_stock.color}`}>Out of Stock</span>
            </div>
            <span className={`text-lg font-bold ${alertTypes.out_of_stock.color}`}>{alerts.out_of_stock_alerts}</span>
          </div>
        )}
        {!alerts.low_stock_alerts && !alerts.expiring_alerts && !alerts.out_of_stock_alerts && (
          <div className="flex items-center justify-center p-4 text-green-600">
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            <span>All stock levels healthy</span>
          </div>
        )}
      </div>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome to Tres Marias Distribution System</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <ClockIcon className="h-4 w-4" />
          <span>{new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Orders"
          value={kpis?.today?.orders_today || 0}
          icon={ShoppingCartIcon}
          color="blue"
          link="/orders"
        />
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(kpis?.today?.revenue_today || 0)}
          icon={ArrowTrendingUpIcon}
          color="green"
        />
        <StatCard
          title="Deliveries Today"
          value={`${kpis?.today?.completed_deliveries_today || 0}/${kpis?.today?.deliveries_today || 0}`}
          icon={TruckIcon}
          color="purple"
          link="/deliveries"
        />
        <StatCard
          title="Active Clients"
          value={kpis?.activeClients || 0}
          icon={UserGroupIcon}
          color="yellow"
          link="/clients"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600">Month Revenue</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(kpis?.thisMonth?.revenue_this_month || 0)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600">Month Orders</p>
          <p className="text-xl font-bold text-gray-900">{kpis?.thisMonth?.orders_this_month || 0}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600">Pending Orders</p>
          <p className="text-xl font-bold text-yellow-600">{kpis?.pendingOrders?.pending || 0}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600">Active Products</p>
          <p className="text-xl font-bold text-gray-900">{kpis?.activeProducts || 0}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (Last 30 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  fill="#93C5FD"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts */}
        <AlertCard alerts={kpis?.alerts || {}} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
            <Link to="/reports/sales" className="text-sm text-blue-600 hover:text-blue-800">
              View report
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Category */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h3>
          <div className="h-64 flex items-center">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="revenue"
                    nameKey="name"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full text-center text-gray-500">No sales data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="divide-y divide-gray-100">
          {recentActivity.map((activity, index) => (
            <div key={index} className="py-3 flex items-center justify-between">
              <div className="flex items-center">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  activity.type === 'order' ? 'bg-blue-100 text-blue-600' :
                  activity.type === 'delivery' ? 'bg-purple-100 text-purple-600' :
                  activity.type === 'inventory' ? 'bg-green-100 text-green-600' :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  {activity.type === 'order' && <ShoppingCartIcon className="h-5 w-5" />}
                  {activity.type === 'delivery' && <TruckIcon className="h-5 w-5" />}
                  {activity.type === 'inventory' && <CubeIcon className="h-5 w-5" />}
                  {activity.type === 'purchase_order' && <ClipboardDocumentListIcon className="h-5 w-5" />}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{activity.reference}</p>
                  <p className="text-xs text-gray-500">
                    {activity.client_name || activity.driver_name || activity.product_name || activity.supplier_name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  activity.status === 'delivered' || activity.status === 'receive' ? 'bg-green-100 text-green-700' :
                  activity.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  activity.status === 'failed' || activity.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {activity.status}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(activity.timestamp).toLocaleString('en-PH', { 
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <div className="py-8 text-center text-gray-500">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Missing import
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
