const express = require('express');
const db = require('../db/pool');
const { order } = require('../serializers');
const { requireVendor } = require('../middleware/auth');

const router = express.Router();

router.use(requireVendor);

const VALID_STATUSES = ['pending', 'paid', 'cancelled'];

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

// PATCH /api/orders/:id — update status (Paid / Pending / Cancelled) (FR-LOG-2)
router.patch('/:id', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const { rows } = await db.query(
      `UPDATE orders SET status = $1
       WHERE order_id = $2 AND vendor_id = $3
       RETURNING *`,
      [status, req.params.id, req.vendor.vendor_id]
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
