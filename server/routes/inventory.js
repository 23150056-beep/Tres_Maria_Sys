import express from 'express';
import { query, transaction } from '../database/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import { paginate, paginationResponse } from '../utils/helpers.js';

const router = express.Router();

// Get inventory list
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, warehouse, product, lowStock, expiring } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (warehouse) {
      whereConditions.push(`i.warehouse_id = $${paramIndex}`);
      params.push(warehouse);
      paramIndex++;
    }

    if (product) {
      whereConditions.push(`i.product_id = $${paramIndex}`);
      params.push(product);
      paramIndex++;
    }

    if (lowStock === 'true') {
      whereConditions.push(`i.quantity <= p.min_stock_level`);
    }

    if (expiring === 'true') {
      whereConditions.push(`i.expiry_date <= CURRENT_DATE + INTERVAL '30 days'`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM inventory i 
       JOIN products p ON i.product_id = p.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT i.*, 
              p.sku, p.name as product_name, p.unit_of_measure, p.min_stock_level,
              w.name as warehouse_name, w.code as warehouse_code,
              sl.code as location_code
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       JOIN warehouses w ON i.warehouse_id = w.id
       LEFT JOIN storage_locations sl ON i.location_id = sl.id
       ${whereClause}
       ORDER BY p.name, w.name
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json(paginationResponse(result.rows, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// Get inventory summary by product
router.get('/summary', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.id, p.sku, p.name, p.unit_of_measure, p.min_stock_level, p.reorder_point,
              COALESCE(SUM(i.quantity), 0) as total_quantity,
              COALESCE(SUM(i.reserved_quantity), 0) as reserved_quantity,
              COALESCE(SUM(i.quantity - i.reserved_quantity), 0) as available_quantity,
              COUNT(DISTINCT i.warehouse_id) as warehouse_count
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.is_active = true
       GROUP BY p.id
       ORDER BY p.name`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get low stock alerts
router.get('/alerts/low-stock', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.id, p.sku, p.name, p.min_stock_level, p.reorder_point, p.reorder_quantity,
              COALESCE(SUM(i.quantity), 0) as current_stock,
              w.id as warehouse_id, w.name as warehouse_name
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       LEFT JOIN warehouses w ON i.warehouse_id = w.id
       WHERE p.is_active = true
       GROUP BY p.id, w.id, w.name
       HAVING COALESCE(SUM(i.quantity), 0) <= p.reorder_point
       ORDER BY COALESCE(SUM(i.quantity), 0) ASC`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get expiring items
router.get('/alerts/expiring', async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const result = await query(
      `SELECT i.*, 
              p.sku, p.name as product_name,
              w.name as warehouse_name,
              i.expiry_date - CURRENT_DATE as days_until_expiry
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       JOIN warehouses w ON i.warehouse_id = w.id
       WHERE i.expiry_date IS NOT NULL 
         AND i.expiry_date <= CURRENT_DATE + $1 * INTERVAL '1 day'
         AND i.quantity > 0
       ORDER BY i.expiry_date ASC`,
      [parseInt(days)]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Receive inventory (goods receiving)
router.post('/receive', async (req, res, next) => {
  try {
    const { 
      productId, warehouseId, quantity, locationId,
      batchNumber, lotNumber, manufactureDate, expiryDate, costPrice,
      referenceType, referenceId, notes 
    } = req.body;

    if (!productId || !warehouseId || !quantity) {
      return res.status(400).json({ error: 'Product, warehouse, and quantity are required' });
    }

    const result = await transaction(async (client) => {
      // Check if inventory record exists
      const existing = await client.query(
        `SELECT id, quantity FROM inventory 
         WHERE product_id = $1 AND warehouse_id = $2 
         AND COALESCE(batch_number, '') = COALESCE($3, '')
         AND COALESCE(location_id::text, '') = COALESCE($4, '')`,
        [productId, warehouseId, batchNumber || '', locationId || '']
      );

      let inventoryRecord;
      if (existing.rows.length > 0) {
        // Update existing
        inventoryRecord = await client.query(
          `UPDATE inventory SET 
            quantity = quantity + $1,
            cost_price = COALESCE($2, cost_price),
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $3
           RETURNING *`,
          [quantity, costPrice, existing.rows[0].id]
        );
      } else {
        // Insert new
        inventoryRecord = await client.query(
          `INSERT INTO inventory (
            product_id, warehouse_id, location_id, quantity,
            batch_number, lot_number, manufacture_date, expiry_date, cost_price
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [productId, warehouseId, locationId, quantity, batchNumber, lotNumber, 
           manufactureDate, expiryDate, costPrice]
        );
      }

      // Create transaction record
      await client.query(
        `INSERT INTO inventory_transactions (
          product_id, warehouse_id, transaction_type, reference_type, reference_id,
          quantity, unit_cost, batch_number, to_location_id, reason, performed_by
         ) VALUES ($1, $2, 'receive', $3, $4, $5, $6, $7, $8, $9, $10)`,
        [productId, warehouseId, referenceType, referenceId, quantity, costPrice,
         batchNumber, locationId, notes, req.user.id]
      );

      return inventoryRecord.rows[0];
    });

    await createAuditLog(req.user.id, 'RECEIVE', 'inventory', result.id, null, result, req);

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('inventory:updated', { productId, warehouseId, type: 'receive' });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Issue inventory (for orders)
router.post('/issue', async (req, res, next) => {
  try {
    const { 
      productId, warehouseId, quantity, locationId,
      batchNumber, referenceType, referenceId, notes 
    } = req.body;

    if (!productId || !warehouseId || !quantity) {
      return res.status(400).json({ error: 'Product, warehouse, and quantity are required' });
    }

    const result = await transaction(async (client) => {
      // Get current inventory
      let inventoryQuery = `
        SELECT id, quantity, reserved_quantity FROM inventory 
        WHERE product_id = $1 AND warehouse_id = $2 
        AND quantity > 0`;
      const queryParams = [productId, warehouseId];

      if (batchNumber) {
        inventoryQuery += ` AND batch_number = $3`;
        queryParams.push(batchNumber);
      }
      if (locationId) {
        inventoryQuery += ` AND location_id = $${queryParams.length + 1}`;
        queryParams.push(locationId);
      }
      inventoryQuery += ` ORDER BY expiry_date ASC NULLS LAST LIMIT 1`;

      const inventory = await client.query(inventoryQuery, queryParams);

      if (inventory.rows.length === 0) {
        throw new Error('Insufficient inventory');
      }

      const record = inventory.rows[0];
      const available = record.quantity - record.reserved_quantity;

      if (available < quantity) {
        throw new Error(`Insufficient available inventory. Available: ${available}`);
      }

      // Update inventory
      const updated = await client.query(
        `UPDATE inventory SET 
          quantity = quantity - $1,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [quantity, record.id]
      );

      // Create transaction record
      await client.query(
        `INSERT INTO inventory_transactions (
          product_id, warehouse_id, transaction_type, reference_type, reference_id,
          quantity, batch_number, from_location_id, reason, performed_by
         ) VALUES ($1, $2, 'issue', $3, $4, $5, $6, $7, $8, $9)`,
        [productId, warehouseId, referenceType, referenceId, -quantity,
         batchNumber, locationId, notes, req.user.id]
      );

      return updated.rows[0];
    });

    await createAuditLog(req.user.id, 'ISSUE', 'inventory', result.id, null, result, req);

    const io = req.app.get('io');
    io.emit('inventory:updated', { productId, warehouseId, type: 'issue' });

    res.json(result);
  } catch (error) {
    if (error.message.includes('Insufficient')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

// Adjust inventory
router.post('/adjust', async (req, res, next) => {
  try {
    const { productId, warehouseId, adjustmentQuantity, reason, notes } = req.body;

    if (!productId || !warehouseId || adjustmentQuantity === undefined) {
      return res.status(400).json({ error: 'Product, warehouse, and adjustment quantity are required' });
    }

    const result = await transaction(async (client) => {
      // Get current inventory
      const inventory = await client.query(
        `SELECT * FROM inventory WHERE product_id = $1 AND warehouse_id = $2`,
        [productId, warehouseId]
      );

      if (inventory.rows.length === 0) {
        throw new Error('Inventory record not found');
      }

      const record = inventory.rows[0];
      const newQuantity = record.quantity + adjustmentQuantity;

      if (newQuantity < 0) {
        throw new Error('Adjustment would result in negative inventory');
      }

      // Update inventory
      const updated = await client.query(
        `UPDATE inventory SET 
          quantity = $1,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [newQuantity, record.id]
      );

      // Create transaction record
      await client.query(
        `INSERT INTO inventory_transactions (
          product_id, warehouse_id, transaction_type, quantity, reason, performed_by
         ) VALUES ($1, $2, 'adjustment', $3, $4, $5)`,
        [productId, warehouseId, adjustmentQuantity, notes || reason, req.user.id]
      );

      return { 
        ...updated.rows[0], 
        adjustment: adjustmentQuantity,
        previousQuantity: record.quantity 
      };
    });

    await createAuditLog(req.user.id, 'ADJUST', 'inventory', result.id, 
      { quantity: result.previousQuantity }, { quantity: result.quantity }, req);

    const io = req.app.get('io');
    io.emit('inventory:updated', { productId, warehouseId, type: 'adjustment' });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Transfer inventory between warehouses/locations
router.post('/transfer', async (req, res, next) => {
  try {
    const { 
      productId, fromWarehouseId, toWarehouseId, quantity,
      fromLocationId, toLocationId, batchNumber, notes 
    } = req.body;

    if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
      return res.status(400).json({ 
        error: 'Product, source warehouse, destination warehouse, and quantity are required' 
      });
    }

    const result = await transaction(async (client) => {
      // Get source inventory
      const sourceInventory = await client.query(
        `SELECT id, quantity, reserved_quantity FROM inventory 
         WHERE product_id = $1 AND warehouse_id = $2 
         ${batchNumber ? 'AND batch_number = $3' : ''}
         ${fromLocationId ? `AND location_id = $${batchNumber ? 4 : 3}` : ''}`,
        [productId, fromWarehouseId, ...(batchNumber ? [batchNumber] : []), ...(fromLocationId ? [fromLocationId] : [])]
      );

      if (sourceInventory.rows.length === 0) {
        throw new Error('Source inventory not found');
      }

      const source = sourceInventory.rows[0];
      const available = source.quantity - source.reserved_quantity;

      if (available < quantity) {
        throw new Error(`Insufficient inventory for transfer. Available: ${available}`);
      }

      // Deduct from source
      await client.query(
        `UPDATE inventory SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [quantity, source.id]
      );

      // Add to destination
      const destInventory = await client.query(
        `SELECT id FROM inventory 
         WHERE product_id = $1 AND warehouse_id = $2
         ${batchNumber ? 'AND batch_number = $3' : ''}
         ${toLocationId ? `AND location_id = $${batchNumber ? 4 : 3}` : ''}`,
        [productId, toWarehouseId, ...(batchNumber ? [batchNumber] : []), ...(toLocationId ? [toLocationId] : [])]
      );

      if (destInventory.rows.length > 0) {
        await client.query(
          `UPDATE inventory SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [quantity, destInventory.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO inventory (product_id, warehouse_id, location_id, quantity, batch_number)
           VALUES ($1, $2, $3, $4, $5)`,
          [productId, toWarehouseId, toLocationId, quantity, batchNumber]
        );
      }

      // Create transaction record
      await client.query(
        `INSERT INTO inventory_transactions (
          product_id, warehouse_id, transaction_type, quantity, 
          batch_number, from_location_id, to_location_id, reason, performed_by
         ) VALUES ($1, $2, 'transfer', $3, $4, $5, $6, $7, $8)`,
        [productId, fromWarehouseId, quantity, batchNumber, fromLocationId, toLocationId, notes, req.user.id]
      );

      return { productId, fromWarehouseId, toWarehouseId, quantity, success: true };
    });

    await createAuditLog(req.user.id, 'TRANSFER', 'inventory', productId, null, result, req);

    const io = req.app.get('io');
    io.emit('inventory:updated', { productId, type: 'transfer' });

    res.json(result);
  } catch (error) {
    if (error.message.includes('Insufficient') || error.message.includes('not found')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

// Get inventory transactions history
router.get('/transactions', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, product, warehouse, type, startDate, endDate } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (product) {
      whereConditions.push(`it.product_id = $${paramIndex}`);
      params.push(product);
      paramIndex++;
    }

    if (warehouse) {
      whereConditions.push(`it.warehouse_id = $${paramIndex}`);
      params.push(warehouse);
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`it.transaction_type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`it.created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`it.created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM inventory_transactions it ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT it.*, 
              p.sku, p.name as product_name,
              w.name as warehouse_name,
              u.first_name || ' ' || u.last_name as performed_by_name
       FROM inventory_transactions it
       JOIN products p ON it.product_id = p.id
       JOIN warehouses w ON it.warehouse_id = w.id
       LEFT JOIN users u ON it.performed_by = u.id
       ${whereClause}
       ORDER BY it.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json(paginationResponse(result.rows, total, page, limit));
  } catch (error) {
    next(error);
  }
});

export default router;
