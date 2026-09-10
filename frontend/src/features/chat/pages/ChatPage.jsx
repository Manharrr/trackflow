import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useChatContext } from '../context/ChatContext';
import { chatApi } from '../api/chatApi';
import { CHAT_ACTIONS } from '../constants';
import { ChatSidebar } from '../components/ChatSidebar';
import { ChatWindow } from '../components/ChatWindow';
import { EmptyChatState } from '../components/EmptyChatState';

export function ChatPage() {
  const { user } = useAuth();
  const { state, dispatch } = useChatContext();
  const [selectedConv, setSelectedConv] = useState(null);

  useEffect(() => {
    const fetchRooms = async () => {
      dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: true });
      try {
        const rooms = await chatApi.getConversations();
        dispatch({ type: CHAT_ACTIONS.SET_CONVERSATIONS, payload: rooms });
      } catch (err) {
        dispatch({ type: CHAT_ACTIONS.SET_ERROR, payload: 'Failed to load conversations.' });
      } finally {
        dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: false });
      }
    };
    fetchRooms();
  }, [dispatch]);

  const handleSelect = (conv) => {
    setSelectedConv(conv);
    dispatch({ type: CHAT_ACTIONS.SET_SELECTED_CONVERSATION, payload: conv });
  };

  const handleBack = () => {
    setSelectedConv(null);
    dispatch({ type: CHAT_ACTIONS.SET_SELECTED_CONVERSATION, payload: null });
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          selectedConv ? 'hidden' : 'block'
        } md:block w-full md:w-[320px] h-full flex-shrink-0`}
      >
        <ChatSidebar
          conversations={state.conversations}
          selectedId={selectedConv?.id}
          onSelect={handleSelect}
          currentUser={user}
        />
      </div>

      {/* Main Chat Window */}
      <div
        className={`${
          selectedConv ? 'block' : 'hidden'
        } md:block flex-1 h-full`}
      >
        {selectedConv ? (
          <ChatWindow
            conversation={selectedConv}
            currentUser={user}
            connectionStatus={state.connectionStatus}
            onBack={handleBack}
          />
        ) : (
          <EmptyChatState />
        )}
      </div>
    </div>
  );
}

export default ChatPage;
