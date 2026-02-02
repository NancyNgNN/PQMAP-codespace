import React, { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, InfoIcon, X } from 'lucide-react';
import type { CriticalMessage } from '../types/critical-message';
import mockMessages from '../data/mockCriticalMessages.json';

// 🎨 DEMO MODE: Using mock data from JSON file
const DISMISSED_KEY = 'pqmap_dismissed_messages';

export default function CriticalMessageBar() {
  const [messages, setMessages] = useState<CriticalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMessages();
    
    // 🔑 Listen for storage changes from NotificationLogs component
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pqmap_demo_critical_messages') {
        loadMessages();
      }
    };
    
    // Also check for custom event from NotificationLogs
    const handleCriticalMessageUpdate = () => {
      loadMessages();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('criticalMessageUpdate', handleCriticalMessageUpdate);
    const interval = setInterval(loadMessages, 30000); // Refresh every 30 seconds
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('criticalMessageUpdate', handleCriticalMessageUpdate);
      clearInterval(interval);
    };
  }, []);

  const loadMessages = async () => {
    try {
      // Load from localStorage first (updates from NotificationLogs component)
      const stored = localStorage.getItem('pqmap_demo_critical_messages');
      const messagesToUse = stored ? JSON.parse(stored) : mockMessages;
      
      // Use mock data from JSON file (Demo Mode)
      const now = new Date();
      const activeMessages = messagesToUse.filter((msg: CriticalMessage) => {
        if (!msg.is_active) return false;
        const startTime = new Date(msg.start_time);
        const endTime = msg.end_time ? new Date(msg.end_time) : null;
        return startTime <= now && (!endTime || endTime > now);
      });
      
      // 🔑 Sort by creation date descending (newest first)
      const sortedMessages = (activeMessages as CriticalMessage[]).sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setMessages(sortedMessages);
    } catch (error) {
      console.error('Error loading critical messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (id: string) => {
    // Add to dismissed set for current session
    setDismissedIds(prev => new Set(prev).add(id));
    
    // Save to localStorage for notification bell
    try {
      const dismissedMessage = messages.find(msg => msg.id === id);
      if (dismissedMessage) {
        const stored = localStorage.getItem(DISMISSED_KEY);
        const dismissedList: CriticalMessage[] = stored ? JSON.parse(stored) : [];
        
        // Add message with updated timestamp (dismissed time)
        const messageWithDismissTime = {
          ...dismissedMessage,
          updated_at: new Date().toISOString()
        };
        
        // Keep only last 20 dismissed messages
        dismissedList.unshift(messageWithDismissTime);
        if (dismissedList.length > 20) {
          dismissedList.pop();
        }
        
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedList));
      }
    } catch (error) {
      console.error('Failed to save dismissed message:', error);
    }
  };

  const visibleMessages = messages.filter(msg => !dismissedIds.has(msg.id));

  if (loading || visibleMessages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 px-4 pt-4">
      {visibleMessages.map(message => {
        const bgColor =
          message.severity === 'critical'
            ? 'bg-red-50 border-red-300'
            : message.severity === 'warning'
              ? 'bg-yellow-50 border-yellow-300'
              : 'bg-blue-50 border-blue-300';

        const textColor =
          message.severity === 'critical'
            ? 'text-red-800'
            : message.severity === 'warning'
              ? 'text-yellow-800'
              : 'text-blue-800';

        const iconColor =
          message.severity === 'critical'
            ? 'text-red-600'
            : message.severity === 'warning'
              ? 'text-yellow-600'
              : 'text-blue-600';

        const IconComponent =
          message.severity === 'critical'
            ? AlertTriangle
            : message.severity === 'warning'
              ? AlertCircle
              : InfoIcon;

        return (
          <div
            key={message.id}
            className={`border-l-4 rounded-lg p-4 ${bgColor} flex items-start justify-between gap-4`}
          >
            <div className="flex items-start gap-3 flex-1">
              <IconComponent className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold ${textColor}`}>{message.title}</h3>
                <p className={`text-sm mt-1 ${textColor} opacity-90`}>{message.content}</p>
                {message.end_time && (
                  <p className={`text-xs mt-2 ${textColor} opacity-75`}>
                    Valid until: {new Date(message.end_time).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDismiss(message.id)}
              className={`flex-shrink-0 p-2 rounded-lg hover:bg-red-100 transition-colors ${iconColor}`}
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
