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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!client) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/clients')} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeftIcon className="h-5 w-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.business_name}</h1>
            <p className="text-gray-600">{client.code}</p>
          </div>
        </div>
        <Link to={`/clients/${id}/edit`} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <PencilIcon className="h-5 w-5 mr-2" />Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Contact Info</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Contact:</span> {client.contact_person}</p>
            <p><span className="text-gray-500">Phone:</span> {client.phone}</p>
            <p><span className="text-gray-500">Email:</span> {client.email}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Financial</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Credit Limit:</span> {formatCurrency(client.credit_limit)}</p>
            <p><span className="text-gray-500">Balance:</span> {formatCurrency(client.current_balance)}</p>
            <p><span className="text-gray-500">Payment Terms:</span> {client.payment_terms}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Statistics</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Type:</span> {client.client_type}</p>
            <p><span className="text-gray-500">Pricing Tier:</span> {client.pricing_tier_name || 'Standard'}</p>
            <p><span className="text-gray-500">Total Orders:</span> {client.total_orders || 0}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b"><h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3></div>
        {orders.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No orders yet</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium"><Link to={`/orders/${order.id}`} className="text-blue-600 hover:text-blue-800">{order.order_number}</Link></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(order.order_date).toLocaleDateString('en-PH')}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(order.total_amount)}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">{order.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
