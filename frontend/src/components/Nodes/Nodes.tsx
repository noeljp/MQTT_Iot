/**
 * Nodes management page
 */
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Memory as MemoryIcon,
  Bluetooth as BluetoothIcon,
  SwapHoriz as SwapIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { nodesAPI, iotGatewaysAPI, sitesAPI } from '../../services/api';

interface Node {
  id: number;
  node_id: string;
  name: string;
  gateway_id: number;
  gateway_name?: string;
  site_id?: number;
  site_name?: string;
  node_type: string;
  status: string;
  mac_address?: string;
  firmware_version?: string;
  adc_config: any;
  bluetooth_config: any;
  last_seen?: string;
  is_active: boolean;
}

interface Gateway {
  id: number;
  gateway_id: string;
  name: string;
  site_id: number;
  site_name?: string;
}

interface Site {
  id: number;
  name: string;
  location: string;
}

const Nodes: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openADCDialog, setOpenADCDialog] = useState(false);
  const [openBluetoothDialog, setOpenBluetoothDialog] = useState(false);
  const [openReassignDialog, setOpenReassignDialog] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<number | ''>('');
  const [selectedGatewayFilter, setSelectedGatewayFilter] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    node_id: '',
    name: '',
    gateway_id: '',
    node_type: 'sensor',
    mac_address: '',
    firmware_version: '',
  });

  const [adcConfig, setAdcConfig] = useState({
    adc_type: 'ADS7128',
    enabled_channels: [] as number[],
    sample_rate: 1000,
    conversion_enabled: true,
    sensor_types: {} as { [key: string]: string },
    calibration: {} as { [key: string]: { offset: number; scale: number } },
  });

  const [bluetoothConfig, setBluetoothConfig] = useState({
    enabled: false,
    scanner_mac: '',
    scan_interval: 5,
    rssi_threshold: -70,
  });

  const [reassignGatewayId, setReassignGatewayId] = useState<number | ''>('');

  const fetchData = async () => {
    try {
      const [nodesRes, gatewaysRes, sitesRes] = await Promise.all([
        nodesAPI.getAll({ 
          site_id: selectedSiteFilter ? selectedSiteFilter as number : undefined,
          gateway_id: selectedGatewayFilter ? selectedGatewayFilter as number : undefined,
        }),
        iotGatewaysAPI.getAll(),
        sitesAPI.getAll(),
      ]);
      
      setNodes(nodesRes.data.nodes);
      setGateways(gatewaysRes.data.gateways);
      setSites(sitesRes.data.sites);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('Erreur lors du chargement des données');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSiteFilter, selectedGatewayFilter]);

  const handleOpenDialog = (node?: Node) => {
    if (node) {
      setEditingNode(node);
      setFormData({
        node_id: node.node_id,
        name: node.name,
        gateway_id: node.gateway_id.toString(),
        node_type: node.node_type,
        mac_address: node.mac_address || '',
        firmware_version: node.firmware_version || '',
      });
    } else {
      setEditingNode(null);
      setFormData({
        node_id: '',
        name: '',
        gateway_id: '',
        node_type: 'sensor',
        mac_address: '',
        firmware_version: '',
      });
    }
    setOpenDialog(true);
  };

  const handleOpenADCDialog = (node: Node) => {
    setSelectedNode(node);
    setAdcConfig(node.adc_config || {
      adc_type: 'ADS7128',
      enabled_channels: [],
      sample_rate: 1000,
      conversion_enabled: true,
      sensor_types: {},
      calibration: {},
    });
    setOpenADCDialog(true);
  };

  const handleOpenBluetoothDialog = (node: Node) => {
    setSelectedNode(node);
    setBluetoothConfig(node.bluetooth_config || {
      enabled: false,
      scanner_mac: '',
      scan_interval: 5,
      rssi_threshold: -70,
    });
    setOpenBluetoothDialog(true);
  };

  const handleOpenReassignDialog = (node: Node) => {
    setSelectedNode(node);
    setReassignGatewayId(node.gateway_id);
    setOpenReassignDialog(true);
  };

  const handleCloseDialogs = () => {
    setOpenDialog(false);
    setOpenADCDialog(false);
    setOpenBluetoothDialog(false);
    setOpenReassignDialog(false);
    setEditingNode(null);
    setSelectedNode(null);
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingNode) {
        await nodesAPI.update(editingNode.id, formData);
        setSuccess('Node mis à jour avec succès');
      } else {
        await nodesAPI.create(formData);
        setSuccess('Node créé avec succès');
      }
      handleCloseDialogs();
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erreur lors de la sauvegarde');
    }
  };

  const handleUpdateADC = async () => {
    if (!selectedNode) return;
    try {
      await nodesAPI.updateADCConfig(selectedNode.id, adcConfig);
      setSuccess('Configuration ADC mise à jour avec succès');
      handleCloseDialogs();
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleUpdateBluetooth = async () => {
    if (!selectedNode) return;
    try {
      await nodesAPI.updateBluetoothConfig(selectedNode.id, bluetoothConfig);
      setSuccess('Configuration Bluetooth mise à jour avec succès');
      handleCloseDialogs();
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleReassignGateway = async () => {
    if (!selectedNode || !reassignGatewayId) return;
    try {
      await nodesAPI.reassignGateway(selectedNode.id, reassignGatewayId as number);
      setSuccess('Node réassigné avec succès');
      handleCloseDialogs();
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erreur lors de la réassignation');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce node ?')) {
      try {
        await nodesAPI.delete(id);
        setSuccess('Node supprimé avec succès');
        fetchData();
        setTimeout(() => setSuccess(null), 3000);
      } catch (error: any) {
        setError(error.response?.data?.error || 'Erreur lors de la suppression');
      }
    }
  };

  const toggleChannel = (channel: number) => {
    setAdcConfig(prev => ({
      ...prev,
      enabled_channels: prev.enabled_channels.includes(channel)
        ? prev.enabled_channels.filter(c => c !== channel)
        : [...prev.enabled_channels, channel],
    }));
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
          <MemoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Nodes IoT
        </Typography>
        <Box>
          <FormControl sx={{ mr: 1, minWidth: 150 }} size="small">
            <InputLabel>Site</InputLabel>
            <Select
              value={selectedSiteFilter}
              onChange={(e) => setSelectedSiteFilter(e.target.value as number | '')}
              label="Site"
            >
              <MenuItem value="">Tous</MenuItem>
              {sites.map((site) => (
                <MenuItem key={site.id} value={site.id}>{site.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ mr: 2, minWidth: 150 }} size="small">
            <InputLabel>Gateway</InputLabel>
            <Select
              value={selectedGatewayFilter}
              onChange={(e) => setSelectedGatewayFilter(e.target.value as number | '')}
              label="Gateway"
            >
              <MenuItem value="">Tous</MenuItem>
              {gateways.map((gw) => (
                <MenuItem key={gw.id} value={gw.id}>{gw.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nouveau Node
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

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Node ID</TableCell>
                  <TableCell>Gateway</TableCell>
                  <TableCell>Site</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>ADC</TableCell>
                  <TableCell>Bluetooth</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Dernière activité</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      Aucun node disponible
                    </TableCell>
                  </TableRow>
                ) : (
                  nodes.map((node) => (
                    <TableRow key={node.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {node.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {node.node_id}
                        </Typography>
                      </TableCell>
                      <TableCell>{node.gateway_name || 'N/A'}</TableCell>
                      <TableCell>{node.site_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip label={node.node_type} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={node.adc_config?.adc_type || 'N/A'} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<BluetoothIcon />}
                          label={node.bluetooth_config?.enabled ? 'On' : 'Off'}
                          size="small"
                          color={node.bluetooth_config?.enabled ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={node.status}
                          size="small"
                          color={node.status === 'active' ? 'success' : node.status === 'inactive' ? 'error' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {node.last_seen 
                            ? new Date(node.last_seen).toLocaleString('fr-FR')
                            : 'Jamais'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenDialog(node)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleOpenADCDialog(node)}>
                          <SettingsIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleOpenBluetoothDialog(node)}>
                          <BluetoothIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleOpenReassignDialog(node)}>
                          <SwapIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(node.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add/Edit Node Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingNode ? 'Modifier le Node' : 'Nouveau Node'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Node ID"
              value={formData.node_id}
              onChange={(e) => setFormData({ ...formData, node_id: e.target.value })}
              margin="normal"
              required
              disabled={!!editingNode}
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
              <InputLabel>Gateway</InputLabel>
              <Select
                value={formData.gateway_id}
                onChange={(e) => setFormData({ ...formData, gateway_id: e.target.value })}
                label="Gateway"
              >
                {gateways.map((gw) => (
                  <MenuItem key={gw.id} value={gw.id}>
                    {gw.name} - {gw.site_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Type de Node</InputLabel>
              <Select
                value={formData.node_type}
                onChange={(e) => setFormData({ ...formData, node_type: e.target.value })}
                label="Type de Node"
              >
                <MenuItem value="sensor">Sensor</MenuItem>
                <MenuItem value="actuator">Actuator</MenuItem>
                <MenuItem value="hybrid">Hybrid</MenuItem>
              </Select>
            </FormControl>
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.node_id || !formData.name || !formData.gateway_id}
          >
            {editingNode ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ADC Configuration Dialog */}
      <Dialog open={openADCDialog} onClose={handleCloseDialogs} maxWidth="md" fullWidth>
        <DialogTitle>Configuration ADC - {selectedNode?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Type ADC</InputLabel>
              <Select
                value={adcConfig.adc_type}
                onChange={(e) => setAdcConfig({ ...adcConfig, adc_type: e.target.value })}
                label="Type ADC"
              >
                <MenuItem value="ADS7128">ADS7128 (8 channels)</MenuItem>
                <MenuItem value="ADS1119_1">ADS1119_1 (4 channels)</MenuItem>
                <MenuItem value="ADS1119_2">ADS1119_2 (4 channels)</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Taux d'échantillonnage (Hz)"
              type="number"
              value={adcConfig.sample_rate}
              onChange={(e) => setAdcConfig({ ...adcConfig, sample_rate: parseInt(e.target.value) })}
              margin="normal"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={adcConfig.conversion_enabled}
                  onChange={(e) => setAdcConfig({ ...adcConfig, conversion_enabled: e.target.checked })}
                />
              }
              label="Conversion activée"
            />

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>Canaux activés</Typography>
            <Grid container spacing={1}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((channel) => (
                <Grid item xs={3} key={channel}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={adcConfig.enabled_channels.includes(channel)}
                        onChange={() => toggleChannel(channel)}
                      />
                    }
                    label={`CH${channel}`}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Annuler</Button>
          <Button onClick={handleUpdateADC} variant="contained">
            Mettre à jour
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bluetooth Configuration Dialog */}
      <Dialog open={openBluetoothDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>
          <BluetoothIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Configuration Bluetooth - {selectedNode?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={bluetoothConfig.enabled}
                  onChange={(e) => setBluetoothConfig({ ...bluetoothConfig, enabled: e.target.checked })}
                />
              }
              label="Bluetooth activé"
            />
            
            <TextField
              fullWidth
              label="Adresse MAC Scanner (Zebra DS2278)"
              value={bluetoothConfig.scanner_mac}
              onChange={(e) => setBluetoothConfig({ ...bluetoothConfig, scanner_mac: e.target.value })}
              margin="normal"
              disabled={!bluetoothConfig.enabled}
            />

            <TextField
              fullWidth
              label="Intervalle de scan (secondes)"
              type="number"
              value={bluetoothConfig.scan_interval}
              onChange={(e) => setBluetoothConfig({ ...bluetoothConfig, scan_interval: parseInt(e.target.value) })}
              margin="normal"
              disabled={!bluetoothConfig.enabled}
            />

            <TextField
              fullWidth
              label="Seuil RSSI (dBm)"
              type="number"
              value={bluetoothConfig.rssi_threshold}
              onChange={(e) => setBluetoothConfig({ ...bluetoothConfig, rssi_threshold: parseInt(e.target.value) })}
              margin="normal"
              disabled={!bluetoothConfig.enabled}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Annuler</Button>
          <Button onClick={handleUpdateBluetooth} variant="contained">
            Mettre à jour
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reassign Gateway Dialog */}
      <Dialog open={openReassignDialog} onClose={handleCloseDialogs} maxWidth="xs" fullWidth>
        <DialogTitle>
          <SwapIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Réassigner Gateway - {selectedNode?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Nouveau Gateway</InputLabel>
              <Select
                value={reassignGatewayId}
                onChange={(e) => setReassignGatewayId(e.target.value as number)}
                label="Nouveau Gateway"
              >
                {gateways.map((gw) => (
                  <MenuItem key={gw.id} value={gw.id}>
                    {gw.name} - {gw.site_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Annuler</Button>
          <Button onClick={handleReassignGateway} variant="contained" disabled={!reassignGatewayId}>
            Réassigner
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Nodes;
