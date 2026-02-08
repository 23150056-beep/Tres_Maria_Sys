import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchClient(); }, [id]);

  const fetchClient = async () => {
    try {
      const response = await api.get(`/clients/${id}`);
      setClient(response.data.client || response.data);
      setOrders(response.data.recentOrders || []);
    } catch (error) {
      toast.error('Failed to load client');
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div>;
  if (!client) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/clients')} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg"><ArrowLeftIcon className="h-5 w-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{client.business_name}</h1>
            <p className="text-slate-500">{client.code}</p>
          </div>
        </div>
        <Link to={`/clients/${id}/edit`} className="btn-primary">
          <PencilIcon className="h-5 w-5 mr-2" />Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-3">Contact Info</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-500">Contact:</span> <span className="text-slate-900">{client.contact_person}</span></p>
            <p><span className="text-slate-500">Phone:</span> <span className="text-slate-900">{client.phone}</span></p>
            <p><span className="text-slate-500">Email:</span> <span className="text-slate-900">{client.email}</span></p>
          </div>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-3">Financial</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-500">Credit Limit:</span> <span className="text-slate-900">{formatCurrency(client.credit_limit)}</span></p>
            <p><span className="text-slate-500">Balance:</span> <span className="text-slate-900">{formatCurrency(client.current_balance)}</span></p>
            <p><span className="text-slate-500">Payment Terms:</span> <span className="text-slate-900">{client.payment_terms}</span></p>
          </div>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-3">Statistics</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-500">Type:</span> <span className="text-slate-900">{client.client_type}</span></p>
            <p><span className="text-slate-500">Pricing Tier:</span> <span className="text-slate-900">{client.pricing_tier_name || 'Standard'}</span></p>
            <p><span className="text-slate-500">Total Orders:</span> <span className="text-slate-900">{client.total_orders || 0}</span></p>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-slate-200"><h3 className="text-lg font-semibold text-slate-900">Recent Orders</h3></div>
        {orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No orders yet</div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium"><Link to={`/orders/${order.id}`} className="text-primary-600 hover:text-primary-700">{order.order_number}</Link></td>
                  <td className="px-6 py-4 text-sm text-slate-500">{new Date(order.order_date).toLocaleDateString('en-PH')}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 text-right">{formatCurrency(order.total_amount)}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">{order.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
