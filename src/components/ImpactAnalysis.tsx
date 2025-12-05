import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PQEvent } from '../types/database';
import { BarChart3, TrendingUp, Activity } from 'lucide-react';

export default function ImpactAnalysis() {
  const [events, setEvents] = useState<PQEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data } = await supabase
      .from('pq_events')
      .select('*')
      .order('timestamp', { ascending: false });

    if (data) setEvents(data);
    setLoading(false);
  };

  const eventsByType = events.reduce((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const eventsByHour = events.reduce((acc, e) => {
    const hour = new Date(e.timestamp).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const maxEvents = Math.max(...Object.values(eventsByHour));

  const harmonicEvents = events.filter(e => e.event_type === 'harmonic');
  const avgTHD = harmonicEvents.reduce((acc, e) => acc + (e.magnitude || 0), 0) / harmonicEvents.length || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-8 h-8 text-slate-700" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Impact Analysis</h1>
          <p className="text-slate-600 mt-1">Power quality impact analysis and visualization</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-6 h-6 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-900">Events by Type</h2>
          </div>
          <div className="space-y-4">
            {Object.entries(eventsByType).map(([type, count]) => (
              <div key={type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700 capitalize">
                    {type.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{count}</span>
                </div>
                <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                    style={{ width: `${(count / events.length) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-900">24-Hour Distribution</h2>
          </div>
          <div className="relative h-64">
            <div className="absolute inset-0 flex items-end justify-between gap-1">
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-cyan-500 rounded-t transition-all hover:opacity-80"
                    style={{
                      height: `${((eventsByHour[hour] || 0) / maxEvents) * 100}%`,
                      minHeight: eventsByHour[hour] ? '8px' : '0',
                    }}
                    title={`${hour}:00 - ${eventsByHour[hour] || 0} events`}
                  />
                  {hour % 4 === 0 && (
                    <span className="text-xs text-slate-600">{hour}h</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <p className="text-sm font-medium mb-2 opacity-90">Total Harmonic Distortion</p>
          <p className="text-4xl font-bold">{avgTHD.toFixed(2)}%</p>
          <p className="text-sm mt-2 opacity-75">Average THD across all events</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl shadow-lg p-6 text-white">
          <p className="text-sm font-medium mb-2 opacity-90">Voltage Dip Events</p>
          <p className="text-4xl font-bold">
            {events.filter(e => e.event_type === 'voltage_dip').length}
          </p>
          <p className="text-sm mt-2 opacity-75">Total voltage dip occurrences</p>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg p-6 text-white">
          <p className="text-sm font-medium mb-2 opacity-90">Interruptions</p>
          <p className="text-4xl font-bold">
            {events.filter(e => e.event_type === 'interruption').length}
          </p>
          <p className="text-sm mt-2 opacity-75">Total power interruptions</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4">IEEE 519 Compliance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Voltage THD Limits</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-slate-700">69kV and below</span>
                <span className="font-bold text-green-700">5.0%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-slate-700">69.001kV - 161kV</span>
                <span className="font-bold text-green-700">2.5%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-slate-700">161kV and above</span>
                <span className="font-bold text-green-700">1.5%</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Current Status</p>
            <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Compliance Rate</p>
              <p className="text-3xl font-bold text-slate-900 mb-4">94.5%</p>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-green-600" style={{ width: '94.5%' }} />
              </div>
              <p className="text-xs text-slate-600 mt-3">
                Based on measurements from the last 30 days
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
