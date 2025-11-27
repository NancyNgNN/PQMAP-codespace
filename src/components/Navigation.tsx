import { LayoutDashboard, Activity, Database, FileText, Bell, Settings, LogOut, BarChart3, Wrench } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Navigation({ currentView, onViewChange }: NavigationProps) {
  const { profile, signOut } = useAuth();

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'events', icon: Activity, label: 'Event Management' },
    { id: 'analytics', icon: BarChart3, label: 'Data Analytics' },
    { id: 'assets', icon: Database, label: 'Asset Management' },
    { id: 'reports', icon: FileText, label: 'Reports' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'services', icon: Wrench, label: 'PQ Services' },
    { id: 'health', icon: Settings, label: 'System Health' },
  ];

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white w-64 min-h-screen flex flex-col shadow-2xl">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          PQMAP
        </h1>
        <p className="text-xs text-slate-400 mt-1">Power Quality Analytics</p>
      </div>

      <div className="flex-1 py-6">
        <nav className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/30'
                    : 'hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-6 border-t border-slate-700 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-sm font-bold">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{profile?.full_name}</p>
            <p className="text-xs text-slate-400 capitalize">{profile?.role}</p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-700/50 transition-all text-slate-300 hover:text-white"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
