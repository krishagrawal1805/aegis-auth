const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Native fetch wrapper for the Aegis backend.
 * Automatically attaches the HttpOnly cookie via `credentials: 'include'`.
 */
const apiFetch = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;

  const workspaceCode = localStorage.getItem('workspaceCode');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(workspaceCode ? { 'X-Workspace-Code': workspaceCode } : {}),
      ...options.headers,
    },
    credentials: 'include', // CRITICAL: Ensures HttpOnly cookies are sent
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    // Do not throw on 401/403, let the components handle unauthenticated states gracefully
    if (!response.ok && response.status !== 401) {
      console.warn(`[API Warning] ${response.status} on ${endpoint}:`, data.error);
    }

    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    console.error(`[API Network Error] on ${endpoint}:`, error);
    return {
      status: 500,
      ok: false,
      data: { success: false, error: 'Network connection failed' },
    };
  }
};

export const api = {
  get: (endpoint) => apiFetch(endpoint, { method: 'GET' }),
  post: (endpoint, body) => apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) }),
};

export default api;
