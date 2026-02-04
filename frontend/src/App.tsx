/**
 * Main application component with routing
 */
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './components/Dashboard/Dashboard';
import Devices from './components/Devices/Devices';
import Gateways from './components/Gateways/Gateways';
import Alerts from './components/Alerts/Alerts';
import Login from './components/Login';
import websocketService from './services/websocket';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  useEffect(() => {
    // Connect to WebSocket on app load
    const token = localStorage.getItem('token');
    if (token) {
      websocketService.connect();
    }

    return () => {
      websocketService.disconnect();
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/devices"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Devices />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/gateways"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Gateways />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Alerts />
                </MainLayout>
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
