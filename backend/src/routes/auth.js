const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/pool');
const {
  generateSlug,
  normalizeRwandaPhone,
  isValidMerchantCode,
} = require('../utils');
const { managementVendor } = require('../serializers');
const { signVendorToken } = require('../lib/jwt');
const { requireVendor } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register — create a vendor account (SRS FR-ON-1)
router.post('/register', async (req, res, next) => {
  try {
    const { businessName, phoneNumber, momoMerchantCode, password, language } =
      req.body || {};

    if (!businessName || String(businessName).trim().length < 2) {
      return res.status(400).json({ error: 'Business name is required.' });
    }
    const phone = normalizeRwandaPhone(phoneNumber);
    if (!phone) {
      return res.status(400).json({
        error: 'Enter a valid Rwandan phone number (e.g. 0788123456).',
      });
    }
    if (!isValidMerchantCode(momoMerchantCode)) {
      return res.status(400).json({
        error: 'Enter a valid MoMo merchant code (4–10 digits).',
      });
    }
    if (!password || String(password).length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters.' });
    }

    // One account per phone number.
    const existing = await db.query(
      'SELECT 1 FROM vendors WHERE phone_number = $1',
      [phone]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'An account with this phone number already exists. Please sign in.',
      });
    }

    // Unique slug (retry on the rare collision).
    let slug = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateSlug(businessName);
      const clash = await db.query(
        'SELECT 1 FROM vendors WHERE store_slug = $1',
        [candidate]
      );
      if (clash.rows.length === 0) {
        slug = candidate;
        break;
      }
    }
    if (!slug) {
      return res.status(500).json({ error: 'Could not generate a store link.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const { rows } = await db.query(
      `INSERT INTO vendors
         (business_name, phone_number, momo_merchant_code, store_slug, password_hash, language)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        String(businessName).trim(),
        phone,
        String(momoMerchantCode).trim(),
        slug,
        passwordHash,
        language === 'rw' ? 'rw' : 'en',
      ]
    );

    const vendor = rows[0];
    const token = signVendorToken(vendor.vendor_id);
    return res.status(201).json({
      token,
      vendor: managementVendor(vendor),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login — phone + password (SRS NFR-SEC-1)
router.post('/login', async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body || {};
    const phone = normalizeRwandaPhone(phoneNumber);
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone number and password are required.' });
    }

    const { rows } = await db.query(
      'SELECT * FROM vendors WHERE phone_number = $1',
      [phone]
    );
    const vendor = rows[0];

    // Same generic error whether the phone or password is wrong.
    const ok =
      vendor &&
      vendor.password_hash &&
      (await bcrypt.compare(String(password), vendor.password_hash));

    if (!ok) {
      return res.status(401).json({ error: 'Invalid phone number or password.' });
    }

    const token = signVendorToken(vendor.vendor_id);
    return res.json({ token, vendor: managementVendor(vendor) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — current signed-in vendor
router.get('/me', requireVendor, (req, res) => {
  return res.json({ vendor: managementVendor(req.vendor) });
});

module.exports = router;
