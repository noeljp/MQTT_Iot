/**
 * IoT Gateways page with real-time updates
 */
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import {
  Router as RouterIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  PowerSettingsNew as PowerIcon,
} from '@mui/icons-material';
import { iotGatewaysAPI, sitesAPI } from '../../services/api';
import websocketService from '../../services/websocket';

interface Gateway {
  id: number;
  gateway_id: string;
  name: string;
  site_id: number;
  site_name?: string;
  status: string;
  ip_address?: string;
  mac_address?: string;
  firmware_version?: string;
  mqtt_topic_prefix: string;
  last_seen?: string;
  is_active: boolean;
  created_at?: string;
}

interface Site {
  id: number;
  name: string;
  location: string;
}

interface GatewayStats {
  total_nodes: number;
  active_nodes: number;
  inactive_nodes: number;
  status_distribution: { [key: string]: number };
}

const Gateways: React.FC = () => {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingGateway, setEditingGateway] = useState<Gateway | null>(null);
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<{ [key: number]: GatewayStats }>({});
  
  const [formData, setFormData] = useState({
    gateway_id: '',
    name: '',
    site_id: '',
    ip_address: '',
    mac_address: '',
    firmware_version: '',
    mqtt_topic_prefix: 'apru40/gateway',
  });

  const fetchSites = async () => {
    try {
      const response = await sitesAPI.getAll();
      setSites(response.data.sites);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const fetchGateways = async () => {
    try {
      const params = selectedSiteFilter ? { site_id: selectedSiteFilter as number } : {};
      const response = await iotGatewaysAPI.getAll(params);
      setGateways(response.data.gateways);
      
      // Fetch stats for each gateway
      response.data.gateways.forEach(async (gw: Gateway) => {
        try {
          const statsResponse = await iotGatewaysAPI.getStats(gw.id);
          setStats(prev => ({ ...prev, [gw.id]: statsResponse.data }));
        } catch (err) {
          console.error(`Error fetching stats for gateway ${gw.id}:`, err);
        }
      });
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching gateways:', error);
      setError('Erreur lors du chargement des gateways');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
    fetchGateways();

    // Listen for real-time gateway status updates
    const handleGatewayStatus = (data: any) => {
      console.log('Gateway status update:', data);
      setGateways(prev => 
        prev.map(gw => 
          gw.gateway_id === data.gateway_id 
            ? { ...gw, status: data.status, last_seen: data.timestamp }
            : gw
        )
      );
    };

    websocketService.on('gateway_status', handleGatewayStatus);

    return () => {
      websocketService.off('gateway_status', handleGatewayStatus);
    };
  }, [selectedSiteFilter]);

  const handleOpenDialog = (gateway?: Gateway) => {
    if (gateway) {
      setEditingGateway(gateway);
      setFormData({
        gateway_id: gateway.gateway_id,
        name: gateway.name,
        site_id: gateway.site_id.toString(),
        ip_address: gateway.ip_address || '',
        mac_address: gateway.mac_address || '',
        firmware_version: gateway.firmware_version || '',
        mqtt_topic_prefix: gateway.mqtt_topic_prefix,
      });
    } else {
      setEditingGateway(null);
      setFormData({
        gateway_id: '',
        name: '',
        site_id: '',
        ip_address: '',
        mac_address: '',
        firmware_version: '',
        mqtt_topic_prefix: 'apru40/gateway',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingGateway(null);
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingGateway) {
        await iotGatewaysAPI.update(editingGateway.id, formData);
        setSuccess('Gateway mis à jour avec succès');
      } else {
        await iotGatewaysAPI.create(formData);
        setSuccess('Gateway créé avec succès');
      }
      handleCloseDialog();
      fetchGateways();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce gateway ?')) {
      try {
        await iotGatewaysAPI.delete(id);
        setSuccess('Gateway supprimé avec succès');
        fetchGateways();
        setTimeout(() => setSuccess(null), 3000);
      } catch (error: any) {
        setError(error.response?.data?.error || 'Erreur lors de la suppression');
      }
    }
  };

  const handleSendCommand = async (gatewayId: number, command: string) => {
    try {
      await iotGatewaysAPI.sendCommand(gatewayId, command);
      setSuccess(`Commande '${command}' envoyée avec succès`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erreur lors de l\'envoi de la commande');
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <RouterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          IoT Gateways
        </Typography>
        <Box>
          <FormControl sx={{ mr: 2, minWidth: 200 }} size="small">
            <InputLabel>Filtrer par site</InputLabel>
            <Select
              value={selectedSiteFilter}
              onChange={(e) => setSelectedSiteFilter(e.target.value as number | '')}
              label="Filtrer par site"
            >
              <MenuItem value="">Tous les sites</MenuItem>
              {sites.map((site) => (
                <MenuItem key={site.id} value={site.id}>
                  {site.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nouveau Gateway
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {gateways.map((gateway) => {
          const gatewayStats = stats[gateway.id];
          return (
            <Grid item xs={12} md={6} lg={4} key={gateway.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box display="flex" alignItems="center">
                      <RouterIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">{gateway.name}</Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleOpenDialog(gateway)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(gateway.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Box mb={2}>
                    <Chip
                      label={gateway.status}
                      size="small"
                      color={gateway.status === 'online' ? 'success' : gateway.status === 'offline' ? 'error' : 'warning'}
                    />
                    <Chip
                      label={gateway.site_name || 'No Site'}
                      size="small"
                      sx={{ ml: 1 }}
                      variant="outlined"
                    />
                  </Box>

                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    <strong>ID:</strong> {gateway.gateway_id}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    <strong>IP:</strong> {gateway.ip_address || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    <strong>MAC:</strong> {gateway.mac_address || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    <strong>Firmware:</strong> {gateway.firmware_version || 'N/A'}
                  </Typography>
                  {gateway.last_seen && (
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      <strong>Vu:</strong> {new Date(gateway.last_seen).toLocaleString('fr-FR')}
                    </Typography>
                  )}

                  {gatewayStats && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>Statistiques Nodes</Typography>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">Total:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {gatewayStats.total_nodes}
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">Actifs:</Typography>
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            {gatewayStats.active_nodes}
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">Inactifs:</Typography>
                          <Typography variant="body2" fontWeight="bold" color="error.main">
                            {gatewayStats.inactive_nodes}
                          </Typography>
                        </Box>
                      </Box>
                    </>
                  )}

                  <Divider sx={{ my: 2 }} />
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={() => handleSendCommand(gateway.id, 'restart')}
                    >
                      Restart
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PowerIcon />}
                      onClick={() => handleSendCommand(gateway.id, 'status')}
                    >
                      Status
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {gateways.length === 0 && (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <Typography color="textSecondary">
                Aucun gateway trouvé
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingGateway ? 'Modifier le Gateway' : 'Nouveau Gateway'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Gateway ID"
              value={formData.gateway_id}
              onChange={(e) => setFormData({ ...formData, gateway_id: e.target.value })}
              margin="normal"
              required
              disabled={!!editingGateway}
            />
            <TextField
              fullWidth
              label="Nom"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Site</InputLabel>
              <Select
                value={formData.site_id}
                onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                label="Site"
              >
                {sites.map((site) => (
                  <MenuItem key={site.id} value={site.id}>
                    {site.name} - {site.location}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Adresse IP"
              value={formData.ip_address}
              onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Adresse MAC"
              value={formData.mac_address}
              onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Version Firmware"
              value={formData.firmware_version}
              onChange={(e) => setFormData({ ...formData, firmware_version: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="MQTT Topic Prefix"
              value={formData.mqtt_topic_prefix}
              onChange={(e) => setFormData({ ...formData, mqtt_topic_prefix: e.target.value })}
              margin="normal"
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.gateway_id || !formData.name || !formData.site_id}
          >
            {editingGateway ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Gateways;


