import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, MapPinIcon, TruckIcon, ClockIcon, PlusIcon, TrashIcon, ArrowsUpDownIcon, XMarkIcon, PhoneIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function DeliveryRoutes() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [trackingModal, setTrackingModal] = useState(null);
  const [newRoute, setNewRoute] = useState({ date: new Date().toISOString().split('T')[0], vehicle_id: '', driver_id: '', deliveries: [] });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [deliveriesRes] = await Promise.all([
        api.get('/deliveries?status=pending,assigned'),
      ]);
      setPendingDeliveries(deliveriesRes.data.deliveries || []);
      // Mock data for demo
      setVehicles([{ id: 1, name: 'Truck 001 - Isuzu Elf' }, { id: 2, name: 'Truck 002 - Mitsubishi Canter' }, { id: 3, name: 'Van 001 - Toyota Hiace' }]);
      setDrivers([{ id: 1, name: 'Juan Dela Cruz' }, { id: 2, name: 'Pedro Santos' }, { id: 3, name: 'Maria Garcia' }]);
      setRoutes([
        { id: 1, date: new Date().toISOString(), vehicle: 'Truck 001', driver: 'Juan Dela Cruz', deliveries: 5, status: 'in-progress', distance: '45 km', estimated_time: '3h 30m' },
        { id: 2, date: new Date().toISOString(), vehicle: 'Van 001', driver: 'Pedro Santos', deliveries: 3, status: 'planned', distance: '28 km', estimated_time: '2h 15m' },
      ]);
    } catch (e) { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const toggleDeliverySelection = (deliveryId) => {
    setNewRoute(prev => ({
      ...prev,
      deliveries: prev.deliveries.includes(deliveryId)
        ? prev.deliveries.filter(id => id !== deliveryId)
        : [...prev.deliveries, deliveryId]
    }));
  };

  const optimizeRoute = () => {
    toast.success('Route optimized! (Demo)');
    // In production, this would call a routing optimization API
  };

  const handleCreateRoute = async () => {
    if (!newRoute.vehicle_id || !newRoute.driver_id) { toast.error('Select vehicle and driver'); return; }
    if (newRoute.deliveries.length === 0) { toast.error('Select at least one delivery'); return; }
    setSubmitting(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Route created successfully');
      setCreateModal(false);
      setNewRoute({ date: new Date().toISOString().split('T')[0], vehicle_id: '', driver_id: '', deliveries: [] });
      fetchData();
    } catch (error) { toast.error('Failed to create route'); }
    finally { setSubmitting(false); }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });

  const statusColors = {
    planned: 'bg-blue-100 text-blue-800',
    'in-progress': 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/deliveries')} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeftIcon className="h-5 w-5" /></button>
          <h1 className="text-2xl font-bold text-gray-900">Route Planning</h1>
        </div>
        <button onClick={() => setCreateModal(true)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <PlusIcon className="h-5 w-5 mr-2" />Create Route
        </button>
      </div>

      {/* Today's Routes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {routes.map(route => (
          <div key={route.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{route.vehicle}</h3>
                <p className="text-sm text-gray-500">Driver: {route.driver}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[route.status]}`}>{route.status.replace('-', ' ')}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <TruckIcon className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                <p className="text-lg font-semibold">{route.deliveries}</p>
                <p className="text-xs text-gray-500">Stops</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <MapPinIcon className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                <p className="text-lg font-semibold">{route.distance}</p>
                <p className="text-xs text-gray-500">Distance</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <ClockIcon className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                <p className="text-lg font-semibold">{route.estimated_time}</p>
                <p className="text-xs text-gray-500">Est. Time</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">View Details</button>
              <button 
                onClick={() => setTrackingModal(route)} 
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Track Live
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Deliveries */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Unassigned Deliveries</h2>
          <p className="text-sm text-gray-500">{pendingDeliveries.filter(d => d.status === 'pending').length} deliveries waiting for route assignment</p>
        </div>
        <div className="p-6">
          {pendingDeliveries.filter(d => d.status === 'pending').length === 0 ? (
            <p className="text-center text-gray-500 py-8">All deliveries have been assigned to routes</p>
          ) : (
            <div className="space-y-3">
              {pendingDeliveries.filter(d => d.status === 'pending').slice(0, 5).map(delivery => (
                <div key={delivery.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <MapPinIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{delivery.order?.client?.business_name || 'Client'}</p>
                      <p className="text-sm text-gray-500">{delivery.delivery_address || delivery.order?.client?.address}</p>
                    </div>
                  </div>
                  <button className="px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50">Assign</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Route Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setCreateModal(false)}></div>
            <div className="relative bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-6">Create Delivery Route</h2>
              
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" value={newRoute.date} onChange={(e) => setNewRoute({ ...newRoute, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                    <select value={newRoute.vehicle_id} onChange={(e) => setNewRoute({ ...newRoute, vehicle_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="">Select vehicle</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                    <select value={newRoute.driver_id} onChange={(e) => setNewRoute({ ...newRoute, driver_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="">Select driver</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Select Deliveries ({newRoute.deliveries.length} selected)</label>
                  <button onClick={optimizeRoute} disabled={newRoute.deliveries.length < 2} className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400">
                    <ArrowsUpDownIcon className="h-4 w-4 mr-1" />Optimize Order
                  </button>
                </div>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {pendingDeliveries.filter(d => d.status === 'pending').map(delivery => (
                    <label key={delivery.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                      <input type="checkbox" checked={newRoute.deliveries.includes(delivery.id)} onChange={() => toggleDeliverySelection(delivery.id)} className="h-4 w-4 text-blue-600 rounded mr-3" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{delivery.order?.client?.business_name || 'Client'}</p>
                        <p className="text-xs text-gray-500">{delivery.delivery_address || 'Address'}</p>
                      </div>
                    </label>
                  ))}
                  {pendingDeliveries.filter(d => d.status === 'pending').length === 0 && (
                    <p className="p-4 text-center text-gray-500 text-sm">No pending deliveries available</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button onClick={() => setCreateModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreateRoute} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? 'Creating...' : 'Create Route'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Tracking Modal */}
      {trackingModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setTrackingModal(null)}></div>
            <div className="relative bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                    <TruckIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-semibold">{trackingModal.vehicle} - Live Tracking</h2>
                    <p className="text-sm text-blue-100">Driver: {trackingModal.driver}</p>
                  </div>
                </div>
                <button onClick={() => setTrackingModal(null)} className="p-2 hover:bg-white/20 rounded-lg">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3">
                {/* Map Area */}
                <div className="lg:col-span-2 h-96 bg-gray-100 relative">
                  {/* Simulated Map */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100">
                    <svg className="w-full h-full" viewBox="0 0 400 300">
                      {/* Roads */}
                      <path d="M50,150 L350,150" stroke="#d1d5db" strokeWidth="8" fill="none" />
                      <path d="M200,50 L200,250" stroke="#d1d5db" strokeWidth="8" fill="none" />
                      <path d="M100,80 L300,220" stroke="#e5e7eb" strokeWidth="4" fill="none" />
                      
                      {/* Route line */}
                      <path d="M80,150 L150,150 L200,100 L280,100 L320,150" stroke="#3b82f6" strokeWidth="3" fill="none" strokeDasharray="8,4" />
                      
                      {/* Delivery stops */}
                      <circle cx="80" cy="150" r="8" fill="#22c55e" />
                      <text x="80" y="175" textAnchor="middle" className="text-xs" fill="#374151">Start</text>
                      
                      <circle cx="150" cy="150" r="8" fill="#22c55e" />
                      <text x="150" y="175" textAnchor="middle" className="text-xs" fill="#374151">Stop 1 ✓</text>
                      
                      <circle cx="200" cy="100" r="8" fill="#22c55e" />
                      <text x="200" y="85" textAnchor="middle" className="text-xs" fill="#374151">Stop 2 ✓</text>
                      
                      <circle cx="280" cy="100" r="8" fill="#f59e0b" />
                      <text x="280" y="85" textAnchor="middle" className="text-xs" fill="#374151">Stop 3</text>
                      
                      <circle cx="320" cy="150" r="8" fill="#d1d5db" />
                      <text x="320" y="175" textAnchor="middle" className="text-xs" fill="#374151">Stop 4</text>
                      
                      {/* Truck icon (current position) */}
                      <g transform="translate(240, 95)">
                        <circle cx="0" cy="0" r="12" fill="#3b82f6" />
                        <path d="M-6,-3 L6,-3 L6,3 L-6,3 Z M6,-2 L9,0 L9,3 L6,3 Z" fill="white" transform="scale(0.8)" />
                        <circle cx="0" cy="0" r="16" fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.5">
                          <animate attributeName="r" from="12" to="20" dur="1.5s" repeatCount="indefinite" />
                          <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                      </g>
                    </svg>
                  </div>
                  
                  {/* Status badge */}
                  <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-sm font-medium">Live Tracking Active</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Last updated: Just now</p>
                  </div>

                  {/* ETA badge */}
                  <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3">
                    <p className="text-xs text-gray-500">Next Stop ETA</p>
                    <p className="text-lg font-bold text-blue-600">12 mins</p>
                  </div>
                </div>

                {/* Stops List */}
                <div className="border-l overflow-y-auto max-h-96">
                  <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Delivery Stops</h3>
                    <p className="text-sm text-gray-500">2 of {trackingModal.deliveries} completed</p>
                  </div>
                  <div className="divide-y">
                    {[
                      { name: 'Warehouse (Start)', address: 'San Fernando City', status: 'completed', time: '8:00 AM' },
                      { name: 'Sari-Sari Store ni Aling Nena', address: '123 Rizal St, San Fernando', status: 'completed', time: '8:45 AM' },
                      { name: 'JM Grocery', address: '456 Quezon Ave, Bauang', status: 'completed', time: '9:30 AM' },
                      { name: 'Northpoint Supermarket', address: '789 National Highway', status: 'current', time: '~10:15 AM' },
                      { name: 'Metro Fresh Mart', address: '654 Governor Luna St', status: 'pending', time: '~11:00 AM' },
                    ].map((stop, idx) => (
                      <div key={idx} className={`p-4 ${stop.status === 'current' ? 'bg-blue-50' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            stop.status === 'completed' ? 'bg-green-100 text-green-600' :
                            stop.status === 'current' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {stop.status === 'completed' ? <CheckCircleIcon className="h-4 w-4" /> : <span className="text-xs font-medium">{idx + 1}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${stop.status === 'current' ? 'text-blue-900' : 'text-gray-900'}`}>{stop.name}</p>
                            <p className="text-xs text-gray-500 truncate">{stop.address}</p>
                            <p className="text-xs text-gray-400 mt-1">{stop.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <a 
                    href="tel:+639171234567" 
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    onClick={() => alert('Calling driver: +63 917 123 4567\n\nOn a real device, this would open the phone dialer.')}
                  >
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    Call Driver
                  </a>
                  <span className="text-sm text-gray-500">Driver's phone: +63 917 123 4567</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Progress</p>
                  <p className="font-semibold text-gray-900">2/{trackingModal.deliveries} deliveries • 40% complete</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
