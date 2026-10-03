/**
 * Unified API Client for Frontend
 * Supports JSON, multipart/form-data, and extracts semantic server error messages
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is FormData (multipart/form-data), let the browser set Content-Type with boundary
  if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.method && options.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.message || `Ошибка сервера (${response.status})`;
      const errorDetails = data?.error?.details || null;
      const errorObj = new Error(errorMessage);
      errorObj.status = response.status;
      errorObj.code = data?.error?.code || 'API_ERROR';
      errorObj.details = errorDetails;
      throw errorObj;
    }

    return data;
  } catch (error) {
    console.error(`API Request to ${endpoint} failed:`, error);
    throw error;
  }
}
