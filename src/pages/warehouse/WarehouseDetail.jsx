import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CubeIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ExclamationTriangleIcon, MapPinIcon, PhoneIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function WarehouseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [warehouse, setWarehouse] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      const [whRes, invRes, txRes] = await Promise.all([
        api.get(`/warehouse/${id}`),
        api.get(`/inventory?warehouse_id=${id}&limit=100`),
        api.get(`/inventory/transactions?warehouse_id=${id}&limit=50`)
      ]);
      setWarehouse(whRes.data);
      setInventory(invRes.data.inventory || []);
      setTransactions(txRes.data.transactions || []);
    } catch (e) { toast.error('Failed to load warehouse data'); navigate('/warehouse'); }
    finally { setLoading(false); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
  const formatNumber = (n) => new Intl.NumberFormat('en-PH').format(n || 0);

  // Calculate stats
  const totalProducts = inventory.length;
  const totalUnits = inventory.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalValue = inventory.reduce((sum, i) => sum + ((i.quantity || 0) * (i.unit_cost || 0)), 0);
  const lowStockItems = inventory.filter(i => i.quantity <= (i.reorder_level || 10)).length;

  // Stock by category
  const categoryData = inventory.reduce((acc, item) => {
    const cat = item.product?.category?.name || 'Uncategorized';
    const existing = acc.find(c => c.name === cat);
    if (existing) existing.value += item.quantity || 0;
    else acc.push({ name: cat, value: item.quantity || 0 });
    return acc;
  }, []);

  // Transaction type breakdown
  const txTypeData = transactions.reduce((acc, tx) => {
    const type = tx.transaction_type || 'other';
    const existing = acc.find(t => t.name === type);
    if (existing) existing.count++;
    else acc.push({ name: type, count: 1 });
    return acc;
  }, []);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div>;
  if (!warehouse) return <div className="text-center py-12 text-white/60">Warehouse not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/warehouse')} className="p-2 text-white/60 hover:bg-white/10 rounded-lg"><ArrowLeftIcon className="h-5 w-5" /></button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{warehouse.name}</h1>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${warehouse.is_active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}>
              {warehouse.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-white/60">{warehouse.code}</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <CubeIcon className="h-8 w-8 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-white">{formatNumber(totalProducts)}</p>
          <p className="text-sm text-white/60">Product SKUs</p>
        </div>
        <div className="glass-card p-4">
          <ArrowTrendingUpIcon className="h-8 w-8 text-green-400 mb-2" />
          <p className="text-2xl font-bold text-white">{formatNumber(totalUnits)}</p>
          <p className="text-sm text-white/60">Total Units</p>
        </div>
        <div className="glass-card p-4">
          <span className="text-2xl text-white">₱</span>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalValue).replace('₱', '')}</p>
          <p className="text-sm text-white/60">Inventory Value</p>
        </div>
        <div className="glass-card p-4">
          <ExclamationTriangleIcon className={`h-8 w-8 ${lowStockItems > 0 ? 'text-red-400' : 'text-white/40'} mb-2`} />
          <p className="text-2xl font-bold text-white">{lowStockItems}</p>
          <p className="text-sm text-white/60">Low Stock Items</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'inventory', 'transactions', 'info'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab ? 'border-purple-500 text-purple-400' : 'border-transparent text-white/60 hover:text-white'}`}>
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock by Category */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Stock by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {categoryData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Transactions */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={txTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" />
                <YAxis stroke="rgba(255,255,255,0.6)" />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Low Stock Alert */}
          {lowStockItems > 0 && (
            <div className="lg:col-span-2 bg-red-500/10 border border-red-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />Low Stock Alert
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventory.filter(i => i.quantity <= (i.reorder_level || 10)).slice(0, 6).map(item => (
                  <div key={item.id} className="glass-card p-4">
                    <p className="font-medium text-white">{item.product?.name || `Product #${item.product_id}`}</p>
                    <p className="text-sm text-red-400">Stock: {item.quantity} (Reorder: {item.reorder_level || 10})</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="glass-table overflow-hidden">
          <table className="min-w-full divide-y divide-white/10">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Location</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Quantity</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Unit Cost</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Total Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {inventory.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-white/60">No inventory in this warehouse</td></tr>
              ) : inventory.map(item => {
                const isLow = item.quantity <= (item.reorder_level || 10);
                return (
                  <tr key={item.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-medium text-white">{item.product?.name || `Product #${item.product_id}`}</td>
                    <td className="px-6 py-4 text-white/60">{item.product?.category?.name || '-'}</td>
                    <td className="px-6 py-4 text-white/60">{item.location || '-'}</td>
                    <td className="px-6 py-4 text-right text-white">{formatNumber(item.quantity)}</td>
                    <td className="px-6 py-4 text-right text-white">{formatCurrency(item.unit_cost)}</td>
                    <td className="px-6 py-4 text-right font-medium text-white">{formatCurrency((item.quantity || 0) * (item.unit_cost || 0))}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${isLow ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {isLow ? 'Low Stock' : 'OK'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="glass-table overflow-hidden">
          <table className="min-w-full divide-y divide-white/10">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Product</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {transactions.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-white/60">No transactions recorded</td></tr>
              ) : transactions.map(tx => {
                const isIn = ['received', 'adjustment_in', 'transfer_in', 'return'].includes(tx.transaction_type);
                return (
                  <tr key={tx.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 text-white">{formatDate(tx.created_at)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${isIn ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isIn ? <ArrowTrendingUpIcon className="h-3 w-3 mr-1" /> : <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />}
                        {tx.transaction_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">{tx.product?.name || `Product #${tx.product_id}`}</td>
                    <td className={`px-6 py-4 text-right font-medium ${isIn ? 'text-green-400' : 'text-red-400'}`}>
                      {isIn ? '+' : '-'}{formatNumber(Math.abs(tx.quantity))}
                    </td>
                    <td className="px-6 py-4 text-white/60">{tx.reference_type || '-'}</td>
                    <td className="px-6 py-4 text-white/60">{tx.user?.name || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'info' && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Warehouse Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPinIcon className="h-5 w-5 text-white/40 mt-0.5" />
                <div>
                  <p className="text-sm text-white/60">Address</p>
                  <p className="font-medium text-white">{warehouse.address || '-'}</p>
                  <p className="text-white/60">{warehouse.city}, {warehouse.province}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <PhoneIcon className="h-5 w-5 text-white/40 mt-0.5" />
                <div>
                  <p className="text-sm text-white/60">Phone</p>
                  <p className="font-medium text-white">{warehouse.phone || '-'}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <UserIcon className="h-5 w-5 text-white/40 mt-0.5" />
                <div>
                  <p className="text-sm text-white/60">Manager</p>
                  <p className="font-medium text-white">{warehouse.manager_name || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CubeIcon className="h-5 w-5 text-white/40 mt-0.5" />
                <div>
                  <p className="text-sm text-white/60">Capacity</p>
                  <p className="font-medium text-white">{warehouse.capacity ? `${formatNumber(warehouse.capacity)} units` : '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ClockIcon className="h-5 w-5 text-white/40 mt-0.5" />
                <div>
                  <p className="text-sm text-white/60">Created</p>
                  <p className="font-medium text-white">{formatDate(warehouse.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
