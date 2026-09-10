import React from 'react';
import { Truck, Clock, AlertTriangle, Bell, Check, Eye } from 'lucide-react';

/**
 * Returns the appropriate Lucide icon element based on the notification type.
 */
const getNotificationIcon = (type) => {
  switch (type) {
    case 'SHIPMENT_ASSIGNED':
      return (
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50 flex-shrink-0">
          <Truck className="h-4 w-4" />
        </div>
      );
    case 'SHIPMENT_STATUS':
      return (
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/50 flex-shrink-0">
          <Bell className="h-4 w-4" />
        </div>
      );
    case 'DELAY_ALERT':
      return (
        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/50 flex-shrink-0">
          <Clock className="h-4 w-4" />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-100/50 flex-shrink-0">
          <Bell className="h-4 w-4" />
        </div>
      );
  }
};

/**
 * Formats timestamps into readable relative string indicators.
 */
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function NotificationDropdown({
  notifications,
  loading,
  markAsRead,
  markAllAsRead,
  onClose
}) {
  return (
    <>
      {/* Backdrop to close dropdown on outer click */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-border-light shadow-2xl rounded-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-light/60 flex items-center justify-between bg-white/50 backdrop-blur-sm">
          <div>
            <h3 className="text-sm font-extrabold text-dark-text tracking-tight">Notifications</h3>
            <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">Real-time alerts</p>
          </div>
          {notifications.some((n) => !n.is_read) && (
            <button
              onClick={() => {
                markAllAsRead();
              }}
              className="text-xs font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* List Content */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border-light/40">
          {loading ? (
            // Loading state skeleton
            <div className="p-5 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-0.5">
                    <div className="h-3.5 bg-slate-100 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            // Empty state
            <div className="py-12 px-5 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-350 flex items-center justify-center border border-slate-100/50 mb-3.5">
                <Bell className="h-5 w-5" />
              </div>
              <span className="block text-sm font-bold text-dark-text">No notifications yet</span>
              <span className="block text-xs text-muted-gray mt-1 max-w-[200px]">We will notify you when new assignments arrive.</span>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.is_read) markAsRead(n.id);
                }}
                className={`p-4 flex gap-3.5 items-start hover:bg-slate-50/70 transition-colors cursor-pointer relative ${
                  !n.is_read ? 'bg-primary/5/10 font-medium' : ''
                }`}
              >
                {/* Status indicator unread dot */}
                {!n.is_read && (
                  <span className="absolute top-4.5 right-4 w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}

                {/* Left Side Icon */}
                {getNotificationIcon(n.notification_type)}

                {/* Core Message Text */}
                <div className="flex-1 min-w-0 pr-2">
                  <span className={`block text-sm tracking-tight ${!n.is_read ? 'font-bold text-dark-text' : 'text-slate-600 font-medium'}`}>
                    {n.title}
                  </span>
                  <span className="block text-xs text-muted-gray mt-1 leading-normal break-words">
                    {n.message}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-semibold mt-1.5 font-sans">
                    {formatTimeAgo(n.created_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
