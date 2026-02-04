"""
IoT Nodes API endpoints
"""
from flask import Blueprint, request, jsonify
from app import db
from app.models.iot import Node, Gateway, SensorData
from app.api.auth import token_required
from datetime import datetime

bp = Blueprint('nodes', __name__)

@bp.route('/', methods=['GET'])
@token_required
def get_nodes(current_user):
    """Get all nodes with optional filters"""
    gateway_id = request.args.get('gateway_id')
    status = request.args.get('status')
    bluetooth_enabled = request.args.get('bluetooth_enabled')
    
    query = Node.query
    
    if gateway_id:
        query = query.filter_by(gateway_id=gateway_id)
    if status:
        query = query.filter_by(status=status)
    if bluetooth_enabled is not None:
        query = query.filter_by(bluetooth_enabled=bluetooth_enabled.lower() == 'true')
    
    nodes = query.all()
    return jsonify({'nodes': [node.to_dict() for node in nodes]}), 200

@bp.route('/<node_id>', methods=['GET'])
@token_required
def get_node(current_user, node_id):
    """Get node details"""
    node = Node.query.get_or_404(node_id)
    return jsonify(node.to_dict()), 200

@bp.route('/', methods=['POST'])
@token_required
def create_node(current_user):
    """Create a new node"""
    data = request.get_json()
    
    if not data or not data.get('name') or not data.get('gateway_id') or data.get('node_id') is None:
        return jsonify({'message': 'Name, gateway_id, and node_id are required'}), 400
    
    # Verify gateway exists
    gateway = Gateway.query.get(data['gateway_id'])
    if not gateway:
        return jsonify({'message': 'Gateway not found'}), 404
    
    # Check if node_id already exists for this gateway
    existing = Node.query.filter_by(gateway_id=data['gateway_id'], node_id=data['node_id']).first()
    if existing:
        return jsonify({'message': 'Node ID already exists for this gateway'}), 409
    
    node = Node(
        node_id=data['node_id'],
        name=data['name'],
        gateway_id=data['gateway_id'],
        mac_address=data.get('mac_address'),
        location=data.get('location'),
        node_type=data.get('node_type', 'sensor'),
        adc_config=data.get('adc_config'),
        bluetooth_enabled=data.get('bluetooth_enabled', False),
        bluetooth_mac=data.get('bluetooth_mac'),
        scanner_model=data.get('scanner_model'),
        sensor_conversions=data.get('sensor_conversions'),
        battery_powered=data.get('battery_powered', False),
        description=data.get('description'),
        manufacturer=data.get('manufacturer'),
        model=data.get('model'),
        serial_number=data.get('serial_number')
    )
    
    db.session.add(node)
    db.session.commit()
    
    return jsonify({'message': 'Node created successfully', 'node': node.to_dict()}), 201

@bp.route('/<node_id>', methods=['PUT'])
@token_required
def update_node(current_user, node_id):
    """Update node"""
    node = Node.query.get_or_404(node_id)
    data = request.get_json()
    
    # Update fields
    updatable_fields = [
        'name', 'location', 'status', 'node_type', 'adc_config',
        'bluetooth_enabled', 'bluetooth_mac', 'scanner_model',
        'sensor_conversions', 'description', 'manufacturer',
        'model', 'serial_number', 'notes'
    ]
    
    for field in updatable_fields:
        if field in data:
            setattr(node, field, data[field])
    
    db.session.commit()
    
    return jsonify({'message': 'Node updated successfully', 'node': node.to_dict()}), 200

@bp.route('/<node_id>', methods=['DELETE'])
@token_required
def delete_node(current_user, node_id):
    """Delete node"""
    node = Node.query.get_or_404(node_id)
    
    db.session.delete(node)
    db.session.commit()
    
    return jsonify({'message': 'Node deleted successfully'}), 200

