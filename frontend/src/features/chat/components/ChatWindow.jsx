import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { useChatSocket } from '../hooks/useChatSocket';
import { useChatContext } from '../context/ChatContext';
import { CHAT_ACTIONS } from '../constants';
import { chatApi } from '../api/chatApi';

export const ChatWindow = React.memo(({ conversation, currentUser, onBack, connectionStatus }) => {
  const { state, dispatch } = useChatContext();
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const { sendMessage } = useChatSocket(conversation.id);

  const messages = useMemo(() => {
    return state.messagesByConversation[conversation.id] || [];
  }, [state.messagesByConversation, conversation.id]);

  const peerParticipant = useMemo(() => {
    return String(conversation.participant_one.id) === String(currentUser?.user?.id)
      ? conversation.participant_two
      : conversation.participant_one;
  }, [conversation, currentUser]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await chatApi.getMessages(conversation.id);
        dispatch({
          type: CHAT_ACTIONS.SET_MESSAGES,
          payload: {
            conversationId: conversation.id,
            messages: data.results,
            nextCursor: data.next,
            hasMore: !!data.next,
          },
        });
        
        await chatApi.markAsRead(conversation.id);
      } catch (err) {
        console.error('Failed to load message history:', err);
      }
    };
    fetchHistory();
  }, [conversation.id, dispatch]);

  const handleSend = (text) => {
    sendMessage(text);
    const tempId = Math.random().toString(36).substring(7);
    const optimisticMessage = {
      id: tempId,
      conversation: conversation.id,
      sender: currentUser?.user,
      message: text,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    dispatch({
      type: CHAT_ACTIONS.APPEND_MESSAGE,
      payload: {
        conversationId: conversation.id,
        message: optimisticMessage,
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <ChatHeader
        participant={peerParticipant}
        connectionStatus={connectionStatus}
        onBack={onBack}
      />
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto py-4 space-y-2"
      >
        {messages.length > 0 ? (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={String(msg.sender.id) === String(currentUser?.user?.id)}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Send a message to start the conversation!
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput
        onSend={handleSend}
        disabled={connectionStatus !== 'connected'}
      />
    </div>
  );
});

ChatWindow.displayName = 'ChatWindow';
