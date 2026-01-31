import express from 'express';
import { query } from '../database/db.js';
import { createAuditLog } from '../utils/auditLog.js';

const router = express.Router();

// Get all categories
router.get('/', async (req, res, next) => {
  try {
    const { includeInactive } = req.query;

    let whereClause = '';
    if (!includeInactive) {
      whereClause = 'WHERE c.is_active = true';
    }

    const result = await query(
      `SELECT c.*, p.name as parent_name,
              COUNT(pr.id) as product_count
       FROM categories c
       LEFT JOIN categories p ON c.parent_id = p.id
       LEFT JOIN products pr ON c.id = pr.category_id AND pr.is_active = true
       ${whereClause}
       GROUP BY c.id, p.name
       ORDER BY c.name`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get category tree (hierarchical)
router.get('/tree', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM categories WHERE is_active = true ORDER BY name`
    );

    // Build tree structure
    const categories = result.rows;
    const categoryMap = new Map();
    const tree = [];

    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach(cat => {
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children.push(categoryMap.get(cat.id));
        }
      } else {
        tree.push(categoryMap.get(cat.id));
      }
    });

    res.json(tree);
  } catch (error) {
    next(error);
  }
});

// Get single category
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT c.*, p.name as parent_name
       FROM categories c
       LEFT JOIN categories p ON c.parent_id = p.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create category
router.post('/', async (req, res, next) => {
  try {
    const { name, description, parentId, imageUrl } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await query(
      `INSERT INTO categories (name, description, parent_id, image_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, parentId, imageUrl]
    );

    await createAuditLog(req.user.id, 'CREATE', 'category', result.rows[0].id, null, result.rows[0], req);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update category
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, parentId, imageUrl, isActive } = req.body;

    const existingCategory = await query('SELECT * FROM categories WHERE id = $1', [id]);
    if (existingCategory.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Prevent setting parent to self or child
    if (parentId === id) {
      return res.status(400).json({ error: 'Category cannot be its own parent' });
    }

    const result = await query(
      `UPDATE categories SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        parent_id = $3,
        image_url = COALESCE($4, image_url),
        is_active = COALESCE($5, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *`,
      [name, description, parentId, imageUrl, isActive, id]
    );

    await createAuditLog(req.user.id, 'UPDATE', 'category', id, existingCategory.rows[0], result.rows[0], req);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete category
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check for products in category
    const productCheck = await query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1 AND is_active = true',
      [id]
    );

    if (parseInt(productCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with active products' 
      });
    }

    // Check for child categories
    const childCheck = await query(
      'SELECT COUNT(*) FROM categories WHERE parent_id = $1 AND is_active = true',
      [id]
    );

    if (parseInt(childCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with child categories' 
      });
    }

    const result = await query(
      `UPDATE categories SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await createAuditLog(req.user.id, 'DELETE', 'category', id, null, null, req);

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
