/**
 * Sensor Data page with charts and CSV export
 */
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Timeline as TimelineIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { sensorDataAPI, nodesAPI, iotGatewaysAPI, sitesAPI } from '../../services/api';
import websocketService from '../../services/websocket';

interface SensorData {
  id: number;
  node_id: number;
  node_name?: string;
  gateway_id: number;
  gateway_name?: string;
  site_id?: number;
  site_name?: string;
  adc_type: string;
  channel: number;
  raw_value: number;
  converted_value?: number;
  unit?: string;
  timestamp: string;
}

interface Node {
  id: number;
  node_id: string;
  name: string;
}

interface Gateway {
  id: number;
  gateway_id: string;
  name: string;
}

interface Site {
  id: number;
  name: string;
}

const SensorData: React.FC = () => {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [selectedSite, setSelectedSite] = useState<number | ''>('');
  const [selectedGateway, setSelectedGateway] = useState<number | ''>('');
  const [selectedNode, setSelectedNode] = useState<number | ''>('');
  const [selectedADCType, setSelectedADCType] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<number | ''>('');
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [limit, setLimit] = useState<number>(100);

  const fetchMetadata = async () => {
    try {
      const [nodesRes, gatewaysRes, sitesRes] = await Promise.all([
        nodesAPI.getAll(),
        iotGatewaysAPI.getAll(),
        sitesAPI.getAll(),
      ]);
      setNodes(nodesRes.data.nodes);
      setGateways(gatewaysRes.data.gateways);
      setSites(sitesRes.data.sites);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  const fetchSensorData = async () => {
    setLoading(true);
    try {
      const params: any = {
        limit,
        start_date: startDate,
        end_date: endDate,
      };
      
      if (selectedSite) params.site_id = selectedSite;
      if (selectedGateway) params.gateway_id = selectedGateway;
      if (selectedNode) params.node_id = selectedNode;
      if (selectedADCType) params.adc_type = selectedADCType;
      if (selectedChannel !== '') params.channel = selectedChannel;

      const response = await sensorDataAPI.getHistory(params);
      const data = response.data.sensor_data || [];
      setSensorData(data);
      
      // Prepare chart data
      const chartPoints = data.map((d: SensorData) => ({
        timestamp: new Date(d.timestamp).toLocaleTimeString('fr-FR'),
        value: d.converted_value || d.raw_value,
        node: d.node_name,
        channel: d.channel,
      }));
      setChartData(chartPoints);
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching sensor data:', error);
      setError('Erreur lors du chargement des données');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
    fetchSensorData();

    // Listen for real-time sensor data updates
    const handleSensorData = (data: any) => {
      console.log('New sensor data:', data);
      setSensorData(prev => [data, ...prev].slice(0, limit));
      
      setChartData(prev => {
        const newPoint = {
          timestamp: new Date(data.timestamp).toLocaleTimeString('fr-FR'),
          value: data.converted_value || data.raw_value,
          node: data.node_name,
          channel: data.channel,
        };
        return [...prev, newPoint].slice(-50); // Keep last 50 points for chart
      });
    };

    websocketService.on('sensor_data', handleSensorData);

    return () => {
      websocketService.off('sensor_data', handleSensorData);
    };
  }, []);

  const handleExportCSV = async () => {
    try {
      const params: any = {
        start_date: startDate,
        end_date: endDate,
      };
      
      if (selectedSite) params.site_id = selectedSite;
      if (selectedGateway) params.gateway_id = selectedGateway;
      if (selectedNode) params.node_id = selectedNode;
      if (selectedADCType) params.adc_type = selectedADCType;
      if (selectedChannel !== '') params.channel = selectedChannel;

      const response = await sensorDataAPI.exportCSV(params);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sensor_data_${startDate}_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSuccess('Export CSV réussi');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      setError('Erreur lors de l\'export CSV');
    }
  };

  const getUniqueChannels = () => {
    const channels = new Set<number>();
    sensorData.forEach(d => channels.add(d.channel));
    return Array.from(channels).sort((a, b) => a - b);
  };

  const getUniqueADCTypes = () => {
    const types = new Set<string>();
    sensorData.forEach(d => types.add(d.adc_type));
    return Array.from(types);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Données Capteurs
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchSensorData}
            sx={{ mr: 1 }}
          >
            Actualiser
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
          >
            Export CSV
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

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filtres</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Site</InputLabel>
                <Select
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value as number | '')}
                  label="Site"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {sites.map((site) => (
                    <MenuItem key={site.id} value={site.id}>{site.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Gateway</InputLabel>
                <Select
                  value={selectedGateway}
                  onChange={(e) => setSelectedGateway(e.target.value as number | '')}
                  label="Gateway"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {gateways.map((gw) => (
                    <MenuItem key={gw.id} value={gw.id}>{gw.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Node</InputLabel>
                <Select
                  value={selectedNode}
                  onChange={(e) => setSelectedNode(e.target.value as number | '')}
                  label="Node"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {nodes.map((node) => (
                    <MenuItem key={node.id} value={node.id}>{node.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Type ADC</InputLabel>
                <Select
                  value={selectedADCType}
                  onChange={(e) => setSelectedADCType(e.target.value)}
                  label="Type ADC"
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="ADS7128">ADS7128</MenuItem>
                  <MenuItem value="ADS1119_1">ADS1119_1</MenuItem>
                  <MenuItem value="ADS1119_2">ADS1119_2</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Canal</InputLabel>
                <Select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value as number | '')}
                  label="Canal"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((ch) => (
                    <MenuItem key={ch} value={ch}>CH{ch}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date début"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date fin"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Limite"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
                inputProps={{ min: 10, max: 10000 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={fetchSensorData}
                sx={{ height: '40px' }}
              >
                Appliquer
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Graphique Temps Réel</Typography>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="300px">
              <CircularProgress />
            </Box>
          ) : chartData.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="300px">
              <Typography color="textSecondary">Aucune donnée disponible</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#1976d2" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Données ({sensorData.length} enregistrements)
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Site</TableCell>
                  <TableCell>Gateway</TableCell>
                  <TableCell>Node</TableCell>
                  <TableCell>Type ADC</TableCell>
                  <TableCell>Canal</TableCell>
                  <TableCell align="right">Valeur Brute</TableCell>
                  <TableCell align="right">Valeur Convertie</TableCell>
                  <TableCell>Unité</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : sensorData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      Aucune donnée disponible
                    </TableCell>
                  </TableRow>
                ) : (
                  sensorData.map((data) => (
                    <TableRow key={data.id}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {new Date(data.timestamp).toLocaleString('fr-FR')}
                        </Typography>
                      </TableCell>
                      <TableCell>{data.site_name || '-'}</TableCell>
                      <TableCell>{data.gateway_name || '-'}</TableCell>
                      <TableCell>{data.node_name || '-'}</TableCell>
                      <TableCell>
                        <Chip label={data.adc_type} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={`CH${data.channel}`} size="small" color="primary" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontFamily="monospace">
                          {data.raw_value}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontFamily="monospace" fontWeight="bold">
                          {data.converted_value !== null && data.converted_value !== undefined
                            ? data.converted_value.toFixed(2)
                            : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{data.unit || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SensorData;
