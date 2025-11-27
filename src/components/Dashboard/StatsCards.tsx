import { Activity, AlertTriangle, Zap, Building2 } from 'lucide-react';
import { PQEvent, Substation } from '../../types/database';

interface StatsCardsProps {
  events: PQEvent[];
  substations: Substation[];
}

export default function StatsCards({ events, substations }: StatsCardsProps) {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentEvents = events.filter(e => new Date(e.timestamp) > last24Hours);
  const criticalEvents = events.filter(e => e.severity === 'critical' && e.status !== 'resolved');
  const activeSubstations = substations.filter(s => s.status === 'operational');

  const stats = [
    {
      label: 'Total Events (24h)',
      value: recentEvents.length,
      icon: Activity,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'Critical Events',
      value: criticalEvents.length,
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
    },
    {
      label: 'Active Substations',
      value: activeSubstations.length,
      icon: Building2,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      label: 'Avg. Event Duration',
      value: `${Math.round(events.reduce((acc, e) => acc + e.duration_ms, 0) / events.length / 1000)}s`,
      icon: Zap,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-xl`}>
                <Icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
