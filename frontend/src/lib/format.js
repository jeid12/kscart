// Formats a whole-RWF integer, e.g. 12500 -> "12,500 RWF"
export function formatRWF(amount) {
  const n = Math.round(Number(amount) || 0);
  return `${n.toLocaleString('en-US')} RWF`;
}

// ISO string -> "Jul 5, 2026, 14:32" in Kigali time.
export function formatDateTime(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Kigali',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return '';
  }
}
