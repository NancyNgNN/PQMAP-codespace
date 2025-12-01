import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PQEvent, Substation, EventCustomerImpact } from '../../types/database';
import { EventTreeNode, EventOperation, EventFilter } from '../../types/eventTypes';
import EventDetails from './EventDetails';
import FalseEventConfig from './FalseEventConfig';
import FalseEventAnalytics from './FalseEventAnalytics';
import { falseEventDetector } from '../../utils/falseEventDetection';
import { MotherEventGroupingService } from '../../services/mother-event-grouping';
import { Activity, Plus, GitBranch, Filter, Search, Calendar, MapPin, Zap, Users, AlertTriangle, Shield, BarChart3, Group, Ungroup, Check, X } from 'lucide-react';

export default function EventManagement() {
  const [events, setEvents] = useState<PQEvent[]>([]);
  const [substations, setSubstations] = useState<Substation[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<PQEvent | null>(null);
  const [impacts, setImpacts] = useState<EventCustomerImpact[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');
  const [showFilters, setShowFilters] = useState(true);
  const [showOperations, setShowOperations] = useState(false);
  const [activeTab, setActiveTab] = useState<'events' | 'false-detection' | 'analytics'>('events');
  const [eventOperations, setEventOperations] = useState<EventOperation[]>([]);
  const [falseEventRules, setFalseEventRules] = useState<any[]>([]);
  const [falseEventResults, setFalseEventResults] = useState<any[]>([]);
  
  // Multi-select and grouping states
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [groupingInProgress, setGroupingInProgress] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState<EventFilter>({
    startDate: '',
    endDate: '',
    eventTypes: [],
    severityLevels: [],
    statusOptions: [],
    voltageLevels: [],
    minDuration: 0,
    maxDuration: 10000,
    minCustomers: 0,
    maxCustomers: 1000,
    minRemainingVoltage: 0,
    maxRemainingVoltage: 100,
    circuitIds: [],
    showOnlyUnvalidated: false,
    showOnlyMotherEvents: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventsRes, substationsRes] = await Promise.all([
        supabase
          .from('pq_events')
          .select('*')
          .order('timestamp', { ascending: false }),
        supabase.from('substations').select('*'),
      ]);

      if (!eventsRes.error) setEvents(eventsRes.data || []);
      if (!substationsRes.error) setSubstations(substationsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEventImpacts = async (eventId: string) => {
    const { data } = await supabase
      .from('event_customer_impact')
      .select('*, customer:customers(*)')
      .eq('event_id', eventId);

    if (data) setImpacts(data);
  };

  const handleEventSelect = (event: PQEvent) => {
    setSelectedEvent(event);
    loadEventImpacts(event.id);
  };

  const updateEventStatus = async (eventId: string, status: string) => {
    await supabase
      .from('pq_events')
      .update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
      .eq('id', eventId);

    loadData();
    if (selectedEvent?.id === eventId) {
      const updated = events.find((e: any) => e.id === eventId);
      if (updated) {
        setSelectedEvent({ ...updated, status: status as any });
      }
    }
  };

  // Build tree structure for mother events
  const buildEventTree = (events: PQEvent[]): EventTreeNode[] => {
    const nodeMap = new Map<string, EventTreeNode>();
    const roots: EventTreeNode[] = [];

    // Create nodes for all events
    events.forEach(event => {
      nodeMap.set(event.id, {
        id: event.id,
        event,
        children: []
      });
    });

    // Organize into tree structure
    events.forEach(event => {
      const node = nodeMap.get(event.id)!;
      if (event.parent_event_id) {
        const parent = nodeMap.get(event.parent_event_id);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  // Apply filters to events
  const applyFilters = (events: PQEvent[]): PQEvent[] => {
    return events.filter(event => {
      // Date range filter
      if (filters.startDate && new Date(event.timestamp) < new Date(filters.startDate)) return false;
      if (filters.endDate && new Date(event.timestamp) > new Date(filters.endDate)) return false;
      
      // Event type filter
      if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.event_type)) return false;
      
      // Severity filter
      if (filters.severityLevels.length > 0 && !filters.severityLevels.includes(event.severity)) return false;
      
      // Status filter
      if (filters.statusOptions.length > 0 && !filters.statusOptions.includes(event.status)) return false;
      
      // Voltage level filter
      if (filters.voltageLevels.length > 0 && !filters.voltageLevels.includes(event.voltage_level)) return false;
      
      // Duration filter
      if (event.duration_ms < filters.minDuration || event.duration_ms > filters.maxDuration) return false;
      
      // Customer count filter
      const customerCount = event.customer_count || 0;
      if (customerCount < filters.minCustomers || customerCount > filters.maxCustomers) return false;
      
      // Remaining voltage filter
      if (event.remaining_voltage !== null && event.remaining_voltage !== undefined) {
        if (event.remaining_voltage < filters.minRemainingVoltage || event.remaining_voltage > filters.maxRemainingVoltage) return false;
      }
      
      // Circuit ID filter
      if (filters.circuitIds.length > 0 && !filters.circuitIds.includes(event.circuit_id)) return false;
      
      // Validation filter
      if (filters.showOnlyUnvalidated && event.validated_by_adms) return false;
      
      // Mother event filter
      if (filters.showOnlyMotherEvents && !event.is_mother_event) return false;

      return true;
    });
  };

  const filteredEvents = applyFilters(events);
  const eventTree = buildEventTree(filteredEvents);

  // Apply false event detection
  const eventsWithFalseDetection = falseEventDetector.applyConfiguredRules(filteredEvents, falseEventRules);
  
  // Filter out events marked as false (if user chooses to hide them)
  const finalEvents = filters.showOnlyMotherEvents 
    ? eventsWithFalseDetection.filter(e => !e.shouldBeHidden)
    : eventsWithFalseDetection;

  // False event detection handlers
  const handleFalseEventRulesChange = (rules: any[]) => {
    setFalseEventRules(rules);
  };

  const handleApplyFalseEventRules = (rules: any[]) => {
    const results = filteredEvents.map(event => {
      return falseEventDetector.detectFalseEvents(event, {
        recentEvents: events,
        historicalData: events,
        maintenanceWindows: [],
        systemStatus: 'normal'
      });
    });
    setFalseEventResults(results);
  };

  const handleRuleOptimize = (ruleId: string) => {
    // Implement rule optimization logic
    console.log('Optimizing rule:', ruleId);
  };

  // Event operations handlers
  const handleCreateEvent = async (eventData: Partial<PQEvent>) => {
    const operation: EventOperation = {
      id: Date.now().toString(),
      type: 'create',
      timestamp: new Date().toISOString(),
      eventData,
      status: 'pending'
    };
    setEventOperations(prev => [...prev, operation]);
    
    try {
      const { data, error } = await supabase
        .from('pq_events')
        .insert([eventData])
        .select()
        .single();
      
      if (!error) {
        setEventOperations(prev => 
          prev.map(op => op.id === operation.id ? { ...op, status: 'completed' } : op)
        );
        loadData();
      } else {
        throw error;
      }
    } catch (error) {
      setEventOperations(prev => 
        prev.map(op => op.id === operation.id ? { ...op, status: 'failed', error: error as Error } : op)
      );
    }
  };

  const handleUpdateEvent = async (eventId: string, eventData: Partial<PQEvent>) => {
    const operation: EventOperation = {
      id: Date.now().toString(),
      type: 'update',
      timestamp: new Date().toISOString(),
      eventId,
      eventData,
      status: 'pending'
    };
    setEventOperations(prev => [...prev, operation]);
    
    try {
      const { error } = await supabase
        .from('pq_events')
        .update(eventData)
        .eq('id', eventId);
      
      if (!error) {
        setEventOperations(prev => 
          prev.map(op => op.id === operation.id ? { ...op, status: 'completed' } : op)
        );
        loadData();
      } else {
        throw error;
      }
    } catch (error) {
      setEventOperations(prev => 
        prev.map(op => op.id === operation.id ? { ...op, status: 'failed', error: error as Error } : op)
      );
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const operation: EventOperation = {
      id: Date.now().toString(),
      type: 'delete',
      timestamp: new Date().toISOString(),
      eventId,
      status: 'pending'
    };
    setEventOperations(prev => [...prev, operation]);
    
    try {
      const { error } = await supabase
        .from('pq_events')
        .delete()
        .eq('id', eventId);
      
      if (!error) {
        setEventOperations(prev => 
          prev.map(op => op.id === operation.id ? { ...op, status: 'completed' } : op)
        );
        loadData();
      } else {
        throw error;
      }
    } catch (error) {
      setEventOperations(prev => 
        prev.map(op => op.id === operation.id ? { ...op, status: 'failed', error: error as Error } : op)
      );
    }
  };

  const handleGroupEvents = async (eventIds: string[]) => {
    if (eventIds.length < 2) {
      alert('Please select at least 2 events to group.');
      return;
    }

    setGroupingInProgress(true);
    
    try {
      // Check if events can be grouped
      const selectedEvents = events.filter(e => eventIds.includes(e.id));
      const validation = MotherEventGroupingService.canGroupEvents(selectedEvents);
      
      if (!validation.canGroup) {
        alert(validation.reason);
        return;
      }

      // Perform manual grouping
      const result = await MotherEventGroupingService.performManualGrouping(eventIds);
      
      if (result) {
        console.log('Events grouped successfully:', result);
        await loadData(); // Reload events to show new grouping
        setSelectedEventIds(new Set()); // Clear selection
        setIsMultiSelectMode(false); // Exit multi-select mode
      }
    } catch (error) {
      console.error('Error grouping events:', error);
      alert('Failed to group events. Please try again.');
    } finally {
      setGroupingInProgress(false);
    }
  };

  const handleUngroupEvents = async (parentEventId: string) => {
    if (!confirm('Are you sure you want to ungroup these events?')) {
      return;
    }

    setGroupingInProgress(true);
    
    try {
      const success = await MotherEventGroupingService.ungroupEvents(parentEventId);
      
      if (success) {
        console.log('Events ungrouped successfully');
        await loadData(); // Reload events to show ungrouping
      } else {
        alert('Failed to ungroup events. Please try again.');
      }
    } catch (error) {
      console.error('Error ungrouping events:', error);
      alert('Failed to ungroup events. Please try again.');
    } finally {
      setGroupingInProgress(false);
    }
  };

  // Handle automatic grouping
  const handleAutoGroupEvents = async () => {
    setGroupingInProgress(true);
    
    try {
      const ungroupedEvents = events.filter(e => !e.parent_event_id && !e.is_mother_event);
      const results = await MotherEventGroupingService.performAutomaticGrouping(ungroupedEvents);
      
      if (results.length > 0) {
        console.log(`Automatically grouped ${results.length} event groups`);
        await loadData(); // Reload events to show new groupings
        alert(`Successfully created ${results.length} event groups automatically.`);
      } else {
        alert('No events were suitable for automatic grouping.');
      }
    } catch (error) {
      console.error('Error performing automatic grouping:', error);
      alert('Failed to perform automatic grouping. Please try again.');
    } finally {
      setGroupingInProgress(false);
    }
  };

  // Handle multi-select toggle
  const toggleEventSelection = (eventId: string) => {
    const newSelection = new Set(selectedEventIds);
    if (newSelection.has(eventId)) {
      newSelection.delete(eventId);
    } else {
      newSelection.add(eventId);
    }
    setSelectedEventIds(newSelection);
  };

  // Handle select all/none
  const handleSelectAll = () => {
    const ungroupedEvents = filteredEvents.filter(e => !e.parent_event_id && !e.is_mother_event);
    setSelectedEventIds(new Set(ungroupedEvents.map(e => e.id)));
  };

  const handleSelectNone = () => {
    setSelectedEventIds(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-slate-700" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Event Management</h1>
            <p className="text-slate-600 mt-1">Monitor and analyze power quality events with advanced filtering</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {[
            { id: 'events', label: 'Event Analysis', icon: Activity },
            { id: 'false-detection', label: 'False Event Detection', icon: Shield },
            { id: 'analytics', label: 'Detection Analytics', icon: BarChart3 }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode(viewMode === 'tree' ? 'list' : 'tree')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  viewMode === 'tree' 
                    ? 'bg-purple-600 text-white border-purple-600' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <GitBranch className="w-4 h-4" />
                {viewMode === 'tree' ? 'Tree View' : 'List View'}
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  showFilters 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>

              {/* Multi-select and Grouping Controls */}
              <button
                onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  isMultiSelectMode 
                    ? 'bg-green-600 text-white border-green-600' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Check className="w-4 h-4" />
                {isMultiSelectMode ? 'Exit Select' : 'Multi-Select'}
              </button>

              {isMultiSelectMode && (
                <>
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleSelectNone}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </button>
                  {selectedEventIds.size > 1 && (
                    <button
                      onClick={() => handleGroupEvents(Array.from(selectedEventIds))}
                      disabled={groupingInProgress}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all"
                    >
                      <Group className="w-4 h-4" />
                      Group ({selectedEventIds.size})
                    </button>
                  )}
                </>
              )}

              <button
                onClick={handleAutoGroupEvents}
                disabled={groupingInProgress}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                <GitBranch className="w-4 h-4" />
                Auto Group
              </button>
            </div>
            <button
              onClick={() => setShowOperations(!showOperations)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">Operations</span>
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Advanced Filters
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={filters.startDate}
                    onChange={(e) => setFilters((prev: any) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={filters.endDate}
                    onChange={(e) => setFilters((prev: any) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Duration Range */}
                <div>
                  <label className="block text-sm font-medium mb-1">Min Duration (ms)</label>
                  <input
                    type="number"
                    value={filters.minDuration}
                    onChange={(e) => setFilters((prev: any) => ({ ...prev, minDuration: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Duration (ms)</label>
                  <input
                    type="number"
                    value={filters.maxDuration}
                    onChange={(e) => setFilters((prev: any) => ({ ...prev, maxDuration: parseInt(e.target.value) || 10000 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 mt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.showOnlyUnvalidated}
                    onChange={(e) => setFilters((prev: any) => ({ ...prev, showOnlyUnvalidated: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Only unvalidated events</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.showOnlyMotherEvents}
                    onChange={(e) => setFilters((prev: any) => ({ ...prev, showOnlyMotherEvents: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Only mother events</span>
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 max-h-[800px] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">
                  {viewMode === 'tree' ? 'Event Tree View' : 'Event List'}
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    ({eventsWithFalseDetection.length} events)
                  </span>
                </h2>
              </div>
              
              {viewMode === 'tree' ? (
                <div className="space-y-4">
                  <div className="text-sm text-slate-600 mb-4">
                    Tree view shows mother events with their related child events. Events marked as potential false positives are highlighted.
                  </div>
                  {/* Tree View Component would go here */}
                  <div className="space-y-2">
                    {eventTree.map((node) => (
                      <div key={node.id} className="border rounded-lg p-4">
                        <div
                          className={`p-3 rounded transition-all ${
                            selectedEvent?.id === node.id
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-white hover:bg-slate-50'
                          } ${
                            node.event.isFlaggedAsFalse ? 'border-l-4 border-l-orange-500' : ''
                          } ${
                            selectedEventIds.has(node.id) ? 'bg-green-50 border-green-300' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Multi-select checkbox */}
                            {isMultiSelectMode && !node.event.is_mother_event && !node.event.parent_event_id && (
                              <input
                                type="checkbox"
                                checked={selectedEventIds.has(node.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleEventSelection(node.id);
                                }}
                                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                              />
                            )}
                            
                            {/* Mother event indicator and ungroup button */}
                            {node.event.is_mother_event && (
                              <div className="flex items-center gap-2">
                                <GitBranch className="w-4 h-4 text-purple-600" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUngroupEvents(node.id);
                                  }}
                                  disabled={groupingInProgress}
                                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                                >
                                  <Ungroup className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            
                            <div
                              onClick={() => handleEventSelect(node.event)}
                              className="flex-1 cursor-pointer"
                            >
                              {node.event.isFlaggedAsFalse && (
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                              )}
                              <div className="flex-1">
                                <p className="font-semibold text-slate-900 capitalize">
                                  {node.event.event_type.replace('_', ' ')}
                                </p>
                                <p className="text-sm text-slate-600">{node.event.circuit_id}</p>
                                <p className="text-xs text-slate-500">
                                  {new Date(node.event.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                node.event.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                node.event.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                node.event.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {node.event.severity}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Child events */}
                        {node.children.length > 0 && (
                          <div className="ml-8 mt-2 space-y-1">
                            {node.children.map((child) => (
                              <div
                                key={child.id}
                                onClick={() => handleEventSelect(child.event)}
                                className={`p-2 text-sm bg-slate-50 rounded cursor-pointer hover:bg-slate-100 ${
                                  child.event.isFlaggedAsFalse ? 'border-l-2 border-l-orange-400' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {child.event.isFlaggedAsFalse && (
                                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                                  )}
                                  <span className="capitalize">{child.event.event_type.replace('_', ' ')}</span>
                                  <span className="text-slate-500 ml-2">{child.event.circuit_id}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {eventsWithFalseDetection.map((event) => {
                    const substation = substations.find(s => s.id === event.substation_id);
                    return (
                      <div
                        key={event.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedEvent?.id === event.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        } ${
                          event.isFlaggedAsFalse ? 'border-l-4 border-l-orange-500' : ''
                        } ${
                          selectedEventIds.has(event.id) ? 'bg-green-50 border-green-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {/* Multi-select checkbox */}
                            {isMultiSelectMode && !event.is_mother_event && !event.parent_event_id && (
                              <input
                                type="checkbox"
                                checked={selectedEventIds.has(event.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleEventSelection(event.id);
                                }}
                                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 mt-1"
                              />
                            )}

                            {/* Mother event indicator and ungroup button */}
                            {event.is_mother_event && (
                              <div className="flex items-center gap-2">
                                <GitBranch className="w-4 h-4 text-purple-600 mt-1" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUngroupEvents(event.id);
                                  }}
                                  disabled={groupingInProgress}
                                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                                >
                                  <Ungroup className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            <div
                              onClick={() => handleEventSelect(event)}
                              className="flex-1 cursor-pointer"
                            >
                              {!event.validated_by_adms && (
                                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-1" />
                              )}
                              {event.isFlaggedAsFalse && (
                                <AlertTriangle className="w-4 h-4 text-orange-500 mt-1" />
                              )}
                              <div>
                                <p className="font-semibold text-slate-900">{substation?.name || event.circuit_id}</p>
                                <p className="text-sm text-slate-600 capitalize">{event.event_type.replace('_', ' ')}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {new Date(event.timestamp).toLocaleString()}
                                </p>
                                {event.customer_count && (
                                  <p className="text-xs text-slate-500">
                                    <Users className="w-3 h-3 inline mr-1" />
                                    {event.customer_count} customers
                                  </p>
                                )}
                                {event.isFlaggedAsFalse && (
                                  <p className="text-xs text-orange-600 mt-1">
                                    ⚠ Potential false positive
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                              event.severity === 'critical' ? 'bg-red-100 text-red-700' :
                              event.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                              event.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {event.severity}
                            </span>
                            {event.duration_ms && (
                              <p className="text-xs text-slate-500 mt-1">
                                {event.duration_ms < 1000 ? `${event.duration_ms}ms` : `${(event.duration_ms/1000).toFixed(1)}s`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 max-h-[800px] overflow-y-auto">
              {selectedEvent ? (
                <EventDetails
                  event={selectedEvent}
                  substation={substations.find(s => s.id === selectedEvent.substation_id)}
                  impacts={impacts}
                  onStatusChange={updateEventStatus}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-lg">Select an event to view details</p>
                    <p className="text-sm mt-1">Choose from the event tree or list view</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* False Event Detection Tab */}
      {activeTab === 'false-detection' && (
        <FalseEventConfig
          events={events}
          onRulesChange={handleFalseEventRulesChange}
          onApplyRules={handleApplyFalseEventRules}
        />
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <FalseEventAnalytics
          events={events}
          detectionResults={falseEventResults}
          rules={falseEventRules}
          onRuleOptimize={handleRuleOptimize}
        />
      )}
    </div>
  );
}
