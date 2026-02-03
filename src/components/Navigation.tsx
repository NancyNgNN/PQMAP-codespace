import { LayoutDashboard, Activity, Database as DatabaseIcon, FileText, Bell, Settings, LogOut, BarChart3, Wrench, Database, ChevronLeft, ChevronRight, Users, MapPin, Network, Scale, Target, Settings2, FileCode, FlaskConical } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Navigation({ currentView, onViewChange, collapsed, onToggleCollapse }: NavigationProps) {
  const { profile, signOut } = useAuth();

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'events', icon: Activity, label: 'Event Management' },
    { id: 'assets', icon: DatabaseIcon, label: 'Asset Management' },
    { id: 'reporting', icon: FileText, label: 'Reporting' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'services', icon: Wrench, label: 'PQ Services' },
  ];

  const dataMaintenanceItems = [
    { id: 'userManagement', icon: Users, label: 'User Management' },
    { id: 'scada', icon: MapPin, label: 'SCADA' },
    { id: 'meterHierarchy', icon: Network, label: 'Meter Hierarchy' },
    { id: 'customerTransformerMatching', icon: Database, label: 'Customer Transformer' },
    { id: 'weightingFactors', icon: Scale, label: 'Weighting Factors' },
    { id: 'pqBenchmarking', icon: Target, label: 'PQ Standard' },
    { id: 'systemParameters', icon: Settings2, label: 'System Parameters' },
  ];

  return (
    <div className={`bg-gradient-to-b from-slate-900 to-slate-800 text-white min-h-screen flex flex-col shadow-2xl relative transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="p-6 border-b border-slate-700">
        {!collapsed ? (
          <>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              PQMAP
            </h1>
            <p className="text-xs text-slate-400 mt-1">Power Quality Analytics</p>
          </>
        ) : (
          <div className="text-center">
            <div className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              PQ
            </div>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center border-2 border-slate-600 transition-all z-10 shadow-lg"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      <div className="flex-1 py-6">
        <nav className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 rounded-lg transition-all ${
                    collapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/30'
                      : 'hover:bg-slate-700/50'
                  }`}
                  title={collapsed ? item.label : ''}
                >
                  <Icon className="w-5 h-5" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </button>
                {collapsed && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                    {item.label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Data Maintenance Section */}
        <div className="mt-6 px-3">
          {!collapsed && (
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-2">
              Data Maintenance
            </div>
          )}
          {collapsed && (
            <div className="h-px bg-slate-700 mb-2"></div>
          )}
          <div className="space-y-1">
            {dataMaintenanceItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center gap-3 rounded-lg transition-all ${
                      collapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'
                    } ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/30'
                        : 'hover:bg-slate-700/50'
                    }`}
                    title={collapsed ? item.label : ''}
                  >
                    <Icon className="w-5 h-5" />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </button>
                  {collapsed && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                      {item.label}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-700 space-y-4">
        {!collapsed ? (
          <>
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
          </>
        ) : (
          <>
            <div className="relative group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-sm font-bold mx-auto">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                {profile?.full_name}
                <div className="text-xs text-slate-400 capitalize">{profile?.role}</div>
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
              </div>
            </div>

            <div className="relative group">
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-700/50 transition-all text-slate-300 hover:text-white"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                Sign Out
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
