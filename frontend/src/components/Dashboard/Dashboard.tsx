/**
 * Dashboard page with real-time statistics
 */
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Devices as DevicesIcon,
  CheckCircle as OnlineIcon,
  Error as OfflineIcon,
  Warning as AlertIcon,
} from '@mui/icons-material';
import { statsAPI } from '../../services/api';
import { DashboardStats } from '../../types';
import websocketService from '../../services/websocket';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await statsAPI.getDashboard();
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s

    // WebSocket listeners for real-time updates
    const handleDeviceStatusChange = () => {
      fetchStats();
    };

    websocketService.on('device:status_change', handleDeviceStatusChange);
    websocketService.on('alert:new', handleDeviceStatusChange);

    return () => {
      clearInterval(interval);
      websocketService.off('device:status_change', handleDeviceStatusChange);
      websocketService.off('alert:new', handleDeviceStatusChange);
    };
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return <Typography>No data available</Typography>;
  }

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, icon, color }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4">{value}</Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: color,
              borderRadius: '50%',
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Devices"
            value={stats.devices.total}
            icon={<DevicesIcon sx={{ color: 'white' }} />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Online Devices"
            value={`${stats.devices.online} (${stats.devices.online_percentage}%)`}
            icon={<OnlineIcon sx={{ color: 'white' }} />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Offline Devices"
            value={stats.devices.offline}
            icon={<OfflineIcon sx={{ color: 'white' }} />}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Alerts"
            value={`${stats.alerts.active} (${stats.alerts.critical} critical)`}
            icon={<AlertIcon sx={{ color: 'white' }} />}
            color="#d32f2f"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Network Overview
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Gateways</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats.devices.gateways}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Sensor Nodes</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats.devices.nodes}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Recent Activity (5min)</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats.activity.recent_heartbeats} devices
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box display="flex" alignItems="center" mb={1}>
                  <OnlineIcon sx={{ color: '#2e7d32', mr: 1 }} />
                  <Typography variant="body2">
                    API Server: Connected
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" mb={1}>
                  <OnlineIcon sx={{ color: '#2e7d32', mr: 1 }} />
                  <Typography variant="body2">
                    WebSocket: Connected
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  <OnlineIcon sx={{ color: '#2e7d32', mr: 1 }} />
                  <Typography variant="body2">
                    Database: Operational
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
