"""
MQTT client service for connecting to the MQTT broker
"""
import paho.mqtt.client as mqtt
from paho.mqtt.client import CallbackAPIVersion
import os
import json
from datetime import datetime

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
            print(f"✓ Subscribed to APRU40 topics")
        else:
            print(f"✗ Failed to connect to MQTT broker, return code {rc}")
    
    def on_message(self, client, userdata, msg):
        """Callback when message received"""
        try:
            payload = json.loads(msg.payload.decode())
            topic = msg.topic
            
            print(f"Received message on {topic}: {payload}")
            
            # Handle different topic types
            if '/data' in topic:
                self.handle_sensor_data(topic, payload)
            elif '/alert' in topic:
                self.handle_alert(topic, payload)
            elif '/status' in topic:
                self.handle_status(topic, payload)
                
        except Exception as e:
            print(f"Error processing MQTT message: {e}")
    
    def handle_sensor_data(self, topic, payload):
        """Handle sensor data messages"""
        # In a real implementation, save to database and emit via WebSocket
        pass
    
    def handle_alert(self, topic, payload):
        """Handle alert messages"""
        # In a real implementation, create alert in database and emit via WebSocket
        pass
    
    def handle_status(self, topic, payload):
        """Handle status messages"""
        # In a real implementation, update device status and emit via WebSocket
        pass
    
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
