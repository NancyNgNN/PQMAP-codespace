import { useEffect, useState } from 'react';
import { CloudLightning } from 'lucide-react';
import { getSystemConfig } from '../services/notificationService';

export default function TyphoonModeIndicator() {
  const [typhoonMode, setTyphoonMode] = useState(false);
  const [typhoonUntil, setTyphoonUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTyphoonStatus();
    
    // Listen for typhoon mode changes
    const handleTyphoonModeChange = () => {
      loadTyphoonStatus();
    };
    window.addEventListener('typhoonModeChanged', handleTyphoonModeChange);
    
    // Refresh every 30 seconds to check if mode expired
    const interval = setInterval(loadTyphoonStatus, 30000);
    
    return () => {
      window.removeEventListener('typhoonModeChanged', handleTyphoonModeChange);
      clearInterval(interval);
    };
  }, []);

  const loadTyphoonStatus = async () => {
    try {
      const { data } = await getSystemConfig();
      
      if (data) {
        setTyphoonMode(data.typhoon_mode || false);
        setTyphoonUntil(data.typhoon_mode_until || null);
      }
    } catch (error) {
      console.error('Error loading typhoon mode status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !typhoonMode) {
    return null;
  }

  const formatUntil = (until: string) => {
    const date = new Date(until);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div 
      className="relative group"
      title={typhoonUntil ? `Typhoon Mode active until ${formatUntil(typhoonUntil)}` : 'Typhoon Mode active'}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-lg animate-pulse">
        <CloudLightning className="w-5 h-5" />
        <span className="text-sm font-semibold">Typhoon Mode</span>
      </div>
      
      {/* Tooltip */}
      <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-3">
        <div className="flex items-start gap-2">
          <CloudLightning className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Typhoon Mode Active</p>
            <p className="text-xs text-slate-300">
              Notifications are suppressed during severe weather conditions.
            </p>
            {typhoonUntil && (
              <p className="text-xs text-amber-400 mt-2">
                Active until: {formatUntil(typhoonUntil)}
              </p>
            )}
          </div>
        </div>
        <div className="absolute bottom-full right-4 border-4 border-transparent border-b-slate-900"></div>
      </div>
    </div>
  );
}
