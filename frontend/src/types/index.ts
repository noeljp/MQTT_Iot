/**
 * TypeScript type definitions
 */

export interface Device {
  id: number;
  device_id: string;
  name: string;
  type: 'node' | 'gateway';
  mac_address?: string;
  gateway_id?: number;
  status: 'online' | 'offline' | 'error';
  firmware_version?: string;
  last_seen?: string;
  created_at: string;
  updated_at: string;
}

export interface Sensor {
  id: number;
  device_id: number;
  sensor_type: string;
  value: number;
  unit: string;
  timestamp: string;
}

export interface Alert {
  id: number;
  device_id?: number;
  alert_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
  resolved_at?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
}

export interface DashboardStats {
  devices: {
    total: number;
    online: number;
    offline: number;
    gateways: number;
    nodes: number;
    online_percentage: number;
  };
  alerts: {
    active: number;
    critical: number;
  };
  activity: {
    recent_heartbeats: number;
  };
}
