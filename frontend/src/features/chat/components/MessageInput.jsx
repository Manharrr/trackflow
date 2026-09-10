import React, { useState, useRef } from 'react';

export const MessageInput = React.memo(({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextChange = (e) => {
    const value = e.target.value;
    if (value.length <= 5000) {
      setText(value);
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end space-x-3 px-6 py-4 bg-white border-t border-gray-100">
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          rows="1"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          className="w-full resize-none bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition duration-150 ease-in-out disabled:opacity-50"
          style={{ maxHeight: '120px' }}
        />
        <div className="absolute right-3 bottom-3 text-[10px] text-gray-400 font-medium">
          {text.length}/5000
        </div>
      </div>
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="flex items-center justify-center p-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm hover:shadow transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {disabled ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        )}
      </button>
    </form>
  );
});

MessageInput.displayName = 'MessageInput';
