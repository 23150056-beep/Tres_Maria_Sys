/**
 * UTILITY HELPERS
 * ===============
 * Common utility functions used throughout the application.
 * 
 * Principles: Simplicity, Reusability, DRY (Don't Repeat Yourself)
 */

/**
 * Debounce function - limits how often a function can fire
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

/**
 * Throttle function - ensures function fires at most once per interval
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Deep clone an object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Generate unique ID
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj) => {
  if (!obj) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

/**
 * Capitalize first letter
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Truncate string with ellipsis
 */
export const truncate = (str, length = 50) => {
  if (!str || str.length <= length) return str;
  return str.substring(0, length) + '...';
};

/**
 * Sort array of objects by key
 */
export const sortBy = (array, key, direction = 'asc') => {
  return [...array].sort((a, b) => {
    const valA = a[key];
    const valB = b[key];
    
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Group array of objects by key
 */
export const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key] || 'Other';
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
};

/**
 * Filter array by search term (searches multiple fields)
 */
export const filterBySearch = (array, searchTerm, fields) => {
  if (!searchTerm) return array;
  
  const term = searchTerm.toLowerCase();
  return array.filter(item => 
    fields.some(field => {
      const value = item[field];
      return value && value.toString().toLowerCase().includes(term);
    })
  );
};

/**
 * Calculate percentage
 */
export const percentage = (value, total) => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Format file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get initials from name
 */
export const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

/**
 * Check if date is today
 */
export const isToday = (date) => {
  const today = new Date();
  const d = new Date(date);
  return d.toDateString() === today.toDateString();
};

/**
 * Get relative time (e.g., "5 minutes ago")
 */
export const getRelativeTime = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return past.toLocaleDateString();
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate Philippine phone number
 */
export const isValidPhoneNumber = (phone) => {
  const re = /^(\+63|0)?[0-9]{10,11}$/;
  return re.test(phone.replace(/\s/g, ''));
};

/**
 * Safe JSON parse with default value
 */
export const safeJsonParse = (str, defaultValue = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

/**
 * Create URL query string from object
 */
export const toQueryString = (params) => {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
};

export default {
  debounce,
  throttle,
  deepClone,
  generateId,
  isEmpty,
  capitalize,
  truncate,
  sortBy,
  groupBy,
  filterBySearch,
  percentage,
  formatFileSize,
  getInitials,
  isToday,
  getRelativeTime,
  isValidEmail,
  isValidPhoneNumber,
  safeJsonParse,
  toQueryString,
};
