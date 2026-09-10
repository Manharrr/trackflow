import React from 'react';

export const EmptyChatState = React.memo(() => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50 p-6">
      <div className="bg-white p-4 rounded-full shadow-sm mb-4">
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Chat</h3>
      <p className="text-sm text-gray-500 text-center max-w-sm">
        Select a conversation from the sidebar list or start a new one to begin chatting.
      </p>
    </div>
  );
});

EmptyChatState.displayName = 'EmptyChatState';
