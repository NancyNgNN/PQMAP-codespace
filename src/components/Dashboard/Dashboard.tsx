import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PQEvent, Substation, SARFIMetrics } from '../../types/database';
import { DashboardLayout, DEFAULT_LAYOUTS, WidgetId } from '../../types/dashboard';
import DashboardLayoutManager from './DashboardLayoutManager';
import SubstationMap from './SubstationMap';
import EventList from './EventList';
import SARFIChart from './SARFIChart';
import StatsCards from './StatsCards';
import RootCauseChart from './RootCauseChart';
import InsightChart from './InsightChart';
import SARFI70Monitor from './SARFI70Monitor';
import AffectedCustomerChart from './AffectedCustomerChart';

export default function Dashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<PQEvent[]>([]);
  const [substations, setSubstations] = useState<Substation[]>([]);
  const [sarfiMetrics, setSarfiMetrics] = useState<SARFIMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [tempLayout, setTempLayout] = useState<DashboardLayout | null>(null);

  useEffect(() => {
    loadDashboardData();
    loadUserLayout();
  }, [user]);
  const loadUserLayout = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('dashboard_layout, role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        // Use admin default as fallback
        setLayout(DEFAULT_LAYOUTS.admin);
        return;
      }

      if (profile?.dashboard_layout) {
        // User has saved layout
        setLayout(profile.dashboard_layout as DashboardLayout);
      } else {
        // Use role-based default
        const defaultLayout = DEFAULT_LAYOUTS[profile?.role || 'admin'];
        setLayout(defaultLayout);
      }
    } catch (error) {
      console.error('Error loading user layout:', error);
      setLayout(DEFAULT_LAYOUTS.admin);
    }
  };
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

  const handleSaveLayout = async () => {
    if (!user || !tempLayout) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ dashboard_layout: tempLayout })
        .eq('id', user.id);

      if (error) throw error;

      setLayout(tempLayout);
      setEditMode(false);
      alert('Dashboard layout saved successfully!');
    } catch (error) {
      console.error('Error saving layout:', error);
      alert('Failed to save layout. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setTempLayout(null);
    setEditMode(false);
  };

  const renderWidget = (widgetId: WidgetId) => {
    const props = { events, substations, sarfiMetrics };
    
    switch (widgetId) {
      case 'stats-cards':
        return <StatsCards events={events} substations={substations} />;
      case 'substation-map':
        return <SubstationMap substations={substations} events={events} />;
      case 'sarfi-chart':
        return <SARFIChart metrics={sarfiMetrics} />;
      case 'root-cause-chart':
        return <RootCauseChart events={events} />;
      case 'insight-chart':
        return <InsightChart events={events} />;
      case 'affected-customer-chart':
        return <AffectedCustomerChart />;
      case 'event-list':
        return <EventList events={events} substations={substations} />;
      case 'sarfi-70-monitor':
        return <SARFI70Monitor events={events} substations={substations} />;
      default:
        return null;
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

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-slate-600">Loading dashboard layout...</p>
        </div>
      </div>
    );
  }

  if (editMode) {
    return (
      <DashboardLayoutManager
        layout={tempLayout || layout}
        onLayoutChange={setTempLayout}
        onSave={handleSaveLayout}
        onCancel={handleCancelEdit}
      />
    );
  }

  const visibleWidgets = layout.widgets
    .filter(w => w.visible)
    .sort((a, b) => a.row - b.row);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Power Quality Dashboard</h1>
          <p className="text-slate-600 mt-1">Real-time monitoring and analysis</p>
        </div>
        <button
          onClick={() => {
            setTempLayout(layout);
            setEditMode(true);
          }}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Customize Dashboard
        </button>
      </div>

      {/* Render widgets based on layout */}
      {visibleWidgets.map((widget, index) => {
        const isHalfWidth = widget.width === 6;
        const nextWidget = visibleWidgets[index + 1];
        const shouldPairWithNext = isHalfWidth && nextWidget?.width === 6 && nextWidget.row === widget.row;

        if (isHalfWidth && shouldPairWithNext) {
          return (
            <div key={`pair-${widget.row}`} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>{renderWidget(widget.id)}</div>
              <div>{renderWidget(nextWidget.id)}</div>
            </div>
          );
        } else if (isHalfWidth && visibleWidgets[index - 1]?.row === widget.row) {
          return null; // Already rendered in pair
        } else {
          return <div key={widget.id}>{renderWidget(widget.id)}</div>;
        }
      })}
    </div>
  );
}
