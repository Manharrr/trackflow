import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import {
  getNotifications,
  markNotificationAsRead as apiMarkAsRead,
  markAllNotificationsAsRead as apiMarkAllAsRead
} from '../services/notificationApi';
import { getWebSocketBaseUrl } from '../services/authSession';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  // Fetch initial notifications list
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data.results || []);
      setUnreadCount(data.unread_count || 0);
      setError(null);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mark single notification as read
  const markAsRead = async (id) => {
    try {
      const updated = await apiMarkAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: updated.read_at } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(`Failed to mark notification ${id} as read:`, err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await apiMarkAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // WebSocket connection initialization
  const connectWebSocket = useCallback(() => {
    if (!user) return;

    // Retrieve active JWT token from axios headers
    const authHeader = axiosInstance.defaults.headers.common['Authorization'];
    const token = authHeader ? authHeader.split(' ')[1] : null;

    if (!token) {
      console.warn('JWT token not found for notifications WebSocket connection.');
      return;
    }

    const wsBaseUrl = getWebSocketBaseUrl(window);
    // Dynamic WebSocket URL with token query param
    const wsUrl = `${wsBaseUrl}/ws/notifications/?token=${token}`;

    setConnectionStatus('connecting');

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'notification' && payload.data) {
            const newNotif = payload.data;

            // Check for duplicates
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) return prev;

              // Trigger toast notification using react-hot-toast
              toast.success(` ${newNotif.title}\n${newNotif.message}`, { duration: 5000 });

              // Dispatch window event if it's a new courier assignment
              if (newNotif.notification_type === 'SHIPMENT_ASSIGNED' && newNotif.order_id) {
                console.log('Dispatching orderAssigned custom event for:', newNotif.order_id);
                window.dispatchEvent(new CustomEvent('orderAssigned', {
                  detail: { orderId: newNotif.order_id }
                }));
              }

              return [newNotif, ...prev];
            });

            setUnreadCount((prev) => prev + 1);
          }
        } catch (parseErr) {
          console.error('Failed to parse WebSocket notification JSON:', parseErr);
        }
      };

      socket.onclose = () => {
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Exponential backoff reconnect strategy
        if (user) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;

          reconnectTimerRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        }
      };

      socket.onerror = (err) => {
        console.error('Notifications WebSocket error:', err);
      };

    } catch (wsErr) {
      console.error('Notifications WebSocket initiation failed:', wsErr);
    }
  }, [user]);

  // Manage REST call and WebSocket connection states
  useEffect(() => {
    if (user) {
      fetchNotifications();
      connectWebSocket();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setConnectionStatus('disconnected');
    }

    return () => {
      // Cleanup WebSocket connection and reconnect timers on unmount
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [user, fetchNotifications, connectWebSocket]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    connectionStatus,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
}
