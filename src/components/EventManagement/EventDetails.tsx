import { useState, useEffect } from 'react';
import { Clock, MapPin, Zap, AlertTriangle, Users, ArrowLeft, GitBranch, Trash2 } from 'lucide-react';
import { PQEvent, Substation, EventCustomerImpact } from '../../types/database';
import { supabase } from '../../lib/supabase';
import WaveformDisplay from './WaveformDisplay';

interface EventDetailsProps {
  event: PQEvent;
  substation?: Substation;
  impacts: EventCustomerImpact[];
  onStatusChange: (eventId: string, status: string) => void;
  onEventDeleted?: () => void;
}

export default function EventDetails({ event: initialEvent, substation: initialSubstation, impacts: initialImpacts, onStatusChange, onEventDeleted }: EventDetailsProps) {
  // Navigation state
  const [currentEvent, setCurrentEvent] = useState<PQEvent>(initialEvent);
  const [currentSubstation, setCurrentSubstation] = useState<Substation | undefined>(initialSubstation);
  const [currentImpacts, setCurrentImpacts] = useState<EventCustomerImpact[]>(initialImpacts);
  const [navigationStack, setNavigationStack] = useState<Array<{
    event: PQEvent;
    substation?: Substation;
    impacts: EventCustomerImpact[];
  }>>([]);
  
  // Child events state
  const [childEvents, setChildEvents] = useState<PQEvent[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Update state when props change
  useEffect(() => {
    setCurrentEvent(initialEvent);
    setCurrentSubstation(initialSubstation);
    setCurrentImpacts(initialImpacts);
    // Clear navigation stack when switching to a new top-level event
    setNavigationStack([]);
  }, [initialEvent, initialSubstation, initialImpacts]);

  // Load child events for mother events
  useEffect(() => {
    if (currentEvent.is_mother_event) {
      loadChildEvents(currentEvent.id);
    } else {
      setChildEvents([]);
    }
  }, [currentEvent.id, currentEvent.is_mother_event]);

  const loadChildEvents = async (motherEventId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pq_events')
        .select(`
          *,
          substation:substation_id (
            id,
            name,
            voltage_level
          )
        `)
        .eq('parent_event_id', motherEventId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading child events:', error);
      } else {
        setChildEvents(data || []);
      }
    } catch (error) {
      console.error('Error loading child events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChildEventClick = async (childEvent: PQEvent) => {
    // Save current state to navigation stack
    setNavigationStack(prev => [...prev, {
      event: currentEvent,
      substation: currentSubstation,
      impacts: currentImpacts
    }]);

    // Load child event details
    try {
      const { data: substationData } = await supabase
        .from('substations')
        .select('*')
        .eq('id', childEvent.substation_id)
        .single();

      const { data: impactsData } = await supabase
        .from('event_customer_impact')
        .select(`
          *,
          customer (
            id,
            name,
            account_number,
            address
          )
        `)
        .eq('event_id', childEvent.id);

      setCurrentEvent(childEvent);
      setCurrentSubstation(substationData || undefined);
      setCurrentImpacts(impactsData || []);
    } catch (error) {
      console.error('Error loading child event details:', error);
    }
  };

  const handleBackNavigation = () => {
    if (navigationStack.length > 0) {
      const previous = navigationStack[navigationStack.length - 1];
      setCurrentEvent(previous.event);
      setCurrentSubstation(previous.substation);
      setCurrentImpacts(previous.impacts);
      setNavigationStack(prev => prev.slice(0, -1));
    }
  };

  const handleDeleteEvent = async () => {
    setDeleting(true);
    try {
      // If it's a mother event, delete child events first
      if (currentEvent.is_mother_event && childEvents.length > 0) {
        const childIds = childEvents.map(child => child.id);
        const { error: childError } = await supabase
          .from('pq_events')
          .delete()
          .in('id', childIds);
        
        if (childError) {
          console.error('Error deleting child events:', childError);
          alert('Failed to delete child events. Please try again.');
          setDeleting(false);
          return;
        }
      }

      // Delete the main event
      const { error } = await supabase
        .from('pq_events')
        .delete()
        .eq('id', currentEvent.id);

      if (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Please try again.');
      } else {
        // Success - notify parent component
        setShowDeleteConfirm(false);
        if (onEventDeleted) {
          onEventDeleted();
        }
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const generateMockWaveform = () => {
    const samples = 200;
    const baseVoltage = currentEvent.magnitude || 100;
    
    const voltage: { time: number; value: number }[] = Array.from({ length: samples }, (_, idx) => ({
      time: idx * 0.001,
      value: baseVoltage + (Math.random() - 0.5) * 5
    }));

    const current: { time: number; value: number }[] = voltage.map(point => ({
      time: point.time,
      value: point.value * 0.8
    }));

    return {
      voltage,
      current
    };
  };

  const waveformData = currentEvent.waveform_data || generateMockWaveform();

  return (
    <div className="space-y-6">
      {/* Back Navigation - only show when viewing child event */}
      {navigationStack.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleBackNavigation}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      )}

      {/* Child Events Tab - only show for mother events */}
      {currentEvent.is_mother_event && navigationStack.length === 0 && (
        <div className="border-b border-slate-200">
          <div className="flex items-center gap-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <GitBranch className="w-5 h-5 text-purple-600" />
              Child Events ({childEvents.length})
            </h3>
          </div>
          
          {loading ? (
            <div className="py-8 text-center text-slate-500">
              Loading child events...
            </div>
          ) : childEvents.length > 0 ? (
            <div className="grid gap-3 py-4">
              {childEvents.map((childEvent) => (
                <div
                  key={childEvent.id}
                  onClick={() => handleChildEventClick(childEvent)}
                  className="p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                        Child
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 capitalize">
                          {childEvent.event_type.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-slate-600">
                          {new Date(childEvent.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        childEvent.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        childEvent.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        childEvent.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {childEvent.severity}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {childEvent.circuit_id}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
              No child events found
            </div>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900">
              Event Details
            </h2>
            {currentEvent.parent_event_id && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded">
                Child
              </span>
            )}
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
            title="Delete Event"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mt-1">ID: {currentEvent.id.substring(0, 8)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-semibold">Location</span>
          </div>
          <p className="text-slate-900 font-medium">{currentSubstation?.name}</p>
          <p className="text-sm text-slate-600">{currentSubstation?.voltage_level}</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-semibold">Timestamp</span>
          </div>
          <p className="text-slate-900 font-medium">
            {new Date(currentEvent.timestamp).toLocaleDateString()}
          </p>
          <p className="text-sm text-slate-600">
            {new Date(currentEvent.timestamp).toLocaleTimeString()}
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-semibold">Magnitude</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{currentEvent.magnitude?.toFixed(2)}%</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-semibold">Duration</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {currentEvent.duration_ms && currentEvent.duration_ms < 1000
              ? `${currentEvent.duration_ms}ms`
              : `${((currentEvent.duration_ms || 0) / 1000).toFixed(2)}s`
            }
          </p>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-slate-700" />
          <span className="font-semibold text-slate-900">Event Information</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-600">Type:</span>
            <span className="ml-2 font-semibold text-slate-900 capitalize">
              {currentEvent.event_type.replace('_', ' ')}
            </span>
          </div>
          <div>
            <span className="text-slate-600">Severity:</span>
            <span className={`ml-2 font-semibold capitalize ${
              currentEvent.severity === 'critical' ? 'text-red-700' :
              currentEvent.severity === 'high' ? 'text-orange-700' :
              currentEvent.severity === 'medium' ? 'text-yellow-700' :
              'text-green-700'
            }`}>
              {currentEvent.severity}
            </span>
          </div>
          <div>
            <span className="text-slate-600">Affected Phases:</span>
            <span className="ml-2 font-semibold text-slate-900">
              {currentEvent.affected_phases.join(', ')}
            </span>
          </div>
          <div>
            <span className="text-slate-600">Mother Event:</span>
            <span className="ml-2 font-semibold text-slate-900">
              {currentEvent.is_mother_event ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
        {currentEvent.root_cause && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <span className="text-slate-600 text-sm">Root Cause:</span>
            <p className="font-semibold text-slate-900 mt-1">{currentEvent.root_cause}</p>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <span>Status Management</span>
        </h3>
        <div className="flex gap-2">
          {['new', 'acknowledged', 'investigating', 'resolved'].map((status) => (
            <button
              key={status}
              onClick={() => onStatusChange(currentEvent.id, status)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentEvent.status === status
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <WaveformDisplay data={waveformData} />

      {currentImpacts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-slate-700" />
            <h3 className="font-semibold text-slate-900">Affected Customers ({currentImpacts.length})</h3>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {currentImpacts.map((impact) => (
              <div key={impact.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{impact.customer?.name}</p>
                    <p className="text-sm text-slate-600">{impact.customer?.address}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Account: {impact.customer?.account_number}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      impact.impact_level === 'severe' ? 'bg-red-100 text-red-700' :
                      impact.impact_level === 'moderate' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {impact.impact_level}
                    </span>
                    <p className="text-xs text-slate-600 mt-1">
                      {impact.estimated_downtime_min} min
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Delete Event</h3>
            </div>
            
            <p className="text-slate-600 mb-2">
              Are you sure you want to delete this event?
            </p>
            
            {currentEvent.is_mother_event && childEvents.length > 0 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                <p className="text-sm text-orange-800 font-semibold">
                  ⚠️ This is a mother event
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  {childEvents.length} child event{childEvents.length !== 1 ? 's' : ''} will also be deleted.
                </p>
              </div>
            )}
            
            <p className="text-sm text-slate-500 mb-6">
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
