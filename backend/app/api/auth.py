"""
Authentication API endpoints
"""
from flask import Blueprint, request, jsonify
import jwt
from datetime import datetime, timedelta
from functools import wraps
import os

bp = Blueprint('auth', __name__)

# Mock user data for demo
DEMO_USER = {
    'username': 'admin',
    'password': 'admin123',  # In production, use hashed passwords
    'email': 'admin@apru40.local',
    'role': 'admin'
}

def token_required(f):
    """Decorator to protect routes with JWT authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'message': 'Token format invalid'}), 401
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production'), algorithms=['HS256'])
            current_user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

@bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Username and password required'}), 400
    
    # Demo authentication
    if data['username'] == DEMO_USER['username'] and data['password'] == DEMO_USER['password']:
        # Generate JWT token
        token = jwt.encode({
            'username': DEMO_USER['username'],
            'email': DEMO_USER['email'],
            'role': DEMO_USER['role'],
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production'), algorithm='HS256')
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'username': DEMO_USER['username'],
                'email': DEMO_USER['email'],
                'role': DEMO_USER['role']
            }
        }), 200
    
    return jsonify({'message': 'Invalid credentials'}), 401

@bp.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    """Get current user profile"""
    return jsonify({
        'username': current_user['username'],
        'email': current_user['email'],
        'role': current_user['role']
    }), 200

@bp.route('/refresh', methods=['POST'])
@token_required
def refresh_token(current_user):
    """Refresh JWT token"""
    new_token = jwt.encode({
        'username': current_user['username'],
        'email': current_user['email'],
        'role': current_user['role'],
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production'), algorithm='HS256')
    
    return jsonify({'token': new_token}), 200
