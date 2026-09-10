import axiosInstance from '../../../api/axios';

export const chatApi = {
  getConversations: async () => {
    const response = await axiosInstance.get('/chat/conversations/');
    return response.data;
  },

  createConversation: async (participantId) => {
    const response = await axiosInstance.post('/chat/conversations/create/', {
      participant_id: participantId,
    });
    return response.data;
  },

  getMessages: async (conversationId, limit = 50, offset = 0) => {
    const response = await axiosInstance.get(
      `/chat/conversations/${conversationId}/messages/`,
      {
        params: { limit, offset },
      }
    );
    return response.data;
  },

  sendMessage: async (conversationId, message, messageType = 'text') => {
    const response = await axiosInstance.post('/chat/messages/', {
      conversation_id: conversationId,
      message,
      message_type: messageType,
    });
    return response.data;
  },

  markAsRead: async (conversationId) => {
    const response = await axiosInstance.patch('/chat/messages/read/', {
      conversation_id: conversationId,
    });
    return response.data;
  },
};
