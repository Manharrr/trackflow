import { useEffect, useRef } from 'react';
import axiosInstance from '../../../api/axios';
import { useChatContext } from '../context/ChatContext';
import { CHAT_ACTIONS } from '../constants';
import { ChatWebSocket } from '../utils/websocket';

export function useChatSocket(conversationId) {
  const { state, dispatch } = useChatContext();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!conversationId) return;

    // Get JWT token from authorization defaults header
    const authHeader = axiosInstance.defaults.headers.common['Authorization'];
    const token = authHeader ? authHeader.split(' ')[1] : null;

    if (!token) {
      console.warn('JWT Access Token not found. WebSocket connection skipped.');
      return;
    }

    const host = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socketUrl = `${protocol}://${host}:8000/ws/chat/conversations/${conversationId}/?token=${token}`;

    const handleMessage = (data) => {
      if (data && data.id) {
        dispatch({
          type: CHAT_ACTIONS.APPEND_MESSAGE,
          payload: {
            conversationId,
            message: data,
          },
        });
      }
    };

    const handleStatusChange = (status) => {
      dispatch({
        type: CHAT_ACTIONS.SET_CONNECTION_STATUS,
        payload: status,
      });
    };

    socketRef.current = new ChatWebSocket(socketUrl, handleMessage, handleStatusChange);
    socketRef.current.connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [conversationId, dispatch]);

  const sendMessage = (messageText) => {
    if (socketRef.current) {
      socketRef.current.send({
        message: messageText,
        message_type: 'text',
      });
    }
  };

  return { sendMessage };
}
