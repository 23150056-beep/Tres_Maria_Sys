import express from 'express';
import { query, transaction } from '../database/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import { paginate, paginationResponse } from '../utils/helpers.js';

const router = express.Router();

// Generate PO number
const generatePONumber = async () => {
  const result = await query(
    `SELECT po_number FROM purchase_orders 
     WHERE po_number LIKE 'PO-%' 
     ORDER BY created_at DESC LIMIT 1`
  );

  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  let sequence = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].po_number;
    const parts = lastNumber.split('-');
    if (parts.length >= 3 && parts[1] === `${year}${month}`) {
      sequence = parseInt(parts[2], 10) + 1;
    }
  }

  return `PO-${year}${month}-${sequence.toString().padStart(5, '0')}`;
};

// Get all purchase orders
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, supplier, warehouse, startDate, endDate, search } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(po.po_number ILIKE $${paramIndex} OR s.company_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`po.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (supplier) {
      whereConditions.push(`po.supplier_id = $${paramIndex}`);
      params.push(supplier);
      paramIndex++;
    }

    if (warehouse) {
      whereConditions.push(`po.warehouse_id = $${paramIndex}`);
      params.push(warehouse);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`po.order_date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`po.order_date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM purchase_orders po 
       LEFT JOIN suppliers s ON po.supplier_id = s.id 
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT po.*, 
              s.company_name as supplier_name,
              w.name as warehouse_name,
              u.first_name || ' ' || u.last_name as created_by_name,
              (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id) as item_count
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN warehouses w ON po.warehouse_id = w.id
       LEFT JOIN users u ON po.created_by = u.id
       ${whereClause}
       ORDER BY po.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json(paginationResponse(result.rows, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// Get single purchase order with items
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const poResult = await query(
      `SELECT po.*, 
              s.company_name as supplier_name, s.contact_person as supplier_contact,
              s.email as supplier_email, s.phone as supplier_phone, s.address as supplier_address,
              w.name as warehouse_name, w.address as warehouse_address,
              u.first_name || ' ' || u.last_name as created_by_name,
              au.first_name || ' ' || au.last_name as approved_by_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN warehouses w ON po.warehouse_id = w.id
       LEFT JOIN users u ON po.created_by = u.id
       LEFT JOIN users au ON po.approved_by = au.id
       WHERE po.id = $1`,
      [id]
    );

    if (poResult.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const itemsResult = await query(
      `SELECT poi.*, 
              p.sku, p.name as product_name, p.unit_of_measure
       FROM purchase_order_items poi
       JOIN products p ON poi.product_id = p.id
       WHERE poi.purchase_order_id = $1
       ORDER BY poi.created_at`,
      [id]
    );

    // Get goods receipts
    const receiptsResult = await query(
      `SELECT gr.*, u.first_name || ' ' || u.last_name as received_by_name
       FROM goods_receipts gr
       LEFT JOIN users u ON gr.received_by = u.id
       WHERE gr.purchase_order_id = $1
       ORDER BY gr.received_date DESC`,
      [id]
    );

    res.json({
      ...poResult.rows[0],
      items: itemsResult.rows,
      goodsReceipts: receiptsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create purchase order
router.post('/', async (req, res, next) => {
  try {
    const { supplierId, warehouseId, items, expectedDate, notes } = req.body;

    if (!supplierId || !warehouseId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Supplier, warehouse, and at least one item are required' });
    }

    const result = await transaction(async (client) => {
      const poNumber = await generatePONumber();

      // Calculate totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const productResult = await client.query(
          `SELECT * FROM products WHERE id = $1`,
          [item.productId]
        );

        if (productResult.rows.length === 0) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        const product = productResult.rows[0];
        const unitCost = item.unitCost || product.cost_price || 0;
        const totalCost = item.quantity * unitCost;

        subtotal += totalCost;
        orderItems.push({
          ...item,
          unitCost,
          totalCost
        });
      }

      const taxAmount = subtotal * 0.12; // 12% VAT
      const totalAmount = subtotal + taxAmount;

      // Create purchase order
      const poResult = await client.query(
        `INSERT INTO purchase_orders (
          po_number, supplier_id, warehouse_id, status, order_date, expected_date,
          subtotal, tax_amount, total_amount, notes, created_by
         ) VALUES ($1, $2, $3, 'draft', CURRENT_DATE, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [poNumber, supplierId, warehouseId, expectedDate, subtotal, taxAmount, totalAmount, notes, req.user.id]
      );

      const po = poResult.rows[0];

      // Create order items
      for (const item of orderItems) {
        await client.query(
          `INSERT INTO purchase_order_items (
            purchase_order_id, product_id, quantity, unit_cost, total_cost, notes
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [po.id, item.productId, item.quantity, item.unitCost, item.totalCost, item.notes]
        );
      }

      return { ...po, items: orderItems };
    });

    await createAuditLog(req.user.id, 'CREATE', 'purchase_order', result.id, null, result, req);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Update purchase order status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(
      `UPDATE purchase_orders 
       SET status = $1, 
           ${status === 'received' ? 'received_date = CURRENT_DATE,' : ''}
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    await createAuditLog(req.user.id, 'STATUS_CHANGE', 'purchase_order', id, null, { status }, req);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Approve purchase order
router.post('/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE purchase_orders 
       SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status IN ('draft', 'pending')
       RETURNING *`,
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Purchase order not found or not in draft/pending status' });
    }

    await createAuditLog(req.user.id, 'APPROVE', 'purchase_order', id, null, result.rows[0], req);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Receive goods
router.post('/:id/receive', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    const result = await transaction(async (client) => {
      // Get PO
      const poResult = await client.query(
        `SELECT * FROM purchase_orders WHERE id = $1`,
        [id]
      );

      if (poResult.rows.length === 0) {
        throw new Error('Purchase order not found');
      }

      const po = poResult.rows[0];

      // Generate GRN number
      const grnResult = await client.query(
        `SELECT grn_number FROM goods_receipts ORDER BY created_at DESC LIMIT 1`
      );

      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      let sequence = 1;

      if (grnResult.rows.length > 0) {
        const parts = grnResult.rows[0].grn_number.split('-');
        if (parts.length >= 3 && parts[1] === `${year}${month}`) {
          sequence = parseInt(parts[2], 10) + 1;
        }
      }

      const grnNumber = `GRN-${year}${month}-${sequence.toString().padStart(5, '0')}`;

      // Create goods receipt
      const grResult = await client.query(
        `INSERT INTO goods_receipts (
          grn_number, purchase_order_id, warehouse_id, received_date, status, notes, received_by
         ) VALUES ($1, $2, $3, CURRENT_DATE, 'completed', $4, $5)
         RETURNING *`,
        [grnNumber, id, po.warehouse_id, notes, req.user.id]
      );

      const gr = grResult.rows[0];
      let allReceived = true;

      // Process each item
      for (const item of items) {
        // Get PO item
        const poiResult = await client.query(
          `SELECT * FROM purchase_order_items WHERE id = $1`,
          [item.purchaseOrderItemId]
        );

        if (poiResult.rows.length === 0) {
          throw new Error(`Purchase order item not found: ${item.purchaseOrderItemId}`);
        }

        const poi = poiResult.rows[0];

        // Create GR item
        await client.query(
          `INSERT INTO goods_receipt_items (
            goods_receipt_id, purchase_order_item_id, product_id,
            quantity_received, quantity_accepted, quantity_rejected,
            batch_number, lot_number, manufacture_date, expiry_date,
            location_id, inspection_notes
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [gr.id, poi.id, poi.product_id, item.quantityReceived, 
           item.quantityAccepted || item.quantityReceived, item.quantityRejected || 0,
           item.batchNumber, item.lotNumber, item.manufactureDate, item.expiryDate,
           item.locationId, item.inspectionNotes]
        );

        // Update PO item received quantity
        await client.query(
          `UPDATE purchase_order_items 
           SET received_quantity = received_quantity + $1
           WHERE id = $2`,
          [item.quantityReceived, poi.id]
        );

        // Add to inventory
        const existingInventory = await client.query(
          `SELECT id FROM inventory 
           WHERE product_id = $1 AND warehouse_id = $2 
           AND COALESCE(batch_number, '') = COALESCE($3, '')`,
          [poi.product_id, po.warehouse_id, item.batchNumber || '']
        );

        if (existingInventory.rows.length > 0) {
          await client.query(
            `UPDATE inventory SET 
              quantity = quantity + $1,
              expiry_date = COALESCE($2, expiry_date),
              cost_price = COALESCE($3, cost_price),
              updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [item.quantityAccepted || item.quantityReceived, item.expiryDate, 
             poi.unit_cost, existingInventory.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO inventory (
              product_id, warehouse_id, location_id, quantity,
              batch_number, lot_number, manufacture_date, expiry_date, cost_price
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [poi.product_id, po.warehouse_id, item.locationId, 
             item.quantityAccepted || item.quantityReceived,
             item.batchNumber, item.lotNumber, item.manufactureDate, 
             item.expiryDate, poi.unit_cost]
          );
        }

        // Create inventory transaction
        await client.query(
          `INSERT INTO inventory_transactions (
            product_id, warehouse_id, transaction_type, reference_type, reference_id,
            quantity, unit_cost, batch_number, to_location_id, performed_by
           ) VALUES ($1, $2, 'receive', 'purchase_order', $3, $4, $5, $6, $7, $8)`,
          [poi.product_id, po.warehouse_id, po.id, item.quantityAccepted || item.quantityReceived,
           poi.unit_cost, item.batchNumber, item.locationId, req.user.id]
        );

        // Check if fully received
        const checkResult = await client.query(
          `SELECT quantity, received_quantity FROM purchase_order_items WHERE id = $1`,
          [poi.id]
        );
        if (checkResult.rows[0].received_quantity < checkResult.rows[0].quantity) {
          allReceived = false;
        }
      }

      // Update PO status
      const newStatus = allReceived ? 'received' : 'partial';
      await client.query(
        `UPDATE purchase_orders 
         SET status = $1, 
             ${allReceived ? 'received_date = CURRENT_DATE,' : ''}
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newStatus, id]
      );

      return { goodsReceipt: gr, allReceived };
    });

    await createAuditLog(req.user.id, 'RECEIVE', 'purchase_order', id, null, result, req);

    const io = req.app.get('io');
    io.emit('inventory:updated', { type: 'goods_received', poId: id });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
