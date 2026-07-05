import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status}).`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  me: () => request('/api/auth/me', { auth: true }),

  // Vendor dashboard
  getMyStore: () => request('/api/vendors/me', { auth: true }),
  updateMyStore: (payload) =>
    request('/api/vendors/me', { method: 'PUT', body: payload, auth: true }),

  // Items
  addItem: (payload) => request('/api/items', { method: 'POST', body: payload, auth: true }),
  updateItem: (id, payload) =>
    request(`/api/items/${id}`, { method: 'PUT', body: payload, auth: true }),
  deleteItem: (id) => request(`/api/items/${id}`, { method: 'DELETE', auth: true }),

  // Image upload (multipart)
  uploadImage: async (file) => {
    const form = new FormData();
    form.append('image', file);
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/api/uploads`, {
      method: 'POST',
      headers,
      body: form,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      // ignore
    }
    if (!res.ok) {
      throw new Error((data && data.error) || 'Upload failed.');
    }
    return data; // { url, publicId }
  },

  // Public storefront
  getStore: (slug) => request(`/api/stores/${slug}`),
  checkout: (slug, payload) =>
    request(`/api/stores/${slug}/checkout`, { method: 'POST', body: payload }),
};

export { API_URL };
