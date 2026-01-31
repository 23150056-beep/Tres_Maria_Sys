import express from 'express';
import { query, transaction } from '../database/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import { calculateDistance, paginate, paginationResponse } from '../utils/helpers.js';

const router = express.Router();

/**
 * DYNAMIC CENTRALIZED DISTRIBUTION SYSTEM
 * 
 * This is the core distribution optimization engine for Tres Marias Marketing.
 * It handles:
 * - Real-time inventory allocation across multiple retailers
 * - Automated distribution routing based on various factors
 * - Load balancing for warehouse stock distribution
 * - Multi-warehouse support
 * - Distribution analytics and optimization
 */

// Generate distribution plan number
const generatePlanNumber = async () => {
  const result = await query(
    `SELECT plan_number FROM distribution_plans 
     WHERE plan_number LIKE 'DP-%' 
     ORDER BY created_at DESC LIMIT 1`
  );

  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  let sequence = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].plan_number;
    const parts = lastNumber.split('-');
    if (parts.length >= 3 && parts[1] === `${year}${month}${day}`) {
      sequence = parseInt(parts[2], 10) + 1;
    }
  }

  return `DP-${year}${month}${day}-${sequence.toString().padStart(4, '0')}`;
};

/**
 * Distribution Optimization Algorithm
 * 
 * Factors considered:
 * 1. Order priority (1-10, lower is higher priority)
 * 2. Client distance from warehouse
 * 3. Available inventory across warehouses
 * 4. Stock expiry dates (FEFO - First Expired, First Out)
 * 5. Client payment history and credit status
 * 6. Delivery schedule constraints
 * 7. Vehicle capacity and availability
 * 8. Route optimization
 */
