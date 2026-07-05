const crypto = require('crypto');
const config = require('./config');

// --- Identifiers -----------------------------------------------------------

// Human-readable store slug, e.g. "amahoro-shop-4f9a"
function generateSlug(businessName) {
  const base = String(businessName || 'store')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'store';
  const suffix = crypto.randomBytes(2).toString('hex');
  return `${base}-${suffix}`;
}

// Raw management token given to the vendor once; only its hash is stored.
function generateManagementToken() {
  return crypto.randomBytes(24).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

// Short order reference, e.g. "KC-2026-3F7A9C"
function generateOrderRef() {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `KC-${year}-${rand}`;
}

// --- Validation (SRS FR-ON-2: plausible Rwandan formats) --------------------

// Accepts 07XXXXXXXX or 2507XXXXXXXX / +2507XXXXXXXX. Returns normalized
// international form (2507XXXXXXXX) or null if invalid.
function normalizeRwandaPhone(input) {
  const digits = String(input || '').replace(/[^\d]/g, '');
  if (/^07\d{8}$/.test(digits)) return `25${digits}`;
  if (/^2507\d{8}$/.test(digits)) return digits;
  return null;
}

function isValidMerchantCode(input) {
  const code = String(input || '').trim();
  return /^\d{4,10}$/.test(code);
}

// --- Payment / order string builders (SRS 3.5, 3.6) ------------------------

function buildUssdString(merchantCode, amount) {
  return config.momoUssdTemplate
    .replace('{code}', String(merchantCode))
    .replace('{amount}', String(Math.round(amount)));
}

// Builds a wa.me deep link with a pre-filled, URL-encoded order message.
function buildWhatsAppLink({ phone, storeName, items, total, orderRef }) {
  const lines = [];
  lines.push(`*${storeName}* order`);
  lines.push(`Ref: ${orderRef}`);
  lines.push('');
  items.forEach((it) => {
    lines.push(`• ${it.name} x${it.quantity} = ${it.subtotal} RWF`);
  });
  lines.push('');
  lines.push(`*Total: ${total} RWF*`);
  lines.push('');
  lines.push('Sent via KasiCart');
  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${phone}?text=${text}`;
}

module.exports = {
  generateSlug,
  generateManagementToken,
  hashToken,
  generateOrderRef,
  normalizeRwandaPhone,
  isValidMerchantCode,
  buildUssdString,
  buildWhatsAppLink,
};
