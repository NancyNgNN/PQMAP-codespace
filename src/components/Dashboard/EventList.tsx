import { Search, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useState } from 'react';
import { PQEvent, Substation } from '../../types/database';

interface EventListProps {
  events: PQEvent[];
  substations: Substation[];
}

export default function EventList({ events, substations }: EventListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const substationMap = substations.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {} as Record<string, Substation>);

  const handleSort = (field: string) => {
    console.log('🔄 [EventList Sort] Clicked field:', field, '| Current:', { sortField, sortDirection });
    
    if (sortField === field) {
      // Toggle direction
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      console.log('🔄 [EventList Sort] Same field - toggling direction:', sortDirection, '→', newDirection);
      setSortDirection(newDirection);
    } else {
      // New field, default to ascending
      console.log('🔄 [EventList Sort] New field - setting:', field, 'to asc');
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredEvents = events.filter(event => {
    const substation = event.substation_id ? substationMap[event.substation_id] : null;
    const matchesSearch = !searchTerm ||
      substation?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.event_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || event.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  // Apply sorting (persists across filter changes)
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortField) {
      case 'timestamp':
        aVal = new Date(a.timestamp).getTime();
        bVal = new Date(b.timestamp).getTime();
        break;
      case 'event_type':
        aVal = a.event_type || '';
        bVal = b.event_type || '';
        break;
      case 'meter_id':
        aVal = a.meter_id || '';
        bVal = b.meter_id || '';
        break;
      case 'duration':
        aVal = a.duration_ms ?? 0;
        bVal = b.duration_ms ?? 0;
        break;
      default:
        aVal = '';
        bVal = '';
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'acknowledged': return 'bg-cyan-100 text-cyan-700';
      case 'investigating': return 'bg-purple-100 text-purple-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-bold text-slate-900">Recent Events</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                <button
                  onClick={() => handleSort('timestamp')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Timestamp
                  {sortField === 'timestamp' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-30" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Substation</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                <button
                  onClick={() => handleSort('event_type')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Event Type
                  {sortField === 'event_type' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-30" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                <button
                  onClick={() => handleSort('meter_id')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  PQ Meter ID
                  {sortField === 'meter_id' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-30" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Severity</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">\n                <button
                  onClick={() => handleSort('duration')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Duration
                  {sortField === 'duration' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-30" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Magnitude</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedEvents.slice(0, 20).map((event) => {
              const substation = event.substation_id ? substationMap[event.substation_id] : null;
              return (
                <tr
                  key={event.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-slate-900">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {substation?.name || 'Unknown'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700 capitalize">
                    {event.event_type.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    {event.meter_id || 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(event.severity)}`}>
                      {event.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    {event.duration_ms !== null && event.duration_ms !== undefined
                      ? (event.duration_ms < 1000
                        ? `${event.duration_ms}ms`
                        : `${(event.duration_ms / 1000).toFixed(2)}s`)
                      : 'N/A'
                    }
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    {event.magnitude !== null && event.magnitude !== undefined
                      ? `${event.magnitude.toFixed(2)}%`
                      : 'N/A'
                    }
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <p>Showing {Math.min(20, sortedEvents.length)} of {sortedEvents.length} events</p>
      </div>
    </div>
  );
}
