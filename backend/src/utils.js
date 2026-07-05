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

// Short per-buyer tag, e.g. "B-4487". Normally supplied by the client (stored in
// the browser); generated here as a fallback when missing.
function generateBuyerId() {
  return `B-${Math.floor(1000 + Math.random() * 9000)}`;
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

// --- Formatting helpers ----------------------------------------------------

// 18000 -> "18,000"
function formatNumber(n) {
  return Math.round(Number(n) || 0).toLocaleString('en-US');
}

// Kigali-local date/time, e.g. { date: "Jul 5, 2026", time: "14:32" }
function kigaliDateTime(when = new Date()) {
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Kigali',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(when);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Kigali',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(when);
  return { date, time };
}

// --- Payment / order string builders (SRS 3.5, 3.6) ------------------------

function buildUssdString(merchantCode, amount) {
  return config.momoUssdTemplate
    .replace('{code}', String(merchantCode))
    .replace('{amount}', String(Math.round(amount)));
}

// Builds a wa.me deep link with a pre-filled, URL-encoded order message.
// The message is vendor-friendly: it surfaces the buyer ID, location, MoMo payer
// name, and timestamp so the vendor can match an incoming MoMo payment to the
// right order at a glance.
function buildWhatsAppLink({ phone, storeName, items, total, orderRef, buyer, date, time }) {
  const lines = [];
  lines.push(`🛒 *New Order – ${storeName}*`);
  lines.push(`📌 Ref: ${orderRef}   🕒 ${date}, ${time}`);
  lines.push('');
  lines.push('*Buyer*');
  lines.push(`Name: ${buyer.name}`);
  lines.push(`Buyer ID: ${buyer.id}`);
  lines.push(`Location: ${buyer.location}`);
  lines.push('');
  lines.push('*Items*');
  items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.name} x${it.quantity} — ${formatNumber(it.subtotal)} RWF`);
  });
  lines.push('');
  lines.push(`*Total: ${formatNumber(total)} RWF*`);
  lines.push('');
  lines.push(`💰 Paying via MoMo as: *${buyer.payerName}*`);
  lines.push(
    "(Check for this name on your MoMo screen when the payment lands — it may differ from the buyer's name above.)"
  );
  lines.push('');
  lines.push(
    `Please confirm once you receive payment. Thank you for shopping with ${storeName}! 🙏`
  );
  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${phone}?text=${text}`;
}

module.exports = {
  generateSlug,
  generateManagementToken,
  hashToken,
  generateOrderRef,
  generateBuyerId,
  normalizeRwandaPhone,
  isValidMerchantCode,
  formatNumber,
  kigaliDateTime,
  buildUssdString,
  buildWhatsAppLink,
};
