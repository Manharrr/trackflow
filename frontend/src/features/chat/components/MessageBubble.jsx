import React from 'react';

export const MessageBubble = React.memo(({ message, isOwn }) => {
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const bubbleClass = isOwn
    ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
    : 'bg-white text-gray-800 rounded-bl-none border border-gray-100 shadow-sm';

  const containerClass = isOwn ? 'justify-end' : 'justify-start';

  return (
    <div className={`flex w-full ${containerClass} mb-3 px-6`}>
      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${bubbleClass}`}>
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
        <div className="flex items-center justify-end space-x-1.5 mt-1 text-[10px] opacity-75">
          <span>{formatTime(message.created_at)}</span>
          {isOwn && (
            <span>
              {message.is_read ? (
                <svg className="w-3.5 h-3.5 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
