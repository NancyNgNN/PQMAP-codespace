import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PQEvent, Substation, EventCustomerImpact, PQMeter, FilterProfile } from '../../types/database';
import { EventTreeNode, EventFilter } from '../../types/eventTypes';
import EventDetails from './EventDetails';
import FalseEventConfig from './FalseEventConfig';
import FalseEventAnalytics from './FalseEventAnalytics';
import { falseEventDetector } from '../../utils/falseEventDetection';
import { MotherEventGroupingService } from '../../services/mother-event-grouping';
import { Activity, Plus, GitBranch, Filter, Search, Calendar, Users, AlertTriangle, Shield, BarChart3, Group, Ungroup, Check, X, Save, Edit2, Trash2, RotateCcw, ChevronDown } from 'lucide-react';

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
    meterIds: [],
    minDuration: 0,
    maxDuration: 300000, // 5 minutes (300 seconds) to accommodate sustained events
    minCustomers: 0,
    maxCustomers: 1000,
    minRemainingVoltage: 0,
    maxRemainingVoltage: 100,
    circuitIds: [],
    showOnlyUnvalidated: false,
    showOnlyMotherEvents: false,
    hideFalseEvents: true
  });

  // Meter and Profile states
  const [meters, setMeters] = useState<PQMeter[]>([]);
  const [filterProfiles, setFilterProfiles] = useState<FilterProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [showMeterDropdown, setShowMeterDropdown] = useState(false);
  const [meterSearchQuery, setMeterSearchQuery] = useState('');
  const [selectedVoltageLevelsForMeters, setSelectedVoltageLevelsForMeters] = useState<string[]>([]);
  const [showVoltageLevelDropdown, setShowVoltageLevelDropdown] = useState(false);

  useEffect(() => {
    loadData();
    loadFilterProfiles();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showMeterDropdown && !target.closest('.meter-dropdown-container')) {
        setShowMeterDropdown(false);
      }
      if (showProfileDropdown && !target.closest('.profile-dropdown-container')) {
        setShowProfileDropdown(false);
      }
      if (showVoltageLevelDropdown && !target.closest('.voltage-dropdown-container')) {
        setShowVoltageLevelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMeterDropdown, showProfileDropdown, showVoltageLevelDropdown]);

  const loadData = async () => {
    try {
      const [eventsRes, substationsRes, metersRes] = await Promise.all([
        supabase
          .from('pq_events')
          .select('*')
          .order('timestamp', { ascending: false }),
        supabase.from('substations').select('*'),
        supabase.from('pq_meters').select('*').order('meter_id', { ascending: true }),
      ]);

      if (!eventsRes.error) setEvents(eventsRes.data || []);
      if (!substationsRes.error) setSubstations(substationsRes.data || []);
      if (!metersRes.error) setMeters(metersRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilterProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('filter_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading filter profiles:', error);
      } else {
        setFilterProfiles(data || []);
        
        // Auto-load default profile if exists
        const defaultProfile = data?.find(p => p.is_default);
        if (defaultProfile) {
          setFilters(defaultProfile.filters as EventFilter);
          setSelectedProfileId(defaultProfile.id);
        }
      }
    } catch (error) {
      console.error('Error loading filter profiles:', error);
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

  const handleEventDeleted = () => {
    // Clear selected event
    setSelectedEvent(null);
    setImpacts([]);
    // Reload event list
    loadData();
  };

  // Filter Profile Management
  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      alert('Please enter a profile name');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to save profiles');
        return;
      }

      if (editingProfileId) {
        // Update existing profile
        const { error } = await supabase
          .from('filter_profiles')
          .update({
            name: profileName.trim(),
            filters: filters,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProfileId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating profile:', error);
          // Check for duplicate name error
          if (error.code === '23505') {
            alert(`A profile named "${profileName.trim()}" already exists. Please choose a different name.`);
          } else {
            alert('Failed to update profile. Please try again.');
          }
          return;
        }
      } else {
        // Create new profile
        const { error } = await supabase
          .from('filter_profiles')
          .insert({
            user_id: user.id,
            name: profileName.trim(),
            filters: filters,
            is_default: false
          });

        if (error) {
          console.error('Error creating profile:', error);
          // Check for duplicate name error (PostgreSQL unique constraint violation)
          if (error.code === '23505') {
            alert(`A profile named "${profileName.trim()}" already exists. Please choose a different name.`);
          } else {
            alert('Failed to create profile. Please try again.');
          }
          return;
        }
      }

      // Reload profiles
      await loadFilterProfiles();
      setShowProfileDialog(false);
      setProfileName('');
      setEditingProfileId(null);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  const handleLoadProfile = (profileId: string) => {
    const profile = filterProfiles.find(p => p.id === profileId);
    if (profile) {
      setFilters(profile.filters as EventFilter);
      setSelectedProfileId(profileId);
    }
  };

  const handleEditProfile = (profileId: string) => {
    const profile = filterProfiles.find(p => p.id === profileId);
    if (profile) {
      setProfileName(profile.name);
      setEditingProfileId(profileId);
      setShowProfileDialog(true);
      setShowProfileDropdown(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) {
      return;
    }

    setShowProfileDropdown(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('filter_profiles')
        .delete()
        .eq('id', profileId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting profile:', error);
        alert('Failed to delete profile. Please try again.');
        return;
      }

      // Reload profiles
      await loadFilterProfiles();
      
      if (selectedProfileId === profileId) {
        setSelectedProfileId(null);
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  const handleSetDefaultProfile = async (profileId: string) => {
    setShowProfileDropdown(false);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('filter_profiles')
        .update({ is_default: true })
        .eq('id', profileId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error setting default profile:', error);
        alert('Failed to set default profile. Please try again.');
        return;
      }

      // Reload profiles
      await loadFilterProfiles();
    } catch (error) {
      console.error('Error setting default profile:', error);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      eventTypes: [],
      severityLevels: [],
      statusOptions: [],
      voltageLevels: [],
      meterIds: [],
      minDuration: 0,
      maxDuration: 300000,
      minCustomers: 0,
      maxCustomers: 1000,
      minRemainingVoltage: 0,
      maxRemainingVoltage: 100,
      circuitIds: [],
      showOnlyUnvalidated: false,
      showOnlyMotherEvents: false,
      hideFalseEvents: true
    });
    setSelectedProfileId(null);
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
    const motherEventsInput = events.filter(e => e.is_mother_event);
    console.log('🔍 applyFilters INPUT - Total events:', events.length, 'Mother events:', motherEventsInput.length);
    
    const filtered = events.filter(event => {
      const isMotherEvent = event.is_mother_event;
      
      // Date range filter
      if (filters.startDate && new Date(event.timestamp) < new Date(filters.startDate)) {
        if (isMotherEvent) console.log('❌ Mother event filtered by START DATE:', event.id.substring(0, 8), event.timestamp);
        return false;
      }
      if (filters.endDate && new Date(event.timestamp) > new Date(filters.endDate)) {
        if (isMotherEvent) console.log('❌ Mother event filtered by END DATE:', event.id.substring(0, 8), event.timestamp);
        return false;
      }
      
      // Event type filter
      if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.event_type)) {
        if (isMotherEvent) console.log('❌ Mother event filtered by TYPE:', event.id.substring(0, 8), event.event_type);
        return false;
      }
      
      // Severity filter
      if (filters.severityLevels.length > 0 && !filters.severityLevels.includes(event.severity)) {
        if (isMotherEvent) console.log('❌ Mother event filtered by SEVERITY:', event.id.substring(0, 8), event.severity);
        return false;
      }
      
      // Status filter
      if (filters.statusOptions.length > 0 && !filters.statusOptions.includes(event.status)) {
        if (isMotherEvent) console.log('❌ Mother event filtered by STATUS:', event.id.substring(0, 8), event.status);
        return false;
      }
      
      // Voltage level filter
      if (filters.voltageLevels.length > 0 && !filters.voltageLevels.includes(event.voltage_level)) {
        if (isMotherEvent) console.log('❌ Mother event filtered by VOLTAGE:', event.id.substring(0, 8), event.voltage_level);
        return false;
      }
      
      // Duration filter
      if (event.duration_ms !== null && (event.duration_ms < filters.minDuration || event.duration_ms > filters.maxDuration)) {
        if (isMotherEvent) console.log('❌ Mother event filtered by DURATION:', event.id.substring(0, 8), event.duration_ms, 'range:', filters.minDuration, '-', filters.maxDuration);
        return false;
      }
      
      // Customer count filter
      const customerCount = event.customer_count || 0;
      if (customerCount < filters.minCustomers || customerCount > filters.maxCustomers) {
        if (isMotherEvent) console.log('❌ Mother event filtered by CUSTOMER COUNT:', event.id.substring(0, 8), customerCount, 'range:', filters.minCustomers, '-', filters.maxCustomers);
        return false;
      }
      
      // Remaining voltage filter
      if (event.remaining_voltage !== null && event.remaining_voltage !== undefined) {
        if (event.remaining_voltage < filters.minRemainingVoltage || event.remaining_voltage > filters.maxRemainingVoltage) {
          if (isMotherEvent) console.log('❌ Mother event filtered by REMAINING VOLTAGE:', event.id.substring(0, 8), event.remaining_voltage, 'range:', filters.minRemainingVoltage, '-', filters.maxRemainingVoltage);
          return false;
        }
      }
      
      // Circuit ID filter
      if (filters.circuitIds.length > 0 && !filters.circuitIds.includes(event.circuit_id)) {
        if (isMotherEvent) console.log('❌ Mother event filtered by CIRCUIT ID:', event.id.substring(0, 8), event.circuit_id, 'allowed:', filters.circuitIds);
        return false;
      }
      
      // Validation filter
      if (filters.showOnlyUnvalidated && event.validated_by_adms) {
        if (isMotherEvent) console.log('❌ Mother event filtered by VALIDATION:', event.id.substring(0, 8), 'validated_by_adms=true');
        return false;
      }
      
      // Mother event filter
      if (filters.showOnlyMotherEvents && !event.is_mother_event) return false;

      // Meter ID filter
      if (filters.meterIds.length > 0 && event.meter_id && !filters.meterIds.includes(event.meter_id)) {
        if (isMotherEvent) console.log('❌ Mother event filtered by METER ID:', event.id.substring(0, 8), event.meter_id);
        return false;
      }

      return true;
    });
    
    const motherEventsOutput = filtered.filter(e => e.is_mother_event);
    console.log('🔍 applyFilters OUTPUT - Total events:', filtered.length, 'Mother events:', motherEventsOutput.length);
    console.log('📊 Mother events LOST in filtering:', motherEventsInput.length - motherEventsOutput.length);
    
    return filtered;
  };

  const filteredEvents = applyFilters(events);
  const eventTree = buildEventTree(filteredEvents);

  // === COMPREHENSIVE DEBUGGING ===
  console.log('🔍 EVENT FILTERING DEBUG:');
  console.log('📊 Total events loaded from DB:', events.length);
  console.log('🔍 Events after applyFilters:', filteredEvents.length);
  
  // Count mother events at each stage
  const motherEventsInDB = events.filter(e => e.is_mother_event);
  const motherEventsAfterFilter = filteredEvents.filter(e => e.is_mother_event);
  console.log('👑 Mother events in DB:', motherEventsInDB.length);
  console.log('👑 Mother events after applyFilters:', motherEventsAfterFilter.length);
  
  // Log filter state
  console.log('⚙️ Filter settings:', {
    showOnlyMotherEvents: filters.showOnlyMotherEvents,
    hideFalseEvents: filters.hideFalseEvents,
    showOnlyUnvalidated: filters.showOnlyUnvalidated
  });

  // Apply false event detection
  const eventsWithFalseDetection = falseEventDetector.applyConfiguredRules(filteredEvents, falseEventRules);
  
  // Count events with shouldBeHidden
  const hiddenEvents = eventsWithFalseDetection.filter(e => e.shouldBeHidden);
  const hiddenMotherEvents = eventsWithFalseDetection.filter(e => e.is_mother_event && e.shouldBeHidden);
  console.log('🚫 Events marked shouldBeHidden:', hiddenEvents.length);
  console.log('🚫 Mother events marked shouldBeHidden:', hiddenMotherEvents.length);
  
  if (hiddenMotherEvents.length > 0) {
    console.log('🔍 Hidden mother events details:', hiddenMotherEvents.map(e => ({
      id: e.id.substring(0, 8),
      type: e.event_type,
      circuit: e.circuit_id,
      timestamp: e.timestamp,
      shouldBeHidden: e.shouldBeHidden,
      falseEventRules: e.falseEventRules?.map((r: any) => r.name)
    })));
  }
  
  // Filter out events marked as false (based on user preference)
  const finalEvents = filters.hideFalseEvents 
    ? eventsWithFalseDetection.filter(e => !e.shouldBeHidden)
    : eventsWithFalseDetection;
  
  const finalMotherEvents = finalEvents.filter(e => e.is_mother_event);
  console.log('✅ Final events to display:', finalEvents.length);
  console.log('✅ Final mother events to display:', finalMotherEvents.length);
  console.log('==========================================\n');

  // False event detection handlers
  const handleFalseEventRulesChange = (rules: any[]) => {
    setFalseEventRules(rules);
  };

  const handleApplyFalseEventRules = () => {
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

              {/* Filter Profile Controls */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-white text-slate-700 border-slate-300 hover:bg-slate-50 transition-all"
                >
                  <Save className="w-4 h-4" />
                  Save Profile
                </button>
              </div>

              {filterProfiles.length > 0 && (
                <div className="relative profile-dropdown-container">
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="px-4 py-2 pr-10 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all min-w-[200px] text-left"
                  >
                    {selectedProfileId 
                      ? filterProfiles.find(p => p.id === selectedProfileId)?.name || 'Select Profile...'
                      : 'Select Profile...'}
                  </button>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                  
                  {showProfileDropdown && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 min-w-[250px] max-h-[300px] overflow-y-auto">
                      <button
                        onClick={() => {
                          setSelectedProfileId(null);
                          setShowProfileDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Select Profile...
                      </button>
                      {filterProfiles.map(profile => (
                        <div
                          key={profile.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors group"
                        >
                          <button
                            onClick={() => {
                              handleLoadProfile(profile.id);
                              setShowProfileDropdown(false);
                            }}
                            className="flex-1 text-left text-sm text-slate-700 flex items-center gap-2"
                          >
                            {profile.is_default && <span className="text-yellow-500">⭐</span>}
                            {profile.name}
                          </button>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!profile.is_default && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetDefaultProfile(profile.id);
                                }}
                                className="p-1 hover:bg-green-50 rounded text-green-600"
                                title="Set as Default"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditProfile(profile.id);
                              }}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600"
                              title="Edit Profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProfile(profile.id);
                              }}
                              className="p-1 hover:bg-red-50 rounded text-red-600"
                              title="Delete Profile"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Advanced Filters
                </h3>
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={filters.startDate}
                    onChange={(e) => {
                      setFilters((prev: any) => ({ ...prev, startDate: e.target.value }));
                      // Auto-close on selection
                      if (e.target.value) {
                        setTimeout(() => e.target.blur(), 100);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={filters.endDate}
                    onChange={(e) => {
                      setFilters((prev: any) => ({ ...prev, endDate: e.target.value }));
                      // Auto-close on selection
                      if (e.target.value) {
                        setTimeout(() => e.target.blur(), 100);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                  />
                </div>

                {/* Duration Range - Compressed */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Duration (ms)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minDuration}
                      onChange={(e) => setFilters((prev: any) => ({ ...prev, minDuration: parseInt(e.target.value) || 0 }))}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <span className="text-slate-500">to</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxDuration}
                      onChange={(e) => setFilters((prev: any) => ({ ...prev, maxDuration: parseInt(e.target.value) || 10000 }))}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Voltage Level Filter */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Voltage Level (Event Filter) {filters.voltageLevels.length > 0 && `(${filters.voltageLevels.length})`}
                  </label>
                  <div className="relative voltage-dropdown-container">
                    <button
                      onClick={() => setShowVoltageLevelDropdown(!showVoltageLevelDropdown)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-left text-sm hover:bg-slate-50 transition-all flex items-center justify-between"
                    >
                      <span className="text-slate-700">
                        {filters.voltageLevels.length === 0 ? 'Select voltage levels...' : `${filters.voltageLevels.length} level(s) selected`}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>
                    
                    {showVoltageLevelDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        <div className="p-2">
                          {['400kV', '132kV', '33kV', '11kV', '380V'].map(voltage => (
                            <label
                              key={voltage}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                            >
                              <input
                                type="checkbox"
                                checked={filters.voltageLevels.includes(voltage)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFilters(prev => ({ ...prev, voltageLevels: [...prev.voltageLevels, voltage] }));
                                  } else {
                                    setFilters(prev => ({ ...prev, voltageLevels: prev.voltageLevels.filter(v => v !== voltage) }));
                                  }
                                }}
                                className="rounded text-blue-600"
                              />
                              <span className="text-sm font-medium text-slate-700">⚡ {voltage}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* PQ Meter Filter with Voltage Level Grouping */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    PQ Meters ({meters.length} total, {filters.meterIds.length} selected)
                  </label>
                  <div className="relative meter-dropdown-container">
                    <button
                      onClick={() => setShowMeterDropdown(!showMeterDropdown)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-left text-sm hover:bg-slate-50 transition-all flex items-center justify-between"
                    >
                      <span className="text-slate-700">
                        {filters.meterIds.length === 0 ? 'Select meters...' : `${filters.meterIds.length} meter(s) selected`}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>
                    
                    {showMeterDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                        {/* Search Box */}
                        <div className="sticky top-0 bg-white p-2 border-b border-slate-200">
                          <input
                            type="text"
                            placeholder="Search meters..."
                            value={meterSearchQuery}
                            onChange={(e) => setMeterSearchQuery(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        {/* Voltage Level Filter for Meter List */}
                        <div className="p-2 border-b border-slate-200 bg-slate-50">
                          <div className="text-xs font-semibold text-slate-600 mb-2">Filter by Voltage Level:</div>
                          <div className="flex flex-wrap gap-1">
                            {['400kV', '132kV', '33kV', '11kV', '380V'].map(level => (
                              <button
                                key={level}
                                onClick={() => {
                                  setSelectedVoltageLevelsForMeters(prev =>
                                    prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
                                  );
                                }}
                                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                                  selectedVoltageLevelsForMeters.includes(level)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {level}
                              </button>
                            ))}
                            {selectedVoltageLevelsForMeters.length > 0 && (
                              <button
                                onClick={() => setSelectedVoltageLevelsForMeters([])}
                                className="px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Select All / Clear All */}
                        <div className="p-2 border-b border-slate-200 flex gap-2">
                          <button
                            onClick={() => {
                              const filteredMeterIds = meters
                                .filter(m => {
                                  const matchesSearch = meterSearchQuery === '' || 
                                    m.meter_id.toLowerCase().includes(meterSearchQuery.toLowerCase());
                                  const matchesVoltage = selectedVoltageLevelsForMeters.length === 0 ||
                                    (m.voltage_level && selectedVoltageLevelsForMeters.includes(m.voltage_level));
                                  return matchesSearch && matchesVoltage;
                                })
                                .map(m => m.id);
                              setFilters(prev => ({ ...prev, meterIds: filteredMeterIds }));
                            }}
                            className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium"
                          >
                            Select All
                          </button>
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, meterIds: [] }))}
                            className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200 font-medium"
                          >
                            Clear All
                          </button>
                        </div>

                        {/* Meter List */}
                        <div className="max-h-64 overflow-y-auto">
                          {meters
                            .filter(meter => {
                              const matchesSearch = meterSearchQuery === '' || 
                                meter.meter_id.toLowerCase().includes(meterSearchQuery.toLowerCase());
                              const matchesVoltage = selectedVoltageLevelsForMeters.length === 0 ||
                                (meter.voltage_level && selectedVoltageLevelsForMeters.includes(meter.voltage_level));
                              return matchesSearch && matchesVoltage;
                            })
                            .map(meter => (
                              <label
                                key={meter.id}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100"
                              >
                                <input
                                  type="checkbox"
                                  checked={filters.meterIds.includes(meter.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFilters(prev => ({ ...prev, meterIds: [...prev.meterIds, meter.id] }));
                                    } else {
                                      setFilters(prev => ({ ...prev, meterIds: prev.meterIds.filter(id => id !== meter.id) }));
                                    }
                                  }}
                                  className="rounded text-blue-600"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-slate-700">{meter.meter_id}</div>
                                  <div className="text-xs text-slate-500">
                                    {meter.voltage_level && <span className="mr-2">⚡ {meter.voltage_level}</span>}
                                    {meter.location && <span>{meter.location}</span>}
                                  </div>
                                </div>
                              </label>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
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
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.hideFalseEvents}
                    onChange={(e) => setFilters((prev: any) => ({ ...prev, hideFalseEvents: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Hide false events</span>
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
                  {finalEvents.map((event) => {
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
                  onEventDeleted={handleEventDeleted}
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

      {/* Profile Save Dialog */}
      {showProfileDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Save className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {editingProfileId ? 'Edit Filter Profile' : 'Save Filter Profile'}
              </h3>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Profile Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter profile name..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-slate-600 mb-2 font-semibold">Current Filter Settings:</p>
              <ul className="text-xs text-slate-600 space-y-1">
                {filters.startDate && <li>• Start Date: {new Date(filters.startDate).toLocaleString()}</li>}
                {filters.endDate && <li>• End Date: {new Date(filters.endDate).toLocaleString()}</li>}
                {filters.voltageLevels.length > 0 && <li>• Voltage Levels: {filters.voltageLevels.join(', ')}</li>}
                {filters.meterIds.length > 0 && <li>• Meters: {filters.meterIds.length} selected</li>}
                {filters.minDuration > 0 && <li>• Min Duration: {filters.minDuration}ms</li>}
                {filters.maxDuration < 300000 && <li>• Max Duration: {filters.maxDuration}ms</li>}
                {filters.showOnlyMotherEvents && <li>• Only Mother Events</li>}
                {filters.hideFalseEvents && <li>• Hide False Events</li>}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowProfileDialog(false);
                  setProfileName('');
                  setEditingProfileId(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={!profileName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingProfileId ? 'Update' : 'Save'} Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
