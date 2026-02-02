import { Search, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PQEvent, Substation } from '../../types/database';
import { supabase } from '../../lib/supabase';

interface EventListProps {
  events: PQEvent[];
  substations: Substation[];
}

export default function EventList({ events, substations }: EventListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [timestampFilter, setTimestampFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [meters, setMeters] = useState<any[]>([]);
  
  const itemsPerPage = 10;

  const substationMap = substations.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {} as Record<string, Substation>);

  // Fetch PQ meters data
  useEffect(() => {
    const fetchMeters = async () => {
      const { data } = await supabase
        .from('pq_meters')
        .select('id, meter_id');
      
      if (data) {
        setMeters(data);
      }
    };
    
    fetchMeters();
  }, []);

  // Create meter map for quick lookup
  const meterMap = meters.reduce((acc, m) => {
    acc[m.id] = m;
    return acc;
  }, {} as Record<string, any>);

  // Calculate date range based on timestamp filter
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (timestampFilter) {
      case 'today':
        return { start: today, end: new Date() };
      case 'last7days':
        const last7 = new Date(today);
        last7.setDate(today.getDate() - 7);
        return { start: last7, end: new Date() };
      case 'last30days':
        const last30 = new Date(today);
        last30.setDate(today.getDate() - 30);
        return { start: last30, end: new Date() };
      case 'custom':
        if (customStartDate && customEndDate) {
          return { 
            start: new Date(customStartDate), 
            end: new Date(new Date(customEndDate).setHours(23, 59, 59, 999)) 
          };
        }
        return null;
      default:
        return null;
    }
  };

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

  // Limit to 50 most recent events first
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  const filteredEvents = recentEvents.filter(event => {
    const substation = event.substation_id ? substationMap[event.substation_id] : null;
    const meter = event.meter_id ? meterMap[event.meter_id] : null;
    
    // Search on substation code and meter_id (partial match)
    const matchesSearch = !searchTerm ||
      (substation?.code && substation.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (meter?.meter_id && meter.meter_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Timestamp filter
    const dateRange = getDateRange();
    const matchesTimestamp = !dateRange || (
      new Date(event.timestamp) >= dateRange.start &&
      new Date(event.timestamp) <= dateRange.end
    );
    
    return matchesSearch && matchesTimestamp;
  });

  // Reset to page 1 when filters change
  const totalItems = filteredEvents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
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

  // Paginate
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvents = sortedEvents.slice(startIndex, endIndex);

  // Generate page numbers (max 5 visible)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-bold text-slate-900">Recent 50 Events</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search substation code or meter ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>
          <select
            value={timestampFilter}
            onChange={(e) => {
              setTimestampFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {/* Custom Date Range Inputs */}
      {timestampFilter === 'custom' && (
        <div className="mb-4 flex items-center gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <label className="text-sm font-medium text-slate-700">Start Date:</label>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => {
              setCustomStartDate(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <label className="text-sm font-medium text-slate-700">End Date:</label>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => {
              setCustomEndDate(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

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
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                <button
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
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">V1</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">V2</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">V3</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEvents.map((event) => {
              const substation = event.substation_id ? substationMap[event.substation_id] : null;
              const meter = event.meter_id ? meterMap[event.meter_id] : null;
              return (
                <tr
                  key={event.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-slate-900">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {substation?.code || 'Unknown'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700 capitalize">
                    {event.event_type.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    {meter?.meter_id || 'N/A'}
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
                    {event.v1 !== null && event.v1 !== undefined ? event.v1.toFixed(1) : ''}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    {event.v2 !== null && event.v2 !== undefined ? event.v2.toFixed(1) : ''}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    {event.v3 !== null && event.v3 !== undefined ? event.v3.toFixed(1) : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-200">
        <div className="text-sm text-slate-600">
          Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} events
        </div>
        
        <div className="flex items-center gap-2">
          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          
          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>
          
          {/* Next Button */}
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
