const express = require('express');
const db = require('../db/pool');
const { publicVendor, item } = require('../serializers');
const {
  generateOrderRef,
  generateBuyerId,
  kigaliDateTime,
  buildUssdString,
  buildWhatsAppLink,
} = require('../utils');

const router = express.Router();

async function findVendorBySlug(slug) {
  const { rows } = await db.query(
    'SELECT * FROM vendors WHERE store_slug = $1',
    [slug]
  );
  return rows[0] || null;
}

// GET /api/stores/:slug — public storefront (SRS FR-STORE-1: no login)
router.get('/:slug', async (req, res, next) => {
  try {
    const vendor = await findVendorBySlug(req.params.slug);
    if (!vendor) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    // Only available items are shown publicly (SRS FR-STORE-4).
    const { rows } = await db.query(
      `SELECT * FROM items
       WHERE vendor_id = $1 AND available = TRUE
       ORDER BY position ASC, created_at ASC`,
      [vendor.vendor_id]
    );

    return res.json({
      vendor: publicVendor(vendor),
      items: rows.map(item),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/stores/:slug/checkout — build WhatsApp + MoMo hand-off strings
// (SRS 3.5 & 3.6). KasiCart does NOT process payment; it only assembles the
// correct instructions and returns them for the customer to act on.
router.post('/:slug/checkout', async (req, res, next) => {
  try {
    const vendor = await findVendorBySlug(req.params.slug);
    if (!vendor) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const cart = Array.isArray(req.body?.items) ? req.body.items : [];
    if (cart.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    // Buyer details (help the vendor match the order to an incoming payment).
    const buyerName = String(req.body?.buyerName || '').trim();
    const buyerLocation = String(req.body?.buyerLocation || '').trim();
    let payerName = String(req.body?.payerName || '').trim();
    const buyerId = String(req.body?.buyerId || '').trim() || generateBuyerId();

    if (buyerName.length < 2) {
      return res.status(400).json({ error: 'Please enter your name.' });
    }
    if (buyerLocation.length < 2) {
      return res.status(400).json({ error: 'Please enter your location.' });
    }
    // The MoMo payer name defaults to the buyer name when left blank.
    if (!payerName) payerName = buyerName;

    // Re-price against the database so totals cannot be tampered with client-side.
    const ids = cart.map((c) => c.itemId);
    const { rows } = await db.query(
      `SELECT * FROM items
       WHERE vendor_id = $1 AND available = TRUE AND item_id = ANY($2::uuid[])`,
      [vendor.vendor_id, ids]
    );
    const priceMap = new Map(rows.map((r) => [r.item_id, r]));

    const lineItems = [];
    let total = 0;
    for (const entry of cart) {
      const record = priceMap.get(entry.itemId);
      const qty = Math.max(0, Math.floor(Number(entry.quantity) || 0));
      if (!record || qty <= 0) continue;
      const subtotal = record.price * qty;
      total += subtotal;
      lineItems.push({
        itemId: record.item_id,
        name: record.name,
        quantity: qty,
        price: record.price,
        subtotal,
      });
    }

    if (lineItems.length === 0) {
      return res.status(400).json({ error: 'No valid items in cart.' });
    }

    const orderRef = generateOrderRef();
    const { date, time } = kigaliDateTime();
    const buyer = { name: buyerName, id: buyerId, location: buyerLocation, payerName };

    const whatsappUrl = buildWhatsAppLink({
      phone: vendor.phone_number,
      storeName: vendor.business_name,
      items: lineItems,
      total,
      orderRef,
      buyer,
      date,
      time,
    });

    const ussdString = buildUssdString(vendor.momo_merchant_code, total);
    // tel: link with USSD requires encoding the '#' as %23 (SRS FR-USSD-2).
    const ussdTelLink = `tel:${encodeURIComponent(ussdString)}`;

    return res.json({
      orderRef,
      items: lineItems,
      total,
      buyer,
      date,
      time,
      whatsappUrl,
      momo: {
        ussdString,
        ussdTelLink,
        merchantCode: vendor.momo_merchant_code,
        amount: total,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
