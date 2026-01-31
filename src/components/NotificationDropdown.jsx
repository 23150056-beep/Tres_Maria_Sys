import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BellIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
  TruckIcon,
  CubeIcon,
  BanknotesIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import useNotificationStore from '../stores/notificationStore';

// Notification type icons and colors
const notificationConfig = {
  low_stock: {
    icon: ExclamationTriangleIcon,
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    baseLink: '/inventory/alerts',
  },
  out_of_stock: {
    icon: CubeIcon,
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    baseLink: '/inventory/alerts',
  },
  new_order: {
    icon: ShoppingCartIcon,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    baseLink: '/orders',
  },
  order_completed: {
    icon: CheckCircleIcon,
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    baseLink: '/orders',
  },
  delivery_scheduled: {
    icon: TruckIcon,
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    baseLink: '/deliveries',
  },
  delivery_completed: {
    icon: TruckIcon,
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    baseLink: '/deliveries',
  },
  delivery_failed: {
    icon: TruckIcon,
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    baseLink: '/deliveries',
  },
  payment_received: {
    icon: BanknotesIcon,
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    baseLink: '/orders',
  },
  payment_due: {
    icon: BanknotesIcon,
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    baseLink: '/orders',
  },
  new_client: {
    icon: UserGroupIcon,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    baseLink: '/clients',
  },
  system: {
    icon: BellIcon,
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    baseLink: null,
  },
  reminder: {
    icon: ClockIcon,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/20',
    baseLink: null,
  },
};

// Generate specific link based on notification type and data
function getNotificationLink(notification) {
  const config = notificationConfig[notification.type] || notificationConfig.system;
  const data = notification.data || {};
  
  switch (notification.type) {
    case 'new_order':
    case 'order_completed':
    case 'payment_due':
    case 'payment_received':
      return data.orderId ? `/orders/${data.orderId}` : config.baseLink;
    
    case 'delivery_scheduled':
    case 'delivery_completed':
    case 'delivery_failed':
      return data.deliveryId ? `/deliveries/${data.deliveryId}` : config.baseLink;
    
    case 'low_stock':
    case 'out_of_stock':
      // Link to inventory alerts page - could be enhanced to show specific product
      return data.productId ? `/inventory?product=${data.productId}` : config.baseLink;
    
    case 'new_client':
      return data.clientId ? `/clients/${data.clientId}` : config.baseLink;
    
    default:
      return config.baseLink;
  }
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function NotificationItem({ notification, onMarkRead, onDelete, onClose }) {
  const config = notificationConfig[notification.type] || notificationConfig.system;
  const Icon = config.icon;
  const link = getNotificationLink(notification);

  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    onClose(); // Close dropdown when navigating
  };

  const content = (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer ${
        notification.read 
          ? 'bg-white/5 hover:bg-white/10' 
          : 'bg-purple-500/10 hover:bg-purple-500/20 border-l-2 border-purple-500'
      }`}
    >
      <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
        <Icon className={`h-5 w-5 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.read ? 'text-white/70' : 'text-white font-medium'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{notification.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-white/40">{formatTimeAgo(notification.timestamp)}</p>
          {link && (
            <span className="text-xs text-purple-400/70">Click to view →</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        {!notification.read && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-green-400 transition-colors"
            title="Mark as read"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  // Always make clickable if there's a link
  if (link) {
    return (
      <Link 
        to={link} 
        onClick={handleClick}
        className="block"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotificationStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-xl transition-all duration-200 relative ${
          isOpen 
            ? 'bg-purple-500/20 text-purple-400' 
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="h-6 w-6" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-red-500/50 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <BellSolidIcon className="h-5 w-5 text-purple-400" />
              <h3 className="text-white font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-2 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="px-2 py-1 text-xs text-white/60 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="p-4 rounded-full bg-white/5 mb-4">
                  <BellIcon className="h-8 w-8 text-white/30" />
                </div>
                <p className="text-white/50 text-sm">No notifications yet</p>
                <p className="text-white/30 text-xs mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={markAsRead}
                    onDelete={deleteNotification}
                    onClose={() => setIsOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-white/10">
              <p className="text-center text-xs text-white/40">
                Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
