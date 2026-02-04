"""
MQTT client service for connecting to the MQTT broker
Handles both node data reception and gateway management
"""
import paho.mqtt.client as mqtt
from paho.mqtt.client import CallbackAPIVersion
import os
import json
from datetime import datetime
from app import db, socketio
from app.models.iot import Gateway, Node, SensorData

class MQTTService:
    def __init__(self, app=None):
        self.client = None
        self.app = app
        self.broker = os.getenv('MQTT_BROKER', 'localhost')
        self.port = int(os.getenv('MQTT_PORT', 1883))
        self.username = os.getenv('MQTT_USERNAME', '')
        self.password = os.getenv('MQTT_PASSWORD', '')
        
    def on_connect(self, client, userdata, flags, rc, properties=None):
        """Callback when connected to MQTT broker"""
        if rc == 0:
            print(f"✓ Connected to MQTT Broker at {self.broker}:{self.port}")
            # Subscribe to APRU40 topics
            client.subscribe('apru40/+/data')
            client.subscribe('apru40/+/alert/#')
            client.subscribe('apru40/+/status')
            # Subscribe to gateway topics
            client.subscribe('apru40/gateway/+/data')
            client.subscribe('apru40/gateway/+/status')
            print(f"✓ Subscribed to APRU40 topics")
        else:
            print(f"✗ Failed to connect to MQTT broker, return code {rc}")
    
    def on_message(self, client, userdata, msg):
        """Callback when message received"""
        try:
            payload = json.loads(msg.payload.decode())
            topic = msg.topic
            
            print(f"Received message on {topic}: {json.dumps(payload, indent=2)}")
            
            # Handle different topic types
            if '/data' in topic:
                self.handle_sensor_data(topic, payload)
            elif '/status' in topic:
                self.handle_status(topic, payload)
            elif '/alert' in topic:
                self.handle_alert(topic, payload)
                
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON from MQTT message: {e}")
        except Exception as e:
            print(f"Error processing MQTT message: {e}")
    
    def handle_sensor_data(self, topic, payload):
        """Handle sensor data messages from gateways"""
        try:
            # Parse gateway_id from topic: apru40/gateway/{gateway_id}/data
            parts = topic.split('/')
            if len(parts) >= 3 and parts[1] == 'gateway':
                gateway_identifier = parts[2]
            else:
                print(f"Unable to parse gateway_id from topic: {topic}")
                return
            
            # Get gateway from database
            gateway = Gateway.query.filter_by(gateway_id=gateway_identifier).first()
            if not gateway:
                print(f"Gateway not found: {gateway_identifier}")
                return
            
            # Update gateway last_seen and status
            gateway.last_seen = datetime.utcnow()
            gateway.status = 'online'
            
            # Process nodes data
            nodes_data = payload.get('nodes', [])
            for node_data in nodes_data:
                node_identifier = node_data.get('node_id')
                if node_identifier is None:
                    continue
                
                # Get or create node
                node = Node.query.filter_by(
                    gateway_id=gateway.id,
                    node_id=node_identifier
                ).first()
                
                if not node:
                    print(f"Node {node_identifier} not found for gateway {gateway_identifier}, skipping...")
                    continue
                
                # Update node status
                node.status = 'online'
                node.last_seen = datetime.utcnow()
                node.rssi = node_data.get('rssi')
                node.battery_level = node_data.get('battery')
                
                # Update QR code if present
                qr_code = node_data.get('qr_code')
                if qr_code:
                    node.last_qr_code = qr_code
                
                # Process sensor data
                sensors = node_data.get('sensors', {})
                for adc_type, channels in sensors.items():
                    for channel_key, channel_data in channels.items():
                        # Extract channel number from key (e.g., "ch0" -> 0)
                        channel_num = int(channel_key.replace('ch', ''))
                        
                        # Create sensor data record
                        sensor_record = SensorData(
                            node_id=node.id,
                            timestamp=datetime.utcnow(),
                            adc_type=adc_type,
                            channel=channel_num,
                            raw_value=channel_data.get('raw'),
                            converted_value=channel_data.get('value'),
                            unit=channel_data.get('unit'),
                            qr_code=qr_code
                        )
                        db.session.add(sensor_record)
            
            # Commit all changes
            db.session.commit()
            
            # Broadcast to WebSocket clients
            socketio.emit('sensor_data', {
                'gateway_id': gateway_identifier,
                'timestamp': datetime.utcnow().isoformat(),
                'nodes': nodes_data
            }, namespace='/')
            
            print(f"✓ Processed sensor data from gateway {gateway_identifier}")
            
        except Exception as e:
            print(f"Error handling sensor data: {e}")
            db.session.rollback()
    
    def handle_status(self, topic, payload):
        """Handle status/heartbeat messages"""
        try:
            # Parse gateway_id from topic
            parts = topic.split('/')
            if len(parts) >= 3 and parts[1] == 'gateway':
                gateway_identifier = parts[2]
            else:
                return
            
            # Update gateway status
            gateway = Gateway.query.filter_by(gateway_id=gateway_identifier).first()
            if gateway:
                gateway.last_seen = datetime.utcnow()
                gateway.status = payload.get('status', 'online')
                db.session.commit()
                
                # Broadcast status update
                socketio.emit('gateway_status', {
                    'gateway_id': gateway_identifier,
                    'status': gateway.status,
                    'timestamp': datetime.utcnow().isoformat()
                }, namespace='/')
                
        except Exception as e:
            print(f"Error handling status: {e}")
            db.session.rollback()
    
    def handle_alert(self, topic, payload):
        """Handle alert messages"""
        # TODO: Create alert in database and emit via WebSocket
        print(f"Alert received: {payload}")
        pass
    
    def publish_node_config(self, node):
        """Publish configuration update to a node via MQTT"""
        if not self.client:
            return False
        
        try:
            # Build config payload
            config_payload = {
                'cmd': 'update_config',
                'node_id': node.node_id,
                'config': {
                    'acquisition': node.adc_config if node.adc_config else {},
                    'conversions': node.sensor_conversions if node.sensor_conversions else {},
                    'bluetooth': {
                        'enabled': node.bluetooth_enabled,
                        'scanner_model': node.scanner_model
                    }
                },
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Publish to gateway's command topic
            topic = f"apru40/node/{node.node_id}/config"
            self.client.publish(topic, json.dumps(config_payload))
            
            print(f"✓ Published config update for node {node.node_id}")
            return True
            
        except Exception as e:
            print(f"Error publishing node config: {e}")
            return False
    
    def publish_gateway_command(self, gateway, command, params=None):
        """Publish command to a gateway via MQTT"""
        if not self.client:
            return False
        
        try:
            command_payload = {
                'command': command,
                'params': params if params else {},
                'timestamp': datetime.utcnow().isoformat()
            }
            
            topic = f"{gateway.mqtt_topic_prefix}/cmd"
            self.client.publish(topic, json.dumps(command_payload))
            
            print(f"✓ Published command '{command}' to gateway {gateway.gateway_id}")
            return True
            
        except Exception as e:
            print(f"Error publishing gateway command: {e}")
            return False
    
    def connect(self):
        """Connect to MQTT broker"""
        try:
            # Use CallbackAPIVersion.VERSION2 for paho-mqtt 2.x
            self.client = mqtt.Client(callback_api_version=CallbackAPIVersion.VERSION2)
            self.client.on_connect = self.on_connect
            self.client.on_message = self.on_message
            
            if self.username and self.password:
                self.client.username_pw_set(self.username, self.password)
            
            print(f"Connecting to MQTT broker at {self.broker}:{self.port}...")
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
            
        except Exception as e:
            print(f"✗ Error connecting to MQTT broker: {e}")
    
    def disconnect(self):
        """Disconnect from MQTT broker"""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
    
    def publish(self, topic, payload):
        """Publish message to MQTT broker"""
        if self.client:
            self.client.publish(topic, json.dumps(payload))

# Global MQTT service instance
mqtt_service = MQTTService()
