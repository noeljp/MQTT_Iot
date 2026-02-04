"""
IoT Gateways API endpoints
"""
from flask import Blueprint, request, jsonify
from app import db
from app.models.iot import Gateway, Node, Site
from app.api.auth import token_required
from datetime import datetime

bp = Blueprint('iot_gateways', __name__)

@bp.route('/', methods=['GET'])
@token_required
def get_gateways(current_user):
    """Get all gateways with optional filters"""
    site_id = request.args.get('site_id')
    status = request.args.get('status')
    
    query = Gateway.query
    
    if site_id:
        query = query.filter_by(site_id=site_id)
    if status:
        query = query.filter_by(status=status)
    
    gateways = query.all()
    return jsonify({'gateways': [gw.to_dict() for gw in gateways]}), 200

@bp.route('/<gateway_id>', methods=['GET'])
@token_required
def get_gateway(current_user, gateway_id):
    """Get gateway details"""
    include_nodes = request.args.get('include_nodes', 'false').lower() == 'true'
    gateway = Gateway.query.get_or_404(gateway_id)
    return jsonify(gateway.to_dict(include_nodes=include_nodes)), 200

@bp.route('/', methods=['POST'])
@token_required
def create_gateway(current_user):
    """Create a new gateway"""
    data = request.get_json()
    
    if not data or not data.get('name') or not data.get('gateway_id') or not data.get('site_id'):
        return jsonify({'message': 'Name, gateway_id, and site_id are required'}), 400
    
    # Verify site exists
    site = Site.query.get(data['site_id'])
    if not site:
        return jsonify({'message': 'Site not found'}), 404
    
    # Check if gateway_id already exists
    if Gateway.query.filter_by(gateway_id=data['gateway_id']).first():
        return jsonify({'message': 'Gateway ID already exists'}), 409
    
    gateway = Gateway(
        gateway_id=data['gateway_id'],
        name=data['name'],
        site_id=data['site_id'],
        mac_address=data.get('mac_address'),
        ip_address=data.get('ip_address'),
        location=data.get('location'),
        firmware_version=data.get('firmware_version'),
        max_nodes=data.get('max_nodes', 30),
        mqtt_topic_prefix=data.get('mqtt_topic_prefix', f"apru40/gateway/{data['gateway_id']}"),
        description=data.get('description'),
        notes=data.get('notes')
    )
    
    db.session.add(gateway)
    db.session.commit()
    
    return jsonify({'message': 'Gateway created successfully', 'gateway': gateway.to_dict()}), 201

@bp.route('/<gateway_id>', methods=['PUT'])
@token_required
def update_gateway(current_user, gateway_id):
    """Update gateway"""
    gateway = Gateway.query.get_or_404(gateway_id)
    data = request.get_json()
    
    # Update fields
    updatable_fields = [
        'name', 'site_id', 'mac_address', 'ip_address', 'location',
        'status', 'firmware_version', 'max_nodes', 'mqtt_topic_prefix',
        'description', 'notes'
    ]
    
    for field in updatable_fields:
        if field in data:
            setattr(gateway, field, data[field])
    
    db.session.commit()
    
    return jsonify({'message': 'Gateway updated successfully', 'gateway': gateway.to_dict()}), 200

@bp.route('/<gateway_id>', methods=['DELETE'])
@token_required
def delete_gateway(current_user, gateway_id):
    """Delete gateway (and all associated nodes)"""
    gateway = Gateway.query.get_or_404(gateway_id)
    
    db.session.delete(gateway)
    db.session.commit()
    
    return jsonify({'message': 'Gateway deleted successfully'}), 200

@bp.route('/<gateway_id>/nodes', methods=['GET'])
@token_required
def get_gateway_nodes(current_user, gateway_id):
    """Get all nodes connected to this gateway"""
    gateway = Gateway.query.get_or_404(gateway_id)
    nodes = [node.to_dict() for node in gateway.nodes.all()]
    
    return jsonify({'nodes': nodes}), 200

@bp.route('/<gateway_id>/stats', methods=['GET'])
@token_required
def get_gateway_stats(current_user, gateway_id):
    """Get gateway statistics"""
    gateway = Gateway.query.get_or_404(gateway_id)
    
    nodes = gateway.nodes.all()
    online_nodes = sum(1 for n in nodes if n.status == 'online')
    
    stats = {
        'gateway_id': gateway.gateway_id,
        'name': gateway.name,
        'status': gateway.status,
        'last_seen': gateway.last_seen.isoformat() if gateway.last_seen else None,
        'total_nodes': len(nodes),
        'online_nodes': online_nodes,
        'offline_nodes': len(nodes) - online_nodes,
        'max_nodes': gateway.max_nodes,
        'capacity_percentage': round((len(nodes) / gateway.max_nodes) * 100, 2) if gateway.max_nodes > 0 else 0,
        'nodes_by_status': {
            'online': online_nodes,
            'offline': sum(1 for n in nodes if n.status == 'offline'),
            'error': sum(1 for n in nodes if n.status == 'error')
        },
        'bluetooth_enabled_nodes': sum(1 for n in nodes if n.bluetooth_enabled),
        'battery_powered_nodes': sum(1 for n in nodes if n.battery_powered)
    }
    
    return jsonify(stats), 200

@bp.route('/<gateway_id>/command', methods=['POST'])
@token_required
def send_gateway_command(current_user, gateway_id):
    """Send command to gateway via MQTT"""
    gateway = Gateway.query.get_or_404(gateway_id)
    data = request.get_json()
    
    if not data or not data.get('command'):
        return jsonify({'message': 'Command is required'}), 400
    
    command = data['command']
    params = data.get('params', {})
    
    # TODO: Publish command to MQTT
    # topic = f"{gateway.mqtt_topic_prefix}/cmd"
    # payload = {
    #     'command': command,
    #     'params': params,
    #     'timestamp': datetime.utcnow().isoformat()
    # }
    # mqtt_service.publish(topic, payload)
    
    return jsonify({
        'message': f'Command "{command}" sent to gateway',
        'gateway_id': gateway.gateway_id,
        'command': command,
        'params': params
    }), 200
