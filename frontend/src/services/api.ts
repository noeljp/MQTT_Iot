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

// Sites
export const sitesAPI = {
  getAll: () => api.get('/sites'),
  getById: (id: number) => api.get(`/sites/${id}`),
  create: (data: any) => api.post('/sites', data),
  update: (id: number, data: any) => api.put(`/sites/${id}`, data),
  delete: (id: number) => api.delete(`/sites/${id}`),
  getGateways: (id: number) => api.get(`/sites/${id}/gateways`),
};

// IoT Gateways
export const iotGatewaysAPI = {
  getAll: (params?: { site_id?: number; status?: string }) =>
    api.get('/iot/gateways', { params }),
  getById: (id: number) => api.get(`/iot/gateways/${id}`),
  create: (data: any) => api.post('/iot/gateways', data),
  update: (id: number, data: any) => api.put(`/iot/gateways/${id}`, data),
  delete: (id: number) => api.delete(`/iot/gateways/${id}`),
  getStats: (id: number) => api.get(`/iot/gateways/${id}/stats`),
  sendCommand: (id: number, command: string, params?: any) =>
    api.post(`/iot/gateways/${id}/command`, { command, params }),
};

// Nodes
export const nodesAPI = {
  getAll: (params?: { gateway_id?: number; site_id?: number; status?: string }) =>
    api.get('/iot/nodes', { params }),
  getById: (id: number) => api.get(`/iot/nodes/${id}`),
  create: (data: any) => api.post('/iot/nodes', data),
  update: (id: number, data: any) => api.put(`/iot/nodes/${id}`, data),
  delete: (id: number) => api.delete(`/iot/nodes/${id}`),
  reassignGateway: (id: number, gateway_id: number) =>
    api.put(`/iot/nodes/${id}/gateway`, { gateway_id }),
  updateADCConfig: (id: number, config: any) =>
    api.put(`/iot/nodes/${id}/adc-config`, config),
  updateBluetoothConfig: (id: number, config: any) =>
    api.put(`/iot/nodes/${id}/bluetooth-config`, config),
  getSensorData: (id: number, params?: any) =>
    api.get(`/iot/nodes/${id}/sensor-data`, { params }),
  getQRCodes: (id: number, params?: any) =>
    api.get(`/iot/nodes/${id}/qr-codes`, { params }),
};

// Sensor Data
export const sensorDataAPI = {
  getLatest: (params?: any) => api.get('/sensor-data/latest', { params }),
  getHistory: (params?: any) => api.get('/sensor-data/history', { params }),
  exportCSV: (params?: any) =>
    api.get('/sensor-data/export', { params, responseType: 'blob' }),
  cleanup: () => api.post('/sensor-data/cleanup'),
};

export default api;
