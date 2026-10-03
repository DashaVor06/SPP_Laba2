import { apiRequest } from './client.js';

export const authApi = {
  login: (email, password) => apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),

  register: (userData) => apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  me: () => apiRequest('/api/auth/me'),

  listUsers: () => apiRequest('/api/auth/users'),

  recoverPassword: (email) => apiRequest('/api/auth/recover-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
};
