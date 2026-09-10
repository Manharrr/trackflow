import React from 'react';

export const ChatHeader = React.memo(({ participant, connectionStatus, onBack }) => {
  if (!participant) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center space-x-3">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-semibold text-lg uppercase shadow-sm">
            {participant.username?.charAt(0)}
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-800">{participant.username}</h4>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full capitalize">
              {participant.role || 'employee'}
            </span>
            <span className="text-[10px] text-gray-400">•</span>
            <span className="text-xs text-gray-500 font-medium capitalize">{connectionStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

ChatHeader.displayName = 'ChatHeader';
