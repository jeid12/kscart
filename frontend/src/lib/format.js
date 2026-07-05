// Formats a whole-RWF integer, e.g. 12500 -> "12,500 RWF"
export function formatRWF(amount) {
  const n = Math.round(Number(amount) || 0);
  return `${n.toLocaleString('en-US')} RWF`;
}
