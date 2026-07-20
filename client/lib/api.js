const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('acra_token');
}

export function setSession(token, user) {
  localStorage.setItem('acra_token', token);
  localStorage.setItem('acra_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('acra_token');
  localStorage.removeItem('acra_user');
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('acra_user')); } catch { return null; }
}

export async function api(path, { method = 'GET', body, formData } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      clearSession();
      window.location.href = '/login';
    }
    throw new Error(data?.error?.message || `Request failed (${res.status})`);
  }
  return data;
}
