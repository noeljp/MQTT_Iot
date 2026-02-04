# APRU40 IoT Management Platform

A complete web application for managing the APRU40 IoT network with React frontend and Python backend.

## Project Overview

This project implements a centralized management platform for the APRU40 industrial IoT network, featuring:

- **Real-time monitoring** of 150+ IoT devices (ESP32 nodes and gateways)
- **Device management** with configuration and status tracking
- **Security alerts** for tamper detection and unauthorized access
- **WebSocket support** for live data updates
- **REST API** for device and alert management
- **MQTT integration** for IoT device communication

## Architecture

```
┌─────────────────────────────────────────────┐
│  React Frontend (TypeScript)                │
│  - Material-UI components                   │
│  - Real-time dashboard                      │
│  - Device/Gateway/Alert management          │
└──────────────┬──────────────────────────────┘
               │ HTTPS + WebSocket
               ▼
┌─────────────────────────────────────────────┐
│  Python Flask Backend                       │
│  - REST API                                 │
│  - WebSocket (Flask-SocketIO)              │
│  - JWT Authentication                       │
│  - SQLite Database                          │
└──────────────┬──────────────────────────────┘
               │ MQTT
               ▼
┌─────────────────────────────────────────────┐
│  MQTT Broker (Mosquitto)                    │
│  - Topics: apru40/+/data                    │
│  - Topics: apru40/+/alert/#                 │
│  - Topics: apru40/+/status                  │
└─────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Create environment configuration:
```bash
cp .env.example .env
# Edit .env with your settings
```

4. Run the backend server:
```bash
python run.py
```

The API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## Default Credentials

For development and testing:
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: Change these credentials in production!

## Features

### Dashboard
- Real-time device statistics
- Network health monitoring
- Active alerts summary
- System status indicators

### Devices Management
- View all devices (nodes and gateways)
- Filter by type and status
- Monitor device connectivity
- View sensor data

### Gateways Overview
- Monitor gateway status
- View connected nodes per gateway
- Track online/offline nodes

### Alerts Management
- View security and system alerts
- Acknowledge and resolve alerts
- Filter by severity and status
- Real-time alert notifications

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile
- `POST /api/v1/auth/refresh` - Refresh token

### Devices
- `GET /api/v1/devices` - List all devices
- `GET /api/v1/devices/<id>` - Get device details
- `POST /api/v1/devices` - Create device
- `PUT /api/v1/devices/<id>` - Update device
- `DELETE /api/v1/devices/<id>` - Delete device

### Gateways
- `GET /api/v1/gateways` - List all gateways
- `GET /api/v1/gateways/<id>/nodes` - Get gateway nodes

### Alerts
- `GET /api/v1/alerts` - List all alerts
- `POST /api/v1/alerts/<id>/acknowledge` - Acknowledge alert
- `POST /api/v1/alerts/<id>/resolve` - Resolve alert

### Statistics
- `GET /api/v1/stats/dashboard` - Dashboard statistics
- `GET /api/v1/stats/network` - Network topology

## WebSocket Events

### Client -> Server
- `connect` - Connect to WebSocket
- `join` - Join a room
- `request_update` - Request data update

### Server -> Client
- `device:heartbeat` - Device heartbeat
- `device:status_change` - Status change
- `device:sensor_data` - Sensor data
- `alert:new` - New alert

## Technology Stack

### Backend
- **Flask 3.0** - Web framework
- **Flask-SocketIO** - WebSocket support
- **SQLAlchemy** - ORM
- **PyJWT** - Authentication
- **paho-mqtt** - MQTT client

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Material-UI** - Component library
- **React Router** - Routing
- **Axios** - HTTP client
- **Socket.IO Client** - WebSocket

## Project Structure

```
.
├── backend/                # Python Flask backend
│   ├── app/
│   │   ├── api/           # API endpoints
│   │   ├── models/        # Database models
│   │   └── services/      # Business logic
│   ├── requirements.txt
│   └── run.py
├── frontend/              # React TypeScript frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API & WebSocket
│   │   └── types/         # TypeScript types
│   └── package.json
└── README.md (original specification)
```

## Development

Both frontend and backend support hot reload in development mode:

- Backend: Changes to Python files trigger automatic restart
- Frontend: Changes to React files trigger automatic rebuild

## Production Deployment

### Backend
1. Use a production WSGI server (Gunicorn, uWSGI)
2. Set up PostgreSQL or MySQL instead of SQLite
3. Configure environment variables securely
4. Enable HTTPS with SSL certificates

### Frontend
1. Build production bundle: `npm run build`
2. Serve with Nginx or similar web server
3. Configure reverse proxy to backend API

## Security Considerations

- JWT tokens for authentication
- CORS configured for frontend origin
- SQL injection protection via SQLAlchemy
- Input validation on API endpoints
- HTTPS recommended for production

## Future Enhancements

- [ ] MQTT broker integration for live device data
- [ ] Advanced data visualization with charts
- [ ] OTA firmware update management
- [ ] Certificate management for TLS
- [ ] User management and RBAC
- [ ] Audit logging for compliance (NIS2)
- [ ] Export reports (CSV, PDF)

## License

Internal project - APRU40 IoT Platform

## Support

For questions or issues, refer to the original specification in README.md
