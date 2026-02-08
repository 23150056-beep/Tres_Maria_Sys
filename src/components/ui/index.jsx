/**
 * REUSABLE UI COMPONENTS
 * ======================
 * Consistent, minimal, professional components used throughout the application.
 * Consumer Goods Distribution & Delivery Operation Management System
 */

import { forwardRef } from 'react';
import { getStatusColor } from '../../config';

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
    <div className={`animate-spin rounded-full border-[3px] border-primary-600 border-t-transparent ${sizes[size]} ${className}`} />
  );
};

// ===================
// PAGE LOADER
// ===================
export const PageLoader = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center h-64 gap-3">
    <Spinner size="lg" />
    <p className="text-slate-500 text-sm">{message}</p>
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
  <div className={`bg-white rounded-xl border border-slate-200 shadow-card ${padding ? 'p-6' : ''} ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, action, children }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
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
    primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary-300 shadow-sm',
    secondary: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 disabled:bg-slate-100 disabled:text-slate-400',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-300 shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300 shadow-sm',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400',
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
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
    )}
    <input
      ref={ref}
      className={`
        w-full px-3.5 py-2.5 border rounded-lg text-slate-900
        focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
        disabled:bg-slate-50 disabled:cursor-not-allowed
        placeholder-slate-400 transition-all
        ${error ? 'border-red-400' : 'border-slate-300'}
      `}
      {...props}
    />
    {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
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
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
    )}
    <select
      ref={ref}
      className={`
        w-full px-3.5 py-2.5 border rounded-lg text-slate-900
        focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
        disabled:bg-slate-50 disabled:cursor-not-allowed
        transition-all
        ${error ? 'border-red-400' : 'border-slate-300'}
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
    {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
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
      <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>
    )}
    <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
    {description && <p className="text-sm text-slate-500 mb-4">{description}</p>}
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
        <div className="fixed inset-0 bg-black/40 transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-600 text-sm mb-6">{message}</p>
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
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    yellow: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-violet-50 text-violet-600',
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${colors[color]}`}>
            <Icon className="h-6 w-6" />
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
