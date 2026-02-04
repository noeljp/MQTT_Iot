"""
Devices API endpoints
"""
from flask import Blueprint, request, jsonify
from app import db
from app.models import Device, Sensor
from app.api.auth import token_required
from datetime import datetime, timedelta
import random

bp = Blueprint('devices', __name__)

@bp.route('/', methods=['GET'])
@token_required
def get_devices(current_user):
    """Get all devices with optional filtering"""
    device_type = request.args.get('type')
    status = request.args.get('status')
    
    query = Device.query
    
    if device_type:
        query = query.filter_by(type=device_type)
    if status:
        query = query.filter_by(status=status)
    
    devices = query.all()
    
    # If no devices exist, create mock data
    if not devices:
        try:
            create_mock_devices()
            devices = query.all()
        except Exception as e:
            # If mock data already exists or there's an error, just continue
            print(f"Mock data creation skipped or failed: {e}")
            devices = query.all()
    
    return jsonify({
        'devices': [device.to_dict() for device in devices],
        'total': len(devices)
    }), 200

@bp.route('/<int:device_id>', methods=['GET'])
@token_required
def get_device(current_user, device_id):
    """Get single device details"""
    device = Device.query.get_or_404(device_id)
    
    device_data = device.to_dict()
    device_data['sensors'] = [sensor.to_dict() for sensor in device.sensors]
    
    return jsonify(device_data), 200

@bp.route('/', methods=['POST'])
@token_required
def create_device(current_user):
    """Create new device"""
    data = request.get_json()
    
    if not data or not data.get('device_id') or not data.get('name'):
        return jsonify({'message': 'device_id and name are required'}), 400
    
    # Check if device already exists
    existing = Device.query.filter_by(device_id=data['device_id']).first()
    if existing:
        return jsonify({'message': 'Device already exists'}), 409
    
    device = Device(
        device_id=data['device_id'],
        name=data['name'],
        type=data.get('type', 'node'),
        mac_address=data.get('mac_address'),
        gateway_id=data.get('gateway_id'),
        status=data.get('status', 'offline'),
        firmware_version=data.get('firmware_version')
    )
    
    db.session.add(device)
    db.session.commit()
    
    return jsonify(device.to_dict()), 201

@bp.route('/<int:device_id>', methods=['PUT'])
@token_required
def update_device(current_user, device_id):
    """Update device"""
    device = Device.query.get_or_404(device_id)
    data = request.get_json()
    
    if 'name' in data:
        device.name = data['name']
    if 'status' in data:
        device.status = data['status']
    if 'firmware_version' in data:
        device.firmware_version = data['firmware_version']
    
    device.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(device.to_dict()), 200

@bp.route('/<int:device_id>', methods=['DELETE'])
@token_required
def delete_device(current_user, device_id):
    """Delete device"""
    device = Device.query.get_or_404(device_id)
    
    db.session.delete(device)
    db.session.commit()
    
    return jsonify({'message': 'Device deleted'}), 200

@bp.route('/<int:device_id>/sensors', methods=['GET'])
@token_required
def get_device_sensors(current_user, device_id):
    """Get device sensor data"""
    device = Device.query.get_or_404(device_id)
    
    # Get recent sensor data
    sensors = Sensor.query.filter_by(device_id=device_id).order_by(Sensor.timestamp.desc()).limit(100).all()
    
    return jsonify({
        'device_id': device_id,
        'sensors': [sensor.to_dict() for sensor in sensors],
        'total': len(sensors)
    }), 200

def create_mock_devices():
    """Create mock devices for demo"""
    # Create gateways
    for i in range(1, 4):
        gateway = Device(
            device_id=f'GW-{i:02d}',
            name=f'Gateway {i}',
            type='gateway',
            mac_address=f'AA:BB:CC:DD:EE:{i:02d}',
            status=random.choice(['online', 'online', 'offline']),
            firmware_version='1.2.3',
            last_seen=datetime.utcnow() - timedelta(minutes=random.randint(0, 60))
        )
        db.session.add(gateway)
    
    db.session.commit()
    
    # Create nodes
    gateways = Device.query.filter_by(type='gateway').all()
    for gw in gateways:
        for i in range(1, 11):
            node = Device(
                device_id=f'{gw.device_id}-N{i:02d}',
                name=f'Node {i} ({gw.name})',
                type='node',
                mac_address=f'{gw.mac_address[:-2]}{i:02X}',
                gateway_id=gw.id,
                status=random.choice(['online', 'online', 'online', 'offline']),
                firmware_version='1.0.5',
                last_seen=datetime.utcnow() - timedelta(minutes=random.randint(0, 30))
            )
            db.session.add(node)
            
            # Add mock sensor data
            if node.status == 'online':
                for sensor_type, unit in [('temperature', '°C'), ('humidity', '%'), ('pressure', 'hPa')]:
                    for j in range(5):
                        # Generate appropriate values based on sensor type
                        if sensor_type == 'temperature':
                            value = random.uniform(15, 30)
                        elif sensor_type == 'humidity':
                            value = random.uniform(30, 80)
                        else:  # pressure
                            value = random.uniform(990, 1020)
                        
                        sensor = Sensor(
                            device_id=node.id,
                            sensor_type=sensor_type,
                            value=value,
                            unit=unit,
                            timestamp=datetime.utcnow() - timedelta(minutes=j * 5)
                        )
                        db.session.add(sensor)
    
    db.session.commit()
