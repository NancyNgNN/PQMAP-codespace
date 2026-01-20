import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SystemHealth as SystemHealthType } from '../types/database';
import { Settings, CheckCircle, AlertTriangle, Server, Wifi, Database, Link } from 'lucide-react';
import DatabaseControls from './DatabaseControls';

export default function SystemHealth() {
  const [healthData, setHealthData] = useState<SystemHealthType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealthData();
    const interval = setInterval(loadHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHealthData = async () => {
    const { data } = await supabase
      .from('system_health')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(20);

    if (data) setHealthData(data);
    setLoading(false);
  };

  const latestHealth = healthData.reduce((acc, item) => {
    if (!acc[item.component] || new Date(item.checked_at) > new Date(acc[item.component].checked_at)) {
      acc[item.component] = item;
    }
    return acc;
  }, {} as Record<string, SystemHealthType>);

  const components = [
    { id: 'server', name: 'Server', icon: Server },
    { id: 'communication', name: 'Communication', icon: Wifi },
    { id: 'database', name: 'Database', icon: Database },
    { id: 'integration', name: 'Integration', icon: Link },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-700 border-green-200';
      case 'degraded': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'down': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'degraded':
      case 'down': return AlertTriangle;
      default: return Settings;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const healthyCount = Object.values(latestHealth).filter(h => h.status === 'healthy').length;
  const totalCount = Object.keys(latestHealth).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-slate-700" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Health</h1>
          <p className="text-slate-600 mt-1">Monitor system components and watchdog status</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium mb-2 opacity-90">Overall System Status</p>
            <p className="text-4xl font-bold">
              {healthyCount === totalCount ? 'All Systems Operational' : 'Degraded Performance'}
            </p>
            <p className="text-sm mt-2 opacity-75">
              {healthyCount} of {totalCount} components healthy
            </p>
          </div>
          <div className="bg-white/20 p-4 rounded-full">
            {healthyCount === totalCount ? (
              <CheckCircle className="w-12 h-12" />
            ) : (
              <AlertTriangle className="w-12 h-12" />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {components.map((component) => {
          const health = latestHealth[component.id];
          const Icon = component.icon;
          const StatusIcon = health ? getStatusIcon(health.status) : Settings;

          return (
            <div key={component.id} className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-slate-100 p-3 rounded-xl">
                  <Icon className="w-6 h-6 text-slate-700" />
                </div>
                <StatusIcon className={`w-6 h-6 ${
                  health?.status === 'healthy' ? 'text-green-600' :
                  health?.status === 'degraded' ? 'text-yellow-600' :
                  'text-red-600'
                }`} />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">{component.name}</h3>

              {health ? (
                <>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(health.status)}`}>
                    {health.status}
                  </span>
                  <p className="text-sm text-slate-600 mt-3">{health.message}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Last check: {new Date(health.checked_at).toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">No data available</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4">System Integration Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Phase 1 Systems</h3>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Active</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">PQMS</span>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">CPDIS</span>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">UAM</span>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">WIS</span>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Phase 2 Systems</h3>
              <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">Planned</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">ADMS</span>
                <span className="text-xs text-slate-500">Pending</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">GIS</span>
                <span className="text-xs text-slate-500">Pending</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">ERP Enlight</span>
                <span className="text-xs text-slate-500">Pending</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">SMP</span>
                <span className="text-xs text-slate-500">Pending</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Database Management</h2>
        <p className="text-slate-600 mb-4">Manage and populate the database with demo data for testing and development.</p>
        <DatabaseControls onUpdate={loadHealthData} />
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Health Checks</h2>
        <div className="space-y-2">
          {healthData.slice(0, 10).map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${
                  item.status === 'healthy' ? 'bg-green-500' :
                  item.status === 'degraded' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{item.component}</p>
                  <p className="text-xs text-slate-600">{item.message}</p>
                </div>
              </div>
              <span className="text-xs text-slate-500">
                {new Date(item.checked_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
