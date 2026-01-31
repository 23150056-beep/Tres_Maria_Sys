import express from 'express';
import { query, transaction } from '../database/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import { paginate, paginationResponse, calculateDistance } from '../utils/helpers.js';

const router = express.Router();

// Generate delivery number
const generateDeliveryNumber = async () => {
  const result = await query(
    `SELECT delivery_number FROM deliveries 
     WHERE delivery_number LIKE 'DL-%' 
     ORDER BY created_at DESC LIMIT 1`
  );

  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  let sequence = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].delivery_number;
    const parts = lastNumber.split('-');
    if (parts.length >= 3 && parts[1] === `${year}${month}`) {
      sequence = parseInt(parts[2], 10) + 1;
    }
  }

  return `DL-${year}${month}-${sequence.toString().padStart(5, '0')}`;
};

// Get all deliveries
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, driver, vehicle, route, date, search } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`d.delivery_number ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`d.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (driver) {
      whereConditions.push(`d.driver_id = $${paramIndex}`);
      params.push(driver);
      paramIndex++;
    }

    if (vehicle) {
      whereConditions.push(`d.vehicle_id = $${paramIndex}`);
      params.push(vehicle);
      paramIndex++;
    }

    if (route) {
      whereConditions.push(`d.route_id = $${paramIndex}`);
      params.push(route);
      paramIndex++;
    }

    if (date) {
      whereConditions.push(`d.scheduled_date = $${paramIndex}`);
      params.push(date);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM deliveries d ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT d.*, 
              dr.route_code, dr.name as route_name,
              drv.employee_id as driver_employee_id,
              u.first_name || ' ' || u.last_name as driver_name,
              v.plate_number, v.vehicle_type,
              w.name as warehouse_name
       FROM deliveries d
       LEFT JOIN delivery_routes dr ON d.route_id = dr.id
       LEFT JOIN drivers drv ON d.driver_id = drv.id
       LEFT JOIN users u ON drv.user_id = u.id
       LEFT JOIN vehicles v ON d.vehicle_id = v.id
       LEFT JOIN warehouses w ON d.warehouse_id = w.id
       ${whereClause}
       ORDER BY d.scheduled_date DESC, d.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json(paginationResponse(result.rows, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// Get single delivery with items
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const deliveryResult = await query(
      `SELECT d.*, 
              dr.route_code, dr.name as route_name, dr.waypoints,
              drv.employee_id as driver_employee_id, drv.phone as driver_phone,
              u.first_name || ' ' || u.last_name as driver_name,
              v.plate_number, v.vehicle_type, v.make, v.model,
              w.name as warehouse_name, w.address as warehouse_address,
              cu.first_name || ' ' || cu.last_name as created_by_name
       FROM deliveries d
       LEFT JOIN delivery_routes dr ON d.route_id = dr.id
       LEFT JOIN drivers drv ON d.driver_id = drv.id
       LEFT JOIN users u ON drv.user_id = u.id
       LEFT JOIN vehicles v ON d.vehicle_id = v.id
       LEFT JOIN warehouses w ON d.warehouse_id = w.id
       LEFT JOIN users cu ON d.created_by = cu.id
       WHERE d.id = $1`,
      [id]
    );

    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    // Get delivery items (stops)
    const itemsResult = await query(
      `SELECT di.*, 
              o.order_number, o.total_amount,
              c.business_name as client_name, c.contact_person, c.phone as client_phone
       FROM delivery_items di
       LEFT JOIN orders o ON di.order_id = o.id
       LEFT JOIN clients c ON di.client_id = c.id
       WHERE di.delivery_id = $1
       ORDER BY di.sequence_number`,
      [id]
    );

    res.json({
      ...deliveryResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create delivery
router.post('/', async (req, res, next) => {
  try {
    const { routeId, driverId, vehicleId, warehouseId, scheduledDate, orderIds, notes } = req.body;

    if (!scheduledDate || !orderIds || orderIds.length === 0) {
      return res.status(400).json({ error: 'Scheduled date and at least one order are required' });
    }

    const result = await transaction(async (client) => {
      const deliveryNumber = await generateDeliveryNumber();

      // Get orders with client info
      const ordersResult = await client.query(
        `SELECT o.*, c.business_name, c.address, c.city, c.province, c.latitude, c.longitude
         FROM orders o
         JOIN clients c ON o.client_id = c.id
         WHERE o.id = ANY($1) AND o.status IN ('confirmed', 'processing', 'packed')
         ORDER BY o.priority ASC`,
        [orderIds]
      );

      if (ordersResult.rows.length === 0) {
        throw new Error('No valid orders found');
      }

      // Create delivery
      const deliveryResult = await client.query(
        `INSERT INTO deliveries (
          delivery_number, route_id, driver_id, vehicle_id, warehouse_id,
          status, scheduled_date, total_stops, notes, created_by
         ) VALUES ($1, $2, $3, $4, $5, 'scheduled', $6, $7, $8, $9)
         RETURNING *`,
        [deliveryNumber, routeId, driverId, vehicleId, warehouseId, 
         scheduledDate, ordersResult.rows.length, notes, req.user.id]
      );

      const delivery = deliveryResult.rows[0];

      // Create delivery items
      let sequence = 1;
      for (const order of ordersResult.rows) {
        const deliveryAddress = `${order.address}, ${order.city}, ${order.province}`;
        
        await client.query(
          `INSERT INTO delivery_items (
            delivery_id, order_id, client_id, sequence_number, status,
            delivery_address, latitude, longitude
           ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)`,
          [delivery.id, order.id, order.client_id, sequence, 
           deliveryAddress, order.latitude, order.longitude]
        );

        // Update order status
        await client.query(
          `UPDATE orders SET status = 'shipped', shipped_date = CURRENT_TIMESTAMP WHERE id = $1`,
          [order.id]
        );

        sequence++;
      }

      // Update driver and vehicle status
      if (driverId) {
        await client.query(`UPDATE drivers SET status = 'assigned' WHERE id = $1`, [driverId]);
      }
      if (vehicleId) {
        await client.query(`UPDATE vehicles SET status = 'assigned' WHERE id = $1`, [vehicleId]);
      }

      return { ...delivery, orderCount: ordersResult.rows.length };
    });

    await createAuditLog(req.user.id, 'CREATE', 'delivery', result.id, null, result, req);

    const io = req.app.get('io');
    io.emit('delivery:created', result);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Update delivery status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['scheduled', 'loading', 'in_transit', 'delivered', 'failed', 'returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await transaction(async (client) => {
      let additionalUpdates = '';
      if (status === 'in_transit') {
        additionalUpdates = ', departure_time = CURRENT_TIMESTAMP';
      } else if (status === 'delivered' || status === 'returned') {
        additionalUpdates = ', completion_time = CURRENT_TIMESTAMP';
      }

      const deliveryResult = await client.query(
        `UPDATE deliveries 
         SET status = $1, updated_at = CURRENT_TIMESTAMP ${additionalUpdates}
         WHERE id = $2
         RETURNING *`,
        [status, id]
      );

      if (deliveryResult.rows.length === 0) {
        throw new Error('Delivery not found');
      }

      const delivery = deliveryResult.rows[0];

      // Update driver and vehicle status when completed
      if (status === 'delivered' || status === 'returned' || status === 'failed') {
        if (delivery.driver_id) {
          await client.query(`UPDATE drivers SET status = 'available' WHERE id = $1`, [delivery.driver_id]);
        }
        if (delivery.vehicle_id) {
          await client.query(`UPDATE vehicles SET status = 'available' WHERE id = $1`, [delivery.vehicle_id]);
        }
      } else if (status === 'in_transit') {
        if (delivery.driver_id) {
          await client.query(`UPDATE drivers SET status = 'on_delivery' WHERE id = $1`, [delivery.driver_id]);
        }
        if (delivery.vehicle_id) {
          await client.query(`UPDATE vehicles SET status = 'in_use' WHERE id = $1`, [delivery.vehicle_id]);
        }
      }

      return delivery;
    });

    await createAuditLog(req.user.id, 'STATUS_CHANGE', 'delivery', id, null, { status }, req);

    const io = req.app.get('io');
    io.emit('delivery:updated', result);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Update delivery item (stop) status
router.patch('/:id/items/:itemId', async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { status, recipientName, notes, failureReason, signatureUrl, photoUrl } = req.body;

    const result = await transaction(async (client) => {
      const itemResult = await client.query(
        `UPDATE delivery_items 
         SET status = $1, 
             recipient_name = COALESCE($2, recipient_name),
             notes = COALESCE($3, notes),
             failure_reason = $4,
             signature_url = COALESCE($5, signature_url),
             photo_url = COALESCE($6, photo_url),
             actual_arrival = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 AND delivery_id = $8
         RETURNING *`,
        [status, recipientName, notes, failureReason, signatureUrl, photoUrl, itemId, id]
      );

      if (itemResult.rows.length === 0) {
        throw new Error('Delivery item not found');
      }

      const item = itemResult.rows[0];

      // Update order status based on delivery status
      if (item.order_id) {
        let orderStatus = 'shipped';
        if (status === 'delivered') orderStatus = 'delivered';
        else if (status === 'failed') orderStatus = 'failed';

        await client.query(
          `UPDATE orders SET status = $1, 
           ${status === 'delivered' ? 'delivered_date = CURRENT_TIMESTAMP,' : ''}
           updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [orderStatus, item.order_id]
        );
      }

      // Update delivery completed_stops count
      const completedResult = await client.query(
        `SELECT COUNT(*) FROM delivery_items 
         WHERE delivery_id = $1 AND status IN ('delivered', 'failed', 'partial')`,
        [id]
      );

      await client.query(
        `UPDATE deliveries SET completed_stops = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [parseInt(completedResult.rows[0].count), id]
      );

      return item;
    });

    const io = req.app.get('io');
    io.emit('delivery:item:updated', { deliveryId: id, item: result });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get delivery routes
router.get('/routes/list', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM delivery_routes WHERE is_active = true ORDER BY name`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get available drivers
router.get('/drivers/available', async (req, res, next) => {
  try {
    const { date } = req.query;

    const result = await query(
      `SELECT d.*, u.first_name || ' ' || u.last_name as name, u.phone
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       WHERE d.is_active = true 
         AND d.status = 'available'
         AND d.id NOT IN (
           SELECT driver_id FROM deliveries 
           WHERE scheduled_date = $1 AND status NOT IN ('delivered', 'returned', 'failed')
           AND driver_id IS NOT NULL
         )
       ORDER BY u.first_name`,
      [date || new Date().toISOString().split('T')[0]]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get available vehicles
router.get('/vehicles/available', async (req, res, next) => {
  try {
    const { date } = req.query;

    const result = await query(
      `SELECT * FROM vehicles 
       WHERE is_active = true 
         AND status = 'available'
         AND id NOT IN (
           SELECT vehicle_id FROM deliveries 
           WHERE scheduled_date = $1 AND status NOT IN ('delivered', 'returned', 'failed')
           AND vehicle_id IS NOT NULL
         )
       ORDER BY plate_number`,
      [date || new Date().toISOString().split('T')[0]]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Optimize route (basic implementation)
router.post('/optimize-route', async (req, res, next) => {
  try {
    const { orderIds, warehouseId } = req.body;

    if (!orderIds || orderIds.length === 0) {
      return res.status(400).json({ error: 'At least one order is required' });
    }

    // Get warehouse coordinates
    const warehouseResult = await query(
      `SELECT latitude, longitude FROM warehouses WHERE id = $1`,
      [warehouseId]
    );

    if (warehouseResult.rows.length === 0) {
      return res.status(400).json({ error: 'Warehouse not found' });
    }

    const warehouse = warehouseResult.rows[0];

    // Get orders with client coordinates
    const ordersResult = await query(
      `SELECT o.id, o.order_number, o.priority, o.total_amount,
              c.business_name, c.latitude, c.longitude, c.address, c.city
       FROM orders o
       JOIN clients c ON o.client_id = c.id
       WHERE o.id = ANY($1)`,
      [orderIds]
    );

    // Simple nearest neighbor algorithm for route optimization
    const orders = ordersResult.rows.filter(o => o.latitude && o.longitude);
    const optimizedRoute = [];
    const remaining = [...orders];
    let currentLat = warehouse.latitude || 16.6159; // Default to San Fernando
    let currentLng = warehouse.longitude || 120.3175;

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const distance = calculateDistance(
          currentLat, currentLng,
          remaining[i].latitude, remaining[i].longitude
        );

        // Factor in priority (lower priority number = higher priority)
        const priorityFactor = 1 + (remaining[i].priority - 1) * 0.1;
        const adjustedDistance = distance * priorityFactor;

        if (adjustedDistance < nearestDistance) {
          nearestDistance = adjustedDistance;
          nearestIndex = i;
        }
      }

      const selected = remaining.splice(nearestIndex, 1)[0];
      optimizedRoute.push({
        ...selected,
        sequence: optimizedRoute.length + 1,
        distanceFromPrevious: nearestDistance
      });

      currentLat = selected.latitude;
      currentLng = selected.longitude;
    }

    // Calculate total distance
    let totalDistance = 0;
    optimizedRoute.forEach(stop => {
      totalDistance += stop.distanceFromPrevious || 0;
    });

    // Add return distance
    if (optimizedRoute.length > 0) {
      const lastStop = optimizedRoute[optimizedRoute.length - 1];
      totalDistance += calculateDistance(
        lastStop.latitude, lastStop.longitude,
        warehouse.latitude || 16.6159, warehouse.longitude || 120.3175
      );
    }

    res.json({
      optimizedRoute,
      totalDistance: Math.round(totalDistance * 100) / 100,
      estimatedDuration: Math.round(totalDistance * 3), // ~3 min per km average
      stopCount: optimizedRoute.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;
