/**
 * CENTRALIZED CONFIGURATION
 * ========================
 * Single source of truth for all system settings.
 * Change values here to affect the entire application.
 * 
 * Principles: Reliability, Maintainability, Simplicity
 */

// Environment detection
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

export const config = {
  // ===================
  // APP SETTINGS
  // ===================
  app: {
    name: 'Tres Marias Distribution System',
    shortName: 'TM System',
    version: '1.0.0',
    company: 'Tres Marias Marketing',
    location: 'San Fernando City, La Union, Philippines',
    currency: 'PHP',
    locale: 'en-PH',
  },

  // ===================
  // API SETTINGS
  // ===================
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 30000, // 30 seconds
    useMock: true, // Toggle mock/real API
  },

  // ===================
  // AUTH SETTINGS
  // ===================
  auth: {
    tokenKey: 'token',
    userKey: 'mock-user',
    sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
  },

  // ===================
  // DATA PERSISTENCE
  // ===================
  storage: {
    enabled: true, // Enable localStorage persistence
    prefix: 'tm_', // Prefix for all stored keys
    keys: {
      orders: 'tm_orders',
      clients: 'tm_clients',
      products: 'tm_products',
      inventory: 'tm_inventory',
      deliveries: 'tm_deliveries',
      distributionPlans: 'tm_distribution_plans',
    },
  },

  // ===================
  // UI SETTINGS
  // ===================
  ui: {
    pageSize: 10, // Default items per page
    toastDuration: 3000, // Toast notification duration
    debounceDelay: 300, // Search debounce delay
    dateFormat: 'en-PH',
    animations: true,
  },

  // ===================
  // BUSINESS RULES
  // ===================
  business: {
    // Pricing tiers
    pricingTiers: ['Regular', 'Wholesale', 'Distributor', 'VIP'],
    
    // Order statuses with flow
    orderStatuses: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    
    // Delivery statuses
    deliveryStatuses: ['pending', 'assigned', 'in-transit', 'delivered', 'failed'],
    
    // Distribution plan statuses
    planStatuses: ['draft', 'approved', 'executing', 'completed', 'cancelled'],
    
    // Default credit limits by tier
    creditLimits: {
      Regular: 10000,
      Wholesale: 50000,
      Distributor: 200000,
      VIP: 500000,
    },
    
    // Stock alert thresholds
    stockAlerts: {
      lowStockPercent: 0.25, // 25% of reorder level
      criticalStockPercent: 0.10, // 10% of reorder level
    },
  },

  // ===================
  // VALIDATION RULES
  // ===================
  validation: {
    phone: /^(\+63|0)?[0-9]{10,11}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    minPasswordLength: 6,
    maxNameLength: 100,
    maxAddressLength: 255,
  },

  // ===================
  // FEATURE FLAGS
  // ===================
  features: {
    liveTracking: true,
    exportReports: true,
    emailNotifications: false, // Not yet implemented
    smsNotifications: false, // Not yet implemented
    multiWarehouse: true,
    advancedAnalytics: true,
  },
};

// ===================
// HELPER FUNCTIONS
// ===================

/**
 * Format currency using app locale
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat(config.app.locale, {
    style: 'currency',
    currency: config.app.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);
};

/**
 * Format number using app locale
 */
export const formatNumber = (value) => {
  return new Intl.NumberFormat(config.app.locale).format(value || 0);
};

/**
 * Format date using app locale
 */
export const formatDate = (date, options = {}) => {
  const defaultOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(date).toLocaleDateString(config.app.locale, { ...defaultOptions, ...options });
};

/**
 * Format date and time
 */
export const formatDateTime = (date) => {
  return new Date(date).toLocaleString(config.app.locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get status color class
 */
export const getStatusColor = (status) => {
  const colors = {
    // Success states
    delivered: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    approved: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
    
    // Warning states
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-yellow-100 text-yellow-800',
    assigned: 'bg-yellow-100 text-yellow-800',
    draft: 'bg-gray-100 text-gray-800',
    
    // Info states
    confirmed: 'bg-blue-100 text-blue-800',
    'in-transit': 'bg-blue-100 text-blue-800',
    executing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-blue-100 text-blue-800',
    
    // Error states
    cancelled: 'bg-red-100 text-red-800',
    failed: 'bg-red-100 text-red-800',
    
    // Default
    default: 'bg-gray-100 text-gray-800',
  };
  
  return colors[status] || colors.default;
};

export default config;
