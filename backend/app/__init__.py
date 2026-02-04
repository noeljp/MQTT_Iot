"""
APRU40 IoT Management Platform - Backend API
Flask application with WebSocket support and MQTT integration
"""
from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
socketio = SocketIO(cors_allowed_origins="*")

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///apru40.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize extensions with app
    db.init_app(app)
    CORS(app, origins=os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(','))
    socketio.init_app(app)
    
    # Register blueprints
    from app.api import auth, devices, gateways, alerts, stats, mqtt_admin
    from app.api import sites, iot_gateways, nodes, sensor_data
    
    app.register_blueprint(auth.bp, url_prefix='/api/v1/auth')
    app.register_blueprint(devices.bp, url_prefix='/api/v1/devices')
    app.register_blueprint(gateways.bp, url_prefix='/api/v1/gateways')
    app.register_blueprint(alerts.bp, url_prefix='/api/v1/alerts')
    app.register_blueprint(stats.bp, url_prefix='/api/v1/stats')
    app.register_blueprint(mqtt_admin.bp, url_prefix='/api/v1/mqtt')
    
    # New IoT management endpoints
    app.register_blueprint(sites.bp, url_prefix='/api/v1/sites')
    app.register_blueprint(iot_gateways.bp, url_prefix='/api/v1/iot/gateways')
    app.register_blueprint(nodes.bp, url_prefix='/api/v1/iot/nodes')
    app.register_blueprint(sensor_data.bp, url_prefix='/api/v1/sensor-data')
    
    # Health check endpoint
    @app.route('/api/v1/health')
    def health():
        return jsonify({'status': 'healthy', 'service': 'APRU40 API'}), 200
    
    # Register WebSocket event handlers
    from app.services import websocket
    
    # Initialize and connect MQTT service
    from app.services.mqtt_service import mqtt_service
    mqtt_service.app = app
    mqtt_service.connect()
    
    # Start background tasks
    from app.services.background_tasks import start_background_tasks
    start_background_tasks()
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app

app = create_app()

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
