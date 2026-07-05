const db = require('../db/pool');
const { verifyToken } = require('../lib/jwt');

// Protects vendor endpoints. The vendor presents a JWT (issued at login /
// registration) via the Authorization header. We verify it and load the vendor,
// so every request is scoped to that vendor only (multi-vendor isolation).
async function requireVendor(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (!token) {
      return res.status(401).json({ error: 'Please sign in.' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    const { rows } = await db.query(
      'SELECT * FROM vendors WHERE vendor_id = $1',
      [payload.sub]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Account not found.' });
    }

    req.vendor = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireVendor };
