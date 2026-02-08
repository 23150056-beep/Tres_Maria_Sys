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
    pending: { color: 'bg-slate-100 text-slate-600', label: 'Pending' },
    assigned: { color: 'bg-blue-50 text-blue-700', label: 'Assigned' },
    'in-transit': { color: 'bg-amber-50 text-amber-700', label: 'In Transit' },
    delivered: { color: 'bg-emerald-50 text-emerald-700', label: 'Delivered' },
    failed: { color: 'bg-red-50 text-red-700', label: 'Failed' },
    returned: { color: 'bg-orange-50 text-orange-700', label: 'Returned' },
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div>;
  if (!delivery) return <div className="text-center py-12 text-slate-500">Delivery not found</div>;

  const config = statusConfig[delivery.status] || statusConfig.pending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/deliveries')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><ArrowLeftIcon className="h-5 w-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{delivery.delivery_number || `DEL-${String(delivery.id).padStart(6, '0')}`}</h1>
            <p className="text-slate-500">Order: {delivery.order?.order_number}</p>
          </div>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${config.color}`}>{config.label}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Info */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Delivery Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500">Client</p>
                <p className="font-medium text-slate-900">{delivery.order?.client?.business_name || '-'}</p>
                <p className="text-sm text-slate-500">{delivery.order?.client?.contact_person}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Contact</p>
                <p className="font-medium text-slate-900 flex items-center"><PhoneIcon className="h-4 w-4 mr-2" />{delivery.order?.client?.phone || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-500">Delivery Address</p>
                <p className="font-medium text-slate-900 flex items-start"><MapPinIcon className="h-4 w-4 mr-2 mt-1 flex-shrink-0" />{delivery.delivery_address || delivery.order?.client?.address || '-'}</p>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Schedule & Assignment</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <ClockIcon className="h-5 w-5 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">Scheduled Date</p>
                <p className="font-medium text-slate-900">{formatDate(delivery.scheduled_date)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <ClockIcon className="h-5 w-5 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">Scheduled Time</p>
                <p className="font-medium text-slate-900">{formatTime(delivery.scheduled_date)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <TruckIcon className="h-5 w-5 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">Vehicle</p>
                <p className="font-medium text-slate-900">{delivery.vehicle?.plate_number || '-'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <TruckIcon className="h-5 w-5 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">Driver</p>
                <p className="font-medium text-slate-900">{delivery.driver?.name || delivery.driver_name || '-'}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Order Items</h2>
            </div>
            <table className="glass-table">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {delivery.order?.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 text-slate-900">{item.product?.name || `Product #${item.product_id}`}</td>
                    <td className="px-6 py-4 text-slate-900">{item.quantity} {item.product?.unit}</td>
                    <td className="px-6 py-4 text-right text-slate-900">{formatCurrency(item.unit_price)}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(item.total_price)}</td>
                  </tr>
                )) || <tr><td colSpan="4" className="px-6 py-4 text-center text-slate-500">No items</td></tr>}
              </tbody>
              <tfoot className="border-t border-slate-200">
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-right font-medium text-slate-900">Order Total:</td>
                  <td className="px-6 py-4 text-right font-bold text-lg text-slate-900">{formatCurrency(delivery.order?.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Timeline */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Delivery Timeline</h2>
            <div className="space-y-4">
              {[
                { status: 'created', label: 'Delivery Created', time: delivery.created_at, done: true },
                { status: 'assigned', label: 'Driver Assigned', time: delivery.assigned_at, done: ['assigned', 'in-transit', 'delivered'].includes(delivery.status) },
                { status: 'in-transit', label: 'Out for Delivery', time: delivery.started_at, done: ['in-transit', 'delivered'].includes(delivery.status) },
                { status: 'delivered', label: 'Delivered', time: delivery.delivered_at, done: delivery.status === 'delivered' },
              ].map((step, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.done ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                    {step.done ? <CheckCircleIcon className="h-5 w-5 text-emerald-600" /> : <div className="w-2 h-2 rounded-full bg-white/40"></div>}
                  </div>
                  <div>
                    <p className={`font-medium ${step.done ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                    <p className="text-sm text-slate-500">{step.time ? `${formatDate(step.time)} at ${formatTime(step.time)}` : 'Pending'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions</h2>
            <div className="space-y-3">
              {delivery.status === 'assigned' && (
                <button onClick={handleStartDelivery} disabled={updating} className="btn-primary w-full flex items-center justify-center disabled:opacity-50">
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
                <div className="text-center py-4 text-slate-500">
                  <p>Delivery completed</p>
                </div>
              )}
            </div>
          </div>

          {/* Proof of Delivery */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Proof of Delivery</h2>
            {delivery.status === 'delivered' ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg text-center">
                  <CameraIcon className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Delivery photo captured</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Received by</p>
                  <p className="font-medium text-slate-900">{delivery.received_by || 'N/A'}</p>
                </div>
                {delivery.signature_url && (
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Signature</p>
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <img src={delivery.signature_url} alt="Signature" className="max-h-20" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">Proof of delivery will be available once delivered</p>
            )}
          </div>

          {/* Notes */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Notes</h2>
            <p className="text-slate-500">{delivery.notes || 'No delivery notes'}</p>
            {delivery.failure_reason && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-600">Failure Reason:</p>
                <p className="text-red-300">{delivery.failure_reason}</p>
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
            <div className="relative glass-card max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Mark Delivery as Failed</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-500 mb-2">Reason for Failure *</label>
                <textarea rows="4" value={failureReason} onChange={(e) => setFailureReason(e.target.value)} placeholder="Describe why the delivery failed..." className="form-input w-full"></textarea>
              </div>
              <div className="flex justify-end gap-4">
                <button onClick={() => setFailureModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleFailed} disabled={updating} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">{updating ? 'Updating...' : 'Confirm Failed'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
