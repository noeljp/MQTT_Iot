"""
Main application entry point
"""
from app import app, socketio

if __name__ == '__main__':
    # Start the Flask-SocketIO server
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
