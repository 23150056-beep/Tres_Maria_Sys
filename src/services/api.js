import axios from 'axios';
import { mockApi, mockUsers, mockProducts, mockCategories, mockClients, mockSuppliers, mockOrders, mockInventory, mockDeliveries, mockPurchaseOrders, mockWarehouses, mockDashboardData } from './mockData';
import { saveMockStore, loadMockStore } from './storage';

// Set to true to use mock data (no backend needed)
const USE_MOCK = true;

// Default store structure
const defaultStore = {
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

// Load from localStorage or use default (DATA PERSISTENCE!)
const mockStore = loadMockStore(defaultStore);

// Save store after each mutation (auto-persist)
const persistStore = () => {
  saveMockStore(mockStore);
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
  
  // === DASHBOARD (DYNAMIC - calculated from actual data) ===
  if (url.includes('/dashboard/kpis')) {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = mockStore.orders.filter(o => o.order_date === today);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const todayDeliveries = mockStore.deliveries.filter(d => d.scheduled_date?.startsWith(today));
    const completedToday = todayDeliveries.filter(d => d.status === 'delivered').length;
    
    const monthStart = today.substring(0, 7); // YYYY-MM
    const monthOrders = mockStore.orders.filter(o => o.order_date?.startsWith(monthStart));
    const monthRevenue = monthOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    
    const lowStockCount = mockStore.inventory.filter(i => i.quantity > 0 && i.quantity <= i.reorder_level).length;
    const outOfStockCount = mockStore.inventory.filter(i => i.quantity === 0).length;
    const pendingOrders = mockStore.orders.filter(o => o.status === 'pending').length;
    
    return { data: {
      today: { orders_today: todayOrders.length, revenue_today: todayRevenue || 156500, deliveries_today: todayDeliveries.length || 5, completed_deliveries_today: completedToday || 3 },
      thisMonth: { orders_this_month: monthOrders.length || mockStore.orders.length, revenue_this_month: monthRevenue || 2450000 },
      pendingOrders: { pending: pendingOrders },
      activeClients: mockStore.clients.length,
      activeProducts: mockStore.products.filter(p => p.is_active).length,
      low_stock_alerts: lowStockCount,
      expiring_alerts: 2,
      out_of_stock_alerts: outOfStockCount
    }};
  }
  if (url.includes('/dashboard/revenue-chart')) {
    // Generate last 7 days of revenue from orders
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(); date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOrders = mockStore.orders.filter(o => o.order_date === dateStr);
      const revenue = dayOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
      days.push({ date: dateStr, label: date.toLocaleDateString('en-PH', { weekday: 'short' }), revenue: revenue || (Math.random() * 100000 + 150000) });
    }
    return { data: days };
  }
  if (url.includes('/dashboard/top-products')) {
    // Calculate from order items
    const productSales = {};
    mockStore.orders.forEach(order => {
      (order.items || []).forEach(item => {
        const name = item.product?.name || 'Unknown';
        if (!productSales[name]) productSales[name] = { name, quantity: 0, revenue: 0, total: 0 };
        productSales[name].quantity += item.quantity || 0;
        productSales[name].revenue += (item.quantity || 0) * (item.unit_price || 0);
        productSales[name].total = productSales[name].revenue;
      });
    });
    const sorted = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    return { data: sorted.length ? sorted : mockDashboardData.topProducts };
  }
  if (url.includes('/dashboard/recent-activity')) {
    // Generate from recent orders and deliveries with proper structure
    const activities = [];
    const now = new Date();
    
    // Add recent orders
    mockStore.orders.slice(0, 5).forEach((o, i) => {
      const orderDate = o.order_date ? new Date(o.order_date) : new Date(now - (i * 2 + 5) * 60000);
      activities.push({ 
        id: `order-${o.id}`, 
        type: 'order', 
        reference: o.order_number || `ORD-${String(o.id).padStart(4, '0')}`,
        client_name: o.client?.business_name || mockStore.clients.find(c => c.id === o.client_id)?.business_name || 'Walk-in Customer',
        status: o.status || 'pending',
        timestamp: orderDate.toISOString()
      });
    });
    
    // Add recent deliveries
    mockStore.deliveries.slice(0, 3).forEach((d, i) => {
      const deliveryDate = d.scheduled_date ? new Date(d.scheduled_date) : new Date(now - (i + 1) * 3600000);
      const driver = mockStore.drivers?.find(dr => dr.id === d.driver_id);
      activities.push({ 
        id: `delivery-${d.id}`, 
        type: 'delivery', 
        reference: d.delivery_number || `DEL-${String(d.id).padStart(4, '0')}`,
        driver_name: driver?.name || d.driver_name || 'Assigned Driver',
        status: d.status || 'pending',
        timestamp: deliveryDate.toISOString()
      });
    });
    
    // Add recent purchase orders
    mockStore.purchaseOrders.slice(0, 2).forEach((po, i) => {
      const poDate = po.order_date ? new Date(po.order_date) : new Date(now - (i + 2) * 3600000);
      const supplier = mockStore.suppliers.find(s => s.id === po.supplier_id);
      activities.push({ 
        id: `po-${po.id}`, 
        type: 'purchase_order', 
        reference: po.po_number || `PO-${String(po.id).padStart(4, '0')}`,
        supplier_name: supplier?.company_name || 'Supplier',
        status: po.status || 'pending',
        timestamp: poDate.toISOString()
      });
    });
    
    // Sort by timestamp descending (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return { data: activities.slice(0, 10) };
  }
  if (url.includes('/dashboard/category-distribution')) {
    // Calculate actual product count per category
    const catCounts = mockStore.categories.map(c => {
      const count = mockStore.products.filter(p => p.category_id === c.id).length;
      const revenue = mockStore.products.filter(p => p.category_id === c.id).reduce((sum, p) => sum + (p.selling_price || 0) * 100, 0);
      return { name: c.name, value: count || c.product_count || 5, revenue };
    });
    return { data: catCounts };
  }
  if (url.includes('/dashboard/inventory-status')) {
    const healthy = mockStore.inventory.filter(i => i.quantity > i.reorder_level).length;
    const low = mockStore.inventory.filter(i => i.quantity > 0 && i.quantity <= i.reorder_level).length;
    const out = mockStore.inventory.filter(i => i.quantity === 0).length;
    return { data: { healthy, low, out } };
  }
  
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
  
  // === REPORTS (DYNAMIC - calculated from actual data) ===
  if (url.includes('/reports/sales')) {
    // Calculate from actual orders
    const totalSales = mockStore.orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const totalOrders = mockStore.orders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const totalItems = mockStore.orders.reduce((sum, o) => sum + (o.items?.length || 2), 0);
    
    // Daily sales from orders
    const salesByDate = {};
    mockStore.orders.forEach(o => {
      const date = o.order_date || '2026-01-31';
      salesByDate[date] = (salesByDate[date] || 0) + parseFloat(o.total_amount || 0);
    });
    const dailySales = Object.entries(salesByDate).map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date));
    
    // Top products from order items
    const productSales = {};
    mockStore.orders.forEach(order => {
      (order.items || []).forEach(item => {
        const name = item.product?.name || 'Unknown';
        if (!productSales[name]) productSales[name] = { name, quantity: 0, total: 0 };
        productSales[name].quantity += item.quantity || 0;
        productSales[name].total += (item.quantity || 0) * (item.unit_price || 0);
      });
    });
    const topProducts = Object.values(productSales).sort((a, b) => b.total - a.total).slice(0, 10);
    
    // Top clients from orders
    const clientSales = {};
    mockStore.orders.forEach(o => {
      const name = o.client?.business_name || 'Unknown';
      if (!clientSales[name]) clientSales[name] = { name, orders: 0, total: 0 };
      clientSales[name].orders++;
      clientSales[name].total += parseFloat(o.total_amount || 0);
    });
    const topClients = Object.values(clientSales).sort((a, b) => b.total - a.total).slice(0, 10);
    
    // Sales by category
    const catSales = {};
    mockStore.orders.forEach(order => {
      (order.items || []).forEach(item => {
        const cat = item.product?.category?.name || 'Uncategorized';
        catSales[cat] = (catSales[cat] || 0) + (item.quantity || 0) * (item.unit_price || 0);
      });
    });
    const byCategory = Object.entries(catSales).map(([category, total]) => ({ category, total }));
    
    return { data: { 
      summary: { totalSales: totalSales || 220500, totalOrders, avgOrderValue: avgOrderValue || 31500, totalItems }, 
      dailySales: dailySales.length ? dailySales : mockDashboardData.revenueChart.map(d => ({ date: d.date, total: d.revenue })), 
      topProducts: topProducts.length ? topProducts : mockDashboardData.topProducts, 
      topClients: topClients.length ? topClients : mockStore.clients.slice(0, 5).map(c => ({ name: c.business_name, orders: 5, total: 50000 })), 
      byCategory: byCategory.length ? byCategory : mockStore.categories.map(c => ({ category: c.name, total: 100000 })) 
    }};
  }
  if (url.includes('/reports/inventory')) {
    // Calculate from actual inventory
    const totalUnits = mockStore.inventory.reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = mockStore.inventory.reduce((sum, i) => sum + (i.quantity * i.unit_cost), 0);
    const lowStock = mockStore.inventory.filter(i => i.quantity > 0 && i.quantity <= i.reorder_level).length;
    const outOfStock = mockStore.inventory.filter(i => i.quantity === 0).length;
    const healthyStock = mockStore.inventory.filter(i => i.quantity > i.reorder_level).length;
    
    // Value by category
    const catValue = {};
    mockStore.inventory.forEach(i => {
      const cat = i.product?.category?.name || 'Uncategorized';
      catValue[cat] = (catValue[cat] || 0) + (i.quantity * i.unit_cost);
    });
    const byCategory = Object.entries(catValue).map(([name, value]) => ({ name, value }));
    
    return { data: { 
      summary: { totalProducts: mockStore.products.length, totalUnits, totalValue, lowStock, outOfStock, healthyStock }, 
      byCategory: byCategory.length ? byCategory : mockStore.categories.map(c => ({ name: c.name, value: 100000 })), 
      lowStockItems: mockStore.inventory.filter(i => i.quantity <= i.reorder_level).map(i => ({ product: i.product?.name || 'Unknown', category: i.product?.category?.name || 'N/A', quantity: i.quantity, reorder_level: i.reorder_level })) 
    }};
  }
  if (url.includes('/reports/delivery') || url.includes('/reports/delivery-performance')) {
    // Calculate from actual deliveries
    const total = mockStore.deliveries.length;
    const delivered = mockStore.deliveries.filter(d => d.status === 'delivered').length;
    const inTransit = mockStore.deliveries.filter(d => d.status === 'in-transit').length;
    const pending = mockStore.deliveries.filter(d => ['pending', 'assigned'].includes(d.status)).length;
    const failed = mockStore.deliveries.filter(d => d.status === 'failed').length;
    const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    
    // Driver performance
    const driverStats = {};
    mockStore.deliveries.forEach(d => {
      const name = d.driver_name || 'Unknown';
      if (!driverStats[name]) driverStats[name] = { name, total: 0, delivered: 0, failed: 0, avgTime: 40 };
      driverStats[name].total++;
      if (d.status === 'delivered') driverStats[name].delivered++;
      if (d.status === 'failed') driverStats[name].failed++;
    });
    
    return { data: { 
      summary: { total: total || 3, delivered: delivered || 1, failed, inTransit: inTransit || 1, pending: pending || 1, successRate: successRate || 33, avgDeliveryTime: 42 }, 
      dailyDeliveries: mockDashboardData.revenueChart.map(d => ({ date: d.date, delivered: Math.floor(Math.random() * 5) + 1, failed: 0 })), 
      driverPerformance: Object.values(driverStats).length ? Object.values(driverStats) : [{ name: 'Pedro Reyes', total: 2, delivered: 1, failed: 0, avgTime: 38 }] 
    }};
  }
  if (url.includes('/reports/financial')) {
    // Calculate from actual orders and purchase orders
    const totalRevenue = mockStore.orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0) || 220500;
    const totalExpenses = mockStore.purchaseOrders.reduce((sum, po) => sum + parseFloat(po.total_amount || 0), 0) || 255000;
    const grossProfit = totalRevenue - totalExpenses;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfit = grossProfit * 0.75;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    // Receivables from client balances
    const receivables = mockStore.clients.reduce((sum, c) => sum + (c.current_balance || 0), 0) || 90500;
    
    // Revenue by source (by client type/tier)
    const revenueBySource = [
      { source: 'Regular Clients', value: totalRevenue * 0.25 },
      { source: 'Wholesale', value: totalRevenue * 0.35 },
      { source: 'Distributors', value: totalRevenue * 0.30 },
      { source: 'VIP Clients', value: totalRevenue * 0.10 }
    ];
    
    // Expenses by category
    const expensesByCategory = [
      { category: 'Inventory/COGS', amount: totalExpenses * 0.60 },
      { category: 'Transportation', amount: totalExpenses * 0.15 },
      { category: 'Salaries', amount: totalExpenses * 0.12 },
      { category: 'Utilities', amount: totalExpenses * 0.05 },
      { category: 'Rent', amount: totalExpenses * 0.05 },
      { category: 'Other', amount: totalExpenses * 0.03 }
    ];
    
    // Cash flow data
    const cashFlow = mockDashboardData.revenueChart.map(d => ({
      date: d.date,
      inflow: d.revenue,
      outflow: d.revenue * 0.70
    }));
    
    // Recent transactions from orders and POs
    const recentTransactions = [
      ...mockStore.orders.slice(0, 5).map(o => ({
        date: o.order_date,
        description: `Order ${o.order_number}`,
        type: 'income',
        entity: o.client?.business_name || 'Client',
        amount: o.total_amount
      })),
      ...mockStore.purchaseOrders.slice(0, 3).map(po => ({
        date: po.expected_date || '2026-01-30',
        description: `Purchase ${po.po_number}`,
        type: 'expense',
        entity: po.supplier?.name || 'Supplier',
        amount: po.total_amount
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return { data: { 
      summary: { 
        totalRevenue, 
        totalExpenses, 
        grossProfit, 
        netProfit, 
        grossMargin: parseFloat(grossMargin.toFixed(1)), 
        netMargin: parseFloat(netMargin.toFixed(1)),
        revenueGrowth: 12.5
      }, 
      trend: mockDashboardData.revenueChart.map(d => ({ date: d.date, revenue: d.revenue, expenses: d.revenue * 0.75, profitMargin: 25 })), 
      receivables: { total: receivables, current: Math.round(receivables * 0.6), days30: Math.round(receivables * 0.25), days60: Math.round(receivables * 0.15) }, 
      payables: { total: 85000, current: 60000, days30: 20000, days60: 5000 },
      revenueBySource,
      expensesByCategory,
      cashFlow,
      recentTransactions
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
  
  // Helper to persist and return result
  const persistAndReturn = (result) => {
    persistStore();
    return result;
  };
  
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
    return persistAndReturn({ data: { success: true, plan: newPlan } });
  }
  
  // === PRODUCTS ===
  if (url.includes('/products')) {
    const newId = mockStore.nextIds.product++;
    const newProduct = { id: newId, ...data, category: mockStore.categories.find(c => c.id === parseInt(data.category_id)) };
    mockStore.products.push(newProduct);
    return persistAndReturn({ data: { success: true, product: newProduct } });
  }
  
  // === CATEGORIES ===
  if (url.includes('/categories')) {
    const newId = mockStore.nextIds.category++;
    const newCat = { id: newId, ...data, product_count: 0 };
    mockStore.categories.push(newCat);
    return persistAndReturn({ data: { success: true, category: newCat } });
  }
  
  // === CLIENTS ===
  if (url.includes('/clients')) {
    const newId = mockStore.nextIds.client++;
    const newClient = { id: newId, ...data };
    mockStore.clients.push(newClient);
    return persistAndReturn({ data: { success: true, client: newClient } });
  }
  
  // === SUPPLIERS ===
  if (url.includes('/suppliers')) {
    const newId = mockStore.nextIds.supplier++;
    const newSupplier = { id: newId, ...data, is_active: true };
    mockStore.suppliers.push(newSupplier);
    return persistAndReturn({ data: { success: true, supplier: newSupplier } });
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
    return persistAndReturn({ data: { success: true, order: newOrder } });
  }
  
  // === PURCHASE ORDERS ===
  if (url.match(/\/purchase-orders\/\d+\/receive/)) {
    return persistAndReturn({ data: { success: true, message: 'Goods received successfully' } });
  }
  if (url.includes('/purchase-orders')) {
    const newId = mockStore.nextIds.po++;
    const supplier = mockStore.suppliers.find(s => s.id === parseInt(data.supplier_id));
    const newPO = { 
      id: newId, po_number: `PO-2026-${String(newId).padStart(3, '0')}`, 
      ...data, supplier, status: 'pending', order_date: new Date().toISOString().split('T')[0]
    };
    mockStore.purchaseOrders.unshift(newPO);
    return persistAndReturn({ data: { success: true, purchaseOrder: newPO } });
  }
  
  // === WAREHOUSE ===
  if (url.includes('/warehouse')) {
    const newId = mockStore.nextIds.warehouse++;
    const newWarehouse = { id: String(newId), ...data, is_active: true };
    mockStore.warehouses.push(newWarehouse);
    return persistAndReturn({ data: { success: true, warehouse: newWarehouse } });
  }
  
  // === USERS ===
  if (url.match(/\/users\/\d+\/reset-password/)) {
    return { data: { success: true, message: 'Password reset email sent' } };
  }
  if (url.includes('/users')) {
    const newId = mockStore.nextIds.user++;
    const newUser = { id: String(newId), ...data, is_active: true, password: 'password123' };
    mockStore.users.push(newUser);
    return persistAndReturn({ data: { success: true, user: { ...newUser, password: undefined } } });
  }
  
  return { data: { success: true, message: 'Created successfully', id: Date.now() } };
};

const mockPut = async (url, data) => {
  await delay(300);
  
  // Helper to persist and return result
  const persistAndReturn = (result) => {
    persistStore();
    return result;
  };
  
  // === DISTRIBUTION PLANS ===
  if (url.includes('/distribution/plans')) {
    const idMatch = url.match(/\/distribution\/plans\/(\d+)/);
    if (idMatch) {
      const plan = mockStore.distributionPlans.find(p => p.id === parseInt(idMatch[1]));
      if (plan) Object.assign(plan, data);
      return persistAndReturn({ data: { success: true, plan } });
    }
  }
  
  // === PRODUCTS ===
  if (url.includes('/products')) {
    const idMatch = url.match(/\/products\/(\d+)/);
    if (idMatch) {
      const idx = mockStore.products.findIndex(p => p.id === parseInt(idMatch[1]));
      if (idx !== -1) {
        mockStore.products[idx] = { ...mockStore.products[idx], ...data };
        return persistAndReturn({ data: { success: true, product: mockStore.products[idx] } });
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
        return persistAndReturn({ data: { success: true, category: mockStore.categories[idx] } });
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
