import { CHAT_ACTIONS } from '../constants';

export const initialState = {
  conversations: [],
  selectedConversation: null,
  messagesByConversation: {},
  unreadCounts: {},
  onlineUsers: [],
  typingUsers: {}, // Maps conversationId to list of typing user IDs
  loading: false,
  error: null,
  connectionStatus: 'idle',
  pagination: {} // Maps conversationId to { nextCursor: null, hasMore: false }
};

export function chatReducer(state, action) {
  switch (action.type) {
    case CHAT_ACTIONS.SET_CONVERSATIONS:
      return {
        ...state,
        conversations: action.payload,
      };
    case CHAT_ACTIONS.SET_SELECTED_CONVERSATION:
      return {
        ...state,
        selectedConversation: action.payload,
      };
    case CHAT_ACTIONS.SET_MESSAGES: {
      const { conversationId, messages, nextCursor, hasMore } = action.payload;
      return {
        ...state,
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: messages,
        },
        pagination: {
          ...state.pagination,
          [conversationId]: { nextCursor, hasMore },
        },
      };
    }
    case CHAT_ACTIONS.APPEND_MESSAGE: {
      const { conversationId, message } = action.payload;
      const currentMessages = state.messagesByConversation[conversationId] || [];

      // Prevent duplicate appends of the exact same message ID
      if (currentMessages.some((msg) => msg.id === message.id)) {
        return state;
      }

      // Check if this is a real message from the socket that matches an optimistic message
      const isRealMessage = !isNaN(Number(message.id)) || (typeof message.id === 'string' && message.id.includes('-'));
      let replacedOptimistic = false;

      const updatedMessages = currentMessages.map((msg) => {
        const isTempId = isNaN(Number(msg.id)) && !(typeof msg.id === 'string' && msg.id.includes('-'));
        if (
          isRealMessage &&
          isTempId &&
          msg.message === message.message &&
          String(msg.sender.id) === String(message.sender.id)
        ) {
          replacedOptimistic = true;
          return message; // Replace optimistic message with real message
        }
        return msg;
      });

      const finalMessages = replacedOptimistic ? updatedMessages : [...currentMessages, message];

      // Update last message metadata and sort descending
      const updatedConversations = state.conversations.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            last_message: message.message,
            last_message_time: message.created_at,
          };
        }
        return conv;
      }).sort((a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0));

      return {
        ...state,
        conversations: updatedConversations,
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: finalMessages,
        },
      };
    }
    case CHAT_ACTIONS.UPDATE_MESSAGE_STATUS: {
      const { conversationId, messageId, status } = action.payload;
      const currentMessages = state.messagesByConversation[conversationId] || [];
      return {
        ...state,
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: currentMessages.map((msg) =>
            msg.id === messageId ? { ...msg, ...status } : msg
          ),
        },
      };
    }
    case CHAT_ACTIONS.MARK_AS_READ: {
      const { conversationId, userId } = action.payload;
      const currentMessages = state.messagesByConversation[conversationId] || [];
      return {
        ...state,
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: currentMessages.map((msg) =>
            msg.sender !== userId ? { ...msg, is_read: true, read_at: new Date().toISOString() } : msg
          ),
        },
      };
    }
    case CHAT_ACTIONS.SET_ONLINE_USERS:
      return {
        ...state,
        onlineUsers: action.payload,
      };
    case CHAT_ACTIONS.SET_TYPING_USERS: {
      const { conversationId, users } = action.payload;
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: users,
        },
      };
    }
    case CHAT_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case CHAT_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };
    case CHAT_ACTIONS.SET_CONNECTION_STATUS:
      return {
        ...state,
        connectionStatus: action.payload,
      };
    case CHAT_ACTIONS.SET_PAGINATION: {
      const { conversationId, nextCursor, hasMore } = action.payload;
      return {
        ...state,
        pagination: {
          ...state.pagination,
          [conversationId]: { nextCursor, hasMore },
        },
      };
    }
    default:
      return state;
  }
}