const calculateAllocationPriority = (order, inventory, warehouse, client) => {
  let score = 100;

  // Priority factor (weight: 30%)
  const priorityScore = (11 - order.priority) * 3; // Higher score for lower priority number
  score += priorityScore;

  // Distance factor (weight: 20%)
  if (client.latitude && client.longitude && warehouse.latitude && warehouse.longitude) {
    const distance = calculateDistance(
      warehouse.latitude, warehouse.longitude,
      client.latitude, client.longitude
    );
    const distanceScore = Math.max(0, 20 - (distance / 5)); // Closer = higher score
    score += distanceScore;
  }

  // Stock availability factor (weight: 15%)
  const availableRatio = inventory.available_quantity / order.quantity;
  const stockScore = Math.min(15, availableRatio * 15);
  score += stockScore;

  // Expiry factor for perishables (weight: 15%)
  if (inventory.expiry_date) {
    const daysUntilExpiry = Math.ceil((new Date(inventory.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 30) {
      score += 15; // Prioritize items expiring soon
    } else if (daysUntilExpiry <= 60) {
      score += 10;
    } else {
      score += 5;
    }
  }

  // Client credit status factor (weight: 10%)
  if (client.credit_limit > 0) {
    const creditUtilization = client.current_balance / client.credit_limit;
    if (creditUtilization < 0.5) {
      score += 10;
    } else if (creditUtilization < 0.8) {
      score += 5;
    }
  }

  // Required date urgency (weight: 10%)
  if (order.required_date) {
    const daysUntilRequired = Math.ceil((new Date(order.required_date) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilRequired <= 1) {
      score += 10;
    } else if (daysUntilRequired <= 3) {
      score += 7;
    } else if (daysUntilRequired <= 7) {
      score += 4;
    }
  }

  return Math.round(score * 100) / 100;
};

// Get distribution plans
router.get('/plans', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`dp.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`dp.plan_date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`dp.plan_date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM distribution_plans dp ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT dp.*, 
              u.first_name || ' ' || u.last_name as created_by_name,
              (SELECT COUNT(*) FROM distribution_allocations WHERE plan_id = dp.id) as allocation_count
       FROM distribution_plans dp
       LEFT JOIN users u ON dp.created_by = u.id
       ${whereClause}
       ORDER BY dp.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json(paginationResponse(result.rows, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// Get single distribution plan
router.get('/plans/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const planResult = await query(
      `SELECT dp.*, 
              u.first_name || ' ' || u.last_name as created_by_name,
              au.first_name || ' ' || au.last_name as approved_by_name
       FROM distribution_plans dp
       LEFT JOIN users u ON dp.created_by = u.id
       LEFT JOIN users au ON dp.approved_by = au.id
       WHERE dp.id = $1`,
      [id]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Distribution plan not found' });
    }

    // Get allocations
    const allocationsResult = await query(
      `SELECT da.*, 
              o.order_number, o.required_date,
              c.business_name as client_name,
              p.sku, p.name as product_name,
              w.name as warehouse_name
       FROM distribution_allocations da
       LEFT JOIN orders o ON da.order_id = o.id
       LEFT JOIN clients c ON o.client_id = c.id
       LEFT JOIN products p ON da.product_id = p.id
       LEFT JOIN warehouses w ON da.warehouse_id = w.id
       WHERE da.plan_id = $1
       ORDER BY da.priority_score DESC`,
      [id]
    );

    res.json({
      ...planResult.rows[0],
      allocations: allocationsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create optimized distribution plan
router.post('/plans/optimize', async (req, res, next) => {
  try {
    const { name, planDate, orderIds, warehouseId } = req.body;

    if (!planDate) {
      return res.status(400).json({ error: 'Plan date is required' });
    }

    const result = await transaction(async (client) => {
      const planNumber = await generatePlanNumber();

      // Get pending/confirmed orders to distribute
      let ordersQuery = `
        SELECT o.*, 
               c.business_name, c.latitude, c.longitude, c.credit_limit, c.current_balance,
               c.pricing_tier_id
        FROM orders o
        JOIN clients c ON o.client_id = c.id
        WHERE o.status IN ('confirmed', 'processing')
      `;
      
      if (orderIds && orderIds.length > 0) {
        ordersQuery += ` AND o.id = ANY($1)`;
      }
      
      ordersQuery += ` ORDER BY o.priority ASC, o.required_date ASC`;

      const ordersResult = await client.query(ordersQuery, orderIds && orderIds.length > 0 ? [orderIds] : []);

      if (ordersResult.rows.length === 0) {
        throw new Error('No orders to distribute');
      }

      // Get warehouses
      let warehousesQuery = `SELECT * FROM warehouses WHERE is_active = true`;
      if (warehouseId) {
        warehousesQuery += ` AND id = $1`;
      }
      
      const warehousesResult = await client.query(warehousesQuery, warehouseId ? [warehouseId] : []);
      const warehouses = warehousesResult.rows;

      // Calculate allocations
      const allocations = [];
      let totalQuantity = 0;
      let totalValue = 0;
      let totalScore = 0;

      for (const order of ordersResult.rows) {
        // Get order items
        const itemsResult = await client.query(
          `SELECT oi.*, p.is_perishable, p.shelf_life_days
           FROM order_items oi
           JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = $1`,
          [order.id]
        );

        for (const item of itemsResult.rows) {
          // Find best warehouse for allocation
          let bestWarehouse = null;
          let bestScore = -1;
          let bestInventory = null;

          for (const warehouse of warehouses) {
            // Get available inventory
            const inventoryResult = await client.query(
              `SELECT *, (quantity - reserved_quantity) as available_quantity
               FROM inventory
               WHERE product_id = $1 AND warehouse_id = $2 AND (quantity - reserved_quantity) > 0
               ORDER BY expiry_date ASC NULLS LAST, created_at ASC
               LIMIT 1`,
              [item.product_id, warehouse.id]
            );

            if (inventoryResult.rows.length > 0) {
              const inventory = inventoryResult.rows[0];
              const score = calculateAllocationPriority(order, inventory, warehouse, order);

              if (score > bestScore) {
                bestScore = score;
                bestWarehouse = warehouse;
                bestInventory = inventory;
              }
            }
          }

          if (bestWarehouse && bestInventory) {
            const allocatedQty = Math.min(item.quantity, bestInventory.available_quantity);
            
            allocations.push({
              orderId: order.id,
              productId: item.product_id,
              warehouseId: bestWarehouse.id,
              allocatedQuantity: allocatedQty,
              priorityScore: bestScore,
              orderPriority: order.priority,
              clientName: order.business_name,
              requiredDate: order.required_date
            });

            totalQuantity += allocatedQty;
            totalValue += allocatedQty * item.unit_price;
            totalScore += bestScore;
          }
        }
      }

      // Calculate optimization score (0-100)
      const optimizationScore = allocations.length > 0 
        ? Math.min(100, (totalScore / allocations.length))
        : 0;

      // Create distribution plan
      const planResult = await client.query(
        `INSERT INTO distribution_plans (
          plan_number, name, description, plan_date, status,
          total_orders, total_quantity, total_value, optimization_score, created_by
         ) VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9)
         RETURNING *`,
        [planNumber, name || `Distribution Plan ${planNumber}`, 
         `Auto-generated distribution plan for ${ordersResult.rows.length} orders`,
         planDate, ordersResult.rows.length, totalQuantity, totalValue, 
         optimizationScore, req.user.id]
      );

      const plan = planResult.rows[0];

      // Create allocations
      for (const allocation of allocations) {
        await client.query(
          `INSERT INTO distribution_allocations (
            plan_id, order_id, product_id, warehouse_id,
            allocated_quantity, priority_score, allocation_status
           ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
          [plan.id, allocation.orderId, allocation.productId, allocation.warehouseId,
           allocation.allocatedQuantity, allocation.priorityScore]
        );
      }

      return {
        ...plan,
        allocations,
        summary: {
          totalOrders: ordersResult.rows.length,
          totalAllocations: allocations.length,
          totalQuantity,
          totalValue,
          optimizationScore,
          warehousesUsed: [...new Set(allocations.map(a => a.warehouseId))].length
        }
      };
    });

    await createAuditLog(req.user.id, 'CREATE', 'distribution_plan', result.id, null, result, req);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Execute distribution plan
