import express from 'express';
import multer from 'multer';
import path from 'path';
import { query, transaction } from '../database/db.js';
import { createAuditLog } from '../utils/auditLog.js';

const router = express.Router();

// Configure multer for file uploads (proof of delivery)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/deliveries/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// ====================================================
// DRIVER AUTHENTICATION & PROFILE
// ====================================================

// Get driver profile and status
router.get('/profile', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT d.*, u.first_name, u.last_name, u.email, u.phone as user_phone,
              u.avatar_url
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       WHERE d.user_id = $1 AND d.is_active = true`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update driver location (real-time GPS tracking)
router.post('/location', async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const result = await query(
      `UPDATE drivers 
       SET current_latitude = $1, current_longitude = $2, last_location_update = CURRENT_TIMESTAMP
       WHERE user_id = $3
       RETURNING id, current_latitude, current_longitude, last_location_update`,
      [latitude, longitude, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Emit real-time location update
    const io = req.app.get('io');
    io.emit('driver:location', {
      driverId: result.rows[0].id,
      latitude,
      longitude,
      timestamp: result.rows[0].last_location_update
    });

    res.json({ success: true, location: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update driver device token (for push notifications)
router.post('/device-token', async (req, res, next) => {
  try {
    const { deviceToken } = req.body;

    await query(
      `UPDATE drivers SET device_token = $1 WHERE user_id = $2`,
      [deviceToken, req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ====================================================
// DRIVER DELIVERIES (Mobile App)
// ====================================================

// Get assigned deliveries for today
router.get('/deliveries', async (req, res, next) => {
  try {
    const { date, status } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get driver ID
    const driverResult = await query(
      `SELECT id FROM drivers WHERE user_id = $1`,
      [req.user.id]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    const driverId = driverResult.rows[0].id;

    let statusFilter = '';
    const params = [driverId, targetDate];

    if (status) {
      statusFilter = 'AND d.status = $3';
      params.push(status);
    }

    const result = await query(
      `SELECT d.*, 
              dr.route_code, dr.name as route_name,
              v.plate_number, v.vehicle_type,
              w.name as warehouse_name, w.address as warehouse_address,
              (SELECT COUNT(*) FROM delivery_items WHERE delivery_id = d.id) as total_stops,
              (SELECT COUNT(*) FROM delivery_items WHERE delivery_id = d.id AND status IN ('delivered', 'failed', 'partial')) as completed_stops
       FROM deliveries d
       LEFT JOIN delivery_routes dr ON d.route_id = dr.id
       LEFT JOIN vehicles v ON d.vehicle_id = v.id
       LEFT JOIN warehouses w ON d.warehouse_id = w.id
       WHERE d.driver_id = $1 AND d.scheduled_date = $2 ${statusFilter}
       ORDER BY d.scheduled_date, d.created_at`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get delivery details with all stops
router.get('/deliveries/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify driver owns this delivery
    const driverResult = await query(
      `SELECT d.id FROM drivers d
       JOIN deliveries del ON del.driver_id = d.id
       WHERE d.user_id = $1 AND del.id = $2`,
      [req.user.id, id]
    );

    if (driverResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to view this delivery' });
    }

    // Get delivery details
    const deliveryResult = await query(
      `SELECT d.*, 
              dr.route_code, dr.name as route_name, dr.waypoints,
              v.plate_number, v.vehicle_type, v.make, v.model,
              w.name as warehouse_name, w.address as warehouse_address, w.latitude as warehouse_lat, w.longitude as warehouse_lng
       FROM deliveries d
       LEFT JOIN delivery_routes dr ON d.route_id = dr.id
       LEFT JOIN vehicles v ON d.vehicle_id = v.id
       LEFT JOIN warehouses w ON d.warehouse_id = w.id
       WHERE d.id = $1`,
      [id]
    );

    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    // Get delivery stops with order details
    const stopsResult = await query(
      `SELECT di.*, 
              o.order_number, o.total_amount, o.notes as order_notes,
              c.business_name as client_name, c.contact_person, c.phone as client_phone, c.mobile as client_mobile
       FROM delivery_items di
       LEFT JOIN orders o ON di.order_id = o.id
       LEFT JOIN clients c ON di.client_id = c.id
       WHERE di.delivery_id = $1
       ORDER BY di.sequence_number`,
      [id]
    );

    // Get order items for each stop
    const stopsWithItems = await Promise.all(stopsResult.rows.map(async (stop) => {
      if (stop.order_id) {
        const itemsResult = await query(
          `SELECT oi.quantity, oi.unit_price, oi.total_price,
                  p.name as product_name, p.sku, p.unit_of_measure
           FROM order_items oi
           JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = $1`,
          [stop.order_id]
        );
        return { ...stop, items: itemsResult.rows };
      }
      return { ...stop, items: [] };
    }));

    res.json({
      ...deliveryResult.rows[0],
      stops: stopsWithItems
    });
  } catch (error) {
    next(error);
  }
});

// Start delivery (depart from warehouse)
router.post('/deliveries/:id/start', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    const result = await transaction(async (client) => {
      // Verify and update delivery
      const deliveryResult = await client.query(
        `UPDATE deliveries 
         SET status = 'in_transit', departure_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status IN ('scheduled', 'loading')
         RETURNING *`,
        [id]
      );

      if (deliveryResult.rows.length === 0) {
        throw new Error('Delivery not found or already in transit');
      }

      const delivery = deliveryResult.rows[0];

      // Update driver status
      await client.query(
        `UPDATE drivers SET status = 'on_delivery', current_latitude = $1, current_longitude = $2, last_location_update = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [latitude, longitude, delivery.driver_id]
      );

      // Update vehicle status
      if (delivery.vehicle_id) {
        await client.query(
          `UPDATE vehicles SET status = 'in_use' WHERE id = $1`,
          [delivery.vehicle_id]
        );
      }

      // Log status change
      await client.query(
        `INSERT INTO delivery_status_history (delivery_id, status, latitude, longitude, notes, changed_by)
         VALUES ($1, 'in_transit', $2, $3, 'Delivery started from warehouse', $4)`,
        [id, latitude, longitude, req.user.id]
      );

      return delivery;
    });

    const io = req.app.get('io');
    io.emit('delivery:started', { deliveryId: id, status: 'in_transit' });

    res.json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// Update delivery stop status (mark as delivered/failed)
