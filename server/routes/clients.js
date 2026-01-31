import express from 'express';
import { query } from '../database/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import { paginate, paginationResponse } from '../utils/helpers.js';

const router = express.Router();

// Get all clients
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, tier, status, city } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(c.business_name ILIKE $${paramIndex} OR c.contact_person ILIKE $${paramIndex} OR c.code ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (tier) {
      whereConditions.push(`c.pricing_tier_id = $${paramIndex}`);
      params.push(tier);
      paramIndex++;
    }

    if (status !== undefined) {
      whereConditions.push(`c.is_active = $${paramIndex}`);
      params.push(status === 'active');
      paramIndex++;
    }

    if (city) {
      whereConditions.push(`c.city ILIKE $${paramIndex}`);
      params.push(`%${city}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM clients c ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT c.*, pt.name as tier_name, pt.discount_percentage,
              (SELECT COUNT(*) FROM orders WHERE client_id = c.id) as total_orders,
              (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE client_id = c.id AND status = 'delivered') as total_purchases
       FROM clients c
       LEFT JOIN pricing_tiers pt ON c.pricing_tier_id = pt.id
       ${whereClause}
       ORDER BY c.business_name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json(paginationResponse(result.rows, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// Get single client
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const clientResult = await query(
      `SELECT c.*, pt.name as tier_name, pt.discount_percentage
       FROM clients c
       LEFT JOIN pricing_tiers pt ON c.pricing_tier_id = pt.id
       WHERE c.id = $1`,
      [id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get addresses
    const addressesResult = await query(
      `SELECT * FROM client_addresses WHERE client_id = $1 ORDER BY is_default DESC`,
      [id]
    );

    // Get recent orders
    const ordersResult = await query(
      `SELECT id, order_number, status, total_amount, order_date
       FROM orders WHERE client_id = $1
       ORDER BY order_date DESC LIMIT 10`,
      [id]
    );

    // Get stats
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_purchases,
        COALESCE(AVG(total_amount), 0) as average_order,
        MAX(order_date) as last_order_date
       FROM orders WHERE client_id = $1 AND status = 'delivered'`,
      [id]
    );

    res.json({
      ...clientResult.rows[0],
      addresses: addressesResult.rows,
      recentOrders: ordersResult.rows,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Create client
router.post('/', async (req, res, next) => {
  try {
    const {
      code, businessName, contactPerson, email, phone, mobile,
      address, city, province, postalCode, latitude, longitude,
      pricingTierId, creditLimit, paymentTerms, taxId, notes
    } = req.body;

    if (!code || !businessName) {
      return res.status(400).json({ error: 'Code and business name are required' });
    }

    const result = await query(
      `INSERT INTO clients (
        code, business_name, contact_person, email, phone, mobile,
        address, city, province, postal_code, latitude, longitude,
        pricing_tier_id, credit_limit, payment_terms, tax_id, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [code, businessName, contactPerson, email, phone, mobile,
       address, city, province, postalCode, latitude, longitude,
       pricingTierId || 1, creditLimit || 0, paymentTerms || 30, taxId, notes]
    );

    await createAuditLog(req.user.id, 'CREATE', 'client', result.rows[0].id, null, result.rows[0], req);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update client
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      code, businessName, contactPerson, email, phone, mobile,
      address, city, province, postalCode, latitude, longitude,
      pricingTierId, creditLimit, paymentTerms, taxId, notes, isActive
    } = req.body;

    const existingClient = await query('SELECT * FROM clients WHERE id = $1', [id]);
    if (existingClient.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const result = await query(
      `UPDATE clients SET
        code = COALESCE($1, code),
        business_name = COALESCE($2, business_name),
        contact_person = COALESCE($3, contact_person),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        mobile = COALESCE($6, mobile),
        address = COALESCE($7, address),
        city = COALESCE($8, city),
        province = COALESCE($9, province),
        postal_code = COALESCE($10, postal_code),
        latitude = COALESCE($11, latitude),
        longitude = COALESCE($12, longitude),
        pricing_tier_id = COALESCE($13, pricing_tier_id),
        credit_limit = COALESCE($14, credit_limit),
        payment_terms = COALESCE($15, payment_terms),
        tax_id = COALESCE($16, tax_id),
        notes = COALESCE($17, notes),
        is_active = COALESCE($18, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $19
       RETURNING *`,
      [code, businessName, contactPerson, email, phone, mobile,
       address, city, province, postalCode, latitude, longitude,
       pricingTierId, creditLimit, paymentTerms, taxId, notes, isActive, id]
    );

    await createAuditLog(req.user.id, 'UPDATE', 'client', id, existingClient.rows[0], result.rows[0], req);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete client (soft delete)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check for pending orders
    const orderCheck = await query(
      `SELECT COUNT(*) FROM orders WHERE client_id = $1 AND status NOT IN ('delivered', 'cancelled')`,
      [id]
    );

    if (parseInt(orderCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete client with pending orders' });
    }

    const result = await query(
      `UPDATE clients SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    await createAuditLog(req.user.id, 'DELETE', 'client', id, null, null, req);

    res.json({ message: 'Client deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

// Add client address
router.post('/:id/addresses', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { addressType, address, city, province, postalCode, latitude, longitude, isDefault, contactPerson, phone } = req.body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await query(
        `UPDATE client_addresses SET is_default = false WHERE client_id = $1 AND address_type = $2`,
        [id, addressType]
      );
    }

    const result = await query(
      `INSERT INTO client_addresses (
        client_id, address_type, address, city, province, postal_code,
        latitude, longitude, is_default, contact_person, phone
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [id, addressType || 'delivery', address, city, province, postalCode,
       latitude, longitude, isDefault || false, contactPerson, phone]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get pricing tiers
router.get('/pricing/tiers', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM pricing_tiers ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get client analytics
router.get('/:id/analytics', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { period = '12' } = req.query; // months

    // Monthly purchase history
    const monthlyResult = await query(
      `SELECT 
        DATE_TRUNC('month', order_date) as month,
        COUNT(*) as order_count,
        SUM(total_amount) as total_amount
       FROM orders 
       WHERE client_id = $1 
         AND status = 'delivered'
         AND order_date >= CURRENT_DATE - ($2 || ' months')::INTERVAL
       GROUP BY DATE_TRUNC('month', order_date)
       ORDER BY month`,
      [id, period]
    );

    // Top products
    const productsResult = await query(
      `SELECT p.id, p.name, p.sku, SUM(oi.quantity) as total_quantity, SUM(oi.total_price) as total_value
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       WHERE o.client_id = $1 AND o.status = 'delivered'
       GROUP BY p.id, p.name, p.sku
       ORDER BY total_quantity DESC
       LIMIT 10`,
      [id]
    );

    // Payment history
    const paymentsResult = await query(
      `SELECT p.*, i.invoice_number
       FROM payments p
       JOIN invoices i ON p.invoice_id = i.id
       WHERE p.client_id = $1
       ORDER BY p.payment_date DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      monthlyPurchases: monthlyResult.rows,
      topProducts: productsResult.rows,
      recentPayments: paymentsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;
