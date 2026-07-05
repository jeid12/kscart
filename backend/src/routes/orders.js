const express = require('express');
const db = require('../db/pool');
const { order } = require('../serializers');
const { requireVendor } = require('../middleware/auth');

const router = express.Router();

router.use(requireVendor);

const VALID_STATUSES = ['pending', 'paid', 'cancelled'];
const VALID_FULFILLMENT = ['new', 'preparing', 'ready', 'completed'];

// GET /api/orders?status=&q=&limit= — the vendor's order log (SRS 3.8, FR-LOG-1)
router.get('/', async (req, res, next) => {
  try {
    const params = [req.vendor.vendor_id];
    let sql = 'SELECT * FROM orders WHERE vendor_id = $1';

    if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      params.push(req.query.status);
      sql += ` AND status = $${params.length}`;
    }

    // Search by buyer name, buyer tag, payer name, or order ref.
    if (req.query.q && String(req.query.q).trim()) {
      params.push(`%${String(req.query.q).trim()}%`);
      const p = `$${params.length}`;
      sql += ` AND (buyer_name ILIKE ${p} OR buyer_tag ILIKE ${p} OR payer_name ILIKE ${p} OR order_ref ILIKE ${p})`;
    }

    sql += ' ORDER BY created_at DESC';

    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
    params.push(limit);
    sql += ` LIMIT $${params.length}`;

    const { rows } = await db.query(sql, params);
    return res.json({ orders: rows.map(order) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id — update payment status, fulfillment, and/or note.
// Any subset of fields can be sent (FR-LOG-2).
router.patch('/:id', async (req, res, next) => {
  try {
    const { status, fulfillment, note } = req.body || {};

    const sets = [];
    const params = [];

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid payment status.' });
      }
      params.push(status);
      sets.push(`status = $${params.length}`);
    }
    if (fulfillment !== undefined) {
      if (!VALID_FULFILLMENT.includes(fulfillment)) {
        return res.status(400).json({ error: 'Invalid fulfillment status.' });
      }
      params.push(fulfillment);
      sets.push(`fulfillment = $${params.length}`);
    }
    if (note !== undefined) {
      params.push(note ? String(note).trim().slice(0, 500) : null);
      sets.push(`note = $${params.length}`);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    params.push(req.params.id, req.vendor.vendor_id);
    const { rows } = await db.query(
      `UPDATE orders SET ${sets.join(', ')}
       WHERE order_id = $${params.length - 1} AND vendor_id = $${params.length}
       RETURNING *`,
      params
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    return res.json({ order: order(rows[0]) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
