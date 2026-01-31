import express from 'express';
import { query } from '../database/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import { paginate, paginationResponse } from '../utils/helpers.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, status, lowStock } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex} OR p.barcode ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`p.category_id = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (status !== undefined) {
      whereConditions.push(`p.is_active = $${paramIndex}`);
      params.push(status === 'active');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM products p ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Build low stock condition for outer query if needed
    let havingClause = '';
    if (lowStock === 'true') {
      havingClause = 'HAVING COALESCE(SUM(i.quantity), 0) <= p.min_stock_level';
    }

    // Get products with inventory
    const result = await query(
      `SELECT p.*, c.name as category_name,
              COALESCE(SUM(i.quantity), 0) as total_stock,
              COALESCE(SUM(i.reserved_quantity), 0) as reserved_stock
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN inventory i ON p.id = i.product_id
       ${whereClause}
       GROUP BY p.id, c.name
       ${havingClause}
       ORDER BY p.name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json(paginationResponse(result.rows, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// Get single product
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, c.name as category_name,
              COALESCE(SUM(i.quantity), 0) as total_stock,
              COALESCE(SUM(i.reserved_quantity), 0) as reserved_stock
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.id = $1
       GROUP BY p.id, c.name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get inventory by warehouse
    const inventoryResult = await query(
      `SELECT i.*, w.name as warehouse_name, sl.code as location_code
       FROM inventory i
       LEFT JOIN warehouses w ON i.warehouse_id = w.id
       LEFT JOIN storage_locations sl ON i.location_id = sl.id
       WHERE i.product_id = $1
       ORDER BY w.name`,
      [id]
    );

    // Get product images
    const imagesResult = await query(
      `SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order`,
      [id]
    );

    res.json({
      ...result.rows[0],
      inventory: inventoryResult.rows,
      images: imagesResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create product
router.post('/', async (req, res, next) => {
  try {
    const {
      sku, barcode, name, description, categoryId, unitOfMeasure,
      weight, dimensions, basePrice, costPrice, wholesalePrice, vipPrice,
      minStockLevel, maxStockLevel, reorderPoint, reorderQuantity,
      isPerishable, shelfLifeDays, requiresBatchTracking, imageUrl
    } = req.body;

    if (!sku || !name || !basePrice) {
      return res.status(400).json({ error: 'SKU, name, and base price are required' });
    }

    const result = await query(
      `INSERT INTO products (
        sku, barcode, name, description, category_id, unit_of_measure,
        weight, dimensions, base_price, cost_price, wholesale_price, vip_price,
        min_stock_level, max_stock_level, reorder_point, reorder_quantity,
        is_perishable, shelf_life_days, requires_batch_tracking, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        sku, barcode, name, description, categoryId, unitOfMeasure || 'piece',
        weight, dimensions ? JSON.stringify(dimensions) : null,
        basePrice, costPrice, wholesalePrice, vipPrice,
        minStockLevel || 0, maxStockLevel, reorderPoint || 10, reorderQuantity || 50,
        isPerishable || false, shelfLifeDays, requiresBatchTracking || false, imageUrl
      ]
    );

    await createAuditLog(req.user.id, 'CREATE', 'product', result.rows[0].id, null, result.rows[0], req);

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('product:created', result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update product
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      sku, barcode, name, description, categoryId, unitOfMeasure,
      weight, dimensions, basePrice, costPrice, wholesalePrice, vipPrice,
      minStockLevel, maxStockLevel, reorderPoint, reorderQuantity,
      isPerishable, shelfLifeDays, requiresBatchTracking, imageUrl, isActive
    } = req.body;

    const existingProduct = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await query(
      `UPDATE products SET
        sku = COALESCE($1, sku),
        barcode = COALESCE($2, barcode),
        name = COALESCE($3, name),
        description = COALESCE($4, description),
        category_id = COALESCE($5, category_id),
        unit_of_measure = COALESCE($6, unit_of_measure),
        weight = COALESCE($7, weight),
        dimensions = COALESCE($8, dimensions),
        base_price = COALESCE($9, base_price),
        cost_price = COALESCE($10, cost_price),
        wholesale_price = COALESCE($11, wholesale_price),
        vip_price = COALESCE($12, vip_price),
        min_stock_level = COALESCE($13, min_stock_level),
        max_stock_level = COALESCE($14, max_stock_level),
        reorder_point = COALESCE($15, reorder_point),
        reorder_quantity = COALESCE($16, reorder_quantity),
        is_perishable = COALESCE($17, is_perishable),
        shelf_life_days = COALESCE($18, shelf_life_days),
        requires_batch_tracking = COALESCE($19, requires_batch_tracking),
        image_url = COALESCE($20, image_url),
        is_active = COALESCE($21, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $22
      RETURNING *`,
      [
        sku, barcode, name, description, categoryId, unitOfMeasure,
        weight, dimensions ? JSON.stringify(dimensions) : null,
        basePrice, costPrice, wholesalePrice, vipPrice,
        minStockLevel, maxStockLevel, reorderPoint, reorderQuantity,
        isPerishable, shelfLifeDays, requiresBatchTracking, imageUrl, isActive, id
      ]
    );

    await createAuditLog(req.user.id, 'UPDATE', 'product', id, existingProduct.rows[0], result.rows[0], req);

    const io = req.app.get('io');
    io.emit('product:updated', result.rows[0]);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete product
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check for existing inventory
    const inventoryCheck = await query(
      'SELECT SUM(quantity) as total FROM inventory WHERE product_id = $1',
      [id]
    );

    if (inventoryCheck.rows[0].total > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete product with existing inventory. Deactivate instead.' 
      });
    }

    // Soft delete
    const result = await query(
      `UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await createAuditLog(req.user.id, 'DELETE', 'product', id, null, null, req);

    res.json({ message: 'Product deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

// Get product by barcode
router.get('/barcode/:barcode', async (req, res, next) => {
  try {
    const { barcode } = req.params;

    const result = await query(
      `SELECT p.*, c.name as category_name,
              COALESCE(SUM(i.quantity), 0) as total_stock
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.barcode = $1 AND p.is_active = true
       GROUP BY p.id, c.name`,
      [barcode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
