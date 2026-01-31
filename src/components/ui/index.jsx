/**
 * REUSABLE UI COMPONENTS
 * ======================
 * Consistent, simple components used throughout the application.
 * 
 * Principles: Simplicity, Consistency, Reusability
 */

import { forwardRef } from 'react';
import { getStatusColor } from '../config';

// ===================
// LOADING SPINNER
// ===================
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizes[size]} ${className}`} />
  );
};

// ===================
// PAGE LOADER
// ===================
export const PageLoader = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center h-64 gap-4">
    <Spinner size="lg" />
    <p className="text-gray-500">{message}</p>
  </div>
);

// ===================
// STATUS BADGE
// ===================
export const StatusBadge = ({ status, className = '' }) => {
  const colorClass = getStatusColor(status);
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${colorClass} ${className}`}>
      {status?.replace(/-/g, ' ') || 'Unknown'}
    </span>
  );
};

// ===================
// CARD COMPONENT
// ===================
export const Card = ({ children, className = '', padding = true }) => (
  <div className={`bg-white rounded-xl shadow-sm ${padding ? 'p-6' : ''} ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, action, children }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
    {children}
  </div>
);

// ===================
// BUTTON COMPONENT
// ===================
export const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  disabled = false,
  className = '',
  ...props 
}, ref) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-100',
    success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-colors duration-150 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-2 border-current" />}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

// ===================
// INPUT COMPONENT
// ===================
export const Input = forwardRef(({ 
  label, 
  error, 
  className = '',
  ...props 
}, ref) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
    )}
    <input
      ref={ref}
      className={`
        w-full px-3 py-2 border rounded-lg
        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        disabled:bg-gray-100 disabled:cursor-not-allowed
        ${error ? 'border-red-500' : 'border-gray-300'}
      `}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
));

Input.displayName = 'Input';

// ===================
// SELECT COMPONENT
// ===================
export const Select = forwardRef(({ 
  label, 
  error, 
  options = [], 
  placeholder = 'Select...',
  className = '',
  ...props 
}, ref) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
    )}
    <select
      ref={ref}
      className={`
        w-full px-3 py-2 border rounded-lg
        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        disabled:bg-gray-100 disabled:cursor-not-allowed
        ${error ? 'border-red-500' : 'border-gray-300'}
      `}
      {...props}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
));

Select.displayName = 'Select';

// ===================
// EMPTY STATE
// ===================
export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action 
}) => (
  <div className="text-center py-12">
    {Icon && (
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
    )}
    <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
    {description && <p className="text-gray-500 mb-4">{description}</p>}
    {action}
  </div>
);

// ===================
// CONFIRM MODAL
// ===================
export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              {cancelText}
            </Button>
            <Button variant={variant} onClick={onConfirm}>
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===================
// STATS CARD
// ===================
export const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue,
  color = 'blue' 
}) => {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`${colors[color]} p-3 rounded-lg`}>
            <Icon className="h-8 w-8 text-white" />
          </div>
        )}
      </div>
    </Card>
  );
};

export default {
  Spinner,
  PageLoader,
  StatusBadge,
  Card,
  CardHeader,
  Button,
  Input,
  Select,
  EmptyState,
  ConfirmModal,
  StatCard,
};
