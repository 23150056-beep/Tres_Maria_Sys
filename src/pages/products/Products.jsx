import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, [page]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products?page=${page}&limit=20`);
      setProducts(response.data.products || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-white/60 mt-1">Manage your product catalog</p>
        </div>
        <Link to="/products/new" className="btn-primary inline-flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Product
        </Link>
      </div>

      <div className="glass-card p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10"
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner h-12 w-12"></div>
          </div>
        ) : (
          <>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Price</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <p className="font-medium text-white">{product.name}</p>
                      <p className="text-xs text-white/50">{product.brand}</p>
                    </td>
                    <td>{product.sku}</td>
                    <td>{product.category_name}</td>
                    <td className="text-right">{formatCurrency(product.cost_price)}</td>
                    <td className="text-right font-medium text-green-400">{formatCurrency(product.unit_price)}</td>
                    <td className="text-center">
                      <span className={`badge ${product.is_active ? 'badge-success' : 'bg-white/10 text-white/50'}`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link to={`/products/${product.id}/edit`} className="text-purple-400 hover:text-purple-300">
                        <PencilIcon className="h-5 w-5 inline" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-white/10 flex justify-between">
              <span className="text-sm text-white/50">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-50">Previous</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm disabled:opacity-50">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