router.post('/plans/:id/execute', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await transaction(async (client) => {
      // Get plan and allocations
      const planResult = await client.query(
        `SELECT * FROM distribution_plans WHERE id = $1 AND status = 'draft'`,
        [id]
      );

      if (planResult.rows.length === 0) {
        throw new Error('Plan not found or not in draft status');
      }

      const allocationsResult = await client.query(
        `SELECT * FROM distribution_allocations WHERE plan_id = $1 AND allocation_status = 'pending'`,
        [id]
      );

      // Process each allocation
      for (const allocation of allocationsResult.rows) {
        // Reserve inventory
        await client.query(
          `UPDATE inventory 
           SET reserved_quantity = reserved_quantity + $1
           WHERE product_id = $2 AND warehouse_id = $3`,
          [allocation.allocated_quantity, allocation.product_id, allocation.warehouse_id]
        );

        // Update allocation status
        await client.query(
          `UPDATE distribution_allocations SET allocation_status = 'confirmed' WHERE id = $1`,
          [allocation.id]
        );

        // Update order status to processing
        await client.query(
          `UPDATE orders SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [allocation.order_id]
        );
      }

      // Update plan status
      const updatedPlan = await client.query(
        `UPDATE distribution_plans 
         SET status = 'active', approved_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [req.user.id, id]
      );

      return updatedPlan.rows[0];
    });

    await createAuditLog(req.user.id, 'EXECUTE', 'distribution_plan', id, null, result, req);

    const io = req.app.get('io');
    io.emit('distribution:executed', result);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get distribution analytics
router.get('/analytics', async (req, res, next) => {
  try {
    const { period = '30' } = req.query;

    // Distribution efficiency
    const efficiencyResult = await query(
      `SELECT 
        COUNT(*) as total_plans,
        AVG(optimization_score) as avg_optimization_score,
        SUM(total_orders) as total_orders_distributed,
        SUM(total_quantity) as total_items_distributed,
        SUM(total_value) as total_value_distributed
       FROM distribution_plans
       WHERE plan_date >= CURRENT_DATE - ($1 || ' days')::INTERVAL
         AND status IN ('active', 'completed')`,
      [period]
    );

    // Warehouse utilization
    const warehouseResult = await query(
      `SELECT w.id, w.name, w.code,
              COUNT(DISTINCT da.order_id) as orders_fulfilled,
              SUM(da.allocated_quantity) as items_distributed
       FROM warehouses w
       LEFT JOIN distribution_allocations da ON w.id = da.warehouse_id
       LEFT JOIN distribution_plans dp ON da.plan_id = dp.id
       WHERE dp.plan_date >= CURRENT_DATE - ($1 || ' days')::INTERVAL
         AND dp.status IN ('active', 'completed')
       GROUP BY w.id, w.name, w.code
       ORDER BY items_distributed DESC`,
      [period]
    );

    // Daily distribution volume
    const dailyResult = await query(
      `SELECT DATE(plan_date) as date,
              COUNT(*) as plans,
              SUM(total_orders) as orders,
              SUM(total_quantity) as quantity,
              SUM(total_value) as value
       FROM distribution_plans
       WHERE plan_date >= CURRENT_DATE - ($1 || ' days')::INTERVAL
         AND status IN ('active', 'completed')
       GROUP BY DATE(plan_date)
       ORDER BY date`,
      [period]
    );

    // Stock allocation rate
    const allocationResult = await query(
      `SELECT 
        COUNT(*) as total_allocations,
        COUNT(CASE WHEN allocation_status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN allocation_status = 'picked' THEN 1 END) as picked,
        COUNT(CASE WHEN allocation_status = 'shipped' THEN 1 END) as shipped
       FROM distribution_allocations da
       JOIN distribution_plans dp ON da.plan_id = dp.id
       WHERE dp.plan_date >= CURRENT_DATE - ($1 || ' days')::INTERVAL`,
      [period]
    );

    res.json({
      efficiency: efficiencyResult.rows[0],
      warehouseUtilization: warehouseResult.rows,
      dailyVolume: dailyResult.rows,
      allocationStatus: allocationResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get real-time inventory allocation status
router.get('/inventory-status', async (req, res, next) => {
  try {
    const { warehouseId, productId } = req.query;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (warehouseId) {
      whereConditions.push(`i.warehouse_id = $${paramIndex}`);
      params.push(warehouseId);
      paramIndex++;
    }

    if (productId) {
      whereConditions.push(`i.product_id = $${paramIndex}`);
      params.push(productId);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT p.id, p.sku, p.name, p.min_stock_level, p.reorder_point,
              w.id as warehouse_id, w.name as warehouse_name,
              COALESCE(SUM(i.quantity), 0) as total_quantity,
              COALESCE(SUM(i.reserved_quantity), 0) as reserved_quantity,
              COALESCE(SUM(i.quantity - i.reserved_quantity), 0) as available_quantity,
              MIN(i.expiry_date) as earliest_expiry
       FROM products p
       CROSS JOIN warehouses w
       LEFT JOIN inventory i ON p.id = i.product_id AND w.id = i.warehouse_id
       ${whereClause}
       GROUP BY p.id, p.sku, p.name, p.min_stock_level, p.reorder_point, w.id, w.name
       HAVING COALESCE(SUM(i.quantity), 0) > 0
       ORDER BY p.name, w.name`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Auto-replenishment suggestions
router.get('/replenishment-suggestions', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.id, p.sku, p.name, p.reorder_point, p.reorder_quantity,
              w.id as warehouse_id, w.name as warehouse_name,
              COALESCE(SUM(i.quantity), 0) as current_stock,
              COALESCE(SUM(i.reserved_quantity), 0) as reserved,
              p.reorder_quantity as suggested_quantity,
              s.id as supplier_id, s.company_name as supplier_name,
              sp.cost_price, sp.lead_time_days
       FROM products p
       CROSS JOIN warehouses w
       LEFT JOIN inventory i ON p.id = i.product_id AND w.id = i.warehouse_id
       LEFT JOIN supplier_products sp ON p.id = sp.product_id AND sp.is_preferred = true
       LEFT JOIN suppliers s ON sp.supplier_id = s.id
       WHERE p.is_active = true AND w.is_active = true
       GROUP BY p.id, p.sku, p.name, p.reorder_point, p.reorder_quantity, 
                w.id, w.name, s.id, s.company_name, sp.cost_price, sp.lead_time_days
       HAVING COALESCE(SUM(i.quantity - i.reserved_quantity), 0) <= p.reorder_point
       ORDER BY (p.reorder_point - COALESCE(SUM(i.quantity - i.reserved_quantity), 0)) DESC`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Load balancing across warehouses
router.post('/balance-stock', async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Get current stock distribution
    const stockResult = await query(
      `SELECT w.id, w.name, w.latitude, w.longitude,
              COALESCE(SUM(i.quantity), 0) as current_stock,
              COALESCE(SUM(i.reserved_quantity), 0) as reserved
       FROM warehouses w
       LEFT JOIN inventory i ON w.id = i.warehouse_id AND i.product_id = $1
       WHERE w.is_active = true
       GROUP BY w.id, w.name, w.latitude, w.longitude
       ORDER BY current_stock DESC`,
      [productId]
    );

    const warehouses = stockResult.rows;
    const totalStock = warehouses.reduce((sum, w) => sum + parseInt(w.current_stock), 0);
    const avgStock = Math.floor(totalStock / warehouses.length);

    // Calculate transfer suggestions
    const suggestions = [];
    const overstock = warehouses.filter(w => parseInt(w.current_stock) > avgStock * 1.2);
    const understock = warehouses.filter(w => parseInt(w.current_stock) < avgStock * 0.8);

    for (const from of overstock) {
      const excess = parseInt(from.current_stock) - avgStock;
      
      for (const to of understock) {
        const deficit = avgStock - parseInt(to.current_stock);
        const transferQty = Math.min(excess, deficit);
        
        if (transferQty > 0) {
          suggestions.push({
            fromWarehouse: { id: from.id, name: from.name },
            toWarehouse: { id: to.id, name: to.name },
            quantity: transferQty,
            currentFromStock: from.current_stock,
            currentToStock: to.current_stock
          });
        }
      }
    }

    res.json({
      productId,
      totalStock,
      averageStock: avgStock,
      distribution: warehouses,
      suggestions
    });
  } catch (error) {
    next(error);
  }
});

export default router;
