const express = require('express');
const db = require('../db/pool');
const { category } = require('../serializers');
const { requireVendor } = require('../middleware/auth');

const router = express.Router();

router.use(requireVendor);

// GET /api/categories — the vendor's categories
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM categories WHERE vendor_id = $1 ORDER BY position ASC, created_at ASC',
      [req.vendor.vendor_id]
    );
    return res.json({ categories: rows.map(category) });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories — create a category
router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (name.length < 1) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const posResult = await db.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM categories WHERE vendor_id = $1',
      [req.vendor.vendor_id]
    );

    const { rows } = await db.query(
      `INSERT INTO categories (vendor_id, name, position)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.vendor.vendor_id, name, posResult.rows[0].next_pos]
    );
    return res.status(201).json({ category: category(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id — rename a category
router.put('/:id', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (name.length < 1) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const { rows } = await db.query(
      `UPDATE categories SET name = $1
       WHERE category_id = $2 AND vendor_id = $3 RETURNING *`,
      [name, req.params.id, req.vendor.vendor_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    return res.json({ category: category(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id — remove a category (items keep, become uncategorized)
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM categories WHERE category_id = $1 AND vendor_id = $2',
      [req.params.id, req.vendor.vendor_id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
