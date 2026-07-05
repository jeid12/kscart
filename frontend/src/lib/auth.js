const TOKEN_KEY = 'kasicart_token';
const VENDOR_KEY = 'kasicart_vendor';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getVendor() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem(VENDOR_KEY));
  } catch {
    return null;
  }
}

export function saveSession(token, vendor) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(VENDOR_KEY, JSON.stringify(vendor));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(VENDOR_KEY);
}
