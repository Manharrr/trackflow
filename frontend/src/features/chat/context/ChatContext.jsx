import { createContext, useContext, useReducer, useMemo } from 'react';
import { chatReducer, initialState } from './chatReducer';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
