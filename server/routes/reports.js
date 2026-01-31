import express from 'express';
import { query } from '../database/db.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const router = express.Router();

// Sales Report
router.get('/sales', async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day', clientId, productId } = req.query;

    let dateFormat = 'YYYY-MM-DD';
    if (groupBy === 'week') dateFormat = 'YYYY-WW';
    if (groupBy === 'month') dateFormat = 'YYYY-MM';
    if (groupBy === 'year') dateFormat = 'YYYY';

    let whereConditions = [`o.status = 'delivered'`];
    let params = [];
    let paramIndex = 1;

    if (startDate) {
      whereConditions.push(`o.order_date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`o.order_date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    if (clientId) {
      whereConditions.push(`o.client_id = $${paramIndex}`);
      params.push(clientId);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Summary
    const summaryResult = await query(
      `SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT o.client_id) as unique_clients,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COALESCE(AVG(o.total_amount), 0) as avg_order_value,
        COALESCE(SUM(oi.quantity), 0) as total_items_sold
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       ${whereClause}`,
      params
    );

    // By period
    const periodResult = await query(
      `SELECT TO_CHAR(o.order_date, '${dateFormat}') as period,
              COUNT(DISTINCT o.id) as orders,
              SUM(o.total_amount) as revenue,
              SUM(oi.quantity) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       ${whereClause}
       GROUP BY TO_CHAR(o.order_date, '${dateFormat}')
       ORDER BY period`,
      params
    );

    // Top products
    const topProductsResult = await query(
      `SELECT p.id, p.sku, p.name,
              SUM(oi.quantity) as quantity_sold,
              SUM(oi.total_price) as revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       ${whereClause}
       GROUP BY p.id, p.sku, p.name
       ORDER BY revenue DESC
       LIMIT 20`,
      params
    );

    // Top clients
    const topClientsResult = await query(
      `SELECT c.id, c.code, c.business_name,
              COUNT(DISTINCT o.id) as order_count,
              SUM(o.total_amount) as total_spent
       FROM orders o
       JOIN clients c ON o.client_id = c.id
       ${whereClause}
       GROUP BY c.id, c.code, c.business_name
       ORDER BY total_spent DESC
       LIMIT 20`,
      params
    );

    // By category
    const categoryResult = await query(
      `SELECT cat.id, cat.name,
              SUM(oi.quantity) as quantity_sold,
              SUM(oi.total_price) as revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       LEFT JOIN categories cat ON p.category_id = cat.id
       ${whereClause}
       GROUP BY cat.id, cat.name
       ORDER BY revenue DESC`,
      params
    );

    res.json({
      summary: summaryResult.rows[0],
      byPeriod: periodResult.rows,
      topProducts: topProductsResult.rows,
      topClients: topClientsResult.rows,
      byCategory: categoryResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Inventory Report
router.get('/inventory', async (req, res, next) => {
  try {
    const { warehouseId, categoryId, lowStock, expiring } = req.query;

    let whereConditions = ['p.is_active = true'];
    let params = [];
    let paramIndex = 1;

    if (warehouseId) {
      whereConditions.push(`i.warehouse_id = $${paramIndex}`);
      params.push(warehouseId);
      paramIndex++;
    }

    if (categoryId) {
      whereConditions.push(`p.category_id = $${paramIndex}`);
      params.push(categoryId);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Summary
    const summaryResult = await query(
      `SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COALESCE(SUM(i.quantity), 0) as total_stock,
        COALESCE(SUM(i.quantity * COALESCE(p.cost_price, 0)), 0) as total_value,
        COALESCE(SUM(i.reserved_quantity), 0) as total_reserved
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       ${whereClause}`,
      params
    );

    // By warehouse
    const warehouseResult = await query(
      `SELECT w.id, w.name, w.code,
              COUNT(DISTINCT i.product_id) as product_count,
              COALESCE(SUM(i.quantity), 0) as total_stock,
              COALESCE(SUM(i.quantity * COALESCE(p.cost_price, 0)), 0) as total_value
       FROM warehouses w
       LEFT JOIN inventory i ON w.id = i.warehouse_id
       LEFT JOIN products p ON i.product_id = p.id
       WHERE w.is_active = true
       GROUP BY w.id, w.name, w.code
       ORDER BY total_value DESC`
    );

    // By category
    const categoryResult = await query(
      `SELECT cat.id, cat.name,
              COUNT(DISTINCT p.id) as product_count,
              COALESCE(SUM(i.quantity), 0) as total_stock,
              COALESCE(SUM(i.quantity * COALESCE(p.cost_price, 0)), 0) as total_value
       FROM categories cat
       LEFT JOIN products p ON cat.id = p.category_id
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE cat.is_active = true
       GROUP BY cat.id, cat.name
       ORDER BY total_value DESC`
    );

    // Low stock items
    const lowStockResult = await query(
      `SELECT p.id, p.sku, p.name, p.min_stock_level, p.reorder_point,
              COALESCE(SUM(i.quantity), 0) as current_stock,
              COALESCE(SUM(i.reserved_quantity), 0) as reserved
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.is_active = true
       GROUP BY p.id, p.sku, p.name, p.min_stock_level, p.reorder_point
       HAVING COALESCE(SUM(i.quantity), 0) <= p.reorder_point
       ORDER BY (p.reorder_point - COALESCE(SUM(i.quantity), 0)) DESC`
    );

    // Expiring items (next 30 days)
    const expiringResult = await query(
      `SELECT p.id, p.sku, p.name,
              i.batch_number, i.quantity, i.expiry_date,
              w.name as warehouse_name
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       JOIN warehouses w ON i.warehouse_id = w.id
       WHERE i.expiry_date IS NOT NULL 
         AND i.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
         AND i.quantity > 0
       ORDER BY i.expiry_date ASC`
    );

    res.json({
      summary: summaryResult.rows[0],
      byWarehouse: warehouseResult.rows,
      byCategory: categoryResult.rows,
      lowStock: lowStockResult.rows,
      expiring: expiringResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Financial Report
router.get('/financial', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    let params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE order_date BETWEEN $1 AND $2';
      params = [startDate, endDate];
    }

    // Revenue summary
    const revenueResult = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN subtotal ELSE 0 END), 0) as gross_sales,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN discount_amount ELSE 0 END), 0) as total_discounts,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN tax_amount ELSE 0 END), 0) as total_tax
       FROM orders ${dateFilter}`,
      params
    );

    // Receivables
    const receivablesResult = await query(
      `SELECT 
        COALESCE(SUM(balance_due), 0) as total_receivables,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN balance_due ELSE 0 END), 0) as overdue_amount
       FROM invoices
       WHERE status NOT IN ('paid', 'cancelled')`
    );

    // Payables (to suppliers)
    const payablesResult = await query(
      `SELECT 
        COALESCE(SUM(total_amount), 0) as total_payables
       FROM purchase_orders
       WHERE status IN ('approved', 'ordered', 'partial', 'received')
         AND id NOT IN (SELECT purchase_order_id FROM supplier_payments WHERE purchase_order_id IS NOT NULL)`
    );

    // Monthly trend
    const trendResult = await query(
      `SELECT TO_CHAR(order_date, 'YYYY-MM') as month,
              SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) as revenue,
              COUNT(CASE WHEN status = 'delivered' THEN 1 END) as orders
       FROM orders
       WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
       GROUP BY TO_CHAR(order_date, 'YYYY-MM')
       ORDER BY month`
    );

    // Payment method breakdown
    const paymentMethodResult = await query(
      `SELECT payment_method,
              COUNT(*) as transaction_count,
              SUM(amount) as total_amount
       FROM payments
       ${startDate && endDate ? 'WHERE payment_date BETWEEN $1 AND $2' : ''}
       GROUP BY payment_method
       ORDER BY total_amount DESC`,
      params
    );

    res.json({
      revenue: revenueResult.rows[0],
      receivables: receivablesResult.rows[0],
      payables: payablesResult.rows[0],
      monthlyTrend: trendResult.rows,
      paymentMethods: paymentMethodResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Delivery Performance Report
router.get('/delivery-performance', async (req, res, next) => {
  try {
    const { startDate, endDate, driverId, routeId } = req.query;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (startDate) {
      whereConditions.push(`d.scheduled_date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`d.scheduled_date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    if (driverId) {
      whereConditions.push(`d.driver_id = $${paramIndex}`);
      params.push(driverId);
      paramIndex++;
    }

    if (routeId) {
      whereConditions.push(`d.route_id = $${paramIndex}`);
      params.push(routeId);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Summary
    const summaryResult = await query(
      `SELECT 
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        SUM(total_stops) as total_stops,
        SUM(completed_stops) as completed_stops,
        AVG(EXTRACT(EPOCH FROM (completion_time - departure_time))/60) as avg_duration_minutes
       FROM deliveries d
       ${whereClause}`,
      params
    );

    // By driver
    const driverResult = await query(
      `SELECT drv.id, u.first_name || ' ' || u.last_name as driver_name,
              COUNT(d.id) as deliveries,
              SUM(d.completed_stops) as stops_completed,
              COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as successful
       FROM drivers drv
       JOIN users u ON drv.user_id = u.id
       LEFT JOIN deliveries d ON drv.id = d.driver_id
       ${whereClause.replace('WHERE', whereConditions.length > 0 ? 'AND' : 'WHERE')}
       GROUP BY drv.id, u.first_name, u.last_name
       ORDER BY deliveries DESC`,
      params
    );

    // By route
    const routeResult = await query(
      `SELECT dr.id, dr.route_code, dr.name,
              COUNT(d.id) as deliveries,
              AVG(d.total_distance) as avg_distance
       FROM delivery_routes dr
       LEFT JOIN deliveries d ON dr.id = d.route_id
       ${whereClause.replace('WHERE', whereConditions.length > 0 ? 'AND' : 'WHERE')}
       GROUP BY dr.id, dr.route_code, dr.name
       ORDER BY deliveries DESC`,
      params
    );

    // Daily performance
    const dailyResult = await query(
      `SELECT d.scheduled_date::date as date,
              COUNT(*) as deliveries,
              SUM(completed_stops) as stops,
              COUNT(CASE WHEN status = 'delivered' THEN 1 END) as successful
       FROM deliveries d
       ${whereClause}
       GROUP BY d.scheduled_date::date
       ORDER BY date`,
      params
    );

    res.json({
      summary: summaryResult.rows[0],
      byDriver: driverResult.rows,
      byRoute: routeResult.rows,
      daily: dailyResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Export to Excel
router.get('/export/excel/:reportType', async (req, res, next) => {
  try {
    const { reportType } = req.params;
    const { startDate, endDate } = req.query;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tres Marias Marketing';
    workbook.created = new Date();

    let sheet;

    switch (reportType) {
      case 'sales':
        sheet = workbook.addWorksheet('Sales Report');
        
        // Get sales data
        const salesData = await query(
          `SELECT o.order_number, o.order_date, c.business_name as client,
                  o.subtotal, o.discount_amount, o.tax_amount, o.total_amount, o.status
           FROM orders o
           JOIN clients c ON o.client_id = c.id
           WHERE o.status = 'delivered'
           ${startDate ? `AND o.order_date >= '${startDate}'` : ''}
           ${endDate ? `AND o.order_date <= '${endDate}'` : ''}
           ORDER BY o.order_date DESC`
        );

        sheet.columns = [
          { header: 'Order #', key: 'order_number', width: 20 },
          { header: 'Date', key: 'order_date', width: 15 },
          { header: 'Client', key: 'client', width: 30 },
          { header: 'Subtotal', key: 'subtotal', width: 15 },
          { header: 'Discount', key: 'discount_amount', width: 15 },
          { header: 'Tax', key: 'tax_amount', width: 15 },
          { header: 'Total', key: 'total_amount', width: 15 },
          { header: 'Status', key: 'status', width: 12 }
        ];

        salesData.rows.forEach(row => sheet.addRow(row));
        break;

      case 'inventory':
        sheet = workbook.addWorksheet('Inventory Report');
        
        const inventoryData = await query(
          `SELECT p.sku, p.name as product, c.name as category,
                  w.name as warehouse, i.quantity, i.reserved_quantity,
                  (i.quantity - i.reserved_quantity) as available,
                  i.batch_number, i.expiry_date
           FROM inventory i
           JOIN products p ON i.product_id = p.id
           JOIN warehouses w ON i.warehouse_id = w.id
           LEFT JOIN categories c ON p.category_id = c.id
           ORDER BY p.name, w.name`
        );

        sheet.columns = [
          { header: 'SKU', key: 'sku', width: 15 },
          { header: 'Product', key: 'product', width: 30 },
          { header: 'Category', key: 'category', width: 20 },
          { header: 'Warehouse', key: 'warehouse', width: 20 },
          { header: 'Quantity', key: 'quantity', width: 12 },
          { header: 'Reserved', key: 'reserved_quantity', width: 12 },
          { header: 'Available', key: 'available', width: 12 },
          { header: 'Batch', key: 'batch_number', width: 15 },
          { header: 'Expiry', key: 'expiry_date', width: 12 }
        ];

        inventoryData.rows.forEach(row => sheet.addRow(row));
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }
    };
    sheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report-${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

// Export to PDF
router.get('/export/pdf/:reportType', async (req, res, next) => {
  try {
    const { reportType } = req.params;
    const { startDate, endDate } = req.query;

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('TRES MARIAS MARKETING', { align: 'center' });
    doc.fontSize(12).text('San Fernando City, La Union, Philippines', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`${reportType.toUpperCase()} REPORT`, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString('en-PH')}`, { align: 'center' });
    doc.moveDown(2);

    switch (reportType) {
      case 'sales':
        const salesSummary = await query(
          `SELECT 
            COUNT(*) as total_orders,
            COALESCE(SUM(total_amount), 0) as total_revenue
           FROM orders WHERE status = 'delivered'
           ${startDate ? `AND order_date >= '${startDate}'` : ''}
           ${endDate ? `AND order_date <= '${endDate}'` : ''}`
        );

        doc.fontSize(12).text('Summary', { underline: true });
        doc.fontSize(10);
        doc.text(`Total Orders: ${salesSummary.rows[0].total_orders}`);
        doc.text(`Total Revenue: ₱${parseFloat(salesSummary.rows[0].total_revenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
        break;

      case 'inventory':
        const inventorySummary = await query(
          `SELECT 
            COUNT(DISTINCT product_id) as total_products,
            COALESCE(SUM(quantity), 0) as total_stock
           FROM inventory`
        );

        doc.fontSize(12).text('Summary', { underline: true });
        doc.fontSize(10);
        doc.text(`Total Products: ${inventorySummary.rows[0].total_products}`);
        doc.text(`Total Stock: ${inventorySummary.rows[0].total_stock} units`);
        break;
    }

    doc.end();
  } catch (error) {
    next(error);
  }
});

export default router;
