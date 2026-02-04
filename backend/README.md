# APRU40 Backend API

Python Flask backend for the APRU40 IoT Management Platform.

## Features

- REST API with JWT authentication
- WebSocket support for real-time updates
- MQTT integration for IoT device communication
- SQLite database for development
- Mock data generation for testing

## Prerequisites

- Python 3.8+
- pip

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create environment configuration:
```bash
cp .env.example .env
# Edit .env with your settings
```

3. Run the application:
```bash
python run.py
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login with username/password
- `GET /api/v1/auth/profile` - Get current user profile
- `POST /api/v1/auth/refresh` - Refresh JWT token

### Devices
- `GET /api/v1/devices/` - Get all devices
- `GET /api/v1/devices/<id>` - Get device details
- `POST /api/v1/devices/` - Create new device
- `PUT /api/v1/devices/<id>` - Update device
- `DELETE /api/v1/devices/<id>` - Delete device
- `GET /api/v1/devices/<id>/sensors` - Get device sensor data

### Gateways
- `GET /api/v1/gateways/` - Get all gateways
- `GET /api/v1/gateways/<id>/nodes` - Get gateway nodes

### Alerts
- `GET /api/v1/alerts/` - Get all alerts
- `GET /api/v1/alerts/<id>` - Get alert details
- `POST /api/v1/alerts/<id>/acknowledge` - Acknowledge alert
- `POST /api/v1/alerts/<id>/resolve` - Resolve alert

### Statistics
- `GET /api/v1/stats/dashboard` - Get dashboard statistics
- `GET /api/v1/stats/network` - Get network topology

### Health Check
- `GET /api/v1/health` - API health check

## WebSocket Events

The backend supports real-time communication via Socket.IO:

### Client -> Server
- `connect` - Connect to WebSocket
- `join` - Join a room
- `leave` - Leave a room
- `request_update` - Request data update

### Server -> Client
- `connection_response` - Connection confirmation
- `device:heartbeat` - Device heartbeat update
- `device:status_change` - Device status change
- `device:sensor_data` - Sensor data update
- `alert:new` - New alert notification

## Default Credentials

For development/demo purposes:
- Username: `admin`
- Password: `admin123`

**Change these in production!**

## Project Structure

```
backend/
├── app/
│   ├── __init__.py          # Application factory
│   ├── api/                 # API endpoints
│   │   ├── auth.py          # Authentication
│   │   ├── devices.py       # Device management
│   │   ├── gateways.py      # Gateway management
│   │   ├── alerts.py        # Alert management
│   │   └── stats.py         # Statistics
│   ├── models/              # Database models
│   │   └── __init__.py      # Device, Sensor, Alert, User models
│   └── services/            # Business logic
│       ├── websocket.py     # WebSocket handlers
│       └── mqtt_service.py  # MQTT client
├── config/                  # Configuration files
├── requirements.txt         # Python dependencies
├── .env.example            # Environment template
└── run.py                  # Application entry point
```

## Development

To enable debug mode, ensure `.env` has:
```
FLASK_ENV=development
FLASK_DEBUG=True
```

The application will automatically reload on code changes.
