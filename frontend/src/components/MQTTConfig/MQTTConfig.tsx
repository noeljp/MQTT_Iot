/**
 * MQTT Configuration and Management Component
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

interface MQTTUser {
  username: string;
  permissions: Permission[];
}

interface Permission {
  access: 'read' | 'write' | 'readwrite';
  topic: string;
}

interface BrokerStatus {
  status: string;
  running: boolean;
  details: string;
}

const MQTTConfig: React.FC = () => {
  const [users, setUsers] = useState<MQTTUser[]>([]);
  const [brokerStatus, setBrokerStatus] = useState<BrokerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [openAddUser, setOpenAddUser] = useState(false);
  const [openEditPermissions, setOpenEditPermissions] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MQTTUser | null>(null);
  
  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  useEffect(() => {
    fetchUsers();
    fetchBrokerStatus();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/mqtt/users`, axiosConfig);
      setUsers(response.data.users);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    }
  };

  const fetchBrokerStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/mqtt/status`, axiosConfig);
      setBrokerStatus(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch broker status');
    }
  };

  const handleAddUser = async () => {
    if (!newUsername || !newPassword) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await axios.post(
        `${API_BASE_URL}/mqtt/users`,
        {
          username: newUsername,
          password: newPassword,
          permissions: permissions,
        },
        axiosConfig
      );
      setSuccess('User created successfully');
      setOpenAddUser(false);
      setNewUsername('');
      setNewPassword('');
      setPermissions([]);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!window.confirm(`Delete user ${username}?`)) return;

    setLoading(true);
    setError('');
    try {
      await axios.delete(`${API_BASE_URL}/mqtt/users/${username}`, axiosConfig);
      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;

    setLoading(true);
    setError('');
    try {
      await axios.put(
        `${API_BASE_URL}/mqtt/users/${selectedUser.username}/permissions`,
        { permissions },
        axiosConfig
      );
      setSuccess('Permissions updated successfully');
      setOpenEditPermissions(false);
      setSelectedUser(null);
      setPermissions([]);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleRestartBroker = async () => {
    if (!window.confirm('Restart MQTT broker?')) return;

    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_BASE_URL}/mqtt/restart`, {}, axiosConfig);
      setSuccess('Broker restarted successfully');
      setTimeout(fetchBrokerStatus, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to restart broker');
    } finally {
      setLoading(false);
    }
  };

  const addPermission = () => {
    setPermissions([...permissions, { access: 'readwrite', topic: '' }]);
  };

  const updatePermission = (index: number, field: keyof Permission, value: string) => {
    const updated = [...permissions];
    updated[index] = { ...updated[index], [field]: value };
    setPermissions(updated);
  };

  const removePermission = (index: number) => {
    setPermissions(permissions.filter((_, i) => i !== index));
  };

  const openEditDialog = (user: MQTTUser) => {
    setSelectedUser(user);
    setPermissions(user.permissions);
    setOpenEditPermissions(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        MQTT Broker Configuration
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Broker Status */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Broker Status
              </Typography>
              {brokerStatus && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Chip
                      icon={brokerStatus.running ? <CheckIcon /> : <StopIcon />}
                      label={brokerStatus.status}
                      color={brokerStatus.running ? 'success' : 'error'}
                    />
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={fetchBrokerStatus}
                    fullWidth
                    sx={{ mb: 1 }}
                  >
                    Refresh Status
                  </Button>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<StartIcon />}
                    onClick={handleRestartBroker}
                    fullWidth
                    disabled={loading}
                  >
                    Restart Broker
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* User Management */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">MQTT Users</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenAddUser(true)}
                >
                  Add User
                </Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Username</TableCell>
                      <TableCell>Permissions</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.username}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          {user.permissions.length > 0 ? (
                            <Box>
                              {user.permissions.slice(0, 2).map((perm, idx) => (
                                <Chip
                                  key={idx}
                                  label={`${perm.access}: ${perm.topic}`}
                                  size="small"
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                />
                              ))}
                              {user.permissions.length > 2 && (
                                <Chip
                                  label={`+${user.permissions.length - 2} more`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              No permissions
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(user)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteUser(user.username)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add User Dialog */}
      <Dialog open={openAddUser} onClose={() => setOpenAddUser(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add MQTT User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
          />

          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Permissions
            <Button size="small" startIcon={<AddIcon />} onClick={addPermission} sx={{ ml: 2 }}>
              Add Permission
            </Button>
          </Typography>

          <List>
            {permissions.map((perm, idx) => (
              <ListItem key={idx}>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Access</InputLabel>
                      <Select
                        value={perm.access}
                        onChange={(e) => updatePermission(idx, 'access', e.target.value)}
                        label="Access"
                      >
                        <MenuItem value="read">Read</MenuItem>
                        <MenuItem value="write">Write</MenuItem>
                        <MenuItem value="readwrite">Read/Write</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={7}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Topic"
                      value={perm.topic}
                      onChange={(e) => updatePermission(idx, 'topic', e.target.value)}
                      placeholder="apru40/#"
                    />
                  </Grid>
                  <Grid item xs={1}>
                    <IconButton onClick={() => removePermission(idx)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddUser(false)}>Cancel</Button>
          <Button onClick={handleAddUser} variant="contained" disabled={loading}>
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog
        open={openEditPermissions}
        onClose={() => setOpenEditPermissions(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Edit Permissions - {selectedUser?.username}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Modify the permissions for this user. Use # for multi-level wildcards and + for single-level wildcards.
          </Typography>

          <Button size="small" startIcon={<AddIcon />} onClick={addPermission} sx={{ mb: 2 }}>
            Add Permission
          </Button>

          <List>
            {permissions.map((perm, idx) => (
              <ListItem key={idx}>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Access</InputLabel>
                      <Select
                        value={perm.access}
                        onChange={(e) => updatePermission(idx, 'access', e.target.value)}
                        label="Access"
                      >
                        <MenuItem value="read">Read</MenuItem>
                        <MenuItem value="write">Write</MenuItem>
                        <MenuItem value="readwrite">Read/Write</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={7}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Topic"
                      value={perm.topic}
                      onChange={(e) => updatePermission(idx, 'topic', e.target.value)}
                      placeholder="apru40/#"
                    />
                  </Grid>
                  <Grid item xs={1}>
                    <IconButton onClick={() => removePermission(idx)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditPermissions(false)}>Cancel</Button>
          <Button onClick={handleUpdatePermissions} variant="contained" disabled={loading}>
            Update Permissions
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MQTTConfig;
