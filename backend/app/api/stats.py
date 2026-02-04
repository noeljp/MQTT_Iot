"""
Statistics API endpoints
"""
from flask import Blueprint, jsonify
from app import db
from app.models import Device, Alert, Sensor
from app.api.auth import token_required
from datetime import datetime, timedelta

bp = Blueprint('stats', __name__)

@bp.route('/dashboard', methods=['GET'])
@token_required
def get_dashboard_stats(current_user):
    """Get dashboard statistics"""
    # Device counts
    total_devices = Device.query.count()
    online_devices = Device.query.filter_by(status='online').count()
    offline_devices = Device.query.filter_by(status='offline').count()
    gateways = Device.query.filter_by(type='gateway').count()
    nodes = Device.query.filter_by(type='node').count()
    
    # Alert counts
    active_alerts = Alert.query.filter_by(status='active').count()
    critical_alerts = Alert.query.filter(Alert.status == 'active', Alert.severity == 'critical').count()
    
    # Recent activity
    recent_devices = Device.query.filter(
        Device.last_seen >= datetime.utcnow() - timedelta(minutes=5)
    ).count()
    
    return jsonify({
        'devices': {
            'total': total_devices,
            'online': online_devices,
            'offline': offline_devices,
            'gateways': gateways,
            'nodes': nodes,
            'online_percentage': round((online_devices / total_devices * 100) if total_devices > 0 else 0, 1)
        },
        'alerts': {
            'active': active_alerts,
            'critical': critical_alerts
        },
        'activity': {
            'recent_heartbeats': recent_devices
        }
    }), 200

@bp.route('/network', methods=['GET'])
@token_required
def get_network_stats(current_user):
    """Get network topology statistics"""
    gateways = Device.query.filter_by(type='gateway').all()
    
    network_data = []
    for gw in gateways:
        nodes = Device.query.filter_by(gateway_id=gw.id).all()
        network_data.append({
            'gateway': gw.to_dict(),
            'nodes': [node.to_dict() for node in nodes],
            'node_count': len(nodes),
            'online_count': len([n for n in nodes if n.status == 'online'])
        })
    
    return jsonify({
        'network': network_data,
        'total_gateways': len(gateways)
    }), 200
