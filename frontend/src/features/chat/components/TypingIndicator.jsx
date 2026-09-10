import React from 'react';

export const TypingIndicator = React.memo(({ username }) => {
  if (!username) return null;

  return (
    <div className="flex items-center space-x-2 p-3 text-sm text-gray-500 italic bg-gray-50 rounded-lg mx-4 my-2 w-max">
      <div className="flex space-x-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{username} is typing...</span>
    </div>
  );
});

TypingIndicator.displayName = 'TypingIndicator';
