"""
Sensor Data API endpoints with CSV export
"""
from flask import Blueprint, request, jsonify, Response
from app import db
from app.models.iot import SensorData, Node
from app.api.auth import token_required
from datetime import datetime, timedelta
import csv
import io

bp = Blueprint('sensor_data', __name__)

@bp.route('/latest', methods=['GET'])
@token_required
def get_latest_data(current_user):
    """Get latest sensor data for all nodes"""
    limit = request.args.get('limit', 100, type=int)
    
    data = SensorData.query.order_by(SensorData.timestamp.desc()).limit(limit).all()
    
    return jsonify({'data': [d.to_dict() for d in data]}), 200

@bp.route('/history', methods=['GET'])
@token_required
def get_sensor_history(current_user):
    """Get sensor data history with filters"""
    # Parse query parameters
    node_id = request.args.get('node_id')
    gateway_id = request.args.get('gateway_id')
    site_id = request.args.get('site_id')
    adc_type = request.args.get('adc_type')
    channel = request.args.get('channel', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    limit = request.args.get('limit', 1000, type=int)
    
    query = SensorData.query
    
    # Filter by node
    if node_id:
        query = query.filter_by(node_id=node_id)
    
    # Filter by gateway (join with Node)
    if gateway_id:
        query = query.join(Node).filter(Node.gateway_id == gateway_id)
    
    # Filter by site (join with Node and Gateway)
    if site_id:
        from app.models.iot import Gateway
        query = query.join(Node).join(Gateway).filter(Gateway.site_id == site_id)
    
    # Filter by ADC type
    if adc_type:
        query = query.filter_by(adc_type=adc_type)
    
    # Filter by channel
    if channel is not None:
        query = query.filter_by(channel=channel)
    
    # Filter by date range
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(SensorData.timestamp >= start_dt)
        except ValueError:
            return jsonify({'message': 'Invalid start_date format'}), 400
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(SensorData.timestamp <= end_dt)
        except ValueError:
            return jsonify({'message': 'Invalid end_date format'}), 400
    
    # Order and limit
    data = query.order_by(SensorData.timestamp.desc()).limit(limit).all()
    
    return jsonify({
        'data': [d.to_dict() for d in data],
        'count': len(data)
    }), 200

@bp.route('/export', methods=['GET'])
@token_required
def export_sensor_data(current_user):
    """Export sensor data to CSV"""
    # Same filters as history endpoint
    node_id = request.args.get('node_id')
    gateway_id = request.args.get('gateway_id')
    adc_type = request.args.get('adc_type')
    channel = request.args.get('channel', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = SensorData.query
    
    if node_id:
        query = query.filter_by(node_id=node_id)
    
    if gateway_id:
        query = query.join(Node).filter(Node.gateway_id == gateway_id)
    
    if adc_type:
        query = query.filter_by(adc_type=adc_type)
    
    if channel is not None:
        query = query.filter_by(channel=channel)
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(SensorData.timestamp >= start_dt)
        except ValueError:
            return jsonify({'message': 'Invalid start_date format'}), 400
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(SensorData.timestamp <= end_dt)
        except ValueError:
            return jsonify({'message': 'Invalid end_date format'}), 400
    
    # Get data
    data = query.order_by(SensorData.timestamp.desc()).all()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'Timestamp', 'Node ID', 'ADC Type', 'Channel', 
        'Raw Value', 'Converted Value', 'Unit', 'QR Code'
    ])
    
    # Write data rows
    for d in data:
        writer.writerow([
            d.timestamp.isoformat() if d.timestamp else '',
            d.node_id,
            d.adc_type,
            d.channel,
            d.raw_value,
            d.converted_value,
            d.unit,
            d.qr_code or ''
        ])
    
    # Create response
    output.seek(0)
    filename = f"sensor_data_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename={filename}'}
    )

@bp.route('/cleanup', methods=['POST'])
@token_required
def cleanup_old_data(current_user):
    """Cleanup sensor data older than 7 days"""
    days = request.json.get('days', 7) if request.json else 7
    
    deleted_count = SensorData.cleanup_old_data(days=days)
    
    return jsonify({
        'message': f'Deleted {deleted_count} old sensor data records',
        'deleted_count': deleted_count,
        'days': days
    }), 200
