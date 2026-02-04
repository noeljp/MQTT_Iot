/**
 * Alerts page
 */
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
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
import { Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { alertsAPI } from '../../services/api';
import { Alert } from '../../types';
import websocketService from '../../services/websocket';

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active');

  const fetchAlerts = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await alertsAPI.getAll(params);
      setAlerts(response.data.alerts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  useEffect(() => {
    const handleNewAlert = () => {
      fetchAlerts();
    };

    websocketService.on('alert:new', handleNewAlert);

    return () => {
      websocketService.off('alert:new', handleNewAlert);
    };
  }, [filter]);

  const handleAcknowledge = async (id: number) => {
    try {
      await alertsAPI.acknowledge(id);
      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await alertsAPI.resolve(id);
      fetchAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'error';
      case 'acknowledged':
        return 'warning';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
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
        Alerts
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={filter}
          onChange={(_, newValue) => setFilter(newValue)}
        >
          <Tab label="Active" value="active" />
          <Tab label="All Alerts" value="all" />
          <Tab label="Resolved" value="resolved" />
        </Tabs>
      </Box>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id} hover>
                    <TableCell>{alert.alert_type}</TableCell>
                    <TableCell>
                      <Chip
                        label={alert.severity}
                        size="small"
                        color={getSeverityColor(alert.severity)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={alert.status}
                        size="small"
                        color={getStatusColor(alert.status)}
                      />
                    </TableCell>
                    <TableCell>{alert.message}</TableCell>
                    <TableCell>
                      {new Date(alert.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {alert.status === 'active' && (
                        <>
                          <Button
                            size="small"
                            startIcon={<CheckIcon />}
                            onClick={() => handleAcknowledge(alert.id)}
                            sx={{ mr: 1 }}
                          >
                            Ack
                          </Button>
                          <Button
                            size="small"
                            startIcon={<CloseIcon />}
                            onClick={() => handleResolve(alert.id)}
                            color="success"
                          >
                            Resolve
                          </Button>
                        </>
                      )}
                      {alert.status === 'acknowledged' && (
                        <Button
                          size="small"
                          startIcon={<CloseIcon />}
                          onClick={() => handleResolve(alert.id)}
                          color="success"
                        >
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {alerts.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography color="textSecondary">
                No alerts found
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Alerts;
