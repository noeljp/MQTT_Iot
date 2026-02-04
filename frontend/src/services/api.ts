/**
 * API service for backend communication
 */
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Authentication
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  getProfile: () => api.get('/auth/profile'),
  refreshToken: () => api.post('/auth/refresh'),
};

// Devices
export const devicesAPI = {
  getAll: (params?: { type?: string; status?: string }) =>
    api.get('/devices', { params }),
  getById: (id: number) => api.get(`/devices/${id}`),
  create: (data: any) => api.post('/devices', data),
  update: (id: number, data: any) => api.put(`/devices/${id}`, data),
  delete: (id: number) => api.delete(`/devices/${id}`),
  getSensors: (id: number) => api.get(`/devices/${id}/sensors`),
};

// Gateways
export const gatewaysAPI = {
  getAll: () => api.get('/gateways'),
  getNodes: (id: number) => api.get(`/gateways/${id}/nodes`),
};

// Alerts
export const alertsAPI = {
  getAll: (params?: { status?: string; severity?: string }) =>
    api.get('/alerts', { params }),
  getById: (id: number) => api.get(`/alerts/${id}`),
  acknowledge: (id: number) => api.post(`/alerts/${id}/acknowledge`),
  resolve: (id: number) => api.post(`/alerts/${id}/resolve`),
};

// Statistics
export const statsAPI = {
  getDashboard: () => api.get('/stats/dashboard'),
  getNetwork: () => api.get('/stats/network'),
};

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
