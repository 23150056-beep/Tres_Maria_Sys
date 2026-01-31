import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, CheckCircleIcon, ClockIcon, TruckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function GoodsReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [receiveModal, setReceiveModal] = useState({ open: false, po: null });
  const [receiveItems, setReceiveItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [poRes] = await Promise.all([api.get('/purchase-orders?status=approved,partial')]);
      setPendingPOs(poRes.data.purchaseOrders || []);
      setReceipts([]); // In a real app, fetch from goods_receipts endpoint
    } catch (e) { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const openReceiveModal = (po) => {
    setReceiveItems(po.items?.map(i => ({ ...i, received_quantity: i.quantity - (i.received_quantity || 0), notes: '' })) || []);
    setReceiveModal({ open: true, po });
  };

  const handleReceive = async () => {
    setSubmitting(true);
    try {
      await api.post(`/purchase-orders/${receiveModal.po.id}/receive`, { items: receiveItems.map(i => ({ item_id: i.id, received_quantity: parseInt(i.received_quantity) || 0, notes: i.notes })) });
      toast.success('Goods received successfully');
      setReceiveModal({ open: false, po: null });
      fetchData();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to receive goods'); }
    finally { setSubmitting(false); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH') : '-';

  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
    partial: { color: 'bg-blue-100 text-blue-800', icon: TruckIcon },
    complete: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
    discrepancy: { color: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon },
  };

  const filteredPOs = pendingPOs.filter(po =>
    po.po_number?.toLowerCase().includes(search.toLowerCase()) ||
    po.supplier?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Goods Receiving</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[{ key: 'pending', label: 'Pending Receipt', count: pendingPOs.length }, { key: 'history', label: 'Receipt History', count: receipts.length }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab.label} <span className={`ml-2 px-2 py-1 rounded-full text-xs ${activeTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>{tab.count}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input type="text" placeholder="Search PO# or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      {activeTab === 'pending' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPOs.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No pending receipts</td></tr>
              ) : filteredPOs.map(po => {
                const config = statusConfig[po.status] || statusConfig.pending;
                return (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4"><Link to={`/purchasing/${po.id}`} className="text-blue-600 hover:underline font-medium">{po.po_number}</Link></td>
                    <td className="px-6 py-4">{po.supplier?.name || '-'}</td>
                    <td className="px-6 py-4">{formatDate(po.expected_date)}</td>
                    <td className="px-6 py-4">{po.items?.length || 0} items</td>
                    <td className="px-6 py-4 font-medium">{formatCurrency(po.total_amount)}</td>
                    <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>{po.status}</span></td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openReceiveModal(po)} className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">Receive</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
          Receipt history will show here once goods are received.
        </div>
      )}

      {/* Receive Modal */}
      {receiveModal.open && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setReceiveModal({ open: false, po: null })}></div>
            <div className="relative bg-white rounded-xl max-w-4xl w-full p-6">
              <h2 className="text-xl font-bold mb-4">Receive Goods - {receiveModal.po.po_number}</h2>
              <p className="text-gray-600 mb-4">Supplier: {receiveModal.po.supplier?.name}</p>
              <table className="min-w-full mb-6">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left text-sm font-medium text-gray-500">Product</th>
                    <th className="py-2 text-left text-sm font-medium text-gray-500 w-24">Ordered</th>
                    <th className="py-2 text-left text-sm font-medium text-gray-500 w-24">Prev Rcvd</th>
                    <th className="py-2 text-left text-sm font-medium text-gray-500 w-32">Receiving</th>
                    <th className="py-2 text-left text-sm font-medium text-gray-500">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {receiveItems.map((item, idx) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3">{item.product?.name || `Product #${item.product_id}`}</td>
                      <td className="py-3">{item.quantity}</td>
                      <td className="py-3">{item.received_quantity_prev || 0}</td>
                      <td className="py-3">
                        <input type="number" min="0" max={item.quantity - (item.received_quantity_prev || 0)} value={item.received_quantity}
                          onChange={(e) => { const newItems = [...receiveItems]; newItems[idx].received_quantity = e.target.value; setReceiveItems(newItems); }}
                          className="w-24 px-2 py-1 border border-gray-300 rounded" />
                      </td>
                      <td className="py-3">
                        <input type="text" placeholder="Notes..." value={item.notes}
                          onChange={(e) => { const newItems = [...receiveItems]; newItems[idx].notes = e.target.value; setReceiveItems(newItems); }}
                          className="w-full px-2 py-1 border border-gray-300 rounded" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end gap-4">
                <button onClick={() => setReceiveModal({ open: false, po: null })} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleReceive} disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{submitting ? 'Processing...' : 'Confirm Receipt'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
