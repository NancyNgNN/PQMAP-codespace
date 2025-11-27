import { Clock, MapPin, Zap, AlertTriangle, Users } from 'lucide-react';
import { PQEvent, Substation, EventCustomerImpact } from '../../types/database';
import WaveformDisplay from './WaveformDisplay';

interface EventDetailsProps {
  event: PQEvent;
  substation?: Substation;
  impacts: EventCustomerImpact[];
  onStatusChange: (eventId: string, status: string) => void;
}

export default function EventDetails({ event, substation, impacts, onStatusChange }: EventDetailsProps) {
  const generateMockWaveform = () => {
    const samples = 200;
    const voltage = Array.from({ length: samples }, (_, i) => {
      const base = event.magnitude;
      const noise = (Math.random() - 0.5) * 5;
      return base + noise;
    });

    return {
      voltage,
      current: voltage.map(v => v * 0.8),
      timestamps: Array.from({ length: samples }, (_, i) => i * 0.001),
      sampling_rate: 1000,
    };
  };

  const waveformData = event.waveform_data || generateMockWaveform();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Event Details</h2>
        <p className="text-sm text-slate-600">ID: {event.id.substring(0, 8)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-semibold">Location</span>
          </div>
          <p className="text-slate-900 font-medium">{substation?.name}</p>
          <p className="text-sm text-slate-600">{substation?.voltage_level}</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-semibold">Timestamp</span>
          </div>
          <p className="text-slate-900 font-medium">
            {new Date(event.timestamp).toLocaleDateString()}
          </p>
          <p className="text-sm text-slate-600">
            {new Date(event.timestamp).toLocaleTimeString()}
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-semibold">Magnitude</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{event.magnitude.toFixed(2)}%</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-semibold">Duration</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {event.duration_ms < 1000
              ? `${event.duration_ms}ms`
              : `${(event.duration_ms / 1000).toFixed(2)}s`
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
              {event.event_type.replace('_', ' ')}
            </span>
          </div>
          <div>
            <span className="text-slate-600">Severity:</span>
            <span className={`ml-2 font-semibold capitalize ${
              event.severity === 'critical' ? 'text-red-700' :
              event.severity === 'high' ? 'text-orange-700' :
              event.severity === 'medium' ? 'text-yellow-700' :
              'text-green-700'
            }`}>
              {event.severity}
            </span>
          </div>
          <div>
            <span className="text-slate-600">Affected Phases:</span>
            <span className="ml-2 font-semibold text-slate-900">
              {event.affected_phases.join(', ')}
            </span>
          </div>
          <div>
            <span className="text-slate-600">Mother Event:</span>
            <span className="ml-2 font-semibold text-slate-900">
              {event.is_mother_event ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
        {event.root_cause && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <span className="text-slate-600 text-sm">Root Cause:</span>
            <p className="font-semibold text-slate-900 mt-1">{event.root_cause}</p>
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
              onClick={() => onStatusChange(event.id, status)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                event.status === status
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

      {impacts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-slate-700" />
            <h3 className="font-semibold text-slate-900">Affected Customers ({impacts.length})</h3>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {impacts.map((impact) => (
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
    </div>
  );
}
