// Desarrollo local: backend Java en 8081. Producción/cPanel: VITE_API_BASE=/api/v1
const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8081/api/v1';
const AUTH_KEY = 'entrelazados_auth';

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let err: ApiError;
    try {
      err = JSON.parse(text) as ApiError;
    } catch {
      err = { timestamp: '', status: res.status, error: 'Error', message: text || res.statusText, path: '' };
    }
    throw new Error(err.message || err.error || 'Error');
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function authHeader(): Record<string, string> {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { token?: string | null };
    if (parsed?.token) return { Authorization: `Bearer ${parsed.token}` };
    return {};
  } catch {
    return {};
  }
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>): Promise<T> => {
    const url = new URL(BASE + path);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return fetch(url.toString(), { headers: { ...authHeader() } }).then(handleResponse<T>);
  },
  post: <T>(path: string, body?: unknown): Promise<T> =>
    fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: body ? JSON.stringify(body) : undefined,
    }).then(handleResponse<T>),
  put: <T>(path: string, body: unknown): Promise<T> =>
    fetch(BASE + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(body),
    }).then(handleResponse<T>),
  patch: <T>(path: string, body: unknown): Promise<T> =>
    fetch(BASE + path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(body),
    }).then(handleResponse<T>),
  delete: (path: string): Promise<void> =>
    fetch(BASE + path, { method: 'DELETE', headers: { ...authHeader() } }).then(async (r) => {
      if (!r.ok) {
        const text = await r.text();
        let err: ApiError;
        try { err = JSON.parse(text) as ApiError; } catch { err = { timestamp: '', status: r.status, error: 'Error', message: text, path: '' }; }
        throw new Error(err.message || 'Error');
      }
    }),
};
