import express from 'express';
import { query } from '../database/db.js';

const router = express.Router();

// Main Dashboard KPIs
router.get('/kpis', async (req, res, next) => {
  try {
    // Today's metrics
    const todayResult = await query(
      `SELECT 
        (SELECT COUNT(*) FROM orders WHERE DATE(order_date) = CURRENT_DATE) as orders_today,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE DATE(order_date) = CURRENT_DATE AND status = 'delivered') as revenue_today,
        (SELECT COUNT(*) FROM deliveries WHERE DATE(scheduled_date) = CURRENT_DATE) as deliveries_today,
        (SELECT COUNT(*) FROM deliveries WHERE DATE(scheduled_date) = CURRENT_DATE AND status = 'delivered') as completed_deliveries_today`
    );

    // This month metrics
    const monthResult = await query(
      `SELECT 
        COUNT(*) as orders_this_month,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END), 0) as revenue_this_month
       FROM orders 
       WHERE DATE_TRUNC('month', order_date) = DATE_TRUNC('month', CURRENT_DATE)`
    );

    // Pending orders
    const pendingResult = await query(
      `SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'picking' THEN 1 END) as picking
       FROM orders`
    );

    // Inventory alerts
    const alertsResult = await query(
      `SELECT 
        (SELECT COUNT(*) FROM stock_alerts WHERE status = 'active' AND alert_type = 'low_stock') as low_stock_alerts,
        (SELECT COUNT(*) FROM stock_alerts WHERE status = 'active' AND alert_type = 'expiring') as expiring_alerts,
        (SELECT COUNT(*) FROM stock_alerts WHERE status = 'active' AND alert_type = 'out_of_stock') as out_of_stock_alerts`
    );

    // Active clients count
    const clientsResult = await query(
      `SELECT COUNT(*) as active_clients FROM clients WHERE is_active = true`
    );

    // Active products count
    const productsResult = await query(
      `SELECT COUNT(*) as active_products FROM products WHERE is_active = true`
    );

    res.json({
      today: todayResult.rows[0],
      thisMonth: monthResult.rows[0],
      pendingOrders: pendingResult.rows[0],
      alerts: alertsResult.rows[0],
      activeClients: parseInt(clientsResult.rows[0].active_clients),
      activeProducts: parseInt(productsResult.rows[0].active_products)
    });
  } catch (error) {
    next(error);
  }
});

