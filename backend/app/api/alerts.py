"""
Alerts API endpoints
"""
from flask import Blueprint, request, jsonify
from app import db
from app.models import Alert, Device
from app.api.auth import token_required
from datetime import datetime
import random

bp = Blueprint('alerts', __name__)

@bp.route('/', methods=['GET'])
@token_required
def get_alerts(current_user):
    """Get all alerts with optional filtering"""
    status = request.args.get('status')
    severity = request.args.get('severity')
    
    query = Alert.query
    
    if status:
        query = query.filter_by(status=status)
    if severity:
        query = query.filter_by(severity=severity)
    
    alerts = query.order_by(Alert.created_at.desc()).all()
    
    # Create mock alerts if none exist
    if not alerts:
        try:
            create_mock_alerts()
            alerts = query.order_by(Alert.created_at.desc()).all()
        except Exception as e:
            # If mock data already exists or there's an error, just continue
            print(f"Mock alerts creation skipped or failed: {e}")
            alerts = query.order_by(Alert.created_at.desc()).all()
    
    return jsonify({
        'alerts': [alert.to_dict() for alert in alerts],
        'total': len(alerts)
    }), 200

@bp.route('/<int:alert_id>', methods=['GET'])
@token_required
def get_alert(current_user, alert_id):
    """Get single alert details"""
    alert = Alert.query.get_or_404(alert_id)
    return jsonify(alert.to_dict()), 200

@bp.route('/<int:alert_id>/acknowledge', methods=['POST'])
@token_required
def acknowledge_alert(current_user, alert_id):
    """Acknowledge an alert"""
    alert = Alert.query.get_or_404(alert_id)
    alert.status = 'acknowledged'
    db.session.commit()
    
    return jsonify(alert.to_dict()), 200

@bp.route('/<int:alert_id>/resolve', methods=['POST'])
@token_required
def resolve_alert(current_user, alert_id):
    """Resolve an alert"""
    alert = Alert.query.get_or_404(alert_id)
    alert.status = 'resolved'
    alert.resolved_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(alert.to_dict()), 200

def create_mock_alerts():
    """Create mock alerts for demo"""
    devices = Device.query.filter_by(type='node').limit(5).all()
    
    alert_types = [
        ('tamper', 'critical', 'Physical tamper detected on device'),
        ('bt_unauthorized', 'high', 'Unauthorized Bluetooth connection attempt'),
        ('offline', 'medium', 'Device offline for extended period'),
        ('low_battery', 'low', 'Battery level below 20%'),
        ('sensor_failure', 'high', 'Sensor reading out of range')
    ]
    
    for device in devices:
        alert_type, severity, message = random.choice(alert_types)
        alert = Alert(
            device_id=device.id,
            alert_type=alert_type,
            severity=severity,
            message=f'{message}: {device.name}',
            status=random.choice(['active', 'active', 'acknowledged'])
        )
        db.session.add(alert)
    
    db.session.commit()
