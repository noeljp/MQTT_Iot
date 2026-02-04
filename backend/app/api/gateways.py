"""
Gateways API endpoints
"""
from flask import Blueprint, request, jsonify
from app import db
from app.models import Device
from app.api.auth import token_required

bp = Blueprint('gateways', __name__)

@bp.route('/', methods=['GET'])
@token_required
def get_gateways(current_user):
    """Get all gateways"""
    gateways = Device.query.filter_by(type='gateway').all()
    
    gateway_data = []
    for gw in gateways:
        gw_dict = gw.to_dict()
        # Count connected nodes
        nodes = Device.query.filter_by(gateway_id=gw.id).all()
        gw_dict['node_count'] = len(nodes)
        gw_dict['online_nodes'] = len([n for n in nodes if n.status == 'online'])
        gateway_data.append(gw_dict)
    
    return jsonify({
        'gateways': gateway_data,
        'total': len(gateway_data)
    }), 200

@bp.route('/<int:gateway_id>/nodes', methods=['GET'])
@token_required
def get_gateway_nodes(current_user, gateway_id):
    """Get all nodes connected to a gateway"""
    gateway = Device.query.get_or_404(gateway_id)
    
    if gateway.type != 'gateway':
        return jsonify({'message': 'Not a gateway device'}), 400
    
    nodes = Device.query.filter_by(gateway_id=gateway_id).all()
    
    return jsonify({
        'gateway_id': gateway_id,
        'gateway_name': gateway.name,
        'nodes': [node.to_dict() for node in nodes],
        'total': len(nodes)
    }), 200
