import React from 'react';

export const ConversationItem = React.memo(({ conversation, isSelected, onClick, currentUser }) => {
  const getPeerParticipant = () => {
    if (!conversation || !currentUser) return null;
    return String(conversation.participant_one.id) === String(currentUser?.user?.id)
      ? conversation.participant_two
      : conversation.participant_one;
  };

  const peer = getPeerParticipant();
  if (!peer) return null;

  const formatRelativeTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch {
      return '';
    }
  };

  const itemClass = isSelected
    ? 'bg-indigo-50 border-indigo-100'
    : 'hover:bg-gray-50 border-transparent';

  return (
    <div
      onClick={onClick}
      className={`flex items-center px-4 py-3.5 border-l-4 transition duration-150 ease-in-out cursor-pointer ${itemClass}`}
    >
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full bg-indigo-500 text-white flex items-center justify-center font-semibold text-lg uppercase shadow-sm">
          {peer.username?.charAt(0)}
        </div>
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
      </div>
      <div className="flex-1 min-w-0 ml-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800 truncate">{peer.username}</h4>
          <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
            {formatRelativeTime(conversation.updated_at || conversation.created_at)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500 truncate pr-4">
            {conversation.last_message || 'Start a new conversation...'}
          </p>
          {conversation.unread_count > 0 && (
            <span className="flex-shrink-0 flex items-center justify-center h-5 px-1.5 min-w-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold shadow-sm animate-pulse">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

ConversationItem.displayName = 'ConversationItem';
