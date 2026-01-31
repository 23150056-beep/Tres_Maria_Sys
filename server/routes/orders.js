import express from 'express';
import { query, transaction } from '../database/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import { paginate, paginationResponse } from '../utils/helpers.js';

const router = express.Router();

// Generate order number
const generateOrderNumber = async () => {
  const result = await query(
    `SELECT order_number FROM orders 
     WHERE order_number LIKE 'SO-%' 
     ORDER BY created_at DESC LIMIT 1`
  );

  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  let sequence = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].order_number;
    const parts = lastNumber.split('-');
    if (parts.length >= 3 && parts[1] === `${year}${month}`) {
      sequence = parseInt(parts[2], 10) + 1;
    }
  }

  return `SO-${year}${month}-${sequence.toString().padStart(5, '0')}`;
};

// Get all orders
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, client, warehouse, startDate, endDate, search } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(o.order_number ILIKE $${paramIndex} OR c.business_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`o.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (client) {
      whereConditions.push(`o.client_id = $${paramIndex}`);
      params.push(client);
      paramIndex++;
    }

    if (warehouse) {
      whereConditions.push(`o.warehouse_id = $${paramIndex}`);
      params.push(warehouse);
      paramIndex++;
    }

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

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM orders o 
       LEFT JOIN clients c ON o.client_id = c.id 
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT o.*, 
              c.business_name as client_name, c.contact_person,
              w.name as warehouse_name,
              u.first_name || ' ' || u.last_name as created_by_name,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       LEFT JOIN clients c ON o.client_id = c.id
       LEFT JOIN warehouses w ON o.warehouse_id = w.id
       LEFT JOIN users u ON o.created_by = u.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json(paginationResponse(result.rows, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// Get single order with items
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const orderResult = await query(
      `SELECT o.*, 
              c.business_name as client_name, c.contact_person, c.email as client_email, c.phone as client_phone,
              c.address as client_address, c.city as client_city, c.province as client_province,
              w.name as warehouse_name, w.address as warehouse_address,
              u.first_name || ' ' || u.last_name as created_by_name,
              au.first_name || ' ' || au.last_name as approved_by_name
       FROM orders o
       LEFT JOIN clients c ON o.client_id = c.id
       LEFT JOIN warehouses w ON o.warehouse_id = w.id
       LEFT JOIN users u ON o.created_by = u.id
       LEFT JOIN users au ON o.approved_by = au.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsResult = await query(
      `SELECT oi.*, 
              p.sku, p.name as product_name, p.unit_of_measure
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1
       ORDER BY oi.created_at`,
      [id]
    );

    const historyResult = await query(
      `SELECT osh.*, u.first_name || ' ' || u.last_name as changed_by_name
       FROM order_status_history osh
       LEFT JOIN users u ON osh.changed_by = u.id
       WHERE osh.order_id = $1
       ORDER BY osh.created_at DESC`,
      [id]
    );

    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows,
      statusHistory: historyResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create order
router.post('/', async (req, res, next) => {
  try {
    const { 
      clientId, warehouseId, items, requiredDate, 
      shippingAddress, notes, priority 
    } = req.body;

    if (!clientId || !warehouseId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Client, warehouse, and at least one item are required' });
    }

    const result = await transaction(async (client) => {
      const orderNumber = await generateOrderNumber();

      // Get client pricing tier
      const clientResult = await client.query(
        `SELECT c.*, pt.discount_percentage 
         FROM clients c
         LEFT JOIN pricing_tiers pt ON c.pricing_tier_id = pt.id
         WHERE c.id = $1`,
        [clientId]
      );

      if (clientResult.rows.length === 0) {
        throw new Error('Client not found');
      }

      const clientData = clientResult.rows[0];
      const discountPercentage = clientData.discount_percentage || 0;

      // Calculate totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        // Get product price based on client tier
        const productResult = await client.query(
          `SELECT * FROM products WHERE id = $1 AND is_active = true`,
          [item.productId]
        );

        if (productResult.rows.length === 0) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        const product = productResult.rows[0];
        let unitPrice = product.base_price;

        // Apply tier pricing
        if (clientData.pricing_tier_id === 2) unitPrice = product.wholesale_price || product.base_price;
        if (clientData.pricing_tier_id === 3) unitPrice = product.vip_price || product.base_price;

        const itemDiscount = item.discountPercentage || 0;
        const totalPrice = item.quantity * unitPrice * (1 - itemDiscount / 100);

        subtotal += totalPrice;
        orderItems.push({
          ...item,
          unitPrice,
          totalPrice,
          discountPercentage: itemDiscount
        });

        // Check inventory availability
        const inventoryResult = await client.query(
          `SELECT COALESCE(SUM(quantity - reserved_quantity), 0) as available
           FROM inventory WHERE product_id = $1 AND warehouse_id = $2`,
          [item.productId, warehouseId]
        );

        if (inventoryResult.rows[0].available < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${inventoryResult.rows[0].available}`);
        }
      }

      // Apply global discount
      const discountAmount = subtotal * (discountPercentage / 100);
      const taxAmount = (subtotal - discountAmount) * 0.12; // 12% VAT
      const totalAmount = subtotal - discountAmount + taxAmount;

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (
          order_number, client_id, warehouse_id, status, required_date,
          shipping_address, subtotal, tax_amount, discount_amount, total_amount,
          notes, priority, created_by
         ) VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [orderNumber, clientId, warehouseId, requiredDate, shippingAddress,
         subtotal, taxAmount, discountAmount, totalAmount, notes, priority || 5, req.user.id]
      );

      const order = orderResult.rows[0];

      // Create order items and reserve inventory
      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items (
            order_id, product_id, quantity, unit_price, discount_percentage, total_price, notes
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [order.id, item.productId, item.quantity, item.unitPrice, 
           item.discountPercentage, item.totalPrice, item.notes]
        );

        // Reserve inventory
        await client.query(
          `UPDATE inventory 
           SET reserved_quantity = reserved_quantity + $1
           WHERE product_id = $2 AND warehouse_id = $3`,
          [item.quantity, item.productId, warehouseId]
        );
      }

      // Create status history
      await client.query(
        `INSERT INTO order_status_history (order_id, status, notes, changed_by)
         VALUES ($1, 'pending', 'Order created', $2)`,
        [order.id, req.user.id]
      );

      return { ...order, items: orderItems };
    });

    await createAuditLog(req.user.id, 'CREATE', 'order', result.id, null, result, req);

    const io = req.app.get('io');
    io.emit('order:created', result);

    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('Insufficient') || error.message.includes('not found')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

// Update order status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'picking', 'packed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await transaction(async (client) => {
      // Get current order
      const orderResult = await client.query(
        `SELECT * FROM orders WHERE id = $1`,
        [id]
      );

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }

      const order = orderResult.rows[0];
      const oldStatus = order.status;

      // Handle cancellation - release reserved inventory
      if (status === 'cancelled' && oldStatus !== 'cancelled') {
        const itemsResult = await client.query(
          `SELECT * FROM order_items WHERE order_id = $1`,
          [id]
        );

        for (const item of itemsResult.rows) {
          await client.query(
            `UPDATE inventory 
             SET reserved_quantity = reserved_quantity - $1
             WHERE product_id = $2 AND warehouse_id = $3`,
            [item.quantity, item.product_id, order.warehouse_id]
          );
        }
      }

      // Handle delivery - deduct from inventory
      if (status === 'delivered' && oldStatus !== 'delivered') {
        const itemsResult = await client.query(
          `SELECT * FROM order_items WHERE order_id = $1`,
          [id]
        );

        for (const item of itemsResult.rows) {
          // Reduce both quantity and reserved
          await client.query(
            `UPDATE inventory 
             SET quantity = quantity - $1,
                 reserved_quantity = reserved_quantity - $1
             WHERE product_id = $2 AND warehouse_id = $3`,
            [item.quantity, item.product_id, order.warehouse_id]
          );

          // Create transaction record
          await client.query(
            `INSERT INTO inventory_transactions (
              product_id, warehouse_id, transaction_type, reference_type, reference_id,
              quantity, performed_by
             ) VALUES ($1, $2, 'issue', 'sales_order', $3, $4, $5)`,
            [item.product_id, order.warehouse_id, order.id, -item.quantity, req.user.id]
          );
        }
      }

      // Update timestamps based on status
      let additionalUpdates = '';
      if (status === 'shipped') additionalUpdates = ', shipped_date = CURRENT_TIMESTAMP';
      if (status === 'delivered') additionalUpdates = ', delivered_date = CURRENT_TIMESTAMP';

      // Update order status
      const updated = await client.query(
        `UPDATE orders 
         SET status = $1, updated_at = CURRENT_TIMESTAMP ${additionalUpdates}
         WHERE id = $2
         RETURNING *`,
        [status, id]
      );

      // Add to status history
      await client.query(
        `INSERT INTO order_status_history (order_id, status, notes, changed_by)
         VALUES ($1, $2, $3, $4)`,
        [id, status, notes, req.user.id]
      );

      return updated.rows[0];
    });

    await createAuditLog(req.user.id, 'STATUS_CHANGE', 'order', id, 
      { status: req.body.oldStatus }, { status }, req);

    const io = req.app.get('io');
    io.emit('order:updated', result);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Approve order
router.post('/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE orders 
       SET status = 'confirmed', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Order not found or not in pending status' });
    }

    await query(
      `INSERT INTO order_status_history (order_id, status, notes, changed_by)
       VALUES ($1, 'confirmed', 'Order approved', $2)`,
      [id, req.user.id]
    );

    await createAuditLog(req.user.id, 'APPROVE', 'order', id, null, result.rows[0], req);

    const io = req.app.get('io');
    io.emit('order:approved', result.rows[0]);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get order statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE order_date BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    const result = await query(
      `SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COALESCE(SUM(total_amount), 0) as total_value,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END), 0) as delivered_value,
        COALESCE(AVG(total_amount), 0) as average_order_value
       FROM orders ${dateFilter}`,
      params
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
