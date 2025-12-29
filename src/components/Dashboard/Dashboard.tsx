import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PQEvent, Substation, SARFIMetrics, UserRole } from '../../types/database';
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
import ReportBuilder from './ReportBuilder/ReportBuilder';

export default function Dashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<PQEvent[]>([]);
  const [substations, setSubstations] = useState<Substation[]>([]);
  const [sarfiMetrics, setSarfiMetrics] = useState<SARFIMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [tempLayout, setTempLayout] = useState<DashboardLayout | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('admin');

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
        console.error('[Dashboard] Error loading user profile:', error);
        // Use admin default as fallback
        setLayout(DEFAULT_LAYOUTS.admin);
        setUserRole('admin');
        return;
      }

      const role = (profile?.role || 'admin') as UserRole;
      setUserRole(role);
      console.log('[Dashboard] User role:', role);

      if (profile?.dashboard_layout) {
        // User has saved layout
        console.log('[Dashboard] Loaded custom layout');
        setLayout(profile.dashboard_layout as DashboardLayout);
      } else {
        // Use role-based default
        const defaultLayout = DEFAULT_LAYOUTS[role];
        console.log('[Dashboard] Using default layout for role:', role);
        setLayout(defaultLayout);
      }
    } catch (error) {
      console.error('[Dashboard] Error loading user layout:', error);
      setLayout(DEFAULT_LAYOUTS.admin);
      setUserRole('admin');
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
      console.log('[Dashboard] Saving layout:', tempLayout);
      const { error } = await supabase
        .from('profiles')
        .update({ dashboard_layout: tempLayout })
        .eq('id', user.id);

      if (error) throw error;

      setLayout(tempLayout);
      setEditMode(false);
      alert('Dashboard layout saved successfully!');
    } catch (error) {
      console.error('[Dashboard] Error saving layout:', error);
      alert('Failed to save layout. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setTempLayout(null);
    setEditMode(false);
  };

  const handleResetToDefault = () => {
    const defaultLayout = DEFAULT_LAYOUTS[userRole];
    const confirmed = window.confirm(
      `Are you sure you want to reset the dashboard to the default ${userRole} layout? This will discard your current customizations.`
    );
    
    if (confirmed) {
      console.log('[Dashboard] Resetting to default layout for role:', userRole);
      setTempLayout(defaultLayout);
    }
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
      case 'report-builder':
        return <ReportBuilder events={events} substations={substations} />;
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
        onResetToDefault={handleResetToDefault}
      />
    );
  }

  const visibleWidgets = layout.widgets
    .filter(w => w.visible)
    .sort((a, b) => a.row - b.row);

  console.log('[Dashboard] Rendering visible widgets:', visibleWidgets);

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
        
        // Two consecutive half-width widgets should pair side-by-side
        const shouldPairWithNext = isHalfWidth && 
                                   nextWidget?.width === 6 && 
                                   (nextWidget.row === widget.row || nextWidget.row === widget.row + 1);

        console.log(`[Dashboard] Widget ${widget.id}: width=${widget.width}, row=${widget.row}, index=${index}`);
        if (nextWidget) {
          console.log(`[Dashboard]   Next: ${nextWidget.id}, width=${nextWidget.width}, row=${nextWidget.row}, shouldPair=${shouldPairWithNext}`);
        }

        if (isHalfWidth && shouldPairWithNext) {
          console.log(`[Dashboard] Pairing ${widget.id} with ${nextWidget.id} on row ${widget.row}`);
          return (
            <div key={`pair-${widget.row}-${index}`} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>{renderWidget(widget.id)}</div>
              <div>{renderWidget(nextWidget.id)}</div>
            </div>
          );
        } else if (isHalfWidth && index > 0) {
          const prevWidget = visibleWidgets[index - 1];
          const wasPairedWithPrev = prevWidget?.width === 6 && 
                                    (prevWidget.row === widget.row || prevWidget.row === widget.row - 1);
          if (wasPairedWithPrev) {
            console.log(`[Dashboard] Skipping ${widget.id} - already paired with previous`);
            return null; // Already rendered in pair
          }
        }
        
        console.log(`[Dashboard] Rendering ${widget.id} as single widget (width: ${widget.width === 12 ? 'full' : 'half'})`);
        return <div key={widget.id}>{renderWidget(widget.id)}</div>;
      })}
    </div>
  );
}
