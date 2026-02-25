import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('satya_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('satya_token');
      localStorage.removeItem('satya_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// Tenants API
export const tenantsAPI = {
  list: () => api.get('/tenants'),
  get: (id) => api.get(`/tenants/${id}`),
  create: (data) => api.post('/tenants', data),
};

// Users API
export const usersAPI = {
  list: () => api.get('/users'),
  toggleStatus: (id, isActive) => api.put(`/users/${id}/status?is_active=${isActive}`),
};

// Providers API
export const providersAPI = {
  list: (params = {}) => api.get('/providers', { params }),
  get: (id) => api.get(`/providers/${id}`),
  create: (data) => api.post('/providers', data),
  updateEligibility: (id, isEligible) => api.put(`/providers/${id}/eligibility?is_eligible=${isEligible}`),
};

// Authorizations API
export const authorizationsAPI = {
  list: (params = {}) => api.get('/authorizations', { params }),
  get: (id) => api.get(`/authorizations/${id}`),
  create: (data) => api.post('/authorizations', data),
};

// Claims API
export const claimsAPI = {
  list: (params = {}) => api.get('/claims', { params }),
  create: (data) => api.post('/claims', data),
};

// Recommendations API
export const recommendationsAPI = {
  list: (params = {}) => api.get('/recommendations', { params }),
  get: (id) => api.get(`/recommendations/${id}`),
  generate: (authorizationId) => api.post('/recommendations', { authorization_id: authorizationId }),
  selectProvider: (recId, providerId, reason) => 
    api.post(`/recommendations/${recId}/select?provider_id=${providerId}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`),
};

// Config API
export const configAPI = {
  get: () => api.get('/config'),
  update: (data) => api.put('/config', data),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Import API
export const importAPI = {
  providers: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/providers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  claims: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/claims', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Audit Logs API
export const auditAPI = {
  list: (params = {}) => api.get('/audit-logs', { params }),
};

export default api;
