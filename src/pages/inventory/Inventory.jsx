import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [page, warehouseFilter, categoryFilter]);

  const fetchFilters = async () => {
    try {
      const [whRes, catRes] = await Promise.all([
        api.get('/warehouse'),
        api.get('/categories')
      ]);
      setWarehouses(whRes.data.warehouses || []);
      setCategories(catRes.data.categories || []);
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 20);
      if (warehouseFilter) params.append('warehouseId', warehouseFilter);
      if (categoryFilter) params.append('categoryId', categoryFilter);
      
      const response = await api.get(`/inventory?${params}`);
      setInventory(response.data.inventory || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (item) => {
    const available = item.quantity - item.reserved_quantity;
    if (available <= 0) return { label: 'Out of Stock', color: 'badge-danger' };
    if (available <= item.min_stock_level) return { label: 'Critical', color: 'badge-danger' };
    if (available <= item.reorder_point) return { label: 'Low Stock', color: 'badge-warning' };
    return { label: 'In Stock', color: 'badge-success' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-white/60 mt-1">Manage warehouse stock levels</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/inventory/transactions"
            className="px-4 py-2 border border-white/10 text-white/60 rounded-lg hover:text-white"
          >
            Transactions
          </Link>
          <Link
            to="/inventory/alerts"
            className="px-4 py-2 border border-white/10 text-white/60 rounded-lg hover:text-white"
          >
            <ExclamationTriangleIcon className="h-5 w-5 inline mr-1" />
            Alerts
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input w-full pl-10"
            />
          </div>
          <select
            value={warehouseFilter}
            onChange={(e) => { setWarehouseFilter(e.target.value); setPage(1); }}
            className="form-input"
          >
            <option value="">All Warehouses</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="form-input"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <button
            onClick={fetchInventory}
            className="px-4 py-2 text-white/60 hover:text-white"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner"></div>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-12 text-center">
            <CubeIcon className="h-12 w-12 mx-auto mb-4 text-white/40" />
            <p className="text-white/60">No inventory items found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Warehouse</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Reserved</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Available</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Batch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const status = getStockStatus(item);
                    const available = item.quantity - item.reserved_quantity;
                    return (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-white">{item.product_name}</p>
                            <p className="text-xs text-white/60">{item.sku}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                          {item.warehouse_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                          {item.location_code || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                          {item.reserved_quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {available}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                          {item.batch_number || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                          {item.expiry_date 
                            ? new Date(item.expiry_date).toLocaleDateString('en-PH')
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-sm text-white/60">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-white/10 rounded text-sm text-white/60 hover:text-white disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-white/10 rounded text-sm text-white/60 hover:text-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
