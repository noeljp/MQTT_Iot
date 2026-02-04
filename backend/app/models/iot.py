"""
Data models for APRU40 IoT system
Multi-site architecture with Gateways and Nodes
"""
from app import db
from datetime import datetime, timedelta
import uuid
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy import Index

# Helper function to generate UUIDs
def generate_uuid():
    return str(uuid.uuid4())

class Site(db.Model):
    """Site/Location that contains gateways"""
    __tablename__ = 'sites'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(200))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    gateways = db.relationship('Gateway', backref='site', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'location': self.location,
            'description': self.description,
            'gateway_count': self.gateways.count(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Gateway(db.Model):
    """ESP32 Gateway device"""
    __tablename__ = 'gateways'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    gateway_id = db.Column(db.String(20), unique=True, nullable=False)  # GW001, GW002...
    name = db.Column(db.String(100), nullable=False)
    site_id = db.Column(db.String(36), db.ForeignKey('sites.id'), nullable=False)
    mac_address = db.Column(db.String(17), unique=True)
    ip_address = db.Column(db.String(15))
    location = db.Column(db.String(200))
    status = db.Column(db.String(20), default='offline')  # online, offline, maintenance
    firmware_version = db.Column(db.String(20))
    last_seen = db.Column(db.DateTime)
    max_nodes = db.Column(db.Integer, default=30)
    mqtt_topic_prefix = db.Column(db.String(100))
    
    # Metadata
    description = db.Column(db.Text)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    nodes = db.relationship('Node', backref='gateway', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self, include_nodes=False):
        data = {
            'id': self.id,
            'gateway_id': self.gateway_id,
            'name': self.name,
            'site_id': self.site_id,
            'mac_address': self.mac_address,
            'ip_address': self.ip_address,
            'location': self.location,
            'status': self.status,
            'firmware_version': self.firmware_version,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'max_nodes': self.max_nodes,
            'mqtt_topic_prefix': self.mqtt_topic_prefix,
            'description': self.description,
            'notes': self.notes,
            'node_count': self.nodes.count(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_nodes:
            data['nodes'] = [node.to_dict() for node in self.nodes.all()]
        
        return data

class Node(db.Model):
    """ESP32 IoT Node device"""
    __tablename__ = 'nodes'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    node_id = db.Column(db.Integer, nullable=False)  # 1-30
    name = db.Column(db.String(100), nullable=False)
    gateway_id = db.Column(db.String(36), db.ForeignKey('gateways.id'), nullable=False)
    mac_address = db.Column(db.String(17), unique=True)
    location = db.Column(db.String(200))
    status = db.Column(db.String(20), default='offline')  # online, offline, error
    node_type = db.Column(db.String(20), default='sensor')  # sensor, actuator
    
    # ADC Configuration (JSON)
    adc_config = db.Column(JSON)  # {ads7128_enabled: true, periods: {...}}
    
    # Bluetooth Scanner (Zebra DS2278)
    bluetooth_enabled = db.Column(db.Boolean, default=False)
    bluetooth_mac = db.Column(db.String(17))
    scanner_model = db.Column(db.String(50))
    last_qr_code = db.Column(db.String(64))
    
    # Sensor conversions (JSON) - formulas per channel
    sensor_conversions = db.Column(JSON)
    
    # Communication
    rssi = db.Column(db.Integer)  # Signal strength
    last_seen = db.Column(db.DateTime)
    firmware_version = db.Column(db.String(20))
    battery_level = db.Column(db.Float)
    battery_powered = db.Column(db.Boolean, default=False)
    
    # Metadata
    description = db.Column(db.Text)
    manufacturer = db.Column(db.String(100))
    model = db.Column(db.String(100))
    serial_number = db.Column(db.String(100))
    installation_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Composite unique constraint: node_id must be unique per gateway
    __table_args__ = (
        db.UniqueConstraint('gateway_id', 'node_id', name='unique_node_per_gateway'),
        Index('idx_node_status', 'status'),
        Index('idx_node_last_seen', 'last_seen'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'node_id': self.node_id,
            'name': self.name,
            'gateway_id': self.gateway_id,
            'gateway_name': self.gateway.name if self.gateway else None,
            'mac_address': self.mac_address,
            'location': self.location,
            'status': self.status,
            'node_type': self.node_type,
            'adc_config': self.adc_config,
            'bluetooth_enabled': self.bluetooth_enabled,
            'bluetooth_mac': self.bluetooth_mac,
            'scanner_model': self.scanner_model,
            'last_qr_code': self.last_qr_code,
            'sensor_conversions': self.sensor_conversions,
            'rssi': self.rssi,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'firmware_version': self.firmware_version,
            'battery_level': self.battery_level,
            'battery_powered': self.battery_powered,
            'description': self.description,
            'manufacturer': self.manufacturer,
            'model': self.model,
            'serial_number': self.serial_number,
            'installation_date': self.installation_date.isoformat() if self.installation_date else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class SensorData(db.Model):
    """Time-series sensor data from nodes"""
    __tablename__ = 'sensor_data'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    node_id = db.Column(db.String(36), db.ForeignKey('nodes.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    adc_type = db.Column(db.String(20), nullable=False)  # ADS7128, ADS1119_1, ADS1119_2
    channel = db.Column(db.Integer, nullable=False)
    raw_value = db.Column(db.Integer)
    converted_value = db.Column(db.Float)
    unit = db.Column(db.String(10))
    qr_code = db.Column(db.String(64))  # Associated QR code if scanned
    
    __table_args__ = (
        Index('idx_sensor_data_node_timestamp', 'node_id', 'timestamp'),
        Index('idx_sensor_data_timestamp', 'timestamp'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'node_id': self.node_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'adc_type': self.adc_type,
            'channel': self.channel,
            'raw_value': self.raw_value,
            'converted_value': self.converted_value,
            'unit': self.unit,
            'qr_code': self.qr_code
        }
    
    @staticmethod
    def cleanup_old_data(days=7):
        """Delete sensor data older than specified days"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        deleted = SensorData.query.filter(SensorData.timestamp < cutoff_date).delete()
        db.session.commit()
        return deleted
