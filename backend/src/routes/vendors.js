const express = require('express');
const db = require('../db/pool');
const { normalizeRwandaPhone, isValidMerchantCode } = require('../utils');
const { managementVendor, item } = require('../serializers');
const { requireVendor } = require('../middleware/auth');

const router = express.Router();

// GET /api/vendors/me — vendor dashboard data (vendor + all items)
router.get('/me', requireVendor, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM items WHERE vendor_id = $1 ORDER BY position ASC, created_at ASC',
      [req.vendor.vendor_id]
    );
    return res.json({
      vendor: managementVendor(req.vendor),
      items: rows.map(item),
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/vendors/me — update store details
router.put('/me', requireVendor, async (req, res, next) => {
  try {
    const current = req.vendor;
    const businessName = req.body?.businessName ?? current.business_name;

    let phone = current.phone_number;
    if (req.body?.phoneNumber !== undefined) {
      const normalized = normalizeRwandaPhone(req.body.phoneNumber);
      if (!normalized) {
        return res.status(400).json({ error: 'Invalid Rwandan phone number.' });
      }
      // Guard against colliding with another vendor's phone.
      if (normalized !== current.phone_number) {
        const clash = await db.query(
          'SELECT 1 FROM vendors WHERE phone_number = $1 AND vendor_id <> $2',
          [normalized, current.vendor_id]
        );
        if (clash.rows.length > 0) {
          return res.status(409).json({ error: 'That phone number is already in use.' });
        }
      }
      phone = normalized;
    }

    let merchantCode = current.momo_merchant_code;
    if (req.body?.momoMerchantCode !== undefined) {
      if (!isValidMerchantCode(req.body.momoMerchantCode)) {
        return res.status(400).json({ error: 'Invalid MoMo merchant code.' });
      }
      merchantCode = String(req.body.momoMerchantCode).trim();
    }

    const language =
      req.body?.language === 'rw'
        ? 'rw'
        : req.body?.language === 'en'
        ? 'en'
        : current.language;

    const { rows } = await db.query(
      `UPDATE vendors
         SET business_name = $1, phone_number = $2, momo_merchant_code = $3, language = $4
       WHERE vendor_id = $5
       RETURNING *`,
      [String(businessName).trim(), phone, merchantCode, language, current.vendor_id]
    );

    return res.json({ vendor: managementVendor(rows[0]) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
