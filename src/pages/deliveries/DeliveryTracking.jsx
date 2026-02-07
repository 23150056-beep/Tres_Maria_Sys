import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TruckIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

const statusColors = {
  scheduled: { bg: 'bg-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-400' },
  loading: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  in_transit: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400 animate-pulse' },
  delivered: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-400' },
  failed: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400' },
  pending: { bg: 'bg-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-400' }
};

function GlassCard({ children, className = '' }) {
  return (
    <div className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl ${className}`}>
      {children}
    </div>
  );
}

export default function DeliveryTracking() {
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const response = await api.get('/dashboard/delivery-tracking');
      setTrackingData(response.data);
      
      // Auto-select first in-transit delivery
      if (!selectedDelivery && response.data.activeDeliveries?.length > 0) {
        setSelectedDelivery(response.data.activeDeliveries[0]);
      }
    } catch (error) {
      toast.error('Failed to load delivery tracking data');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 15 seconds for real-time updates
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto"></div>
          <p className="text-white/70 mt-4">Loading delivery tracking...</p>
        </div>
      </div>
    );
  }

  const { activeDeliveries, driverLocations, todayStats } = trackingData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPinIcon className="h-7 w-7 text-cyan-400" />
            Live Delivery Tracking
          </h1>
          <p className="text-white/60 mt-1">Real-time driver and delivery status monitoring</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <GlassCard className="p-4">
          <p className="text-white/60 text-sm">Total Deliveries</p>
          <p className="text-2xl font-bold text-white">{todayStats?.total_deliveries || 0}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-white/60 text-sm">Scheduled</p>
          <p className="text-2xl font-bold text-gray-400">{todayStats?.scheduled || 0}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-white/60 text-sm">In Transit</p>
          <p className="text-2xl font-bold text-blue-400">{todayStats?.in_transit || 0}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-white/60 text-sm">Completed</p>
          <p className="text-2xl font-bold text-green-400">{todayStats?.completed || 0}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-white/60 text-sm">Stop Progress</p>
          <p className="text-2xl font-bold text-white">
            {todayStats?.stops_delivered || 0}/{todayStats?.total_stops || 0}
          </p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Deliveries List */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Active Deliveries</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {activeDeliveries?.length > 0 ? (
              activeDeliveries.map((delivery) => (
                <button
                  key={delivery.id}
                  onClick={() => setSelectedDelivery(delivery)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedDelivery?.id === delivery.id
                      ? 'bg-purple-500/20 border-purple-500'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{delivery.delivery_number}</span>
                    <span className={`w-3 h-3 rounded-full ${statusColors[delivery.status]?.dot}`}></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60 mb-1">
                    <UserIcon className="h-4 w-4" />
                    {delivery.driver_name || 'Unassigned'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60 mb-1">
                    <TruckIcon className="h-4 w-4" />
                    {delivery.plate_number || 'No vehicle'}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[delivery.status]?.bg} ${statusColors[delivery.status]?.text}`}>
                      {delivery.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-white/50">
                      {delivery.completed_stops}/{delivery.total_stops} stops
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8">
                <TruckIcon className="h-12 w-12 text-white/20 mx-auto mb-2" />
                <p className="text-white/60">No active deliveries</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Delivery Details & Map Placeholder */}
        <GlassCard className="p-6 lg:col-span-2">
          {selectedDelivery ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {selectedDelivery.delivery_number}
                </h3>
                <Link
                  to={`/deliveries/${selectedDelivery.id}`}
                  className="text-purple-400 hover:text-purple-300 text-sm"
                >
                  View Full Details →
                </Link>
              </div>

              {/* Driver Info */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{selectedDelivery.driver_name || 'Unassigned'}</p>
                    <p className="text-sm text-white/60">{selectedDelivery.plate_number}</p>
                  </div>
                  {selectedDelivery.driver_phone && (
                    <a
                      href={`tel:${selectedDelivery.driver_phone}`}
                      className="p-2 bg-green-500/20 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      <PhoneIcon className="h-5 w-5 text-green-400" />
                    </a>
                  )}
                </div>
                {selectedDelivery.last_location_update && (
                  <p className="text-xs text-white/40 mt-2 flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    Last updated: {new Date(selectedDelivery.last_location_update).toLocaleTimeString('en-PH')}
                  </p>
                )}
              </div>

              {/* Map Placeholder */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl h-48 mb-4 flex items-center justify-center border border-white/10">
                <div className="text-center">
                  <MapPinIcon className="h-12 w-12 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40">Map integration available</p>
                  <p className="text-xs text-white/30">GPS: {selectedDelivery.current_latitude?.toFixed(4)}, {selectedDelivery.current_longitude?.toFixed(4)}</p>
                </div>
              </div>

              {/* Delivery Stops */}
              <h4 className="font-medium text-white mb-3">Delivery Stops</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedDelivery.stops?.map((stop, index) => (
                  <div
                    key={stop.id}
                    className={`p-3 rounded-lg border ${
                      stop.status === 'delivered' ? 'bg-green-500/10 border-green-500/30' :
                      stop.status === 'failed' ? 'bg-red-500/10 border-red-500/30' :
                      stop.status === 'in_transit' ? 'bg-blue-500/10 border-blue-500/30' :
                      'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        stop.status === 'delivered' ? 'bg-green-500 text-white' :
                        stop.status === 'failed' ? 'bg-red-500 text-white' :
                        stop.status === 'in_transit' ? 'bg-blue-500 text-white animate-pulse' :
                        'bg-white/20 text-white'
                      }`}>
                        {stop.status === 'delivered' ? '✓' : stop.sequence_number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{stop.client_name}</p>
                        <p className="text-xs text-white/50 truncate">{stop.delivery_address}</p>
                      </div>
                      {stop.order_number && (
                        <span className="text-xs text-purple-400">{stop.order_number}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <TruckIcon className="h-16 w-16 text-white/20 mx-auto mb-3" />
                <p className="text-white/60">Select a delivery to view details</p>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Driver Locations Summary */}
      {driverLocations?.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Active Drivers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {driverLocations.map((driver) => (
              <div
                key={driver.driver_id}
                className="p-4 bg-white/5 rounded-xl border border-white/10"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    driver.status === 'on_delivery' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                  }`}></div>
                  <span className="font-medium text-white">{driver.driver_name}</span>
                </div>
                {driver.delivery_number && (
                  <p className="text-sm text-purple-400">{driver.delivery_number}</p>
                )}
                <p className="text-xs text-white/40 mt-1">
                  Updated: {new Date(driver.last_location_update).toLocaleTimeString('en-PH')}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
