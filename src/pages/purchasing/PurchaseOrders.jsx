import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

const statusColors = { pending: 'bg-gray-100 text-gray-700', approved: 'bg-blue-100 text-blue-700', ordered: 'bg-yellow-100 text-yellow-700', partial: 'bg-orange-100 text-orange-700', received: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' };

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
        <div><h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1><p className="text-gray-600 mt-1">Manage supplier orders</p></div>
        <Link to="/purchasing/create" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="h-5 w-5 mr-2" />Create PO</Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative"><MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" placeholder="Search POs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" /></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div> : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO #</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPOs.map(po => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{po.po_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{po.supplier_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(po.order_date).toLocaleDateString('en-PH')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{po.expected_date ? new Date(po.expected_date).toLocaleDateString('en-PH') : '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(po.total_amount)}</td>
                    <td className="px-6 py-4"><span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[po.status]}`}>{po.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t flex justify-between"><span className="text-sm text-gray-500">Page {page} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Previous</button><button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button></div></div>
          </>
        )}
      </div>
    </div>
  );
}
