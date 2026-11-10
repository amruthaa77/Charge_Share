import axios from 'axios';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    const trimmed = envUrl.replace(/\/+$/, '');
    return trimmed.includes('/api') ? trimmed : `${trimmed}/api/v1`;
  }
  return '/api/v1';
};

const apiBaseURL = getBaseURL();

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to add token (skip for public auth endpoints)
api.interceptors.request.use(
  (config) => {
    if (config.url && (config.url.includes('/auth/login') || config.url.includes('/auth/register'))) {
      delete config.headers.Authorization;
      return config;
    }
    const token = localStorage.getItem('cs_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      // Don't auto-redirect if we're just checking token on app load
    }
    return Promise.reject(error);
  }
);

// Dedicated Admin API instance with its own isolated admin_session token
export const adminApi = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

adminApi.interceptors.request.use(
  (config) => {
    // If endpoint is admin login, do not attach Authorization or X-Admin-Token headers
    if (config.url && config.url.includes('/admin/auth/login')) {
      delete config.headers.Authorization;
      delete config.headers['X-Admin-Token'];
      return config;
    }
    const adminToken = localStorage.getItem('cs_admin_token');
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
      config.headers['X-Admin-Token'] = adminToken;
    } else {
      const userToken = localStorage.getItem('cs_token');
      if (userToken) {
        config.headers.Authorization = `Bearer ${userToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth Services
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  logoutAllDevices: () => api.post('/auth/logout-all'),
  deleteAccount: (data) => api.post('/auth/delete-account', data),
};

// Admin Back-Office Auth Services (Uses isolated admin session)
export const adminAuthAPI = {
  login: (data) => adminApi.post('/admin/auth/login', data),
  logout: () => adminApi.post('/admin/auth/logout'),
  changePassword: (data) => adminApi.put('/admin/password', data),
  rotatePassword: (data) => adminApi.post('/admin/rotate-password', data),
  getMe: () => adminApi.get('/auth/me'),
};

// Vehicle Services
export const vehicleAPI = {
  getMyVehicles: () => api.get('/vehicles'),
  create: (data) => api.post('/vehicles', data),
  getOne: (id) => api.get(`/vehicles/${id}`),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  delete: (id) => api.delete(`/vehicles/${id}`),
};

// Charger Services
export const chargerAPI = {
  search: (params) => api.get('/chargers', { params }),
  getOne: (id) => api.get(`/chargers/${id}`),
  getLiveStatus: (id) => api.get(`/chargers/${id}/live-status`),
  getEmergencyAlternatives: (params) => api.get('/chargers/emergency-alternatives', { params }),
  getMyListings: () => api.get('/chargers/my/listings'),
  create: (data) => api.post('/chargers', data),
  update: (id, data) => api.put(`/chargers/${id}`, data),
  delete: (id) => api.delete(`/chargers/${id}`),
  pause: (id) => api.patch(`/chargers/${id}/pause`),
  getAvailability: (id, date) => api.get(`/chargers/${id}/availability`, { params: { date } }),
};

// Booking Services
export const bookingAPI = {
  createHold: (data) => api.post('/bookings', data),
  confirm: (data) => api.post('/bookings/confirm', data),
  getMyBookings: (params) => api.get('/bookings', { params }),
  getOne: (id) => api.get(`/bookings/${id}`),
  cancel: (id, data) => api.post(`/bookings/${id}/cancel`, data),
  hostAction: (id, data) => api.post(`/bookings/${id}/action`, data),
};

// Payment Services
export const paymentAPI = {
  createOrder: (bookingId) => api.post('/payments/create-order', { bookingId }),
  verify: (data) => api.post('/payments/verify', data),
  mockPay: (bookingId) => api.post('/payments/mock-pay', { bookingId }),
};

// Review Services
export const reviewAPI = {
  create: (data) => api.post('/reviews', data),
  getChargerReviews: (chargerId) => api.get(`/reviews/charger/${chargerId}`),
};

// Verification Services
export const verificationAPI = {
  submit: (data) => api.post('/verifications', data),
  getMyStatus: (chargerId) => api.get(`/verifications/my/${chargerId}`),
  adminGetPending: (params) => api.get('/verifications/pending', { params }),
  adminReview: (id, data) => api.post(`/verifications/${id}/review`, data),
};

// Admin Services (Uses dedicated adminApi with admin_session token)
export const adminAPI = {
  getStats: () => adminApi.get('/admin/stats'),
  listChargers: (params) => adminApi.get('/admin/chargers', { params }),
  toggleChargerSuspend: (id, data) => adminApi.patch(`/admin/chargers/${id}/suspend`, data),
  listUsers: (params) => adminApi.get('/admin/users', { params }),
  getUserDetail: (id) => adminApi.get(`/admin/users/${id}`),
  updateUserTrust: (id, data) => adminApi.patch(`/admin/users/${id}/trust`, data),
  addUserNote: (id, note) => adminApi.post(`/admin/users/${id}/notes`, { note }),
  exportUsersCSV: () => adminApi.get('/admin/users/export/csv', { responseType: 'blob' }),
  listBookings: (params) => adminApi.get('/admin/bookings', { params }),
  getBookingDetail: (id) => adminApi.get(`/admin/bookings/${id}`),
  listPayments: (params) => adminApi.get('/admin/payments', { params }),
  listReports: (params) => adminApi.get('/admin/reports', { params }),
  resolveReport: (id, data) => adminApi.patch(`/admin/reports/${id}`, data),
  listContactMessages: (params) => adminApi.get('/admin/contact', { params }),
  updateContactStatus: (id, data) => adminApi.patch(`/admin/contact/${id}`, data),
  getAuditLogs: (params) => adminApi.get('/admin/audit', { params }),
  createAdmin: (data) => adminApi.post('/admin/admins', data),
  changeForcedPassword: (data) => adminApi.put('/admin/password', data),
  rotatePassword: (data) => adminApi.post('/admin/rotate-password', data),
  getDocumentSignedUrl: (filename) => adminApi.get(`/documents/signed-url/${filename}`),
  getHostStats: () => (localStorage.getItem('cs_token') ? api : adminApi).get('/admin/host-stats'),
};

// Notification Services
export const notificationAPI = {
  getMyNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

// Upload Service
export const uploadAPI = {
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export { api };
export default api;
