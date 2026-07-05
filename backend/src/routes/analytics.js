const express = require('express');
const db = require('../db/pool');
const { requireVendor } = require('../middleware/auth');

const router = express.Router();

router.use(requireVendor);

// Kigali-local YYYY-MM-DD key for day bucketing.
function dayKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kigali',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// Short label like "Mon 5" for the trend chart.
function dayLabel(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Kigali',
    weekday: 'short',
    day: 'numeric',
  }).format(date);
}

// GET /api/analytics — vendor sales overview.
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM orders WHERE vendor_id = $1',
      [req.vendor.vendor_id]
    );

    const summary = {
      totalOrders: rows.length,
      paidOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
      paidRevenue: 0,
      pendingRevenue: 0,
    };

    const buyers = new Map(); // tag -> { tag, name, orders, spent }
    const itemsAgg = new Map(); // name -> { name, quantity, revenue }

    for (const o of rows) {
      if (o.status === 'paid') {
        summary.paidOrders += 1;
        summary.paidRevenue += o.total;
      } else if (o.status === 'pending') {
        summary.pendingOrders += 1;
        summary.pendingRevenue += o.total;
      } else if (o.status === 'cancelled') {
        summary.cancelledOrders += 1;
      }

      const tag = o.buyer_tag || 'unknown';
      const b = buyers.get(tag) || { tag, name: o.buyer_name, orders: 0, spent: 0 };
      b.orders += 1;
      if (o.status === 'paid') b.spent += o.total;
      b.name = o.buyer_name || b.name;
      buyers.set(tag, b);

      const lineItems = Array.isArray(o.items) ? o.items : [];
      for (const li of lineItems) {
        const a = itemsAgg.get(li.name) || { name: li.name, quantity: 0, revenue: 0 };
        a.quantity += Number(li.quantity) || 0;
        a.revenue += Number(li.subtotal) || 0;
        itemsAgg.set(li.name, a);
      }
    }

    summary.uniqueBuyers = buyers.size;
    summary.repeatBuyers = [...buyers.values()].filter((b) => b.orders > 1).length;

    // Last 7 days trend (including today), Kigali time.
    const trend = [];
    const byDay = new Map();
    for (const o of rows) {
      const key = dayKey(new Date(o.created_at));
      const d = byDay.get(key) || { orders: 0, revenue: 0 };
      d.orders += 1;
      if (o.status === 'paid') d.revenue += o.total;
      byDay.set(key, d);
    }
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(Date.now() - i * 86400000);
      const key = dayKey(date);
      const d = byDay.get(key) || { orders: 0, revenue: 0 };
      trend.push({ date: key, label: dayLabel(date), orders: d.orders, revenue: d.revenue });
    }

    const topItems = [...itemsAgg.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const topBuyers = [...buyers.values()]
      .sort((a, b) => b.spent - a.spent || b.orders - a.orders)
      .slice(0, 5);

    return res.json({ summary, trend, topItems, topBuyers });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
