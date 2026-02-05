import { useState, useEffect } from 'react';
import { Power } from 'lucide-react';

export default function GlobalNotificationStatus() {
  const [globalNotificationEnabled, setGlobalNotificationEnabled] = useState(() => {
    const saved = localStorage.getItem('globalNotificationEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    // Listen for changes from Notifications page toggle
    const handleGlobalToggle = (event: CustomEvent) => {
      setGlobalNotificationEnabled(event.detail.enabled);
    };
    window.addEventListener('globalNotificationToggle', handleGlobalToggle as EventListener);
    return () => window.removeEventListener('globalNotificationToggle', handleGlobalToggle as EventListener);
  }, []);

  return (
    <div className="relative group">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all shadow-lg cursor-default ${
          globalNotificationEnabled
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
            : 'bg-gradient-to-r from-slate-400 to-gray-400 text-white'
        }`}
      >
        <Power className="w-5 h-5" />
        <span className="text-sm font-semibold">Global Notification System</span>
      </div>

      {/* Tooltip */}
      <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-3">
        <div className="flex items-start gap-2">
          <Power className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
            globalNotificationEnabled ? 'text-green-400' : 'text-slate-400'
          }`} />
          <div>
            <p className="font-semibold mb-1">
              {globalNotificationEnabled ? 'Global Notifications Enabled' : 'Global Notifications Disabled'}
            </p>
            <p className="text-xs text-slate-300">
              {globalNotificationEnabled 
                ? 'All automated email notifications (Voltage Dips, Health Alerts, Reports) are active. Go to Notification Management to change settings.'
                : 'All automated notifications are suppressed. No emails will be sent. Go to Notification Management to re-enable.'}
            </p>
          </div>
        </div>
        <div className="absolute bottom-full right-4 border-4 border-transparent border-b-slate-900"></div>
      </div>
    </div>
  );
}