// Revenue Chart Data
router.get('/revenue-chart', async (req, res, next) => {
  try {
    const { period = '30days' } = req.query;

    let interval, groupFormat, dateFormat;
    
    switch (period) {
      case '7days':
        interval = '7 days';
        groupFormat = 'YYYY-MM-DD';
        dateFormat = 'Mon DD';
        break;
      case '30days':
        interval = '30 days';
        groupFormat = 'YYYY-MM-DD';
        dateFormat = 'Mon DD';
        break;
      case '12months':
        interval = '12 months';
        groupFormat = 'YYYY-MM';
        dateFormat = 'Mon YYYY';
        break;
      default:
        interval = '30 days';
        groupFormat = 'YYYY-MM-DD';
        dateFormat = 'Mon DD';
    }

    const result = await query(
      `SELECT TO_CHAR(order_date, '${groupFormat}') as date,
              TO_CHAR(order_date, '${dateFormat}') as label,
              COALESCE(SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END), 0) as revenue,
              COUNT(CASE WHEN status = 'delivered' THEN 1 END) as orders
       FROM orders
       WHERE order_date >= CURRENT_DATE - INTERVAL '${interval}'
       GROUP BY TO_CHAR(order_date, '${groupFormat}'), TO_CHAR(order_date, '${dateFormat}')
       ORDER BY date`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Top Products Chart
router.get('/top-products', async (req, res, next) => {
  try {
    const { limit = 10, period = '30days' } = req.query;

    const result = await query(
      `SELECT p.id, p.name, p.sku,
              SUM(oi.quantity) as quantity_sold,
              SUM(oi.total_price) as revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       WHERE o.status = 'delivered'
         AND o.order_date >= CURRENT_DATE - INTERVAL '${period === '30days' ? '30 days' : '12 months'}'
       GROUP BY p.id, p.name, p.sku
       ORDER BY revenue DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Top Clients Chart
router.get('/top-clients', async (req, res, next) => {
  try {
    const { limit = 10, period = '30days' } = req.query;

    const result = await query(
      `SELECT c.id, c.business_name, c.code,
              COUNT(o.id) as order_count,
              COALESCE(SUM(o.total_amount), 0) as total_spent
       FROM clients c
       LEFT JOIN orders o ON c.id = o.client_id 
         AND o.status = 'delivered'
         AND o.order_date >= CURRENT_DATE - INTERVAL '${period === '30days' ? '30 days' : '12 months'}'
       WHERE c.is_active = true
       GROUP BY c.id, c.business_name, c.code
       ORDER BY total_spent DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Category Sales Distribution
router.get('/category-distribution', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.id, c.name,
              COALESCE(SUM(oi.total_price), 0) as revenue,
              COUNT(DISTINCT oi.order_id) as orders
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id
       LEFT JOIN order_items oi ON p.id = oi.product_id
       LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'delivered'
       WHERE c.is_active = true
       GROUP BY c.id, c.name
       ORDER BY revenue DESC`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Inventory Status Summary
router.get('/inventory-status', async (req, res, next) => {
  try {
    // Stock levels by warehouse
    const warehouseStock = await query(
      `SELECT w.id, w.name, w.code,
              COUNT(DISTINCT i.product_id) as products,
              COALESCE(SUM(i.quantity), 0) as total_stock,
              COALESCE(SUM(i.quantity * p.cost_price), 0) as stock_value
       FROM warehouses w
       LEFT JOIN inventory i ON w.id = i.warehouse_id
       LEFT JOIN products p ON i.product_id = p.id
       WHERE w.is_active = true
       GROUP BY w.id, w.name, w.code`
    );

    // Stock health
    const stockHealth = await query(
      `SELECT 
        SUM(CASE WHEN COALESCE(total_qty, 0) > p.reorder_point THEN 1 ELSE 0 END) as healthy,
        SUM(CASE WHEN COALESCE(total_qty, 0) <= p.reorder_point AND COALESCE(total_qty, 0) > p.min_stock_level THEN 1 ELSE 0 END) as low,
        SUM(CASE WHEN COALESCE(total_qty, 0) <= p.min_stock_level AND COALESCE(total_qty, 0) > 0 THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN COALESCE(total_qty, 0) = 0 THEN 1 ELSE 0 END) as out_of_stock
       FROM products p
       LEFT JOIN (
         SELECT product_id, SUM(quantity) as total_qty
         FROM inventory GROUP BY product_id
       ) inv ON p.id = inv.product_id
       WHERE p.is_active = true`
    );

    res.json({
      byWarehouse: warehouseStock.rows,
      health: stockHealth.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Recent Activity Feed
router.get('/recent-activity', async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    // Recent orders
    const recentOrders = await query(
      `SELECT 'order' as type, o.id, o.order_number as reference, 
              o.status, o.total_amount as amount,
              c.business_name as client_name,
              o.created_at as timestamp
       FROM orders o
       JOIN clients c ON o.client_id = c.id
       ORDER BY o.created_at DESC
       LIMIT $1`,
      [Math.floor(limit / 4)]
    );

    // Recent deliveries
    const recentDeliveries = await query(
      `SELECT 'delivery' as type, d.id, d.delivery_number as reference,
              d.status, NULL as amount,
              u.first_name || ' ' || u.last_name as driver_name,
              d.created_at as timestamp
       FROM deliveries d
       LEFT JOIN drivers drv ON d.driver_id = drv.id
       LEFT JOIN users u ON drv.user_id = u.id
       ORDER BY d.created_at DESC
       LIMIT $1`,
      [Math.floor(limit / 4)]
    );

    // Recent inventory transactions
    const recentInventory = await query(
      `SELECT 'inventory' as type, it.id, it.reference_number as reference,
              it.transaction_type as status, it.quantity as amount,
              p.name as product_name,
              it.created_at as timestamp
       FROM inventory_transactions it
       JOIN products p ON it.product_id = p.id
       ORDER BY it.created_at DESC
       LIMIT $1`,
      [Math.floor(limit / 4)]
    );

    // Recent purchase orders
    const recentPOs = await query(
      `SELECT 'purchase_order' as type, po.id, po.po_number as reference,
              po.status, po.total_amount as amount,
              s.name as supplier_name,
              po.created_at as timestamp
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       ORDER BY po.created_at DESC
       LIMIT $1`,
      [Math.floor(limit / 4)]
    );

    // Combine and sort by timestamp
    const activities = [
      ...recentOrders.rows,
      ...recentDeliveries.rows,
      ...recentInventory.rows,
      ...recentPOs.rows
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
     .slice(0, limit);

    res.json(activities);
  } catch (error) {
    next(error);
  }
});

// Delivery Status Overview
router.get('/delivery-status', async (req, res, next) => {
  try {
    // Today's deliveries by status
    const todayStatus = await query(
      `SELECT status, COUNT(*) as count
       FROM deliveries
       WHERE DATE(scheduled_date) = CURRENT_DATE
       GROUP BY status`
    );

    // This week's performance
    const weekPerformance = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        SUM(completed_stops) as total_stops_completed,
        SUM(total_stops) as total_stops_planned
       FROM deliveries
       WHERE scheduled_date >= DATE_TRUNC('week', CURRENT_DATE)`
    );

    // Upcoming deliveries
    const upcoming = await query(
      `SELECT d.id, d.delivery_number, d.scheduled_date,
              d.total_stops, dr.name as route_name,
              u.first_name || ' ' || u.last_name as driver_name
       FROM deliveries d
       LEFT JOIN delivery_routes dr ON d.route_id = dr.id
       LEFT JOIN drivers drv ON d.driver_id = drv.id
       LEFT JOIN users u ON drv.user_id = u.id
       WHERE d.status IN ('pending', 'assigned', 'in_transit')
         AND d.scheduled_date >= CURRENT_DATE
       ORDER BY d.scheduled_date, d.created_at
       LIMIT 10`
    );

    res.json({
      todayByStatus: todayStatus.rows,
      weekPerformance: weekPerformance.rows[0],
      upcoming: upcoming.rows
    });
  } catch (error) {
    next(error);
  }
});

// Pending Actions Summary
router.get('/pending-actions', async (req, res, next) => {
  try {
    const actions = await query(
      `SELECT 
        (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
        (SELECT COUNT(*) FROM orders WHERE status IN ('confirmed', 'processing') AND DATE(order_date) < CURRENT_DATE - INTERVAL '2 days') as delayed_orders,
        (SELECT COUNT(*) FROM purchase_orders WHERE status = 'pending') as pending_pos,
        (SELECT COUNT(*) FROM deliveries WHERE status = 'pending' AND DATE(scheduled_date) = CURRENT_DATE) as today_deliveries_pending,
        (SELECT COUNT(*) FROM invoices WHERE status = 'overdue') as overdue_invoices,
        (SELECT COUNT(*) FROM stock_alerts WHERE status = 'active') as active_alerts,
        (SELECT COUNT(*) FROM goods_receipts WHERE status = 'pending') as pending_receipts`
    );

    res.json(actions.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Sales by Area/Region
router.get('/sales-by-area', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT ca.city, ca.province,
              COUNT(DISTINCT o.id) as orders,
              COALESCE(SUM(o.total_amount), 0) as revenue
       FROM client_addresses ca
       JOIN clients c ON ca.client_id = c.id AND ca.is_default = true
       LEFT JOIN orders o ON c.id = o.client_id AND o.status = 'delivered'
       GROUP BY ca.city, ca.province
       ORDER BY revenue DESC
       LIMIT 20`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Distribution Plan Dashboard
router.get('/distribution-overview', async (req, res, next) => {
  try {
    // Active distribution plans
    const activePlans = await query(
      `SELECT dp.id, dp.plan_number, dp.plan_date, dp.status,
              dp.total_orders, dp.total_value,
              COUNT(da.id) as allocations
       FROM distribution_plans dp
       LEFT JOIN distribution_allocations da ON dp.id = da.plan_id
       WHERE dp.status IN ('draft', 'approved', 'executing')
       GROUP BY dp.id, dp.plan_number, dp.plan_date, dp.status, dp.total_orders, dp.total_value
       ORDER BY dp.plan_date DESC
       LIMIT 5`
    );

    // Allocation stats
    const allocationStats = await query(
      `SELECT 
        COUNT(*) as total_allocations,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'allocated' THEN 1 END) as allocated,
        COUNT(CASE WHEN status = 'picked' THEN 1 END) as picked,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered
       FROM distribution_allocations
       WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`
    );

    res.json({
      activePlans: activePlans.rows,
      allocationStats: allocationStats.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// ====================================================
// ORDER VISIBILITY DASHBOARD (Centralized Order Management)
// ====================================================

// Real-time Order Status Overview
router.get('/order-visibility', async (req, res, next) => {
  try {
    // Order counts by status
    const statusCounts = await query(
      `SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total_value
       FROM orders
       WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY status
       ORDER BY CASE status
         WHEN 'pending' THEN 1
         WHEN 'confirmed' THEN 2
         WHEN 'processing' THEN 3
         WHEN 'picking' THEN 4
         WHEN 'packed' THEN 5
         WHEN 'shipped' THEN 6
         WHEN 'delivered' THEN 7
         WHEN 'cancelled' THEN 8
         ELSE 9
       END`
    );

    // Today's order summary
    const todaySummary = await query(
      `SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status IN ('confirmed', 'processing', 'picking', 'packed') THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END) as dispatched,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COALESCE(SUM(total_amount), 0) as total_value,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END), 0) as delivered_value
       FROM orders
       WHERE DATE(order_date) = CURRENT_DATE`
    );

    // Orders requiring attention (pending > 24hrs, failed deliveries)
    const attentionRequired = await query(
      `SELECT o.id, o.order_number, o.status, o.total_amount, o.order_date,
              c.business_name as client_name, c.phone as client_phone,
              CASE 
                WHEN o.status = 'pending' AND o.created_at < NOW() - INTERVAL '24 hours' THEN 'pending_too_long'
                WHEN o.status = 'failed' THEN 'delivery_failed'
                WHEN o.required_date < CURRENT_DATE AND o.status NOT IN ('delivered', 'cancelled') THEN 'overdue'
              END as attention_reason
       FROM orders o
       JOIN clients c ON o.client_id = c.id
       WHERE (
         (o.status = 'pending' AND o.created_at < NOW() - INTERVAL '24 hours')
         OR o.status = 'failed'
         OR (o.required_date < CURRENT_DATE AND o.status NOT IN ('delivered', 'cancelled'))
       )
       ORDER BY o.order_date DESC
       LIMIT 20`
    );

    // Recent order activity (last 50 status changes)
    const recentActivity = await query(
      `SELECT osh.*, o.order_number, c.business_name as client_name,
              u.first_name || ' ' || u.last_name as changed_by_name
       FROM order_status_history osh
       JOIN orders o ON osh.order_id = o.id
       JOIN clients c ON o.client_id = c.id
       LEFT JOIN users u ON osh.changed_by = u.id
       ORDER BY osh.created_at DESC
       LIMIT 50`
    );

    res.json({
      statusCounts: statusCounts.rows,
      todaySummary: todaySummary.rows[0],
      attentionRequired: attentionRequired.rows,
      recentActivity: recentActivity.rows
    });
  } catch (error) {
    next(error);
  }
});

// Real-time Delivery Tracking Dashboard
router.get('/delivery-tracking', async (req, res, next) => {
  try {
    // Active deliveries with real-time status
    const activeDeliveries = await query(
      `SELECT d.id, d.delivery_number, d.status, d.scheduled_date,
              d.total_stops, d.completed_stops,
              d.departure_time,
              dr.name as route_name,
              drv.current_latitude, drv.current_longitude, drv.last_location_update,
              u.first_name || ' ' || u.last_name as driver_name,
              u.phone as driver_phone,
              v.plate_number
       FROM deliveries d
       LEFT JOIN delivery_routes dr ON d.route_id = dr.id
       LEFT JOIN drivers drv ON d.driver_id = drv.id
       LEFT JOIN users u ON drv.user_id = u.id
       LEFT JOIN vehicles v ON d.vehicle_id = v.id
       WHERE d.status IN ('scheduled', 'loading', 'in_transit')
         AND d.scheduled_date = CURRENT_DATE
       ORDER BY CASE d.status
         WHEN 'in_transit' THEN 1
         WHEN 'loading' THEN 2
         WHEN 'scheduled' THEN 3
       END, d.departure_time`
    );

    // Get delivery items for active deliveries
    const deliveriesWithStops = await Promise.all(activeDeliveries.rows.map(async (delivery) => {
      const stops = await query(
        `SELECT di.id, di.sequence_number, di.status, di.delivery_address,
                di.latitude, di.longitude,
                c.business_name as client_name, c.phone as client_phone,
                o.order_number, o.total_amount
         FROM delivery_items di
         LEFT JOIN clients c ON di.client_id = c.id
         LEFT JOIN orders o ON di.order_id = o.id
         WHERE di.delivery_id = $1
         ORDER BY di.sequence_number`,
        [delivery.id]
      );
      return { ...delivery, stops: stops.rows };
    }));

    // Driver locations for map
    const driverLocations = await query(
      `SELECT d.id as driver_id, d.current_latitude, d.current_longitude, 
              d.last_location_update, d.status,
              u.first_name || ' ' || u.last_name as driver_name,
              del.delivery_number, del.id as delivery_id
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN deliveries del ON del.driver_id = d.id 
         AND del.status = 'in_transit' 
         AND del.scheduled_date = CURRENT_DATE
       WHERE d.is_active = true 
         AND d.status IN ('on_delivery', 'assigned')
         AND d.current_latitude IS NOT NULL`
    );

    // Today's delivery stats
    const todayStats = await query(
      `SELECT 
        COUNT(DISTINCT d.id) as total_deliveries,
        COUNT(DISTINCT CASE WHEN d.status = 'scheduled' THEN d.id END) as scheduled,
        COUNT(DISTINCT CASE WHEN d.status = 'in_transit' THEN d.id END) as in_transit,
        COUNT(DISTINCT CASE WHEN d.status = 'delivered' THEN d.id END) as completed,
        COUNT(DISTINCT CASE WHEN d.status = 'failed' THEN d.id END) as failed,
        SUM(d.total_stops) as total_stops,
        SUM(d.completed_stops) as completed_stops,
        COUNT(CASE WHEN di.status = 'delivered' THEN 1 END) as stops_delivered,
        COUNT(CASE WHEN di.status = 'failed' THEN 1 END) as stops_failed
       FROM deliveries d
       LEFT JOIN delivery_items di ON d.id = di.delivery_id
       WHERE d.scheduled_date = CURRENT_DATE`
    );

    res.json({
      activeDeliveries: deliveriesWithStops,
      driverLocations: driverLocations.rows,
      todayStats: todayStats.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Order Flow Pipeline (for Admin dashboard)
router.get('/order-pipeline', async (req, res, next) => {
  try {
    const { period = '7days' } = req.query;
    const interval = period === '7days' ? '7 days' : period === '30days' ? '30 days' : '90 days';

    // Order flow by day
    const dailyFlow = await query(
      `SELECT DATE(order_date) as date,
              COUNT(*) as created,
              COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
              COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped,
              COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
              COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
       FROM orders
       WHERE order_date >= CURRENT_DATE - INTERVAL '${interval}'
       GROUP BY DATE(order_date)
       ORDER BY date`
    );

    // Average processing time by status
    const processingTimes = await query(
      `SELECT 
        AVG(EXTRACT(EPOCH FROM (
          CASE WHEN status != 'pending' THEN 
            (SELECT MIN(created_at) FROM order_status_history WHERE order_id = o.id AND status = 'confirmed')
          END - created_at
        )) / 3600) as avg_confirmation_hours,
        AVG(EXTRACT(EPOCH FROM (shipped_date - created_at)) / 3600) as avg_ship_hours,
        AVG(EXTRACT(EPOCH FROM (delivered_date - created_at)) / 3600) as avg_delivery_hours
       FROM orders o
       WHERE order_date >= CURRENT_DATE - INTERVAL '${interval}'
         AND status = 'delivered'`
    );

    // Top performing clients
    const topClients = await query(
      `SELECT c.id, c.business_name, c.code,
              COUNT(o.id) as order_count,
              COALESCE(SUM(o.total_amount), 0) as total_value
       FROM clients c
       JOIN orders o ON c.id = o.client_id
       WHERE o.order_date >= CURRENT_DATE - INTERVAL '${interval}'
         AND o.status NOT IN ('cancelled')
       GROUP BY c.id, c.business_name, c.code
       ORDER BY total_value DESC
       LIMIT 10`
    );

    res.json({
      dailyFlow: dailyFlow.rows,
      processingTimes: processingTimes.rows[0],
      topClients: topClients.rows
    });
  } catch (error) {
    next(error);
  }
});

// Duplicate Order Alerts
router.get('/duplicate-alerts', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT doc.*, o.order_number, o.total_amount, o.status,
              c.business_name as client_name,
              u.first_name || ' ' || u.last_name as confirmed_by_name
       FROM duplicate_order_checks doc
       JOIN orders o ON doc.order_id = o.id
       JOIN clients c ON doc.client_id = c.id
       LEFT JOIN users u ON doc.confirmed_by = u.id
       WHERE doc.created_at >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY doc.created_at DESC
       LIMIT 50`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;
