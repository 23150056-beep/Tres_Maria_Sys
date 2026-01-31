// Mock data for demo purposes - simulates backend responses without database

export const mockUsers = [
  {
    id: '1',
    email: 'admin@tresmarias.ph',
    password: 'admin123',
    name: 'System Administrator',
    first_name: 'System',
    last_name: 'Administrator',
    role: 'admin',
    warehouse_id: null,
    is_active: true,
    permissions: { all: true }
  },
  {
    id: '2',
    email: 'manager@tresmarias.ph',
    password: 'manager123',
    name: 'Juan Dela Cruz',
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    role: 'manager',
    warehouse_id: '1',
    is_active: true,
    permissions: { inventory: true, orders: true, reports: true }
  },
  {
    id: '3',
    email: 'sales@tresmarias.ph',
    password: 'sales123',
    name: 'Maria Santos',
    first_name: 'Maria',
    last_name: 'Santos',
    role: 'sales',
    warehouse_id: '1',
    is_active: true,
    permissions: { orders: true, clients: true }
  }
];

export const mockWarehouses = [
  { id: '1', code: 'WH-MAIN', name: 'Tres Marias Main Warehouse', address: '123 MacArthur Highway', city: 'San Fernando City', province: 'La Union', is_active: true, capacity: 10000 },
  { id: '2', code: 'WH-NORTH', name: 'Northern Distribution Center', address: '456 National Road', city: 'Vigan City', province: 'Ilocos Sur', is_active: true, capacity: 5000 }
];

export const mockCategories = [
  { id: 1, name: 'Beverages', description: 'Soft drinks, juices, water', product_count: 45 },
  { id: 2, name: 'Snacks', description: 'Chips, crackers, cookies', product_count: 78 },
  { id: 3, name: 'Canned Goods', description: 'Canned meat, fish, vegetables', product_count: 56 },
  { id: 4, name: 'Condiments', description: 'Sauces, vinegar, seasonings', product_count: 34 },
  { id: 5, name: 'Personal Care', description: 'Soap, shampoo, toiletries', product_count: 42 },
  { id: 6, name: 'Household', description: 'Cleaning supplies, detergents', product_count: 28 }
];

export const mockProducts = [
  { id: 1, sku: 'BEV-001', name: 'Coca-Cola 1.5L', category_id: 1, category: { name: 'Beverages' }, unit: 'bottle', cost_price: 45, selling_price: 55, unit_price: 55, reorder_level: 100, is_active: true },
  { id: 2, sku: 'BEV-002', name: 'Sprite 1.5L', category_id: 1, category: { name: 'Beverages' }, unit: 'bottle', cost_price: 45, selling_price: 55, unit_price: 55, reorder_level: 100, is_active: true },
  { id: 3, sku: 'BEV-003', name: 'Royal 500ml', category_id: 1, category: { name: 'Beverages' }, unit: 'bottle', cost_price: 18, selling_price: 25, unit_price: 25, reorder_level: 200, is_active: true },
  { id: 4, sku: 'SNK-001', name: 'Piattos Cheese 85g', category_id: 2, category: { name: 'Snacks' }, unit: 'pack', cost_price: 22, selling_price: 30, unit_price: 30, reorder_level: 150, is_active: true },
  { id: 5, sku: 'SNK-002', name: 'Nova Country Cheddar 78g', category_id: 2, category: { name: 'Snacks' }, unit: 'pack', cost_price: 20, selling_price: 28, unit_price: 28, reorder_level: 150, is_active: true },
  { id: 6, sku: 'CAN-001', name: 'Century Tuna Flakes 180g', category_id: 3, category: { name: 'Canned Goods' }, unit: 'can', cost_price: 32, selling_price: 42, unit_price: 42, reorder_level: 200, is_active: true },
  { id: 7, sku: 'CAN-002', name: 'Argentina Corned Beef 260g', category_id: 3, category: { name: 'Canned Goods' }, unit: 'can', cost_price: 55, selling_price: 68, unit_price: 68, reorder_level: 150, is_active: true },
  { id: 8, sku: 'CON-001', name: 'Silver Swan Soy Sauce 1L', category_id: 4, category: { name: 'Condiments' }, unit: 'bottle', cost_price: 45, selling_price: 58, unit_price: 58, reorder_level: 100, is_active: true },
  { id: 9, sku: 'PER-001', name: 'Safeguard Soap 135g', category_id: 5, category: { name: 'Personal Care' }, unit: 'piece', cost_price: 38, selling_price: 48, unit_price: 48, reorder_level: 200, is_active: true },
  { id: 10, sku: 'HOU-001', name: 'Tide Powder 2kg', category_id: 6, category: { name: 'Household' }, unit: 'pack', cost_price: 180, selling_price: 215, unit_price: 215, reorder_level: 50, is_active: true }
];

