"""
MQTT Management API endpoints
Manage Mosquitto broker configuration, users, and ACL
"""
from flask import Blueprint, request, jsonify
import subprocess
import os
import sys
from app.api.auth import token_required

bp = Blueprint('mqtt_admin', __name__)

MOSQUITTO_PASSWORDS_FILE = '/etc/mosquitto/passwords'
MOSQUITTO_ACL_FILE = '/etc/mosquitto/acl'
MOSQUITTO_CONF_FILE = '/etc/mosquitto/mosquitto.conf'
SCRIPT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'scripts')
UPDATE_ACL_SCRIPT = os.path.join(SCRIPT_DIR, 'update_acl.py')

@bp.route('/status', methods=['GET'])
@token_required
def get_broker_status(current_user):
    """Get MQTT broker status"""
    try:
        result = subprocess.run(
            ['systemctl', 'is-active', 'mosquitto'],
            capture_output=True,
            text=True
        )
        status = result.stdout.strip()
        
        # Get broker info
        result_status = subprocess.run(
            ['systemctl', 'status', 'mosquitto'],
            capture_output=True,
            text=True
        )
        
        return jsonify({
            'status': status,
            'running': status == 'active',
            'details': result_status.stdout
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error checking broker status: {str(e)}'}), 500

@bp.route('/users', methods=['GET'])
@token_required
def get_users(current_user):
    """Get list of MQTT users from ACL file"""
    try:
        users = []
        if os.path.exists(MOSQUITTO_ACL_FILE):
            result = subprocess.run(
                ['sudo', 'cat', MOSQUITTO_ACL_FILE],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                return jsonify({'message': 'Error reading ACL file'}), 500
            
            current_user_name = None
            current_permissions = []
            
            for line in result.stdout.split('\n'):
                line = line.strip()
                if line.startswith('user '):
                    # Save previous user
                    if current_user_name:
                        users.append({
                            'username': current_user_name,
                            'permissions': current_permissions.copy()
                        })
                    # Start new user
                    current_user_name = line.split()[1]
                    current_permissions = []
                elif line.startswith('topic '):
                    parts = line.split()
                    if len(parts) >= 3:
                        current_permissions.append({
                            'access': parts[1],
                            'topic': ' '.join(parts[2:])
                        })
            
            # Save last user
            if current_user_name:
                users.append({
                    'username': current_user_name,
                    'permissions': current_permissions
                })
        
        return jsonify({'users': users}), 200
    except Exception as e:
        return jsonify({'message': f'Error reading users: {str(e)}'}), 500

@bp.route('/users', methods=['POST'])
@token_required
def create_user(current_user):
    """Create a new MQTT user"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Username and password required'}), 400
    
    username = data['username']
    password = data['password']
    permissions = data.get('permissions', [])
    
    try:
        # Create user with mosquitto_passwd
        process = subprocess.Popen(
            ['sudo', 'mosquitto_passwd', '-b', MOSQUITTO_PASSWORDS_FILE, username, password],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            return jsonify({'message': f'Error creating user: {stderr.decode()}'}), 500
        
        # Add permissions to ACL file
        if permissions:
            # Read current ACL
            result = subprocess.run(
                ['sudo', 'cat', MOSQUITTO_ACL_FILE],
                capture_output=True,
                text=True
            )
            
            current_acl = result.stdout if result.returncode == 0 else ''
            
            # Append new user
            new_acl = current_acl + f'\nuser {username}\n'
            for perm in permissions:
                new_acl += f"topic {perm['access']} {perm['topic']}\n"
            
            # Write using script
            subprocess.run(
                ['sudo', UPDATE_ACL_SCRIPT, new_acl],
                check=True
            )
        
        # Restart mosquitto to apply changes
        subprocess.run(['sudo', 'systemctl', 'restart', 'mosquitto'])
        
        return jsonify({'message': 'User created successfully'}), 201
    except Exception as e:
        return jsonify({'message': f'Error creating user: {str(e)}'}), 500

@bp.route('/users/<username>', methods=['DELETE'])
@token_required
def delete_user(current_user, username):
    """Delete an MQTT user"""
    try:
        # Remove from password file
        subprocess.run(
            ['sudo', 'mosquitto_passwd', '-D', MOSQUITTO_PASSWORDS_FILE, username],
            check=True
        )
        
        # Remove from ACL file
        if os.path.exists(MOSQUITTO_ACL_FILE):
            result = subprocess.run(
                ['sudo', 'cat', MOSQUITTO_ACL_FILE],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                new_lines = []
                skip = False
                
                for line in lines:
                    if line.strip() == f'user {username}':
                        skip = True
                        continue
                    elif line.strip().startswith('user '):
                        skip = False
                    
                    if not skip:
                        new_lines.append(line)
                
                # Write updated ACL
                new_acl = '\n'.join(new_lines)
                subprocess.run(
                    ['sudo', UPDATE_ACL_SCRIPT, new_acl],
                    check=True
                )
        
        # Restart mosquitto
        subprocess.run(['sudo', 'systemctl', 'restart', 'mosquitto'])
        
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        return jsonify({'message': f'Error deleting user: {str(e)}'}), 500

@bp.route('/users/<username>/permissions', methods=['PUT'])
@token_required
def update_permissions(current_user, username):
    """Update user permissions"""
    data = request.get_json()
    
    if not data or 'permissions' not in data:
        return jsonify({'message': 'Permissions required'}), 400
    
    permissions = data['permissions']
    
    try:
        # Read current ACL
        result = subprocess.run(
            ['sudo', 'cat', MOSQUITTO_ACL_FILE],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            return jsonify({'message': 'Error reading ACL file'}), 500
        
        lines = result.stdout.split('\n')
        new_lines = []
        skip = False
        user_found = False
        
        for line in lines:
            if line.strip() == f'user {username}':
                # Write user and new permissions
                new_lines.append(line)
                for perm in permissions:
                    new_lines.append(f"topic {perm['access']} {perm['topic']}")
                skip = True
                user_found = True
                continue
            elif line.strip().startswith('user '):
                skip = False
            
            if not skip:
                new_lines.append(line)
        
        if not user_found:
            return jsonify({'message': f'User {username} not found in ACL'}), 404
        
        # Write updated ACL
        new_acl = '\n'.join(new_lines)
        subprocess.run(
            ['sudo', UPDATE_ACL_SCRIPT, new_acl],
            check=True
        )
        
        # Restart mosquitto
        subprocess.run(['sudo', 'systemctl', 'restart', 'mosquitto'])
        
        return jsonify({'message': 'Permissions updated successfully'}), 200
    except Exception as e:
        return jsonify({'message': f'Error updating permissions: {str(e)}'}), 500

@bp.route('/config', methods=['GET'])
@token_required
def get_config(current_user):
    """Get current Mosquitto configuration"""
    try:
        result = subprocess.run(
            ['sudo', 'cat', MOSQUITTO_CONF_FILE],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            return jsonify({'message': 'Error reading config file'}), 500
        
        return jsonify({'config': result.stdout}), 200
    except Exception as e:
        return jsonify({'message': f'Error reading config: {str(e)}'}), 500

@bp.route('/test-connection', methods=['POST'])
@token_required
def test_connection(current_user):
    """Test MQTT connection with credentials"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Username and password required'}), 400
    
    username = data['username']
    password = data['password']
    broker = data.get('broker', '10.1.22.2')
    topic = data.get('topic', 'test/connection')
    
    try:
        result = subprocess.run(
            ['mosquitto_pub', '-h', broker, '-u', username, '-P', password, 
             '-t', topic, '-m', 'test'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            return jsonify({'success': True, 'message': 'Connection successful'}), 200
        else:
            return jsonify({
                'success': False, 
                'message': f'Connection failed: {result.stderr}'
            }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error testing connection: {str(e)}'
        }), 500

@bp.route('/restart', methods=['POST'])
@token_required
def restart_broker(current_user):
    """Restart Mosquitto broker"""
    try:
        subprocess.run(['sudo', 'systemctl', 'restart', 'mosquitto'], check=True)
        return jsonify({'message': 'Broker restarted successfully'}), 200
    except Exception as e:
        return jsonify({'message': f'Error restarting broker: {str(e)}'}), 500
