"""
Database models for APRU40 IoT Management Platform
"""
from datetime import datetime
from app import db

# Import new IoT models
from app.models.iot import Site, Gateway, Node, SensorData

# Legacy models (keep for backward compatibility)
class Device(db.Model):
    """IoT Device/Node Model"""
    __tablename__ = 'devices'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'node', 'gateway'
    mac_address = db.Column(db.String(17), unique=True)
    gateway_id = db.Column(db.Integer, db.ForeignKey('devices.id'))
    status = db.Column(db.String(20), default='offline')  # 'online', 'offline', 'error'
    firmware_version = db.Column(db.String(20))
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sensors = db.relationship('Sensor', backref='device', lazy=True, cascade='all, delete-orphan')
    alerts = db.relationship('Alert', backref='device', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'name': self.name,
            'type': self.type,
            'mac_address': self.mac_address,
            'gateway_id': self.gateway_id,
            'status': self.status,
            'firmware_version': self.firmware_version,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Sensor(db.Model):
    """Sensor data model"""
    __tablename__ = 'sensors'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('devices.id'), nullable=False)
    sensor_type = db.Column(db.String(50), nullable=False)  # 'temperature', 'humidity', etc.
    value = db.Column(db.Float)
    unit = db.Column(db.String(20))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'sensor_type': self.sensor_type,
            'value': self.value,
            'unit': self.unit,
            'timestamp': self.timestamp.isoformat()
        }

class Alert(db.Model):
    """Security and system alerts"""
    __tablename__ = 'alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('devices.id'))
    alert_type = db.Column(db.String(50), nullable=False)  # 'tamper', 'bt_unauthorized', 'offline'
    severity = db.Column(db.String(20), nullable=False)  # 'critical', 'high', 'medium', 'low'
    message = db.Column(db.Text)
    status = db.Column(db.String(20), default='active')  # 'active', 'acknowledged', 'resolved'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'alert_type': self.alert_type,
            'severity': self.severity,
            'message': self.message,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None
        }

class User(db.Model):
    """User authentication model"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='viewer')  # 'admin', 'operator', 'viewer'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat()
        }
