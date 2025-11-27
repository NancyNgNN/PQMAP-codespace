import { MapPin, AlertCircle } from 'lucide-react';
import { Substation, PQEvent } from '../../types/database';

interface SubstationMapProps {
  substations: Substation[];
  events: PQEvent[];
}

export default function SubstationMap({ substations, events }: SubstationMapProps) {
  const getSubstationEvents = (substationId: string) => {
    return events.filter(e => e.substation_id === substationId && e.status !== 'resolved').length;
  };

  const getSeverityColor = (eventCount: number) => {
    if (eventCount === 0) return 'bg-green-500';
    if (eventCount <= 2) return 'bg-yellow-500';
    if (eventCount <= 5) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const centerLat = substations.reduce((acc, s) => acc + (s.latitude || 0), 0) / substations.length;
  const centerLon = substations.reduce((acc, s) => acc + (s.longitude || 0), 0) / substations.length;

  const minLat = Math.min(...substations.map(s => s.latitude || 0));
  const maxLat = Math.max(...substations.map(s => s.latitude || 0));
  const minLon = Math.min(...substations.map(s => s.longitude || 0));
  const maxLon = Math.max(...substations.map(s => s.longitude || 0));

  const normalizeX = (lon: number) => {
    return ((lon - minLon) / (maxLon - minLon)) * 90 + 5;
  };

  const normalizeY = (lat: number) => {
    return 95 - ((lat - minLat) / (maxLat - minLat)) * 90;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Substation Map View</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-slate-600">Normal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-slate-600">Minor</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-slate-600">Critical</span>
          </div>
        </div>
      </div>

      <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 h-96">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />

          {substations.map((substation) => {
            const eventCount = getSubstationEvents(substation.id);
            const x = normalizeX(substation.longitude || 0);
            const y = normalizeY(substation.latitude || 0);
            const color = getSeverityColor(eventCount);

            return (
              <g key={substation.id}>
                <circle
                  cx={x}
                  cy={y}
                  r="2.5"
                  className={`${color} opacity-20`}
                  style={{ filter: 'blur(3px)' }}
                />
                <circle
                  cx={x}
                  cy={y}
                  r="1.5"
                  className={color}
                />
                {eventCount > 0 && (
                  <text
                    x={x}
                    y={y - 3}
                    textAnchor="middle"
                    className="text-xs font-bold fill-red-600"
                    style={{ fontSize: '3px' }}
                  >
                    {eventCount}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {substations.slice(0, 4).map((substation) => {
          const eventCount = getSubstationEvents(substation.id);
          return (
            <div
              key={substation.id}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
            >
              <MapPin className="w-5 h-5 text-slate-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{substation.name}</p>
                <p className="text-xs text-slate-600">{substation.voltage_level}</p>
              </div>
              {eventCount > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-bold">{eventCount}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
