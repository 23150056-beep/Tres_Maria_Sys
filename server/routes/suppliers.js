import express from 'express';
import { query } from '../database/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import { paginate, paginationResponse } from '../utils/helpers.js';

const router = express.Router();

// Get all suppliers
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(s.company_name ILIKE $${paramIndex} OR s.contact_person ILIKE $${paramIndex} OR s.code ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status !== undefined) {
      whereConditions.push(`s.is_active = $${paramIndex}`);
      params.push(status === 'active');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM suppliers s ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = s.id) as total_orders,
              (SELECT COUNT(*) FROM supplier_products WHERE supplier_id = s.id) as product_count
       FROM suppliers s
       ${whereClause}
       ORDER BY s.company_name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json(paginationResponse(result.rows, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// Get single supplier
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const supplierResult = await query(
      `SELECT * FROM suppliers WHERE id = $1`,
      [id]
    );

    if (supplierResult.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Get supplier products
    const productsResult = await query(
      `SELECT sp.*, p.sku, p.name as product_name, p.unit_of_measure
       FROM supplier_products sp
       JOIN products p ON sp.product_id = p.id
       WHERE sp.supplier_id = $1
       ORDER BY p.name`,
      [id]
    );

    // Get recent purchase orders
    const ordersResult = await query(
      `SELECT id, po_number, status, total_amount, order_date
       FROM purchase_orders WHERE supplier_id = $1
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
       FROM purchase_orders WHERE supplier_id = $1 AND status = 'received'`,
      [id]
    );

    res.json({
      ...supplierResult.rows[0],
      products: productsResult.rows,
      recentOrders: ordersResult.rows,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Create supplier
router.post('/', async (req, res, next) => {
  try {
    const {
      code, companyName, contactPerson, email, phone, mobile,
      address, city, province, postalCode, taxId,
      paymentTerms, leadTimeDays, notes
    } = req.body;

    if (!code || !companyName) {
      return res.status(400).json({ error: 'Code and company name are required' });
    }

    const result = await query(
      `INSERT INTO suppliers (
        code, company_name, contact_person, email, phone, mobile,
        address, city, province, postal_code, tax_id,
        payment_terms, lead_time_days, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [code, companyName, contactPerson, email, phone, mobile,
       address, city, province, postalCode, taxId,
       paymentTerms || 30, leadTimeDays || 7, notes]
    );

    await createAuditLog(req.user.id, 'CREATE', 'supplier', result.rows[0].id, null, result.rows[0], req);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update supplier
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      code, companyName, contactPerson, email, phone, mobile,
      address, city, province, postalCode, taxId,
      paymentTerms, leadTimeDays, rating, notes, isActive
    } = req.body;

    const existingSupplier = await query('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (existingSupplier.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const result = await query(
      `UPDATE suppliers SET
        code = COALESCE($1, code),
        company_name = COALESCE($2, company_name),
        contact_person = COALESCE($3, contact_person),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        mobile = COALESCE($6, mobile),
        address = COALESCE($7, address),
        city = COALESCE($8, city),
        province = COALESCE($9, province),
        postal_code = COALESCE($10, postal_code),
        tax_id = COALESCE($11, tax_id),
        payment_terms = COALESCE($12, payment_terms),
        lead_time_days = COALESCE($13, lead_time_days),
        rating = COALESCE($14, rating),
        notes = COALESCE($15, notes),
        is_active = COALESCE($16, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $17
       RETURNING *`,
      [code, companyName, contactPerson, email, phone, mobile,
       address, city, province, postalCode, taxId,
       paymentTerms, leadTimeDays, rating, notes, isActive, id]
    );

    await createAuditLog(req.user.id, 'UPDATE', 'supplier', id, existingSupplier.rows[0], result.rows[0], req);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete supplier
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check for pending orders
    const orderCheck = await query(
      `SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = $1 AND status NOT IN ('received', 'cancelled')`,
      [id]
    );

    if (parseInt(orderCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete supplier with pending purchase orders' });
    }

    const result = await query(
      `UPDATE suppliers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    await createAuditLog(req.user.id, 'DELETE', 'supplier', id, null, null, req);

    res.json({ message: 'Supplier deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

// Add/Update supplier product
router.post('/:id/products', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { productId, supplierSku, costPrice, minOrderQuantity, leadTimeDays, isPreferred } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // If setting as preferred, unset other preferred for this product
    if (isPreferred) {
      await query(
        `UPDATE supplier_products SET is_preferred = false WHERE product_id = $1`,
        [productId]
      );
    }

    const result = await query(
      `INSERT INTO supplier_products (
        supplier_id, product_id, supplier_sku, cost_price, min_order_quantity, lead_time_days, is_preferred
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (supplier_id, product_id) 
       DO UPDATE SET
        supplier_sku = EXCLUDED.supplier_sku,
        cost_price = EXCLUDED.cost_price,
        min_order_quantity = EXCLUDED.min_order_quantity,
        lead_time_days = EXCLUDED.lead_time_days,
        is_preferred = EXCLUDED.is_preferred
       RETURNING *`,
      [id, productId, supplierSku, costPrice, minOrderQuantity || 1, leadTimeDays, isPreferred || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Remove supplier product
router.delete('/:id/products/:productId', async (req, res, next) => {
  try {
    const { id, productId } = req.params;

    await query(
      `DELETE FROM supplier_products WHERE supplier_id = $1 AND product_id = $2`,
      [id, productId]
    );

    res.json({ message: 'Product removed from supplier' });
  } catch (error) {
    next(error);
  }
});

// Get supplier performance
router.get('/:id/performance', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { period = '12' } = req.query;

    // Order fulfillment stats
    const fulfillmentResult = await query(
      `SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'received' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        AVG(CASE WHEN received_date IS NOT NULL THEN received_date - order_date END) as avg_lead_time
       FROM purchase_orders 
       WHERE supplier_id = $1 
         AND order_date >= CURRENT_DATE - ($2 || ' months')::INTERVAL`,
      [id, period]
    );

    // Monthly purchase history
    const monthlyResult = await query(
      `SELECT 
        DATE_TRUNC('month', order_date) as month,
        COUNT(*) as order_count,
        SUM(total_amount) as total_amount
       FROM purchase_orders 
       WHERE supplier_id = $1 
         AND order_date >= CURRENT_DATE - ($2 || ' months')::INTERVAL
       GROUP BY DATE_TRUNC('month', order_date)
       ORDER BY month`,
      [id, period]
    );

    // Quality metrics (from goods receipts)
    const qualityResult = await query(
      `SELECT 
        COALESCE(SUM(gri.quantity_received), 0) as total_received,
        COALESCE(SUM(gri.quantity_accepted), 0) as total_accepted,
        COALESCE(SUM(gri.quantity_rejected), 0) as total_rejected
       FROM goods_receipt_items gri
       JOIN goods_receipts gr ON gri.goods_receipt_id = gr.id
       JOIN purchase_orders po ON gr.purchase_order_id = po.id
       WHERE po.supplier_id = $1`,
      [id]
    );

    res.json({
      fulfillment: fulfillmentResult.rows[0],
      monthlyPurchases: monthlyResult.rows,
      quality: qualityResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

export default router;
