/**
 * Gateways page
 */
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Typography,
} from '@mui/material';
import { Router as RouterIcon } from '@mui/icons-material';
import { gatewaysAPI } from '../../services/api';

interface Gateway {
  id: number;
  device_id: string;
  name: string;
  status: string;
  mac_address?: string;
  firmware_version?: string;
  node_count: number;
  online_nodes: number;
}

const Gateways: React.FC = () => {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGateways = async () => {
    try {
      const response = await gatewaysAPI.getAll();
      setGateways(response.data.gateways);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching gateways:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGateways();
  }, []);

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
        Gateways
      </Typography>

      <Grid container spacing={3}>
        {gateways.map((gateway) => (
          <Grid item xs={12} md={6} lg={4} key={gateway.id}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <RouterIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">{gateway.name}</Typography>
                </Box>

                <Box mb={2}>
                  <Chip
                    label={gateway.status}
                    size="small"
                    color={gateway.status === 'online' ? 'success' : 'error'}
                  />
                </Box>

                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Device ID: {gateway.device_id}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  MAC: {gateway.mac_address || 'N/A'}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Firmware: {gateway.firmware_version || 'N/A'}
                </Typography>

                <Box
                  sx={{
                    mt: 2,
                    pt: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Connected Nodes</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {gateway.node_count}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Online Nodes</Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      {gateway.online_nodes}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {gateways.length === 0 && (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <Typography color="textSecondary">
                No gateways found
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Gateways;
