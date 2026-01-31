import express from 'express';
import { query } from '../database/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import { paginate, paginationResponse } from '../utils/helpers.js';

const router = express.Router();

// Get all warehouses
router.get('/', async (req, res, next) => {
  try {
    const { includeInactive } = req.query;

    let whereClause = '';
    if (!includeInactive) {
      whereClause = 'WHERE w.is_active = true';
    }

    const result = await query(
      `SELECT w.*, 
              u.first_name || ' ' || u.last_name as manager_name,
              (SELECT COUNT(*) FROM warehouse_zones WHERE warehouse_id = w.id) as zone_count,
              (SELECT COUNT(*) FROM storage_locations WHERE warehouse_id = w.id) as location_count
       FROM warehouses w
       LEFT JOIN users u ON w.manager_id = u.id
       ${whereClause}
       ORDER BY w.name`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single warehouse
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const warehouseResult = await query(
      `SELECT w.*, u.first_name || ' ' || u.last_name as manager_name
       FROM warehouses w
       LEFT JOIN users u ON w.manager_id = u.id
       WHERE w.id = $1`,
      [id]
    );

    if (warehouseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    // Get zones
    const zonesResult = await query(
      `SELECT wz.*, 
              (SELECT COUNT(*) FROM storage_locations WHERE zone_id = wz.id) as location_count
       FROM warehouse_zones wz
       WHERE wz.warehouse_id = $1
       ORDER BY wz.code`,
      [id]
    );

    // Get inventory summary
    const inventoryResult = await query(
      `SELECT COUNT(DISTINCT product_id) as product_count,
              COALESCE(SUM(quantity), 0) as total_items,
              COALESCE(SUM(quantity * COALESCE(cost_price, 0)), 0) as total_value
       FROM inventory WHERE warehouse_id = $1`,
      [id]
    );

    // Get recent activity
    const activityResult = await query(
      `SELECT it.*, p.name as product_name, u.first_name || ' ' || u.last_name as performed_by_name
       FROM inventory_transactions it
       JOIN products p ON it.product_id = p.id
       LEFT JOIN users u ON it.performed_by = u.id
       WHERE it.warehouse_id = $1
       ORDER BY it.created_at DESC LIMIT 10`,
      [id]
    );

    res.json({
      ...warehouseResult.rows[0],
      zones: zonesResult.rows,
      inventory: inventoryResult.rows[0],
      recentActivity: activityResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create warehouse
router.post('/', async (req, res, next) => {
  try {
    const {
      code, name, address, city, province, postalCode,
      phone, email, managerId, latitude, longitude, totalCapacity
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const result = await query(
      `INSERT INTO warehouses (
        code, name, address, city, province, postal_code,
        phone, email, manager_id, latitude, longitude, total_capacity
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [code, name, address, city, province, postalCode,
       phone, email, managerId, latitude, longitude, totalCapacity || 0]
    );

    await createAuditLog(req.user.id, 'CREATE', 'warehouse', result.rows[0].id, null, result.rows[0], req);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update warehouse
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      code, name, address, city, province, postalCode,
      phone, email, managerId, latitude, longitude, totalCapacity, isActive
    } = req.body;

    const existingWarehouse = await query('SELECT * FROM warehouses WHERE id = $1', [id]);
    if (existingWarehouse.rows.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    const result = await query(
      `UPDATE warehouses SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        address = COALESCE($3, address),
        city = COALESCE($4, city),
        province = COALESCE($5, province),
        postal_code = COALESCE($6, postal_code),
        phone = COALESCE($7, phone),
        email = COALESCE($8, email),
        manager_id = $9,
        latitude = COALESCE($10, latitude),
        longitude = COALESCE($11, longitude),
        total_capacity = COALESCE($12, total_capacity),
        is_active = COALESCE($13, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
      [code, name, address, city, province, postalCode,
       phone, email, managerId, latitude, longitude, totalCapacity, isActive, id]
    );

    await createAuditLog(req.user.id, 'UPDATE', 'warehouse', id, existingWarehouse.rows[0], result.rows[0], req);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get warehouse zones
router.get('/:id/zones', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT wz.*, 
              (SELECT COUNT(*) FROM storage_locations WHERE zone_id = wz.id) as location_count,
              (SELECT COUNT(*) FROM storage_locations WHERE zone_id = wz.id AND is_occupied = true) as occupied_count
       FROM warehouse_zones wz
       WHERE wz.warehouse_id = $1
       ORDER BY wz.code`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create warehouse zone
router.post('/:id/zones', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, name, zoneType, temperatureControlled, minTemperature, maxTemperature, capacity } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const result = await query(
      `INSERT INTO warehouse_zones (
        warehouse_id, code, name, zone_type, temperature_controlled,
        min_temperature, max_temperature, capacity
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, code, name, zoneType, temperatureControlled || false,
       minTemperature, maxTemperature, capacity || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get storage locations
router.get('/:id/locations', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { zone, type, occupied, page = 1, limit = 50 } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);

    let whereConditions = [`sl.warehouse_id = $1`];
    let params = [id];
    let paramIndex = 2;

    if (zone) {
      whereConditions.push(`sl.zone_id = $${paramIndex}`);
      params.push(zone);
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`sl.location_type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (occupied !== undefined) {
      whereConditions.push(`sl.is_occupied = $${paramIndex}`);
      params.push(occupied === 'true');
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const countResult = await query(
      `SELECT COUNT(*) FROM storage_locations sl ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT sl.*, 
              wz.name as zone_name, wz.code as zone_code,
              p.name as product_name, p.sku
       FROM storage_locations sl
       LEFT JOIN warehouse_zones wz ON sl.zone_id = wz.id
       LEFT JOIN products p ON sl.current_product_id = p.id
       ${whereClause}
       ORDER BY sl.aisle, sl.rack, sl.shelf, sl.bin
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json(paginationResponse(result.rows, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// Create storage location
router.post('/:id/locations', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { zoneId, code, aisle, rack, shelf, bin, locationType, maxWeight, maxVolume } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Location code is required' });
    }

    const result = await query(
      `INSERT INTO storage_locations (
        warehouse_id, zone_id, code, aisle, rack, shelf, bin,
        location_type, max_weight, max_volume
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, zoneId, code, aisle, rack, shelf, bin, locationType || 'storage', maxWeight, maxVolume]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Bulk create storage locations
router.post('/:id/locations/bulk', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { zoneId, aisles, racksPerAisle, shelvesPerRack, binsPerShelf, locationType } = req.body;

    if (!aisles || !racksPerAisle || !shelvesPerRack) {
      return res.status(400).json({ error: 'Aisles, racks per aisle, and shelves per rack are required' });
    }

    const locations = [];
    for (let a = 1; a <= aisles; a++) {
      for (let r = 1; r <= racksPerAisle; r++) {
        for (let s = 1; s <= shelvesPerRack; s++) {
          const binCount = binsPerShelf || 1;
          for (let b = 1; b <= binCount; b++) {
            const aisle = a.toString().padStart(2, '0');
            const rack = r.toString().padStart(2, '0');
            const shelf = s.toString().padStart(2, '0');
            const bin = b.toString().padStart(2, '0');
            const code = `A${aisle}-R${rack}-S${shelf}-B${bin}`;
            
            locations.push([id, zoneId, code, aisle, rack, shelf, bin, locationType || 'storage']);
          }
        }
      }
    }

    // Batch insert
    const values = locations.map((_, i) => {
      const base = i * 8;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
    }).join(', ');

    const flatParams = locations.flat();

    await query(
      `INSERT INTO storage_locations (warehouse_id, zone_id, code, aisle, rack, shelf, bin, location_type)
       VALUES ${values}
       ON CONFLICT (warehouse_id, code) DO NOTHING`,
      flatParams
    );

    res.status(201).json({ message: `Created ${locations.length} storage locations` });
  } catch (error) {
    next(error);
  }
});

// Get warehouse capacity utilization
router.get('/:id/utilization', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Overall utilization
    const overallResult = await query(
      `SELECT 
        (SELECT COUNT(*) FROM storage_locations WHERE warehouse_id = $1) as total_locations,
        (SELECT COUNT(*) FROM storage_locations WHERE warehouse_id = $1 AND is_occupied = true) as occupied_locations,
        (SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE warehouse_id = $1) as total_items,
        (SELECT COUNT(DISTINCT product_id) FROM inventory WHERE warehouse_id = $1) as unique_products
      `,
      [id]
    );

    // By zone
    const zoneResult = await query(
      `SELECT wz.id, wz.code, wz.name, wz.capacity,
              COUNT(sl.id) as total_locations,
              COUNT(CASE WHEN sl.is_occupied THEN 1 END) as occupied_locations
       FROM warehouse_zones wz
       LEFT JOIN storage_locations sl ON wz.id = sl.zone_id
       WHERE wz.warehouse_id = $1
       GROUP BY wz.id, wz.code, wz.name, wz.capacity
       ORDER BY wz.code`,
      [id]
    );

    // Top products by quantity
    const topProductsResult = await query(
      `SELECT p.id, p.sku, p.name, SUM(i.quantity) as total_quantity
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.warehouse_id = $1
       GROUP BY p.id, p.sku, p.name
       ORDER BY total_quantity DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      overall: overallResult.rows[0],
      byZone: zoneResult.rows,
      topProducts: topProductsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;
