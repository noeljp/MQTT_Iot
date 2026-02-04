/**
 * WebSocket service for real-time communication
 */
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('connection_response', (data) => {
      console.log('Connection response:', data);
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventListeners() {
    const events = [
      'device:heartbeat',
      'device:status_change',
      'device:sensor_data',
      'alert:new',
      'device:config_applied',
    ];

    events.forEach((event) => {
      this.socket?.on(event, (data) => {
        console.log(`WebSocket event: ${event}`, data);
        this.notifyListeners(event, data);
      });
    });
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private notifyListeners(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  joinRoom(room: string) {
    this.socket?.emit('join', { room });
  }

  leaveRoom(room: string) {
    this.socket?.emit('leave', { room });
  }

  requestUpdate() {
    this.socket?.emit('request_update', {});
  }
}

export const websocketService = new WebSocketService();
export default websocketService;
