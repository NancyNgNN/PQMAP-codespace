import React, { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { CriticalMessage } from '../types/critical-message';

// Storage key for dismissed messages
const DISMISSED_KEY = 'pqmap_dismissed_messages';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedMessages, setDismissedMessages] = useState<CriticalMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadDismissedMessages();
    // Refresh every 5 seconds to catch new dismissals
    const interval = setInterval(loadDismissedMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDismissedMessages = () => {
    try {
      const stored = localStorage.getItem(DISMISSED_KEY);
      if (stored) {
        const messages: CriticalMessage[] = JSON.parse(stored);
        // Sort by dismissed time (most recent first)
        messages.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        setDismissedMessages(messages);
        
        // Count unread (dismissed in last hour)
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const unread = messages.filter(msg => 
          new Date(msg.updated_at).getTime() > oneHourAgo
        ).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Failed to load dismissed messages:', error);
    }
  };

  const handleClearAll = () => {
    if (confirm('Clear all dismissed messages?')) {
      localStorage.removeItem(DISMISSED_KEY);
      setDismissedMessages([]);
      setUnreadCount(0);
      setIsOpen(false);
    }
  };

  const handleRemoveMessage = (id: string) => {
    try {
      const filtered = dismissedMessages.filter(msg => msg.id !== id);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(filtered));
      setDismissedMessages(filtered);
      
      // Recalculate unread count
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const unread = filtered.filter(msg => 
        new Date(msg.updated_at).getTime() > oneHourAgo
      ).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to remove message:', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('.notification-bell-container')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative notification-bell-container">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
        title="Dismissed notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900">Dismissed Messages</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {dismissedMessages.length} message{dismissedMessages.length !== 1 ? 's' : ''}
              </p>
            </div>
            {dismissedMessages.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-slate-600 hover:text-red-600 font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto">
            {dismissedMessages.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No dismissed messages</p>
                <p className="text-xs text-slate-400 mt-1">
                  Messages you dismiss will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {dismissedMessages.map(message => (
                  <div
                    key={message.id}
                    className="p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getSeverityIcon(message.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">
                            {message.title}
                          </h4>
                          <button
                            onClick={() => handleRemoveMessage(message.id)}
                            className="flex-shrink-0 text-slate-400 hover:text-slate-600"
                            title="Remove from list"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                          {message.content}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getSeverityBadge(message.severity)}`}>
                            {message.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatTime(message.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Info */}
          {dismissedMessages.length > 0 && (
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500 text-center">
                💡 Tip: Messages auto-expire based on their end time
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
