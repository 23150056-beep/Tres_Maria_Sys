import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, TruckIcon, MapPinIcon, PhoneIcon, ClockIcon, CheckCircleIcon, XCircleIcon, DocumentTextIcon, CameraIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function DeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [failureModal, setFailureModal] = useState(false);
  const [failureReason, setFailureReason] = useState('');

  useEffect(() => { fetchDelivery(); }, [id]);

  const fetchDelivery = async () => {
    try {
      const res = await api.get(`/deliveries/${id}`);
      setDelivery(res.data);
    } catch (e) { toast.error('Failed to load delivery'); navigate('/deliveries'); }
    finally { setLoading(false); }
  };

  const updateStatus = async (status) => {
    setUpdating(true);
    try {
      await api.put(`/deliveries/${id}/status`, { status });
      toast.success(`Delivery marked as ${status}`);
      fetchDelivery();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to update status'); }
    finally { setUpdating(false); }
  };

  const handleDelivered = () => updateStatus('delivered');
  
  const handleFailed = async () => {
    if (!failureReason) { toast.error('Provide a failure reason'); return; }
    setUpdating(true);
    try {
      await api.put(`/deliveries/${id}/status`, { status: 'failed', failure_reason: failureReason });
      toast.success('Delivery marked as failed');
      setFailureModal(false);
      fetchDelivery();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to update status'); }
    finally { setUpdating(false); }
  };

  const handleStartDelivery = () => updateStatus('in-transit');

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-';
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '-';
  const formatCurrency = (v) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v || 0);

  const statusConfig = {
    pending: { color: 'bg-gray-100 text-gray-800', label: 'Pending' },
    assigned: { color: 'bg-blue-100 text-blue-800', label: 'Assigned' },
    'in-transit': { color: 'bg-yellow-100 text-yellow-800', label: 'In Transit' },
    delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
    failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
    returned: { color: 'bg-orange-100 text-orange-800', label: 'Returned' },
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (!delivery) return <div className="text-center py-12">Delivery not found</div>;

  const config = statusConfig[delivery.status] || statusConfig.pending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/deliveries')} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeftIcon className="h-5 w-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{delivery.delivery_number || `DEL-${String(delivery.id).padStart(6, '0')}`}</h1>
            <p className="text-gray-500">Order: {delivery.order?.order_number}</p>
          </div>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${config.color}`}>{config.label}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Delivery Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="font-medium">{delivery.order?.client?.business_name || '-'}</p>
                <p className="text-sm text-gray-600">{delivery.order?.client?.contact_person}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-medium flex items-center"><PhoneIcon className="h-4 w-4 mr-2" />{delivery.order?.client?.phone || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Delivery Address</p>
                <p className="font-medium flex items-start"><MapPinIcon className="h-4 w-4 mr-2 mt-1 flex-shrink-0" />{delivery.delivery_address || delivery.order?.client?.address || '-'}</p>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Schedule & Assignment</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <ClockIcon className="h-5 w-5 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Scheduled Date</p>
                <p className="font-medium">{formatDate(delivery.scheduled_date)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <ClockIcon className="h-5 w-5 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Scheduled Time</p>
                <p className="font-medium">{formatTime(delivery.scheduled_date)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <TruckIcon className="h-5 w-5 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Vehicle</p>
                <p className="font-medium">{delivery.vehicle?.plate_number || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <TruckIcon className="h-5 w-5 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Driver</p>
                <p className="font-medium">{delivery.driver?.name || delivery.driver_name || '-'}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Order Items</h2>
            </div>
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {delivery.order?.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4">{item.product?.name || `Product #${item.product_id}`}</td>
                    <td className="px-6 py-4">{item.quantity} {item.product?.unit}</td>
                    <td className="px-6 py-4 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="px-6 py-4 text-right font-medium">{formatCurrency(item.total_price)}</td>
                  </tr>
                )) || <tr><td colSpan="4" className="px-6 py-4 text-center text-gray-500">No items</td></tr>}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-right font-medium">Order Total:</td>
                  <td className="px-6 py-4 text-right font-bold text-lg">{formatCurrency(delivery.order?.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Delivery Timeline</h2>
            <div className="space-y-4">
              {[
                { status: 'created', label: 'Delivery Created', time: delivery.created_at, done: true },
                { status: 'assigned', label: 'Driver Assigned', time: delivery.assigned_at, done: ['assigned', 'in-transit', 'delivered'].includes(delivery.status) },
                { status: 'in-transit', label: 'Out for Delivery', time: delivery.started_at, done: ['in-transit', 'delivered'].includes(delivery.status) },
                { status: 'delivered', label: 'Delivered', time: delivery.delivered_at, done: delivery.status === 'delivered' },
              ].map((step, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.done ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {step.done ? <CheckCircleIcon className="h-5 w-5 text-green-600" /> : <div className="w-2 h-2 rounded-full bg-gray-400"></div>}
                  </div>
                  <div>
                    <p className={`font-medium ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                    <p className="text-sm text-gray-500">{step.time ? `${formatDate(step.time)} at ${formatTime(step.time)}` : 'Pending'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              {delivery.status === 'assigned' && (
                <button onClick={handleStartDelivery} disabled={updating} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center">
                  <TruckIcon className="h-5 w-5 mr-2" />Start Delivery
                </button>
              )}
              {delivery.status === 'in-transit' && (
                <>
                  <button onClick={handleDelivered} disabled={updating} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center">
                    <CheckCircleIcon className="h-5 w-5 mr-2" />Mark Delivered
                  </button>
                  <button onClick={() => setFailureModal(true)} disabled={updating} className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center">
                    <XCircleIcon className="h-5 w-5 mr-2" />Mark Failed
                  </button>
                </>
              )}
              {['delivered', 'failed'].includes(delivery.status) && (
                <div className="text-center py-4 text-gray-500">
                  <p>Delivery completed</p>
                </div>
              )}
            </div>
          </div>

          {/* Proof of Delivery */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Proof of Delivery</h2>
            {delivery.status === 'delivered' ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <CameraIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Delivery photo captured</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Received by</p>
                  <p className="font-medium">{delivery.received_by || 'N/A'}</p>
                </div>
                {delivery.signature_url && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Signature</p>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <img src={delivery.signature_url} alt="Signature" className="max-h-20" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Proof of delivery will be available once delivered</p>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Notes</h2>
            <p className="text-gray-600">{delivery.notes || 'No delivery notes'}</p>
            {delivery.failure_reason && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-800">Failure Reason:</p>
                <p className="text-red-700">{delivery.failure_reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Failure Modal */}
      {failureModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setFailureModal(false)}></div>
            <div className="relative bg-white rounded-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Mark Delivery as Failed</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Failure *</label>
                <textarea rows="4" value={failureReason} onChange={(e) => setFailureReason(e.target.value)} placeholder="Describe why the delivery failed..." className="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
              </div>
              <div className="flex justify-end gap-4">
                <button onClick={() => setFailureModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleFailed} disabled={updating} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">{updating ? 'Updating...' : 'Confirm Failed'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
