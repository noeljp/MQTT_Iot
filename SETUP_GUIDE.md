# APRU40 IoT Platform - Setup Guide

Complete guide to set up and run the APRU40 IoT Management Platform.

## Quick Start

### 1. Backend Setup (Python/Flask)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Run the backend server
python run.py
```

The backend API will be available at `http://localhost:5000`

### 2. Frontend Setup (React/TypeScript)

Open a new terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend will automatically open at `http://localhost:3000`

## Login Credentials

Use these credentials to log in:

- **Username**: `admin`
- **Password**: `admin123`

## Features Available

### 1. Dashboard
- Real-time device statistics
- Network health overview
- Active alerts summary

### 2. Devices
- View all devices (gateways and nodes)
- Filter by type and status
- Monitor device connectivity

### 3. Gateways
- Monitor gateway status
- View connected nodes per gateway

### 4. Alerts
- View security and system alerts
- Acknowledge and resolve alerts
- Real-time notifications via WebSocket

## API Endpoints

All endpoints require JWT authentication (except login).

### Authentication
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile

### Devices
- `GET /api/v1/devices/` - List all devices
- `GET /api/v1/devices/<id>` - Get device details

### Gateways
- `GET /api/v1/gateways/` - List all gateways

### Alerts
- `GET /api/v1/alerts/` - List all alerts
- `POST /api/v1/alerts/<id>/acknowledge` - Acknowledge alert
- `POST /api/v1/alerts/<id>/resolve` - Resolve alert

### Statistics
- `GET /api/v1/stats/dashboard` - Dashboard statistics

## Technology Stack

### Backend
- Python 3.8+, Flask 3.0, Flask-SocketIO, SQLAlchemy, PyJWT

### Frontend
- React 18, TypeScript, Material-UI v5, Axios, Socket.IO Client
