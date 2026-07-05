const express = require('express');
const db = require('../db/pool');
const { item } = require('../serializers');
const { requireVendor } = require('../middleware/auth');

const router = express.Router();

// All item routes require the vendor's management token.
router.use(requireVendor);

function parsePrice(value) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// POST /api/items — add an item (SRS FR-CAT-1)
router.post('/', async (req, res, next) => {
  try {
    const { name, price, photoUrl, available } = req.body || {};
    if (!name || String(name).trim().length < 1) {
      return res.status(400).json({ error: 'Item name is required.' });
    }
    const parsedPrice = parsePrice(price);
    if (parsedPrice === null) {
      return res.status(400).json({ error: 'Price must be a non-negative whole number (RWF).' });
    }

    const posResult = await db.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM items WHERE vendor_id = $1',
      [req.vendor.vendor_id]
    );

    const { rows } = await db.query(
      `INSERT INTO items (vendor_id, name, price, photo_url, available, position)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.vendor.vendor_id,
        String(name).trim(),
        parsedPrice,
        photoUrl ? String(photoUrl).trim() : null,
        available === false ? false : true,
        posResult.rows[0].next_pos,
      ]
    );

    return res.status(201).json({ item: item(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/items/:id — edit / toggle availability (SRS FR-CAT-2, FR-CAT-3)
router.put('/:id', async (req, res, next) => {
  try {
    const { rows: existingRows } = await db.query(
      'SELECT * FROM items WHERE item_id = $1 AND vendor_id = $2',
      [req.params.id, req.vendor.vendor_id]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Item not found.' });
    }
    const current = existingRows[0];

    const name = req.body?.name !== undefined
      ? String(req.body.name).trim()
      : current.name;

    let price = current.price;
    if (req.body?.price !== undefined) {
      const parsedPrice = parsePrice(req.body.price);
      if (parsedPrice === null) {
        return res.status(400).json({ error: 'Price must be a non-negative whole number (RWF).' });
      }
      price = parsedPrice;
    }

    const photoUrl = req.body?.photoUrl !== undefined
      ? (req.body.photoUrl ? String(req.body.photoUrl).trim() : null)
      : current.photo_url;

    const available = req.body?.available !== undefined
      ? Boolean(req.body.available)
      : current.available;

    const { rows } = await db.query(
      `UPDATE items
         SET name = $1, price = $2, photo_url = $3, available = $4
       WHERE item_id = $5 AND vendor_id = $6
       RETURNING *`,
      [name, price, photoUrl, available, req.params.id, req.vendor.vendor_id]
    );

    return res.json({ item: item(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/items/:id — remove an item (SRS FR-CAT-2)
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM items WHERE item_id = $1 AND vendor_id = $2',
      [req.params.id, req.vendor.vendor_id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Item not found.' });
    }
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
