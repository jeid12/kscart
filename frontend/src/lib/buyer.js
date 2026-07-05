// Buyer identity + profile, stored in the browser so a customer needs no login.

const ID_KEY = 'kasicart_buyer_id';
const PROFILE_KEY = 'kasicart_buyer_profile';

// A short, stable per-browser tag (e.g. "B-4487") so a vendor can tell repeat
// buyers apart. Generated once on first checkout and reused after.
export function getBuyerId() {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(ID_KEY);
  if (!id) {
    id = `B-${Math.floor(1000 + Math.random() * 9000)}`;
    window.localStorage.setItem(ID_KEY, id);
  }
  return id;
}

// Remembers name / location / MoMo name so returning buyers don't retype them.
export function getBuyerProfile() {
  if (typeof window === 'undefined') return { buyerName: '', buyerLocation: '', payerName: '' };
  try {
    const saved = JSON.parse(window.localStorage.getItem(PROFILE_KEY));
    return {
      buyerName: saved?.buyerName || '',
      buyerLocation: saved?.buyerLocation || '',
      payerName: saved?.payerName || '',
    };
  } catch {
    return { buyerName: '', buyerLocation: '', payerName: '' };
  }
}

export function saveBuyerProfile(profile) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
