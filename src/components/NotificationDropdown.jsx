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
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    baseLink: '/inventory/alerts',
  },
  out_of_stock: {
    icon: CubeIcon,
    color: 'text-red-600',
    bg: 'bg-red-50',
    baseLink: '/inventory/alerts',
  },
  new_order: {
    icon: ShoppingCartIcon,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    baseLink: '/orders',
  },
  order_completed: {
    icon: CheckCircleIcon,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    baseLink: '/orders',
  },
  delivery_scheduled: {
    icon: TruckIcon,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    baseLink: '/deliveries',
  },
  delivery_completed: {
    icon: TruckIcon,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    baseLink: '/deliveries',
  },
  delivery_failed: {
    icon: TruckIcon,
    color: 'text-red-600',
    bg: 'bg-red-50',
    baseLink: '/deliveries',
  },
  payment_received: {
    icon: BanknotesIcon,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    baseLink: '/orders',
  },
  payment_due: {
    icon: BanknotesIcon,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    baseLink: '/orders',
  },
  new_client: {
    icon: UserGroupIcon,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    baseLink: '/clients',
  },
  system: {
    icon: BellIcon,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    baseLink: null,
  },
  reminder: {
    icon: ClockIcon,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    baseLink: null,
  },
};

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
    onClose();
  };

  const content = (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors duration-150 cursor-pointer ${
        notification.read 
          ? 'hover:bg-slate-50' 
          : 'bg-primary-50/50 hover:bg-primary-50 border-l-2 border-primary-500'
      }`}
    >
      <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.read ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-slate-400">{formatTimeAgo(notification.timestamp)}</p>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        {!notification.read && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMarkRead(notification.id); }}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors"
            title="Mark as read"
          >
            <CheckIcon className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(notification.id); }}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
          title="Delete"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  if (link) {
    return (
      <Link to={link} onClick={handleClick} className="block">
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-colors duration-150 relative ${
          isOpen 
            ? 'bg-slate-100 text-slate-700' 
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
        }`}
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="h-5 w-5" />
        ) : (
          <BellIcon className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-primary-50 text-primary-700 text-[10px] rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <div className="p-3 rounded-xl bg-slate-50 mb-3">
                  <BellIcon className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-slate-500 text-sm">No notifications yet</p>
                <p className="text-slate-400 text-xs mt-0.5">You're all caught up!</p>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
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

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100">
              <p className="text-center text-[11px] text-slate-400">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
