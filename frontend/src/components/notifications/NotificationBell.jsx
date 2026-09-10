import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

  // Formats counts exceeding 99 to display standard threshold text
  const formatCount = (count) => {
    return count > 99 ? '99+' : count;
  };

  return (
    <div className="relative">
      {/* Trigger Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open notifications dropdown"
        className={`relative p-2 text-slate-400 hover:text-dark-text hover:bg-bg-tint rounded-xl transition-all duration-205 cursor-pointer ${
          isOpen ? 'bg-bg-tint text-dark-text' : ''
        }`}
      >
        <Bell className="h-5 w-5" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white animate-in scale-in duration-200">
            {formatCount(unreadCount)}
          </span>
        )}
      </button>

      {/* Dropdown Container */}
      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          loading={loading}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