export const mockClients = [
  { id: 1, business_name: 'Sari-Sari Store ni Aling Nena', contact_person: 'Nena Cruz', email: 'nena@email.com', phone: '+63 917 111 2222', address: '123 Rizal St, San Fernando', city: 'San Fernando City', province: 'La Union', pricing_tier: 'Regular', credit_limit: 10000, current_balance: 2500 },
  { id: 2, business_name: 'JM Grocery & Gen. Mdse.', contact_person: 'Jose Martinez', email: 'jm.grocery@email.com', phone: '+63 918 222 3333', address: '456 Quezon Ave, Bauang', city: 'Bauang', province: 'La Union', pricing_tier: 'Wholesale', credit_limit: 50000, current_balance: 15000 },
  { id: 3, business_name: 'Northpoint Supermarket', contact_person: 'Anna Reyes', email: 'northpoint@email.com', phone: '+63 919 333 4444', address: '789 National Highway, San Juan', city: 'San Juan', province: 'La Union', pricing_tier: 'Distributor', credit_limit: 200000, current_balance: 45000 },
  { id: 4, business_name: 'Barangay Store Express', contact_person: 'Pedro Santos', email: 'pedro.santos@email.com', phone: '+63 920 444 5555', address: '321 Mabini St, Agoo', city: 'Agoo', province: 'La Union', pricing_tier: 'Regular', credit_limit: 15000, current_balance: 0 },
  { id: 5, business_name: 'Metro Fresh Mart', contact_person: 'Linda Tan', email: 'metrofresh@email.com', phone: '+63 921 555 6666', address: '654 Governor Luna St, San Fernando', city: 'San Fernando City', province: 'La Union', pricing_tier: 'VIP', credit_limit: 100000, current_balance: 28000 }
];

export const mockSuppliers = [
  { id: 1, name: 'Coca-Cola Bottlers Phils.', contact_person: 'Roberto Cruz', email: 'rcola@supplier.com', phone: '+63 2 888 1111', address: 'SLEX Industrial Park, Laguna', payment_terms: 30, is_active: true },
  { id: 2, name: 'Universal Robina Corp.', contact_person: 'Maria Lopez', email: 'urc@supplier.com', phone: '+63 2 888 2222', address: 'Pasig City, Metro Manila', payment_terms: 45, is_active: true },
  { id: 3, name: 'Century Pacific Food Inc.', contact_person: 'John Reyes', email: 'century@supplier.com', phone: '+63 2 888 3333', address: 'Taguig City, Metro Manila', payment_terms: 30, is_active: true },
  { id: 4, name: 'Procter & Gamble Phils.', contact_person: 'Sarah Tan', email: 'pg@supplier.com', phone: '+63 2 888 4444', address: 'Makati City, Metro Manila', payment_terms: 30, is_active: true }
];

export const mockOrders = [
  { id: 1, order_number: 'ORD-2026-0001', client_id: 1, client: mockClients[0], status: 'delivered', total_amount: 12500, order_date: '2026-01-28', delivery_date: '2026-01-29', items: [{ product: mockProducts[0], quantity: 50, unit_price: 55 }, { product: mockProducts[3], quantity: 100, unit_price: 30 }] },
  { id: 2, order_number: 'ORD-2026-0002', client_id: 2, client: mockClients[1], status: 'processing', total_amount: 45000, order_date: '2026-01-29', delivery_date: '2026-01-31', items: [{ product: mockProducts[5], quantity: 200, unit_price: 42 }, { product: mockProducts[6], quantity: 150, unit_price: 68 }] },
  { id: 3, order_number: 'ORD-2026-0003', client_id: 3, client: mockClients[2], status: 'confirmed', total_amount: 78500, order_date: '2026-01-30', delivery_date: '2026-02-01', items: [{ product: mockProducts[1], quantity: 300, unit_price: 55 }, { product: mockProducts[9], quantity: 100, unit_price: 215 }] },
  { id: 4, order_number: 'ORD-2026-0004', client_id: 5, client: mockClients[4], status: 'confirmed', total_amount: 32000, order_date: '2026-01-30', delivery_date: '2026-02-01', items: [{ product: mockProducts[2], quantity: 400, unit_price: 25 }, { product: mockProducts[7], quantity: 150, unit_price: 58 }] },
  { id: 5, order_number: 'ORD-2026-0005', client_id: 4, client: mockClients[3], status: 'processing', total_amount: 8500, order_date: '2026-01-31', delivery_date: '2026-02-02', items: [{ product: mockProducts[4], quantity: 100, unit_price: 28 }, { product: mockProducts[8], quantity: 100, unit_price: 48 }] },
  { id: 6, order_number: 'ORD-2026-0006', client_id: 1, client: mockClients[0], status: 'confirmed', total_amount: 15600, order_date: '2026-01-31', delivery_date: '2026-02-02', items: [{ product: mockProducts[0], quantity: 100, unit_price: 55 }, { product: mockProducts[5], quantity: 150, unit_price: 42 }] },
  { id: 7, order_number: 'ORD-2026-0007', client_id: 2, client: mockClients[1], status: 'processing', total_amount: 28400, order_date: '2026-01-31', delivery_date: '2026-02-03', items: [{ product: mockProducts[6], quantity: 200, unit_price: 68 }, { product: mockProducts[9], quantity: 60, unit_price: 215 }] }
];

