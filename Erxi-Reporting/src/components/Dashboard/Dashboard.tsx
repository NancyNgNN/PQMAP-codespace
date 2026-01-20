import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PQEvent, Substation, SARFIMetrics } from '../../types/database';
import SubstationMap from './SubstationMap';
import EventList from './EventList';
import SARFIChart from './SARFIChart';
import StatsCards from './StatsCards';
import RootCauseChart from './RootCauseChart';
import InsightChart from './InsightChart';
import SARFI70Monitor from './SARFI70Monitor';

export default function Dashboard() {
  const [events, setEvents] = useState<PQEvent[]>([]);
  const [substations, setSubstations] = useState<Substation[]>([]);
  const [sarfiMetrics, setSarfiMetrics] = useState<SARFIMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [eventsRes, substationsRes, sarfiRes] = await Promise.all([
        supabase
          .from('pq_events')
          .select('*, substation:substations(*)', { count: 'exact' })
          .gte('timestamp', '2023-01-01')
          .order('timestamp', { ascending: false })
          .limit(5000),
        supabase.from('substations').select('*'),
        supabase
          .from('sarfi_metrics')
          .select('*')
          .gte('period_year', new Date().getFullYear() - 1)
          .order('period_year', { ascending: true })
          .order('period_month', { ascending: true }),
      ]);

      if (!eventsRes.error) setEvents(eventsRes.data);
      if (!substationsRes.error) setSubstations(substationsRes.data);
      if (!sarfiRes.error) setSarfiMetrics(sarfiRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Power Quality Dashboard</h1>
          <p className="text-slate-600 mt-1">Real-time monitoring and analysis</p>
        </div>
      </div>

      <StatsCards events={events} substations={substations} />

      <SubstationMap substations={substations} events={events} />

      {/* SARFI Chart - Full Width with integrated data table */}
      <SARFIChart metrics={sarfiMetrics} />

      {/* Root Cause Chart & Insight Chart - Half Width Each */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RootCauseChart events={events} />
        <InsightChart events={events} />
      </div>

      <EventList events={events} substations={substations} />

      {/* SARFI-70 KPI Monitoring - Full Width */}
      <SARFI70Monitor events={events} substations={substations} />
    </div>
  );
}
