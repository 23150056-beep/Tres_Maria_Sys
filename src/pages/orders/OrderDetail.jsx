import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PrinterIcon, TruckIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

const statusColors = {
  pending: 'bg-gray-500/20 text-gray-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-yellow-500/20 text-yellow-400',
  picking: 'bg-orange-500/20 text-orange-400',
  packed: 'bg-purple-500/20 text-purple-400',
  shipped: 'bg-indigo-500/20 text-indigo-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400'
};

const statusFlow = ['pending', 'confirmed', 'processing', 'picking', 'packed', 'shipped', 'delivered'];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${id}`);
      const orderData = response.data.order || response.data;
      setOrder(orderData);
      setItems(response.data.items || orderData.items || []);
      setHistory(response.data.statusHistory || []);
    } catch (error) {
      toast.error('Failed to load order');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.put(`/orders/${id}/status`, { status: newStatus });
      toast.success(`Order ${newStatus}`);
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-12 w-12"></div>
      </div>
    );
  }

  if (!order) return null;

  const currentStatusIndex = statusFlow.indexOf(order.status);
  const nextStatus = statusFlow[currentStatusIndex + 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/orders')} className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{order.order_number}</h1>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
                {order.status}
              </span>
            </div>
            <p className="text-white/60 mt-1">
              Created on {new Date(order.created_at).toLocaleDateString('en-PH')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-secondary">
            <PrinterIcon className="h-5 w-5" />
          </button>
          {nextStatus && order.status !== 'cancelled' && (
            <button
              onClick={() => handleStatusChange(nextStatus)}
              className="btn-primary"
            >
              Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
            </button>
          )}
          {order.status === 'pending' && (
            <button
              onClick={() => handleStatusChange('cancelled')}
              className="btn-danger"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Order Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-3">Customer</h3>
          <p className="font-semibold text-white">{order.client_name}</p>
          <p className="text-sm text-white/60">{order.client_code}</p>
          <p className="text-sm text-white/60 mt-2">{order.delivery_address}</p>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-3">Order Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Order Date</span>
              <span className="text-white">{new Date(order.order_date).toLocaleDateString('en-PH')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Payment Terms</span>
              <span className="text-white">{order.payment_terms}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Items</span>
              <span className="text-white">{order.total_items}</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-3">Payment Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Subtotal</span>
              <span className="text-white">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Discount</span>
              <span className="text-white">-{formatCurrency(order.discount_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Tax</span>
              <span className="text-white">{formatCurrency(order.tax_amount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-white/10 pt-2 text-white">
              <span>Total</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Order Items</h3>
        </div>
        <table className="glass-table">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">SKU</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Qty</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Unit Price</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 text-sm font-medium text-white">{item.product_name}</td>
                <td className="px-6 py-4 text-sm text-white/60">{item.sku}</td>
                <td className="px-6 py-4 text-sm text-white text-right">{item.quantity}</td>
                <td className="px-6 py-4 text-sm text-white text-right">{formatCurrency(item.unit_price)}</td>
                <td className="px-6 py-4 text-sm font-medium text-white text-right">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status History */}
      {history.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Status History</h3>
          <div className="space-y-4">
            {history.map((h, index) => (
              <div key={index} className="flex items-start">
                <div className={`h-3 w-3 rounded-full mt-1.5 ${statusColors[h.status].split(' ')[0]}`}></div>
                <div className="ml-4">
                  <p className="font-medium text-white">{h.status.charAt(0).toUpperCase() + h.status.slice(1)}</p>
                  <p className="text-sm text-white/60">
                    {new Date(h.created_at).toLocaleString('en-PH')} by {h.changed_by_name}
                  </p>
                  {h.notes && <p className="text-sm text-white/60 mt-1">{h.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Notes</h3>
          <p className="text-white/60">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