@bp.route('/<node_id>/gateway', methods=['PUT'])
@token_required
def reassign_gateway(current_user, node_id):
    """Reassign node to different gateway"""
    node = Node.query.get_or_404(node_id)
    data = request.get_json()
    
    if not data or not data.get('gateway_id'):
        return jsonify({'message': 'Gateway ID is required'}), 400
    
    # Verify new gateway exists
    gateway = Gateway.query.get(data['gateway_id'])
    if not gateway:
        return jsonify({'message': 'Gateway not found'}), 404
    
    # Check if node_id conflicts with existing node on new gateway
    existing = Node.query.filter_by(
        gateway_id=data['gateway_id'], 
        node_id=node.node_id
    ).first()
    
    if existing and existing.id != node.id:
        return jsonify({'message': 'Node ID already exists on target gateway'}), 409
    
    node.gateway_id = data['gateway_id']
    db.session.commit()
    
    return jsonify({'message': 'Node reassigned successfully', 'node': node.to_dict()}), 200

@bp.route('/<node_id>/adc-config', methods=['PUT'])
@token_required
def update_adc_config(current_user, node_id):
    """Update ADC configuration"""
    node = Node.query.get_or_404(node_id)
    data = request.get_json()
    
    if not data or 'adc_config' not in data:
        return jsonify({'message': 'ADC configuration is required'}), 400
    
    node.adc_config = data['adc_config']
    
    # Optionally update sensor conversions too
    if 'sensor_conversions' in data:
        node.sensor_conversions = data['sensor_conversions']
    
    db.session.commit()
    
    # TODO: Publish config update to MQTT
    # mqtt_service.publish_node_config(node)
    
    return jsonify({'message': 'ADC config updated successfully', 'node': node.to_dict()}), 200

@bp.route('/<node_id>/bluetooth', methods=['PUT'])
@token_required
def update_bluetooth_config(current_user, node_id):
    """Update Bluetooth scanner configuration"""
    node = Node.query.get_or_404(node_id)
    data = request.get_json()
    
    if 'bluetooth_enabled' in data:
        node.bluetooth_enabled = data['bluetooth_enabled']
    if 'bluetooth_mac' in data:
        node.bluetooth_mac = data['bluetooth_mac']
    if 'scanner_model' in data:
        node.scanner_model = data['scanner_model']
    
    db.session.commit()
    
    # TODO: Publish config update to MQTT
    # mqtt_service.publish_node_config(node)
    
    return jsonify({'message': 'Bluetooth config updated successfully', 'node': node.to_dict()}), 200

@bp.route('/<node_id>/sensor-data', methods=['GET'])
@token_required
def get_node_sensor_data(current_user, node_id):
    """Get sensor data for a node"""
    node = Node.query.get_or_404(node_id)
    
    # Parse query parameters
    limit = request.args.get('limit', 1000, type=int)
    adc_type = request.args.get('adc_type')
    channel = request.args.get('channel', type=int)
    
    query = SensorData.query.filter_by(node_id=node_id).order_by(SensorData.timestamp.desc())
    
    if adc_type:
        query = query.filter_by(adc_type=adc_type)
    if channel is not None:
        query = query.filter_by(channel=channel)
    
    data = query.limit(limit).all()
    
    return jsonify({'data': [d.to_dict() for d in data]}), 200

@bp.route('/<node_id>/qr-codes', methods=['GET'])
@token_required
def get_node_qr_codes(current_user, node_id):
    """Get QR codes history for a node"""
    node = Node.query.get_or_404(node_id)
    
    limit = request.args.get('limit', 100, type=int)
    
    # Get distinct QR codes with timestamps
    data = SensorData.query.filter(
        SensorData.node_id == node_id,
        SensorData.qr_code.isnot(None)
    ).order_by(SensorData.timestamp.desc()).limit(limit).all()
    
    qr_codes = []
    seen = set()
    for d in data:
        if d.qr_code not in seen:
            qr_codes.append({
                'qr_code': d.qr_code,
                'timestamp': d.timestamp.isoformat()
            })
            seen.add(d.qr_code)
    
    return jsonify({'qr_codes': qr_codes}), 200