export const mockInventory = [
  { id: 1, product_id: 1, product: mockProducts[0], warehouse_id: '1', warehouse: mockWarehouses[0], quantity: 450, unit_cost: 45, location: 'A-01-01', reorder_level: 100 },
  { id: 2, product_id: 2, product: mockProducts[1], warehouse_id: '1', warehouse: mockWarehouses[0], quantity: 380, unit_cost: 45, location: 'A-01-02', reorder_level: 100 },
  { id: 3, product_id: 3, product: mockProducts[2], warehouse_id: '1', warehouse: mockWarehouses[0], quantity: 720, unit_cost: 18, location: 'A-02-01', reorder_level: 200 },
  { id: 4, product_id: 4, product: mockProducts[3], warehouse_id: '1', warehouse: mockWarehouses[0], quantity: 85, unit_cost: 22, location: 'B-01-01', reorder_level: 150 },
  { id: 5, product_id: 5, product: mockProducts[4], warehouse_id: '1', warehouse: mockWarehouses[0], quantity: 120, unit_cost: 20, location: 'B-01-02', reorder_level: 150 },
  { id: 6, product_id: 6, product: mockProducts[5], warehouse_id: '1', warehouse: mockWarehouses[0], quantity: 340, unit_cost: 32, location: 'C-01-01', reorder_level: 200 },
  { id: 7, product_id: 7, product: mockProducts[6], warehouse_id: '1', warehouse: mockWarehouses[0], quantity: 45, unit_cost: 55, location: 'C-01-02', reorder_level: 150 },
  { id: 8, product_id: 8, product: mockProducts[7], warehouse_id: '1', warehouse: mockWarehouses[0], quantity: 180, unit_cost: 45, location: 'D-01-01', reorder_level: 100 },
  { id: 9, product_id: 9, product: mockProducts[8], warehouse_id: '1', warehouse: mockWarehouses[0], quantity: 520, unit_cost: 38, location: 'E-01-01', reorder_level: 200 },
  { id: 10, product_id: 10, product: mockProducts[9], warehouse_id: '1', warehouse: mockWarehouses[0], quantity: 65, unit_cost: 180, location: 'F-01-01', reorder_level: 50 }
];

export const mockDeliveries = [
  { id: 1, delivery_number: 'DEL-2026-0001', order_id: 1, order: mockOrders[0], status: 'delivered', scheduled_date: '2026-01-29T09:00:00', driver_name: 'Pedro Reyes', delivery_address: '123 Rizal St, San Fernando' },
  { id: 2, delivery_number: 'DEL-2026-0002', order_id: 2, order: mockOrders[1], status: 'in-transit', scheduled_date: '2026-01-31T08:00:00', driver_name: 'Juan Santos', delivery_address: '456 Quezon Ave, Bauang' },
  { id: 3, delivery_number: 'DEL-2026-0003', order_id: 4, order: mockOrders[3], status: 'assigned', scheduled_date: '2026-02-01T10:00:00', driver_name: 'Pedro Reyes', delivery_address: '654 Governor Luna St, San Fernando' }
];

export const mockPurchaseOrders = [
  { id: 1, po_number: 'PO-2026-0001', supplier_id: 1, supplier: mockSuppliers[0], status: 'received', total_amount: 125000, expected_date: '2026-01-25', items: [] },
  { id: 2, po_number: 'PO-2026-0002', supplier_id: 2, supplier: mockSuppliers[1], status: 'approved', total_amount: 85000, expected_date: '2026-02-01', items: [] },
  { id: 3, po_number: 'PO-2026-0003', supplier_id: 3, supplier: mockSuppliers[2], status: 'pending', total_amount: 45000, expected_date: '2026-02-05', items: [] }
];

