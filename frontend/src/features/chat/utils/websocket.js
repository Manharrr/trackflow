export class ChatWebSocket {
  constructor(url, onMessage, onStatusChange) {
    this.url = url;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30000;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.messageQueue = [];
    this.isClosedIntentionally = false;
  }

  connect() {
    this.isClosedIntentionally = false;
    this.onStatusChange('connecting');

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.onStatusChange('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.flushQueue();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message JSON:', e);
        }
      };

      this.socket.onclose = (event) => {
        this.stopHeartbeat();
        if (!this.isClosedIntentionally) {
          this.onStatusChange('disconnected');
          this.scheduleReconnect();
        } else {
          this.onStatusChange('idle');
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };
    } catch (e) {
      console.error('WebSocket Connection Init Failure:', e);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;

    this.onStatusChange('reconnecting');
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      this.messageQueue.push(data);
    }
  }

  flushQueue() {
    while (this.messageQueue.length > 0 && this.socket && this.socket.readyState === WebSocket.OPEN) {
      const data = this.messageQueue.shift();
      this.socket.send(JSON.stringify(data));
    }
  }

  disconnect() {
    this.isClosedIntentionally = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
