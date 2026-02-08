import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

const statusColors = { pending: 'bg-slate-100 text-slate-600', approved: 'bg-blue-50 text-blue-700', ordered: 'bg-amber-50 text-amber-700', partial: 'bg-orange-50 text-orange-700', received: 'bg-emerald-50 text-emerald-700', cancelled: 'bg-red-50 text-red-700' };

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
        <div><h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1><p className="text-slate-500 mt-1">Manage supplier orders</p></div>
        <Link to="/purchasing/create" className="btn-primary inline-flex items-center"><PlusIcon className="h-5 w-5 mr-2" />Create PO</Link>
      </div>
      <div className="glass-card p-4">
        <div className="relative"><MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" /><input type="text" placeholder="Search POs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-10" /></div>
      </div>
      <div className="glass-card overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div> : (
          <>
            <table className="glass-table">
              <thead><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">PO #</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Supplier</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Expected</th><th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPOs.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{po.po_number}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{po.supplier_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(po.order_date).toLocaleDateString('en-PH')}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{po.expected_date ? new Date(po.expected_date).toLocaleDateString('en-PH') : '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 text-right">{formatCurrency(po.total_amount)}</td>
                    <td className="px-6 py-4"><span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[po.status]}`}>{po.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-between"><span className="text-sm text-slate-500">Page {page} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-50">Previous</button><button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm disabled:opacity-50">Next</button></div></div>
          </>
        )}
      </div>
    </div>
  );
}
