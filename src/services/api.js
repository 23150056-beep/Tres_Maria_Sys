import axios from 'axios';
import { mockApi, mockUsers, mockProducts, mockCategories, mockClients, mockSuppliers, mockOrders, mockInventory, mockDeliveries, mockPurchaseOrders, mockWarehouses, mockDashboardData } from './mockData';

// Set to true to use mock data (no backend needed)
const USE_MOCK = true;

// In-memory store for dynamic mock data (persists during session)
const mockStore = {
  distributionPlans: [
    { id: 1, plan_number: 'DP-2026-001', status: 'completed', total_value: 125000, created_at: '2026-01-25', completed_at: '2026-01-26', deliveries_count: 5, items_count: 24 },
    { id: 2, plan_number: 'DP-2026-002', status: 'executing', total_value: 89500, created_at: '2026-01-28', completed_at: null, deliveries_count: 3, items_count: 15 },
    { id: 3, plan_number: 'DP-2026-003', status: 'approved', total_value: 156000, created_at: '2026-01-30', completed_at: null, deliveries_count: 7, items_count: 32 },
    { id: 4, plan_number: 'DP-2026-004', status: 'draft', total_value: 45000, created_at: '2026-01-31', completed_at: null, deliveries_count: 2, items_count: 8 }
  ],
  products: [...mockProducts],
  categories: [...mockCategories],
  clients: [...mockClients],
  suppliers: [...mockSuppliers],
  orders: [...mockOrders],
  purchaseOrders: [...mockPurchaseOrders],
  deliveries: [...mockDeliveries],
  warehouses: [...mockWarehouses],
  users: [...mockUsers],
  inventory: [...mockInventory],
  nextIds: { plan: 5, product: 11, category: 7, client: 6, supplier: 5, order: 8, po: 4, delivery: 4, warehouse: 3, user: 4 }
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Mock API wrapper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to extract ID from URL
const getIdFromUrl = (url, pattern) => {
  const match = url.match(pattern);
  return match ? parseInt(match[1]) : null;
};

const mockGet = async (url) => {
  await delay(300);
  
  // === AUTH ===
  if (url.includes('/auth/me')) {
    const token = localStorage.getItem('token');
    if (token && token.startsWith('mock-jwt-token-')) {
      const savedUser = JSON.parse(localStorage.getItem('mock-user') || 'null');
      if (savedUser) return { data: { user: savedUser } };
    }
    const error = new Error('Unauthorized');
    error.response = { status: 401 };
    throw error;
  }
  
  // === DASHBOARD ===
  if (url.includes('/dashboard/kpis')) return { data: mockDashboardData.kpis };
  if (url.includes('/dashboard/revenue-chart')) return { data: mockDashboardData.revenueChart };
  if (url.includes('/dashboard/top-products')) return { data: mockDashboardData.topProducts };
  if (url.includes('/dashboard/recent-activity')) return { data: mockDashboardData.recentActivity };
  if (url.includes('/dashboard/category-distribution')) return { data: mockStore.categories.map(c => ({ name: c.name, value: c.product_count || 10 })) };
  if (url.includes('/dashboard/inventory-status')) return { data: { healthy: 7, low: 2, out: 1 } };
  
  // === DISTRIBUTION PLANS ===
  if (url.includes('/distribution/plans')) {
    const idMatch = url.match(/\/distribution\/plans\/(\d+)/);
    if (idMatch) {
      const plan = mockStore.distributionPlans.find(p => p.id === parseInt(idMatch[1]));
      if (plan) return { data: { plan, orders: mockStore.orders.filter(o => ['confirmed', 'processing'].includes(o.status)).slice(0, 3) } };
      return { data: { plan: null } };
    }
    return { data: { plans: mockStore.distributionPlans, total: mockStore.distributionPlans.length } };
  }
  
  // === PRODUCTS ===
  if (url.includes('/products') && !url.includes('/categories')) {
    const idMatch = url.match(/\/products\/(\d+)/);
    if (idMatch) {
      const product = mockStore.products.find(p => p.id === parseInt(idMatch[1]));
      return { data: product || null };
    }
    return { data: { products: mockStore.products, total: mockStore.products.length } };
  }
  
  // === CATEGORIES ===
  if (url.includes('/categories')) {
    const idMatch = url.match(/\/categories\/(\d+)/);
    if (idMatch) {
      const cat = mockStore.categories.find(c => c.id === parseInt(idMatch[1]));
      return { data: cat || null };
    }
    return { data: { categories: mockStore.categories } };
  }
  
  // === CLIENTS ===
  if (url.includes('/clients/pricing-tiers')) {
    return { data: { tiers: ['Regular', 'Wholesale', 'Distributor', 'VIP'] } };
  }
  if (url.includes('/clients')) {
    const idMatch = url.match(/\/clients\/(\d+)/);
    if (idMatch) {
      const client = mockStore.clients.find(c => c.id === parseInt(idMatch[1]));
      return { data: client || null };
    }
    return { data: { clients: mockStore.clients, total: mockStore.clients.length } };
  }
  
  // === SUPPLIERS ===
  if (url.includes('/suppliers')) {
    const idMatch = url.match(/\/suppliers\/(\d+)/);
    if (idMatch) {
      const supplier = mockStore.suppliers.find(s => s.id === parseInt(idMatch[1]));
      return { data: supplier || null };
    }
    return { data: { suppliers: mockStore.suppliers, total: mockStore.suppliers.length } };
  }
  
  // === ORDERS ===
  if (url.includes('/orders')) {
    const idMatch = url.match(/\/orders\/(\d+)/);
    if (idMatch) {
      const order = mockStore.orders.find(o => o.id === parseInt(idMatch[1]));
      return { data: order || null };
    }
    let filteredOrders = [...mockStore.orders];
    if (url.includes('status=confirmed') || url.includes('status=processing')) {
      filteredOrders = mockStore.orders.filter(o => ['confirmed', 'processing'].includes(o.status));
    }
    return { data: { orders: filteredOrders, total: filteredOrders.length } };
  }
  
  // === INVENTORY ===
  if (url.includes('/inventory/transactions')) {
    const mockTransactions = [
      { id: 1, product: mockStore.products[0], type: 'in', quantity: 100, reference: 'PO-2026-001', created_at: '2026-01-30T10:00:00', notes: 'Goods received' },
      { id: 2, product: mockStore.products[1], type: 'out', quantity: 50, reference: 'ORD-2026-005', created_at: '2026-01-30T14:30:00', notes: 'Sold to client' },
      { id: 3, product: mockStore.products[2], type: 'adjustment', quantity: -5, reference: 'ADJ-001', created_at: '2026-01-29T09:00:00', notes: 'Damaged goods' },
      { id: 4, product: mockStore.products[3], type: 'in', quantity: 200, reference: 'PO-2026-002', created_at: '2026-01-28T11:00:00', notes: 'Goods received' }
    ];
    return { data: { transactions: mockTransactions, total: mockTransactions.length } };
  }
  if (url.includes('/inventory/alerts')) {
    const mockAlerts = mockStore.inventory.filter(i => i.quantity <= i.reorder_level).map((item, idx) => ({
      id: item.id,
      product_name: item.product?.name || 'Unknown Product',
      product_sku: item.product?.sku || '',
      alert_type: item.quantity === 0 ? 'out_of_stock' : 'low_stock',
      status: 'active',
      message: item.quantity === 0 
        ? `${item.product?.name} is out of stock!` 
        : `${item.product?.name} is running low (${item.quantity} remaining, reorder at ${item.reorder_level})`,
      warehouse_name: item.warehouse?.name || 'Main Warehouse',
      current_quantity: item.quantity,
      threshold_quantity: item.reorder_level,
      created_at: '2026-01-30T08:00:00'
    }));
    return { data: { alerts: mockAlerts, total: mockAlerts.length } };
  }
  if (url.includes('/inventory')) {
    return { data: { inventory: mockStore.inventory, total: mockStore.inventory.length } };
  }
  
  // === DELIVERIES ===
  if (url.includes('/deliveries/routes')) {
    const mockRoutes = [
      { id: 1, name: 'North Route - San Fernando', driver: 'Pedro Reyes', vehicle: 'Truck A - ABC 123', stops: 5, status: 'active', distance: 45 },
      { id: 2, name: 'South Route - Bauang', driver: 'Juan Santos', vehicle: 'Truck B - XYZ 456', stops: 4, status: 'active', distance: 38 },
      { id: 3, name: 'East Route - Naguilian', driver: 'Mario Cruz', vehicle: 'Van C - DEF 789', stops: 6, status: 'inactive', distance: 52 }
    ];
    return { data: { routes: mockRoutes, total: mockRoutes.length } };
  }
  if (url.includes('/deliveries')) {
    const idMatch = url.match(/\/deliveries\/(\d+)/);
    if (idMatch) {
      const delivery = mockStore.deliveries.find(d => d.id === parseInt(idMatch[1]));
      return { data: delivery || null };
    }
    let filteredDeliveries = [...mockStore.deliveries];
    if (url.includes('status=pending') || url.includes('status=assigned')) {
      filteredDeliveries = mockStore.deliveries.filter(d => ['pending', 'assigned'].includes(d.status));
    }
    return { data: { deliveries: filteredDeliveries, total: filteredDeliveries.length } };
  }
  
  // === PURCHASE ORDERS ===
  if (url.includes('/purchase-orders')) {
    const idMatch = url.match(/\/purchase-orders\/(\d+)/);
    if (idMatch) {
      const po = mockStore.purchaseOrders.find(p => p.id === parseInt(idMatch[1]));
      return { data: po || null };
    }
    let filteredPOs = [...mockStore.purchaseOrders];
    if (url.includes('status=approved') || url.includes('status=partial')) {
      filteredPOs = mockStore.purchaseOrders.filter(p => ['approved', 'partial'].includes(p.status));
    }
    return { data: { purchaseOrders: filteredPOs, total: filteredPOs.length } };
  }
  
  // === WAREHOUSE ===
  if (url.includes('/warehouse')) {
    const idMatch = url.match(/\/warehouse\/(\d+)/);
    if (idMatch) {
      const warehouse = mockStore.warehouses.find(w => w.id === idMatch[1] || w.id === parseInt(idMatch[1]));
      return { data: warehouse || mockStore.warehouses[0] };
    }
    return { data: { warehouses: mockStore.warehouses, total: mockStore.warehouses.length } };
  }
  
  // === USERS ===
  if (url.includes('/users')) {
    const idMatch = url.match(/\/users\/(\d+)/);
    if (idMatch) {
      const user = mockStore.users.find(u => u.id === idMatch[1] || u.id === parseInt(idMatch[1]));
      if (user) {
        const { password, ...userWithoutPw } = user;
        return { data: userWithoutPw };
      }
      return { data: null };
    }
    return { data: { users: mockStore.users.map(({ password, ...u }) => u), total: mockStore.users.length } };
  }
  
  // === REPORTS ===
  if (url.includes('/reports/sales')) {
    return { data: { 
      summary: { totalSales: 2450000, totalOrders: 156, avgOrderValue: 15705, totalItems: 4520 }, 
      dailySales: mockDashboardData.revenueChart.map(d => ({ date: d.date, total: d.revenue })), 
      topProducts: mockDashboardData.topProducts, 
      topClients: mockStore.clients.slice(0, 5).map(c => ({ name: c.business_name, orders: Math.floor(Math.random() * 20) + 5, total: Math.floor(Math.random() * 100000) + 20000 })), 
      byCategory: mockStore.categories.map(c => ({ category: c.name, total: Math.floor(Math.random() * 500000) + 100000 })) 
    }};
  }
  if (url.includes('/reports/inventory')) {
    return { data: { 
      summary: { totalProducts: mockStore.products.length, totalUnits: 2905, totalValue: 1850000, lowStock: 3, outOfStock: 1, healthyStock: 6 }, 
      byCategory: mockStore.categories.map(c => ({ name: c.name, value: Math.floor(Math.random() * 500000) + 50000 })), 
      lowStockItems: mockStore.inventory.filter(i => i.quantity < i.reorder_level).map(i => ({ product: i.product.name, category: i.product.category?.name || 'N/A', quantity: i.quantity, reorder_level: i.reorder_level })) 
    }};
  }
  if (url.includes('/reports/delivery') || url.includes('/reports/delivery-performance')) {
    return { data: { 
      summary: { total: 45, delivered: 38, failed: 2, inTransit: 3, pending: 2, successRate: 95, avgDeliveryTime: 42 }, 
      dailyDeliveries: mockDashboardData.revenueChart.map(d => ({ date: d.date, delivered: Math.floor(Math.random() * 10) + 3, failed: Math.floor(Math.random() * 2) })), 
      driverPerformance: [{ name: 'Pedro Reyes', total: 18, delivered: 17, failed: 1, avgTime: 38 }, { name: 'Juan Santos', total: 15, delivered: 14, failed: 1, avgTime: 45 }] 
    }};
  }
  if (url.includes('/reports/financial')) {
    return { data: { 
      summary: { totalRevenue: 2450000, totalExpenses: 1850000, grossProfit: 600000, netProfit: 450000, grossMargin: 24.5, netMargin: 18.4 }, 
      trend: mockDashboardData.revenueChart.map(d => ({ date: d.date, revenue: d.revenue, expenses: d.revenue * 0.75, profitMargin: 25 })), 
      receivables: { total: 125000, current: 80000, days30: 30000, days60: 15000 }, 
      payables: { total: 85000, current: 60000, days30: 20000, days60: 5000 } 
    }};
  }
  if (url.includes('/reports/export')) {
    // Return empty blob for export
    return { data: new Blob(['Mock export data'], { type: 'text/csv' }) };
  }
  
  return { data: {} };
};

const mockPost = async (url, data) => {
  await delay(500);
  
  // === AUTH ===
  if (url.includes('/auth/login')) {
    const user = mockStore.users.find(u => u.email === data.email && u.password === data.password);
    if (!user) {
      const error = new Error('Invalid credentials');
      error.response = { data: { error: 'Invalid email or password' } };
      throw error;
    }
    const { password, ...userWithoutPassword } = user;
    localStorage.setItem('mock-user', JSON.stringify(userWithoutPassword));
    return { data: { token: 'mock-jwt-token-' + Date.now(), user: userWithoutPassword } };
  }
  
  // === DISTRIBUTION PLANS ===
  if (url.includes('/distribution/plans/optimize')) {
    return { data: { success: true, optimized_routes: 2, estimated_savings: 1500, recommendations: ['Combine orders for San Fernando', 'Use Truck A for better fuel efficiency'] } };
  }
  if (url.match(/\/distribution\/plans\/\d+\/execute/)) {
    const idMatch = url.match(/\/distribution\/plans\/(\d+)/);
    if (idMatch) {
      const plan = mockStore.distributionPlans.find(p => p.id === parseInt(idMatch[1]));
      if (plan) plan.status = 'executing';
    }
    return { data: { success: true } };
  }
  if (url.includes('/distribution/plans')) {
    const selectedOrders = mockStore.orders.filter(o => data.order_ids?.includes(o.id));
    const totalValue = selectedOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const newPlanId = mockStore.nextIds.plan++;
    const newPlan = {
      id: newPlanId, plan_number: `DP-2026-${String(newPlanId).padStart(3, '0')}`, status: 'draft',
      total_value: totalValue, created_at: new Date().toISOString().split('T')[0], completed_at: null,
      deliveries_count: selectedOrders.length, items_count: selectedOrders.reduce((sum, o) => sum + (o.items?.length || 2), 0),
      priority: data.priority || 'normal', notes: data.notes || ''
    };
    mockStore.distributionPlans.unshift(newPlan);
    return { data: { success: true, plan: newPlan } };
  }
  
  // === PRODUCTS ===
  if (url.includes('/products')) {
    const newId = mockStore.nextIds.product++;
    const newProduct = { id: newId, ...data, category: mockStore.categories.find(c => c.id === parseInt(data.category_id)) };
    mockStore.products.push(newProduct);
    return { data: { success: true, product: newProduct } };
  }
  
  // === CATEGORIES ===
  if (url.includes('/categories')) {
    const newId = mockStore.nextIds.category++;
    const newCat = { id: newId, ...data, product_count: 0 };
    mockStore.categories.push(newCat);
    return { data: { success: true, category: newCat } };
  }
  
  // === CLIENTS ===
  if (url.includes('/clients')) {
    const newId = mockStore.nextIds.client++;
    const newClient = { id: newId, ...data };
    mockStore.clients.push(newClient);
    return { data: { success: true, client: newClient } };
  }
  
  // === SUPPLIERS ===
  if (url.includes('/suppliers')) {
    const newId = mockStore.nextIds.supplier++;
    const newSupplier = { id: newId, ...data, is_active: true };
    mockStore.suppliers.push(newSupplier);
    return { data: { success: true, supplier: newSupplier } };
  }
  
  // === ORDERS ===
  if (url.includes('/orders')) {
    const newId = mockStore.nextIds.order++;
    const client = mockStore.clients.find(c => c.id === parseInt(data.client_id));
    const newOrder = { 
      id: newId, order_number: `ORD-2026-${String(newId).padStart(4, '0')}`, 
      ...data, client, status: 'pending', order_date: new Date().toISOString().split('T')[0]
    };
    mockStore.orders.unshift(newOrder);
    return { data: { success: true, order: newOrder } };
  }
  
  // === PURCHASE ORDERS ===
  if (url.match(/\/purchase-orders\/\d+\/receive/)) {
    return { data: { success: true, message: 'Goods received successfully' } };
  }
  if (url.includes('/purchase-orders')) {
    const newId = mockStore.nextIds.po++;
    const supplier = mockStore.suppliers.find(s => s.id === parseInt(data.supplier_id));
    const newPO = { 
      id: newId, po_number: `PO-2026-${String(newId).padStart(3, '0')}`, 
      ...data, supplier, status: 'pending', order_date: new Date().toISOString().split('T')[0]
    };
    mockStore.purchaseOrders.unshift(newPO);
    return { data: { success: true, purchaseOrder: newPO } };
  }
  
  // === WAREHOUSE ===
  if (url.includes('/warehouse')) {
    const newId = mockStore.nextIds.warehouse++;
    const newWarehouse = { id: String(newId), ...data, is_active: true };
    mockStore.warehouses.push(newWarehouse);
    return { data: { success: true, warehouse: newWarehouse } };
  }
  
  // === USERS ===
  if (url.match(/\/users\/\d+\/reset-password/)) {
    return { data: { success: true, message: 'Password reset email sent' } };
  }
  if (url.includes('/users')) {
    const newId = mockStore.nextIds.user++;
    const newUser = { id: String(newId), ...data, is_active: true, password: 'password123' };
    mockStore.users.push(newUser);
    return { data: { success: true, user: { ...newUser, password: undefined } } };
  }
  
  return { data: { success: true, message: 'Created successfully', id: Date.now() } };
};

const mockPut = async (url, data) => {
  await delay(300);
  
  // === DISTRIBUTION PLANS ===
  if (url.includes('/distribution/plans')) {
    const idMatch = url.match(/\/distribution\/plans\/(\d+)/);
    if (idMatch) {
      const plan = mockStore.distributionPlans.find(p => p.id === parseInt(idMatch[1]));
      if (plan) Object.assign(plan, data);
      return { data: { success: true, plan } };
    }
  }
  
  // === PRODUCTS ===
  if (url.includes('/products')) {
    const idMatch = url.match(/\/products\/(\d+)/);
    if (idMatch) {
      const idx = mockStore.products.findIndex(p => p.id === parseInt(idMatch[1]));
      if (idx !== -1) {
        mockStore.products[idx] = { ...mockStore.products[idx], ...data };
        return { data: { success: true, product: mockStore.products[idx] } };
      }
    }
  }
  
  // === CATEGORIES ===
  if (url.includes('/categories')) {
    const idMatch = url.match(/\/categories\/(\d+)/);
    if (idMatch) {
      const idx = mockStore.categories.findIndex(c => c.id === parseInt(idMatch[1]));
      if (idx !== -1) {
        mockStore.categories[idx] = { ...mockStore.categories[idx], ...data };
        return { data: { success: true, category: mockStore.categories[idx] } };
      }
    }
  }
  
  // === CLIENTS ===
  if (url.includes('/clients')) {
    const idMatch = url.match(/\/clients\/(\d+)/);
    if (idMatch) {
      const idx = mockStore.clients.findIndex(c => c.id === parseInt(idMatch[1]));
      if (idx !== -1) {
        mockStore.clients[idx] = { ...mockStore.clients[idx], ...data };
        return { data: { success: true, client: mockStore.clients[idx] } };
      }
    }
  }
  
  // === SUPPLIERS ===
  if (url.includes('/suppliers')) {
    const idMatch = url.match(/\/suppliers\/(\d+)/);
    if (idMatch) {
      const idx = mockStore.suppliers.findIndex(s => s.id === parseInt(idMatch[1]));
      if (idx !== -1) {
        mockStore.suppliers[idx] = { ...mockStore.suppliers[idx], ...data };
        return { data: { success: true, supplier: mockStore.suppliers[idx] } };
      }
    }
  }
  
  // === ORDERS ===
  if (url.includes('/orders')) {
    const idMatch = url.match(/\/orders\/(\d+)/);
    if (idMatch) {
      const idx = mockStore.orders.findIndex(o => o.id === parseInt(idMatch[1]));
      if (idx !== -1) {
        mockStore.orders[idx] = { ...mockStore.orders[idx], ...data };
        return { data: { success: true, order: mockStore.orders[idx] } };
      }
    }
  }
  
  // === DELIVERIES ===
  if (url.includes('/deliveries')) {
    const idMatch = url.match(/\/deliveries\/(\d+)/);
    if (idMatch) {
      const idx = mockStore.deliveries.findIndex(d => d.id === parseInt(idMatch[1]));
      if (idx !== -1) {
        mockStore.deliveries[idx] = { ...mockStore.deliveries[idx], ...data };
        return { data: { success: true, delivery: mockStore.deliveries[idx] } };
      }
    }
  }
  
  // === INVENTORY ALERTS ===
  if (url.includes('/inventory/alerts')) {
    return { data: { success: true } };
  }
  
  // === WAREHOUSE ===
  if (url.includes('/warehouse')) {
    const idMatch = url.match(/\/warehouse\/(\d+)/);
    if (idMatch) {
      const idx = mockStore.warehouses.findIndex(w => w.id === idMatch[1] || w.id === parseInt(idMatch[1]));
      if (idx !== -1) {
        mockStore.warehouses[idx] = { ...mockStore.warehouses[idx], ...data };
        return { data: { success: true, warehouse: mockStore.warehouses[idx] } };
      }
    }
  }
  
  // === USERS ===
  if (url.includes('/users')) {
    const idMatch = url.match(/\/users\/(\d+)/);
    if (idMatch) {
      const idx = mockStore.users.findIndex(u => u.id === idMatch[1] || u.id === parseInt(idMatch[1]));
      if (idx !== -1) {
        mockStore.users[idx] = { ...mockStore.users[idx], ...data };
        const { password, ...userWithoutPw } = mockStore.users[idx];
        return { data: { success: true, user: userWithoutPw } };
      }
    }
  }
  
  return { data: { success: true, ...data } };
};

const mockDelete = async (url) => {
  await delay(300);
  
  // === CATEGORIES ===
  if (url.includes('/categories')) {
    const idMatch = url.match(/\/categories\/(\d+)/);
    if (idMatch) {
      const idx = mockStore.categories.findIndex(c => c.id === parseInt(idMatch[1]));
      if (idx !== -1) mockStore.categories.splice(idx, 1);
    }
  }
  
  // === USERS ===
  if (url.includes('/users')) {
    const idMatch = url.match(/\/users\/(\d+)/);
    if (idMatch) {
      const idx = mockStore.users.findIndex(u => u.id === idMatch[1] || u.id === parseInt(idMatch[1]));
      if (idx !== -1) mockStore.users.splice(idx, 1);
    }
  }
  
  return { data: { success: true } };
};

// Override axios methods with mock when USE_MOCK is true
if (USE_MOCK) {
  api.get = mockGet;
  api.post = mockPost;
  api.put = mockPut;
  api.delete = mockDelete;
}

export default api;