export const mockDashboardData = {
  kpis: {
    todaySales: 156500,
    todayOrders: 12,
    pendingDeliveries: 8,
    lowStockItems: 3,
    monthlyRevenue: 2450000,
    monthlyGrowth: 12.5,
    activeClients: 48,
    inventoryValue: 1850000
  },
  revenueChart: [
    { date: '2026-01-25', revenue: 185000 },
    { date: '2026-01-26', revenue: 210000 },
    { date: '2026-01-27', revenue: 165000 },
    { date: '2026-01-28', revenue: 245000 },
    { date: '2026-01-29', revenue: 198000 },
    { date: '2026-01-30', revenue: 278000 },
    { date: '2026-01-31', revenue: 156500 }
  ],
  topProducts: [
    { name: 'Coca-Cola 1.5L', quantity: 1250, revenue: 68750 },
    { name: 'Century Tuna 180g', quantity: 980, revenue: 41160 },
    { name: 'Tide Powder 2kg', quantity: 320, revenue: 68800 },
    { name: 'Piattos Cheese 85g', quantity: 850, revenue: 25500 },
    { name: 'Safeguard Soap 135g', quantity: 720, revenue: 34560 }
  ],
  recentActivity: [
    { id: 1, type: 'order', message: 'New order ORD-2026-0005 from Barangay Store Express', time: '5 minutes ago' },
    { id: 2, type: 'delivery', message: 'Delivery DEL-2026-0002 is now in transit', time: '15 minutes ago' },
    { id: 3, type: 'inventory', message: 'Low stock alert: Argentina Corned Beef 260g (45 units)', time: '1 hour ago' },
    { id: 4, type: 'payment', message: 'Payment received from Metro Fresh Mart - ₱28,000', time: '2 hours ago' },
    { id: 5, type: 'order', message: 'Order ORD-2026-0004 confirmed for delivery', time: '3 hours ago' }
  ]
};

// Simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API handlers
export const mockApi = {
  // Auth
  login: async (email, password) => {
    await delay(500);
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (!user) {
      throw { response: { data: { error: 'Invalid credentials' } } };
    }
    const { password: _, ...userWithoutPassword } = user;
    return { 
      data: { 
        token: 'mock-jwt-token-' + Date.now(),
        user: userWithoutPassword 
      } 
    };
  },

  // Dashboard
  getDashboardKpis: async () => {
    await delay(300);
    return { data: mockDashboardData.kpis };
  },
  getRevenueChart: async () => {
    await delay(300);
    return { data: mockDashboardData.revenueChart };
  },
  getTopProducts: async () => {
    await delay(300);
    return { data: mockDashboardData.topProducts };
  },
  getRecentActivity: async () => {
    await delay(300);
    return { data: mockDashboardData.recentActivity };
  },

  // Products
  getProducts: async () => {
    await delay(300);
    return { data: { products: mockProducts, total: mockProducts.length } };
  },
  getCategories: async () => {
    await delay(300);
    return { data: { categories: mockCategories } };
  },

  // Clients
  getClients: async () => {
    await delay(300);
    return { data: { clients: mockClients, total: mockClients.length } };
  },

  // Suppliers
  getSuppliers: async () => {
    await delay(300);
    return { data: { suppliers: mockSuppliers, total: mockSuppliers.length } };
  },

  // Orders
  getOrders: async () => {
    await delay(300);
    return { data: { orders: mockOrders, total: mockOrders.length } };
  },

  // Inventory
  getInventory: async () => {
    await delay(300);
    return { data: { inventory: mockInventory, total: mockInventory.length } };
  },

  // Deliveries
  getDeliveries: async () => {
    await delay(300);
    return { data: { deliveries: mockDeliveries, total: mockDeliveries.length } };
  },

  // Purchase Orders
  getPurchaseOrders: async () => {
    await delay(300);
    return { data: { purchaseOrders: mockPurchaseOrders, total: mockPurchaseOrders.length } };
  },

  // Warehouses
  getWarehouses: async () => {
    await delay(300);
    return { data: { warehouses: mockWarehouses, total: mockWarehouses.length } };
  },

  // Users
  getUsers: async () => {
    await delay(300);
    const usersWithoutPasswords = mockUsers.map(({ password, ...user }) => user);
    return { data: { users: usersWithoutPasswords, total: mockUsers.length } };
  }
};

export default mockApi;
