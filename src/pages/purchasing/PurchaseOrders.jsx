import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

const statusColors = { pending: 'bg-gray-500/20 text-gray-400', approved: 'bg-blue-500/20 text-blue-400', ordered: 'bg-yellow-500/20 text-yellow-400', partial: 'bg-orange-500/20 text-orange-400', received: 'bg-green-500/20 text-green-400', cancelled: 'bg-red-500/20 text-red-400' };

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { fetchPurchaseOrders(); }, [page]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/purchase-orders?page=${page}&limit=20`);
      setPurchaseOrders(response.data.purchaseOrders || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const filteredPOs = purchaseOrders.filter(po => po.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) || po.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const formatCurrency = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-white">Purchase Orders</h1><p className="text-white/60 mt-1">Manage supplier orders</p></div>
        <Link to="/purchasing/create" className="btn-primary inline-flex items-center"><PlusIcon className="h-5 w-5 mr-2" />Create PO</Link>
      </div>
      <div className="glass-card p-4">
        <div className="relative"><MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" /><input type="text" placeholder="Search POs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-10" /></div>
      </div>
      <div className="glass-card overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div> : (
          <>
            <table className="glass-table">
              <thead><tr><th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">PO #</th><th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Supplier</th><th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Expected</th><th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Total</th><th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Status</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {filteredPOs.map(po => (
                  <tr key={po.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 text-sm font-medium text-white">{po.po_number}</td>
                    <td className="px-6 py-4 text-sm text-white/60">{po.supplier_name}</td>
                    <td className="px-6 py-4 text-sm text-white/60">{new Date(po.order_date).toLocaleDateString('en-PH')}</td>
                    <td className="px-6 py-4 text-sm text-white/60">{po.expected_date ? new Date(po.expected_date).toLocaleDateString('en-PH') : '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-white text-right">{formatCurrency(po.total_amount)}</td>
                    <td className="px-6 py-4"><span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[po.status]}`}>{po.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-white/10 flex justify-between"><span className="text-sm text-white/60">Page {page} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-50">Previous</button><button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm disabled:opacity-50">Next</button></div></div>
          </>
        )}
      </div>
    </div>
  );
}
