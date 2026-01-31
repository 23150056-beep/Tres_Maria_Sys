// Format number as Philippine Peso
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(amount);
};

// Generate order/document numbers
export const generateNumber = async (prefix, tableName, columnName, query) => {
  const result = await query(
    `SELECT ${columnName} FROM ${tableName} 
     WHERE ${columnName} LIKE $1 
     ORDER BY created_at DESC LIMIT 1`,
    [`${prefix}-%`]
  );

  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  let sequence = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0][columnName];
    const parts = lastNumber.split('-');
    if (parts.length >= 3 && parts[1] === `${year}${month}`) {
      sequence = parseInt(parts[2], 10) + 1;
    }
  }

  return `${prefix}-${year}${month}-${sequence.toString().padStart(5, '0')}`;
};

// Calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value) => (value * Math.PI) / 180;

// Pagination helper
export const paginate = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return { limit, offset };
};

// Build pagination response
export const paginationResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

// Date formatting
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate Philippine phone number
export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^(\+63|0)?9\d{9}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

// Sanitize string for SQL LIKE
export const sanitizeSearchTerm = (term) => {
  return term.replace(/[%_]/g, '\\$&');
};