router.patch('/deliveries/:deliveryId/stops/:stopId', async (req, res, next) => {
  try {
    const { deliveryId, stopId } = req.params;
    const { 
      status, 
      recipientName, 
      recipientRelationship,
      notes, 
      failureReason,
      latitude,
      longitude,
      deliveredQuantity // For partial deliveries: { productId: quantity }
    } = req.body;

    const validStatuses = ['in_transit', 'delivered', 'failed', 'partial'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await transaction(async (client) => {
      // Get delivery item
      const itemResult = await client.query(
        `SELECT di.*, d.driver_id FROM delivery_items di
         JOIN deliveries d ON di.delivery_id = d.id
         WHERE di.id = $1 AND di.delivery_id = $2`,
        [stopId, deliveryId]
      );

      if (itemResult.rows.length === 0) {
        throw new Error('Delivery stop not found');
      }

      const item = itemResult.rows[0];

      // Update delivery item
      const updateResult = await client.query(
        `UPDATE delivery_items 
         SET status = $1, 
             recipient_name = COALESCE($2, recipient_name),
             recipient_relationship = COALESCE($3, recipient_relationship),
             notes = COALESCE($4, notes),
             failure_reason = $5,
             actual_arrival = CURRENT_TIMESTAMP,
             delivery_attempts = delivery_attempts + 1,
             last_attempt_at = CURRENT_TIMESTAMP,
             delivered_quantity = COALESCE($6, delivered_quantity),
             latitude = COALESCE($7, latitude),
             longitude = COALESCE($8, longitude),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9
         RETURNING *`,
        [status, recipientName, recipientRelationship, notes, failureReason, 
         deliveredQuantity ? JSON.stringify(deliveredQuantity) : null, latitude, longitude, stopId]
      );

      // Update order status
      if (item.order_id) {
        let orderStatus = 'shipped';
        if (status === 'delivered') orderStatus = 'delivered';
        else if (status === 'failed') orderStatus = 'failed';
        else if (status === 'partial') orderStatus = 'partial';

        await client.query(
          `UPDATE orders SET status = $1, 
           ${status === 'delivered' || status === 'partial' ? 'delivered_date = CURRENT_TIMESTAMP,' : ''}
           updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [orderStatus, item.order_id]
        );

        // Log order status change
        await client.query(
          `INSERT INTO order_status_history (order_id, status, notes, changed_by)
           VALUES ($1, $2, $3, $4)`,
          [item.order_id, orderStatus, `Delivery ${status}: ${notes || ''}`, req.user.id]
        );
      }

      // Update delivery completion count
      const completedResult = await client.query(
        `SELECT COUNT(*) FROM delivery_items 
         WHERE delivery_id = $1 AND status IN ('delivered', 'failed', 'partial')`,
        [deliveryId]
      );

      await client.query(
        `UPDATE deliveries SET completed_stops = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [parseInt(completedResult.rows[0].count), deliveryId]
      );

      // Log status change
      await client.query(
        `INSERT INTO delivery_status_history (delivery_id, delivery_item_id, status, latitude, longitude, notes, changed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [deliveryId, stopId, status, latitude, longitude, notes || failureReason, req.user.id]
      );

      return updateResult.rows[0];
    });

    const io = req.app.get('io');
    io.emit('delivery:stop:updated', { deliveryId, stopId, status: result.status });

    res.json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// Upload proof of delivery (signature or photo)
router.post('/deliveries/:deliveryId/stops/:stopId/proof', upload.fields([
  { name: 'signature', maxCount: 1 },
  { name: 'photos', maxCount: 5 }
]), async (req, res, next) => {
  try {
    const { deliveryId, stopId } = req.params;
    const files = req.files;

    let signatureUrl = null;
    let photoUrls = [];

    if (files.signature && files.signature[0]) {
      signatureUrl = `/uploads/deliveries/${files.signature[0].filename}`;
    }

    if (files.photos) {
      photoUrls = files.photos.map(f => `/uploads/deliveries/${f.filename}`);
    }

    const result = await query(
      `UPDATE delivery_items 
       SET signature_url = COALESCE($1, signature_url),
           photo_urls = COALESCE(photo_urls, '[]'::jsonb) || $2::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND delivery_id = $4
       RETURNING *`,
      [signatureUrl, JSON.stringify(photoUrls), stopId, deliveryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery stop not found' });
    }

    const io = req.app.get('io');
    io.emit('delivery:proof:uploaded', { deliveryId, stopId });

    res.json({
      success: true,
      signatureUrl,
      photoUrls,
      item: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Complete delivery (all stops done, return to warehouse)
router.post('/deliveries/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, notes } = req.body;

    const result = await transaction(async (client) => {
      // Update delivery status
      const deliveryResult = await client.query(
        `UPDATE deliveries 
         SET status = 'delivered', completion_time = CURRENT_TIMESTAMP, notes = COALESCE($1, notes), updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND status = 'in_transit'
         RETURNING *`,
        [notes, id]
      );

      if (deliveryResult.rows.length === 0) {
        throw new Error('Delivery not found or not in transit');
      }

      const delivery = deliveryResult.rows[0];

      // Update driver status
      await client.query(
        `UPDATE drivers SET status = 'available', current_latitude = $1, current_longitude = $2, last_location_update = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [latitude, longitude, delivery.driver_id]
      );

      // Update vehicle status
      if (delivery.vehicle_id) {
        await client.query(
          `UPDATE vehicles SET status = 'available' WHERE id = $1`,
          [delivery.vehicle_id]
        );
      }

      // Log status change
      await client.query(
        `INSERT INTO delivery_status_history (delivery_id, status, latitude, longitude, notes, changed_by)
         VALUES ($1, 'delivered', $2, $3, 'Delivery completed', $4)`,
        [id, latitude, longitude, req.user.id]
      );

      return delivery;
    });

    await createAuditLog(req.user.id, 'COMPLETE', 'delivery', id, null, result, req);

    const io = req.app.get('io');
    io.emit('delivery:completed', { deliveryId: id, status: 'delivered' });

    res.json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// Get delivery history for driver
router.get('/history', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    // Get driver ID
    const driverResult = await query(
      `SELECT id FROM drivers WHERE user_id = $1`,
      [req.user.id]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    const driverId = driverResult.rows[0].id;

    let dateFilter = '';
    const params = [driverId, parseInt(limit), offset];

    if (startDate && endDate) {
      dateFilter = 'AND d.scheduled_date BETWEEN $4 AND $5';
      params.push(startDate, endDate);
    }

    const result = await query(
      `SELECT d.*, 
              (SELECT COUNT(*) FROM delivery_items WHERE delivery_id = d.id AND status = 'delivered') as delivered_count,
              (SELECT COUNT(*) FROM delivery_items WHERE delivery_id = d.id AND status = 'failed') as failed_count
       FROM deliveries d
       WHERE d.driver_id = $1 AND d.status IN ('delivered', 'returned', 'failed')
       ${dateFilter}
       ORDER BY d.completion_time DESC
       LIMIT $2 OFFSET $3`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM deliveries WHERE driver_id = $1 AND status IN ('delivered', 'returned', 'failed')`,
      [driverId]
    );

    res.json({
      deliveries: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get driver statistics
router.get('/stats', async (req, res, next) => {
  try {
    const { period = '30days' } = req.query;

    // Get driver ID
    const driverResult = await query(
      `SELECT id FROM drivers WHERE user_id = $1`,
      [req.user.id]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    const driverId = driverResult.rows[0].id;
    const interval = period === '7days' ? '7 days' : period === '30days' ? '30 days' : '90 days';

    const stats = await query(
      `SELECT 
        COUNT(DISTINCT d.id) as total_deliveries,
        COUNT(DISTINCT CASE WHEN d.status = 'delivered' THEN d.id END) as completed_deliveries,
        COUNT(di.id) as total_stops,
        COUNT(CASE WHEN di.status = 'delivered' THEN 1 END) as delivered_stops,
        COUNT(CASE WHEN di.status = 'failed' THEN 1 END) as failed_stops,
        ROUND(AVG(EXTRACT(EPOCH FROM (d.completion_time - d.departure_time)) / 60)::numeric, 2) as avg_delivery_time_mins
       FROM deliveries d
       LEFT JOIN delivery_items di ON d.id = di.delivery_id
       WHERE d.driver_id = $1 
         AND d.scheduled_date >= CURRENT_DATE - INTERVAL '${interval}'`,
      [driverId]
    );

    // Today's summary
    const todayStats = await query(
      `SELECT 
        COUNT(DISTINCT d.id) as deliveries_today,
        COUNT(di.id) as stops_today,
        COUNT(CASE WHEN di.status = 'delivered' THEN 1 END) as completed_today
       FROM deliveries d
       LEFT JOIN delivery_items di ON d.id = di.delivery_id
       WHERE d.driver_id = $1 AND d.scheduled_date = CURRENT_DATE`,
      [driverId]
    );

    res.json({
      period,
      stats: stats.rows[0],
      today: todayStats.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

export default router;
