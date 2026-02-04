/**
 * Devices page with list and details
 */
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import { devicesAPI } from '../../services/api';
import { Device } from '../../types';
import websocketService from '../../services/websocket';

const Devices: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'gateway' | 'node'>('all');

  const fetchDevices = async () => {
    try {
      const params = filter !== 'all' ? { type: filter } : {};
      const response = await devicesAPI.getAll(params);
      setDevices(response.data.devices);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching devices:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [filter]);

  useEffect(() => {
    const handleStatusChange = (data: any) => {
      setDevices((prev) =>
        prev.map((device) =>
          device.device_id === data.device_id
            ? { ...device, status: data.status }
            : device
        )
      );
    };

    websocketService.on('device:status_change', handleStatusChange);

    return () => {
      websocketService.off('device:status_change', handleStatusChange);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTypeChipColor = (type: string) => {
    return type === 'gateway' ? 'primary' : 'secondary';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Devices
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={filter}
          onChange={(_, newValue) => setFilter(newValue)}
        >
          <Tab label="All Devices" value="all" />
          <Tab label="Gateways" value="gateway" />
          <Tab label="Nodes" value="node" />
        </Tabs>
      </Box>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Device ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>MAC Address</TableCell>
                  <TableCell>Firmware</TableCell>
                  <TableCell>Last Seen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id} hover>
                    <TableCell>{device.device_id}</TableCell>
                    <TableCell>{device.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={device.type}
                        size="small"
                        color={getTypeChipColor(device.type)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={device.status}
                        size="small"
                        color={getStatusColor(device.status)}
                      />
                    </TableCell>
                    <TableCell>{device.mac_address || 'N/A'}</TableCell>
                    <TableCell>{device.firmware_version || 'N/A'}</TableCell>
                    <TableCell>
                      {device.last_seen
                        ? new Date(device.last_seen).toLocaleString()
                        : 'Never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {devices.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography color="textSecondary">
                No devices found
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Devices;
