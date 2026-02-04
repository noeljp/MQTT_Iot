"""
WebSocket event handlers for real-time communication
"""
from flask_socketio import emit, join_room, leave_room
from app import socketio
import random
from datetime import datetime

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print('Client connected')
    emit('connection_response', {'status': 'connected', 'message': 'Connected to APRU40 server'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print('Client disconnected')

@socketio.on('join')
def handle_join(data):
    """Join a specific room for targeted updates"""
    room = data.get('room')
    if room:
        join_room(room)
        emit('joined', {'room': room})

@socketio.on('leave')
def handle_leave(data):
    """Leave a room"""
    room = data.get('room')
    if room:
        leave_room(room)
        emit('left', {'room': room})

@socketio.on('request_update')
def handle_update_request(data):
    """Handle manual update request"""
    # Send mock real-time data
    emit('device:heartbeat', {
        'device_id': 'GW-01-N01',
        'status': 'online',
        'timestamp': datetime.utcnow().isoformat()
    })

# Helper functions to emit events (called from other parts of the app)
def emit_device_status_change(device_id, status):
    """Emit device status change event"""
    socketio.emit('device:status_change', {
        'device_id': device_id,
        'status': status,
        'timestamp': datetime.utcnow().isoformat()
    })

def emit_new_alert(alert):
    """Emit new alert event"""
    socketio.emit('alert:new', {
        'id': alert.id,
        'device_id': alert.device_id,
        'alert_type': alert.alert_type,
        'severity': alert.severity,
        'message': alert.message,
        'timestamp': alert.created_at.isoformat()
    })

def emit_sensor_data(device_id, sensor_data):
    """Emit sensor data update"""
    socketio.emit('device:sensor_data', {
        'device_id': device_id,
        'data': sensor_data,
        'timestamp': datetime.utcnow().isoformat()
    })
