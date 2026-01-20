import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PQEvent, Substation, EventCustomerImpact, PQMeter, FilterProfile } from '../../types/database';
import { EventTreeNode, EventFilter } from '../../types/eventTypes';
import EventDetails from './EventDetails';
import FalseEventConfig from './FalseEventConfig';
import FalseEventAnalytics from './FalseEventAnalytics';
import { falseEventDetector } from '../../utils/falseEventDetection';
import { MotherEventGroupingService } from '../../services/mother-event-grouping';
import { ExportService } from '../../services/exportService';
import { Activity, Plus, GitBranch, Filter, Search, Calendar, Users, AlertTriangle, Shield, BarChart3, Group, Check, X, Save, Edit2, Trash2, RotateCcw, ChevronDown, Download, Upload, FileDown } from 'lucide-react';

export default function EventManagement() {
  const [events, setEvents] = useState<PQEvent[]>([]);
  const [substations, setSubstations] = useState<Substation[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<PQEvent | null>(null);
  const [impacts, setImpacts] = useState<EventCustomerImpact[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');
  const [showFilters, setShowFilters] = useState(true);
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
    showOnlyStandaloneEvents: false,
    showFalseEventsOnly: false
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
  
  // Export states
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Import states
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; column: string; message: string }>;
  } | null>(null);

  // Manual Event Creation states
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    event_type: 'voltage_dip' as const,
    timestamp: new Date().toISOString().slice(0, 16),
    substation_id: '',
    meter_id: '',
    voltage_level: '',
    circuit_id: '',
    duration_ms: 1000,
    remaining_voltage: 85,
    affected_phases: ['A', 'B', 'C'],
    severity: 'medium' as const,
    magnitude: 0,
    customer_count: 0,
    address: '',
    cause: '',
    equipment_type: '',
    weather: '',
    remarks: '',
    is_child_event: false,
    parent_event_id: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
      if (showExportDropdown && !target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
      if (showImportDropdown && !target.closest('.import-dropdown-container')) {
        setShowImportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMeterDropdown, showProfileDropdown, showVoltageLevelDropdown, showExportDropdown, showImportDropdown]);

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
          // Merge with default filter values to ensure all properties are defined
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
            showOnlyStandaloneEvents: false,
            showFalseEventsOnly: false,
            ...(defaultProfile.filters as any)
          });
          setSelectedProfileId(defaultProfile.id);
        }
      }
    } catch (error) {
      console.error('Error loading filter profiles:', error);
    }
  };

  const loadEventImpacts = async (eventId: string) => {
    console.log('🔍 [loadEventImpacts] Loading impacts for event:', eventId);
    
    const { data, error } = await supabase
      .from('event_customer_impact')
      .select('*, customer:customers(*)')
      .eq('event_id', eventId);

    console.log('🔍 [loadEventImpacts] Query result:', { 
      error, 
      impactCount: data?.length || 0,
      firstImpact: data?.[0]
    });

    if (error) {
      console.error('❌ [loadEventImpacts] Error loading impacts:', error);
    }

    if (data) {
      console.log('✅ [loadEventImpacts] Impacts loaded successfully:', data.length);
      console.log('🔍 [loadEventImpacts] Sample impact data:', {
        id: data[0]?.id,
        customer_id: data[0]?.customer_id,
        hasCustomerObject: !!data[0]?.customer,
        customerName: data[0]?.customer?.name,
        customerAddress: data[0]?.customer?.address,
        customerAccount: data[0]?.customer?.account_number,
        impactLevel: data[0]?.impact_level,
        downtime: data[0]?.estimated_downtime_min
      });
      setImpacts(data);
    } else {
      console.warn('⚠️ [loadEventImpacts] No impact data returned');
    }
  };

  const handleEventSelect = (event: PQEvent) => {
    console.log('🎯 [handleEventSelect] Event selected:', {
      eventId: event.id,
      customerCount: event.customer_count,
      eventType: event.event_type,
      timestamp: event.timestamp
    });
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
      // Merge with default filter values to ensure all properties are defined
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
        showOnlyStandaloneEvents: false,
        showFalseEventsOnly: false,
        ...(profile.filters as any)
      });
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
      showOnlyStandaloneEvents: false,
      showFalseEventsOnly: false
    });
    setSelectedProfileId(null);
  };

  // Export functions
  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    setIsExporting(true);
    setShowExportDropdown(false);
    
    try {
      // Use finalEvents (the filtered and displayed events)
      const eventsToExport = finalEvents;
      
      // Create substations map
      const substationsMap = new Map<string, Substation>();
      substations.forEach(sub => substationsMap.set(sub.id, sub));
      
      // Export based on format
      switch (format) {
        case 'excel':
          await ExportService.exportToExcel(eventsToExport, substationsMap);
          break;
        case 'csv':
          await ExportService.exportToCSV(eventsToExport, substationsMap);
          break;
        case 'pdf':
          await ExportService.exportToPDF(eventsToExport, substationsMap);
          break;
      }
      
      console.log(`✅ Successfully exported ${eventsToExport.length} events as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export events as ${format.toUpperCase()}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  // Import functions
  const handleDownloadTemplate = () => {
    const headers = [
      'event_type',
      'timestamp',
      'substation_id',
      'voltage_level',
      'circuit_id',
      'meter_id',
      'duration_ms',
      'remaining_voltage',
      'affected_phases',
      'severity',
      'magnitude',
      'customer_count',
      'address',
      'cause',
      'equipment_type',
      'weather',
      'remarks',
      'parent_event_id'
    ];

    const exampleRow = [
      'voltage_dip',
      '2024-01-15 10:30:00',
      'SUBSTATION_ID',
      '132kV',
      'CIRCUIT_001',
      'METER_001',
      '500',
      '85',
      'A,B,C',
      'medium',
      '15',
      '0',
      'Location Address',
      'Equipment Failure',
      'Transformer',
      'Normal',
      'Additional remarks',
      ''
    ];

    const csvContent = [
      headers.join(','),
      exampleRow.join(','),
      '# event_type: voltage_dip, voltage_swell, momentary_interruption, sustained_interruption, voltage_sag',
      '# timestamp: YYYY-MM-DD HH:MM:SS format',
      '# voltage_level: 400kV, 132kV, 33kV, 11kV, 380V',
      '# affected_phases: Comma-separated (e.g., A,B,C)',
      '# severity: low, medium, high, critical',
      '# parent_event_id: Leave empty for standalone events, or provide existing event ID for child events'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `event_import_template_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setShowImportDropdown(false);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setShowImportDropdown(false);
    setShowImportModal(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const errors: Array<{ row: number; column: string; message: string }> = [];
      let successCount = 0;
      let failedCount = 0;

      // Validate required columns
      const requiredColumns = ['event_type', 'timestamp', 'substation_id', 'voltage_level'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const rowNumber = i + 1;
        const values = lines[i].split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Validate row
        const rowErrors = validateImportRow(row, rowNumber);
        
        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
          failedCount++;
          continue;
        }

        // Create event
        try {
          const eventData = {
            event_type: row.event_type as any,
            timestamp: new Date(row.timestamp).toISOString(),
            substation_id: row.substation_id,
            voltage_level: row.voltage_level,
            circuit_id: row.circuit_id || null,
            meter_id: row.meter_id || null,
            duration_ms: row.duration_ms ? parseInt(row.duration_ms) : 1000,
            remaining_voltage: row.remaining_voltage ? parseFloat(row.remaining_voltage) : null,
            affected_phases: row.affected_phases ? row.affected_phases.split(',').map(p => p.trim()) : ['A', 'B', 'C'],
            severity: row.severity || 'medium',
            magnitude: row.magnitude ? parseFloat(row.magnitude) : 0,
            customer_count: row.customer_count ? parseInt(row.customer_count) : 0,
            address: row.address || null,
            cause: row.cause || null,
            equipment_type: row.equipment_type || null,
            weather: row.weather || null,
            remarks: row.remarks || null,
            parent_event_id: row.parent_event_id || null,
            is_child_event: !!row.parent_event_id,
            status: 'open' as const,
            validated_by_adms: false,
            false_event: false
          };

          const { error } = await supabase
            .from('pq_events')
            .insert([eventData]);

          if (error) {
            throw error;
          }

          successCount++;
        } catch (error: any) {
          errors.push({
            row: rowNumber,
            column: 'General',
            message: `Failed to create event: ${error.message || 'Unknown error'}`
          });
          failedCount++;
        }
      }

      setImportResults({
        success: successCount,
        failed: failedCount,
        errors: errors
      });

      // Reload events if any succeeded
      if (successCount > 0) {
        await loadData();
      }
    } catch (error: any) {
      alert(`Import failed: ${error.message}`);
      setShowImportModal(false);
    } finally {
      setIsImporting(false);
      event.target.value = ''; // Reset file input
    }
  };

  const validateImportRow = (row: Record<string, string>, rowNumber: number): Array<{ row: number; column: string; message: string }> => {
    const errors: Array<{ row: number; column: string; message: string }> = [];
    
    // Validate event_type
    const validEventTypes = ['voltage_dip', 'voltage_swell', 'momentary_interruption', 'sustained_interruption', 'voltage_sag'];
    if (!validEventTypes.includes(row.event_type)) {
      errors.push({
        row: rowNumber,
        column: 'event_type',
        message: `Invalid value. Must be one of: ${validEventTypes.join(', ')}`
      });
    }

    // Validate timestamp
    if (!row.timestamp || isNaN(new Date(row.timestamp).getTime())) {
      errors.push({
        row: rowNumber,
        column: 'timestamp',
        message: 'Invalid date format. Use YYYY-MM-DD HH:MM:SS'
      });
    }

    // Validate substation_id (can be UUID, code, or name)
    if (!row.substation_id) {
      errors.push({
        row: rowNumber,
        column: 'substation_id',
        message: 'Substation ID is required'
      });
    } else {
      const substationExists = substations.some(s => 
        s.id === row.substation_id || 
        s.code === row.substation_id || 
        s.name === row.substation_id
      );
      if (!substationExists) {
        errors.push({
          row: rowNumber,
          column: 'substation_id',
          message: 'Substation not found in database (tried UUID, code, and name)'
        });
      }
    }

    // Validate voltage_level
    const validVoltageLevels = ['400kV', '132kV', '33kV', '11kV', '380V'];
    if (!validVoltageLevels.includes(row.voltage_level)) {
      errors.push({
        row: rowNumber,
        column: 'voltage_level',
        message: `Invalid value. Must be one of: ${validVoltageLevels.join(', ')}`
      });
    }

    // Validate duration_ms if provided
    if (row.duration_ms && (isNaN(parseInt(row.duration_ms)) || parseInt(row.duration_ms) < 0)) {
      errors.push({
        row: rowNumber,
        column: 'duration_ms',
        message: 'Must be a positive number'
      });
    }

    // Validate remaining_voltage if provided
    if (row.remaining_voltage) {
      const value = parseFloat(row.remaining_voltage);
      if (isNaN(value) || value < 0 || value > 100) {
        errors.push({
          row: rowNumber,
          column: 'remaining_voltage',
          message: 'Must be a number between 0 and 100'
        });
      }
    }

    // Validate severity if provided
    if (row.severity) {
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(row.severity)) {
        errors.push({
          row: rowNumber,
          column: 'severity',
          message: `Invalid value. Must be one of: ${validSeverities.join(', ')}`
        });
      }
    }

    // Validate parent_event_id if provided
    if (row.parent_event_id && !row.parent_event_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      errors.push({
        row: rowNumber,
        column: 'parent_event_id',
        message: 'Must be a valid UUID format or leave empty'
      });
    }

    return errors;
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
    const filtered = events.filter(event => {
      // Date range filter
      if (filters.startDate && new Date(event.timestamp) < new Date(filters.startDate)) {
        return false;
      }
      if (filters.endDate && new Date(event.timestamp) > new Date(filters.endDate)) {
        return false;
      }
      
      // Event type filter
      if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.event_type)) {
        return false;
      }
      
      // Severity filter
      if (filters.severityLevels.length > 0 && !filters.severityLevels.includes(event.severity)) {
        return false;
      }
      
      // Status filter
      if (filters.statusOptions.length > 0 && !filters.statusOptions.includes(event.status)) {
        return false;
      }
      
      // Voltage level filter
      if (filters.voltageLevels.length > 0 && !filters.voltageLevels.includes(event.voltage_level)) {
        return false;
      }
      
      // Duration filter
      if (event.duration_ms !== null && (event.duration_ms < filters.minDuration || event.duration_ms > filters.maxDuration)) {
        return false;
      }
      
      // Customer count filter
      const customerCount = event.customer_count || 0;
      if (customerCount < filters.minCustomers || customerCount > filters.maxCustomers) {
        return false;
      }
      
      // Remaining voltage filter
      if (event.remaining_voltage !== null && event.remaining_voltage !== undefined) {
        if (event.remaining_voltage < filters.minRemainingVoltage || event.remaining_voltage > filters.maxRemainingVoltage) {
          return false;
        }
      }
      
      // Circuit ID filter
      if (filters.circuitIds.length > 0 && !filters.circuitIds.includes(event.circuit_id)) {
        return false;
      }
      
      // Validation filter
      if (filters.showOnlyUnvalidated && event.validated_by_adms) {
        return false;
      }
      
      // Standalone event filter (show only events that are not mother and not child)
      if (filters.showOnlyStandaloneEvents) {
        // An event is standalone if:
        // 1. It's NOT a mother event (is_mother_event !== true)
        // 2. It's NOT a child event (is_child_event !== true AND parent_event_id is null/empty)
        const isStandalone = !event.is_mother_event && !event.is_child_event && !event.parent_event_id;
        
        if (!isStandalone) {
          return false;
        }
      }

      // Meter ID filter
      if (filters.meterIds.length > 0 && event.meter_id && !filters.meterIds.includes(event.meter_id)) {
        return false;
      }

      return true;
    });
    
    return filtered;
  };

  const filteredEvents = applyFilters(events);
  
  // Apply false event filter (only show events where false_event is explicitly true)
  const finalEvents = filters.showFalseEventsOnly 
    ? filteredEvents.filter(e => e.false_event === true)
    : filteredEvents;
  
  const eventTree = buildEventTree(finalEvents);

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

  // Manual Event Creation Handlers
  const validateEventForm = () => {
    const errors: Record<string, string> = {};
    
    // Required fields
    if (!eventFormData.event_type) {
      errors.event_type = 'Event type is required';
    }
    if (!eventFormData.timestamp) {
      errors.timestamp = 'Timestamp is required';
    } else {
      const eventDate = new Date(eventFormData.timestamp);
      if (eventDate > new Date()) {
        errors.timestamp = 'Event cannot be in the future';
      }
    }
    if (!eventFormData.substation_id) {
      errors.substation_id = 'Substation is required';
    }
    if (!eventFormData.severity) {
      errors.severity = 'Severity is required';
    }
    
    // Mother/Child event validation
    if (eventFormData.is_child_event && !eventFormData.parent_event_id) {
      errors.parent_event_id = 'Mother event is required for child events';
    }
    
    // Number validations
    if (eventFormData.duration_ms && (eventFormData.duration_ms < 1 || eventFormData.duration_ms > 300000)) {
      errors.duration_ms = 'Duration must be between 1ms and 300,000ms (5 minutes)';
    }
    if (eventFormData.remaining_voltage && (eventFormData.remaining_voltage < 0 || eventFormData.remaining_voltage > 100)) {
      errors.remaining_voltage = 'Remaining voltage must be between 0% and 100%';
    }
    if (eventFormData.magnitude && eventFormData.magnitude < 0) {
      errors.magnitude = 'Magnitude must be positive';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateEventFormChange = (field: string, value: any) => {
    setEventFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleOpenCreateEventModal = () => {
    console.log('✅ handleOpenCreateEventModal called');
    console.log('📊 Current substations:', substations.length);
    console.log('📊 Current meters:', meters.length);
    setShowCreateEventModal(true);
    // Reset form
    setEventFormData({
      event_type: 'voltage_dip',
      timestamp: new Date().toISOString().slice(0, 16),
      substation_id: '',
      meter_id: '',
      voltage_level: '',
      circuit_id: '',
      duration_ms: 1000,
      remaining_voltage: 85,
      affected_phases: ['A', 'B', 'C'],
      severity: 'medium',
      magnitude: 0,
      customer_count: 0,
      address: '',
      cause: '',
      equipment_type: '',
      weather: '',
      remarks: '',
      is_child_event: false,
      parent_event_id: ''
    });
    setFormErrors({});
  };

  const handleCloseCreateEventModal = () => {
    setShowCreateEventModal(false);
    setEventFormData({
      event_type: 'voltage_dip',
      timestamp: new Date().toISOString().slice(0, 16),
      substation_id: '',
      meter_id: '',
      voltage_level: '',
      circuit_id: '',
      duration_ms: 1000,
      remaining_voltage: 85,
      affected_phases: ['A', 'B', 'C'],
      severity: 'medium',
      magnitude: 0,
      customer_count: 0,
      address: '',
      cause: '',
      equipment_type: '',
      weather: '',
      remarks: '',
      is_child_event: false,
      parent_event_id: ''
    });
    setFormErrors({});
  };

  const handleSubmitCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Form submitted, validating...');
    
    // Validate form
    if (!validateEventForm()) {
      console.log('❌ Validation failed:', formErrors);
      alert('Please fix all validation errors before creating the event.');
      return;
    }
    
    console.log('✅ Validation passed, creating event...');
    console.log('📋 Form data:', eventFormData);
    setCreatingEvent(true);
    
    try {
      // Step 1: Create the event
      const { data: newEvent, error: eventError } = await supabase
        .from('pq_events')
        .insert({
          event_type: eventFormData.event_type,
          timestamp: eventFormData.timestamp,
          substation_id: eventFormData.substation_id || null,
          meter_id: eventFormData.meter_id || null,
          voltage_level: eventFormData.voltage_level || null,
          circuit_id: eventFormData.circuit_id || null,
          duration_ms: eventFormData.duration_ms || null,
          remaining_voltage: eventFormData.remaining_voltage || null,
          affected_phases: eventFormData.affected_phases,
          severity: eventFormData.severity,
          magnitude: eventFormData.magnitude || null,
          customer_count: 0, // Will be calculated
          address: eventFormData.address || null,
          cause: eventFormData.cause || null,
          equipment_type: eventFormData.equipment_type || null,
          weather: eventFormData.weather || null,
          remarks: eventFormData.remarks || null,
          status: 'new',
          is_mother_event: false,
          is_child_event: eventFormData.is_child_event,
          parent_event_id: eventFormData.is_child_event ? eventFormData.parent_event_id : null,
          false_event: false,
          validated_by_adms: false,
          is_special_event: false,
          manual_create_idr: true
        })
        .select()
        .single();

      if (eventError) throw eventError;

      console.log('✅ Event created successfully:', newEvent.id);

      // Step 2: Auto-calculate customer impacts using customer_transformer_matching
      if (newEvent && eventFormData.substation_id && eventFormData.circuit_id) {
        console.log('🔍 Searching for customer impacts...');
        console.log('   Substation:', eventFormData.substation_id);
        console.log('   Circuit:', eventFormData.circuit_id);
        
        // Get matching customers for this substation and circuit
        const { data: matchings, error: matchingError } = await supabase
          .from('customer_transformer_matching')
          .select('customer_id, customer:customers(*)')
          .eq('substation_id', eventFormData.substation_id)
          .eq('circuit_id', eventFormData.circuit_id)
          .eq('active', true);

        console.log('📊 Found matchings:', matchings?.length || 0);

        if (!matchingError && matchings && matchings.length > 0) {
          // Map severity to impact level
          const impactLevelMap: Record<string, string> = {
            'critical': 'severe',
            'high': 'moderate',
            'medium': 'minor',
            'low': 'minor'
          };
          
          const impactLevel = impactLevelMap[eventFormData.severity] || 'minor';
          const downtimeMin = Math.round((eventFormData.duration_ms || 0) / 60000);

          console.log('💡 Creating impact records:', {
            count: matchings.length,
            impactLevel,
            downtimeMin
          });

          // Create customer impact records
          const impactRecords = matchings.map(m => ({
            event_id: newEvent.id,
            customer_id: m.customer_id,
            impact_level: impactLevel,
            estimated_downtime_min: downtimeMin
          }));

          const { error: impactError } = await supabase
            .from('event_customer_impact')
            .insert(impactRecords);

          if (impactError) {
            console.error('❌ Error creating customer impacts:', impactError);
          } else {
            console.log('✅ Customer impacts created successfully');
          }

          // Update event with customer count
          console.log('🔄 Updating event customer count:', matchings.length);
          await supabase
            .from('pq_events')
            .update({ customer_count: matchings.length })
            .eq('id', newEvent.id);
        }
      }

      // Step 3: Success - reload data and navigate to new event
      console.log('🔄 Reloading data...');
      await loadData();
      handleCloseCreateEventModal();
      
      // Navigate to the newly created event
      if (newEvent) {
        console.log('🎯 Navigating to new event:', newEvent.id);
        const event = events.find(e => e.id === newEvent.id) || newEvent;
        handleEventSelect(event as PQEvent);
      }
      
      console.log('🎉 Event creation complete!');
      alert('Event created successfully!');
    } catch (error) {
      console.error('❌ Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleTogglePhase = (phase: string) => {
    setEventFormData(prev => {
      const phases = prev.affected_phases.includes(phase)
        ? prev.affected_phases.filter(p => p !== phase)
        : [...prev.affected_phases, phase];
      return { ...prev, affected_phases: phases };
    });
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  console.log('🔘 + Event button clicked');
                  handleOpenCreateEventModal();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">Event</span>
              </button>

              {/* Import Button with Dropdown */}
              <div className="relative import-dropdown-container">
                <button
                  onClick={() => setShowImportDropdown(!showImportDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <Upload className="w-5 h-5" />
                  <span className="font-semibold">Import</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showImportDropdown && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-30 min-w-[200px]">
                    <label className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportCSV}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span>Import CSV</span>
                      </div>
                    </label>
                    <button
                      onClick={handleDownloadTemplate}
                      className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-green-50 text-left transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileDown className="w-4 h-4 text-green-600" />
                        <span>Download Template</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
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
                                  <div className="text-sm font-medium text-slate-700">
                                    {meter.meter_id} | {meter.location}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {meter.voltage_level && <span>⚡ {meter.voltage_level}</span>}
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
                    checked={filters.showOnlyStandaloneEvents}
                    onChange={(e) => setFilters((prev: any) => ({ ...prev, showOnlyStandaloneEvents: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Show only standalone events</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.showFalseEventsOnly}
                    onChange={(e) => setFilters((prev: any) => ({ ...prev, showFalseEventsOnly: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Show false events only</span>
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-4 max-h-[800px] overflow-y-auto xl:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-900">
                  {viewMode === 'tree' ? 'Event Tree' : 'Events'}
                  <span className="text-xs font-normal text-slate-500 ml-2">
                    ({finalEvents.length})
                  </span>
                </h2>
                
                {/* Export Button */}
                <div className="relative export-dropdown-container">
                    <button
                      onClick={() => setShowExportDropdown(!showExportDropdown)}
                      disabled={isExporting || finalEvents.length === 0}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Export Events"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  
                  {showExportDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                      <button
                        onClick={() => handleExport('excel')}
                        disabled={isExporting}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export to Excel
                      </button>
                      <button
                        onClick={() => handleExport('csv')}
                        disabled={isExporting}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export to CSV
                      </button>
                      <button
                        onClick={() => handleExport('pdf')}
                        disabled={isExporting}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export to PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {viewMode === 'tree' ? (
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 mb-2">
                    Mother events with child events
                  </div>
                  {/* Tree View Component would go here */}
                  <div className="space-y-1">
                    {eventTree.map((node) => (
                      <div key={node.id} className="border rounded-lg p-2">
                        <div
                          className={`p-1.5 rounded transition-all ${
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
                            
                            {/* Mother event indicator */}
                            {node.event.is_mother_event && (
                              <GitBranch className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            )}
                            
                            <div
                              onClick={() => handleEventSelect(node.event)}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {node.event.isFlaggedAsFalse && (
                                      <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                    )}
                                    <p className="font-semibold text-sm text-slate-900 capitalize truncate">
                                      {node.event.event_type.replace('_', ' ')}
                                    </p>
                                  </div>
                                  <p className="text-xs text-slate-600 truncate">{node.event.circuit_id}</p>
                                  <p className="text-xs text-slate-500">
                                    {new Date(node.event.timestamp).toLocaleTimeString()}
                                  </p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${
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
                        </div>
                        
                        {/* Child events */}
                        {node.children.length > 0 && (
                          <div className="ml-6 mt-1 space-y-1">
                            {node.children.map((child) => (
                              <div
                                key={child.id}
                                onClick={() => handleEventSelect(child.event)}
                                className={`p-1.5 text-xs bg-slate-50 rounded cursor-pointer hover:bg-slate-100 ${
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
                <div className="space-y-1">
                  {finalEvents.map((event) => {
                    const substation = substations.find(s => s.id === event.substation_id);
                    return (
                      <div
                        key={event.id}
                        className={`p-2 rounded-lg border-2 transition-all ${
                          selectedEvent?.id === event.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        } ${
                          event.false_event ? 'border-l-4 border-l-orange-500' : ''
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

                            {/* Mother event indicator */}
                            {event.is_mother_event && (
                              <GitBranch className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            )}

                            <div
                              onClick={() => handleEventSelect(event)}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    {!event.validated_by_adms && (
                                      <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                                    )}
                                    {event.false_event && (
                                      <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                    )}
                                    <p className="font-semibold text-sm text-slate-900 truncate">{substation?.name || event.circuit_id}</p>
                                  </div>
                                  <div className="flex items-center justify-between gap-2 mt-0.5">
                                    <p className="text-sm text-slate-600 capitalize">{event.event_type.replace('_', ' ')}</p>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${
                                      event.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                      event.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                      event.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {event.severity}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    {new Date(event.timestamp).toLocaleTimeString()} • {event.duration_ms && (event.duration_ms < 1000 ? `${event.duration_ms}ms` : `${(event.duration_ms/1000).toFixed(1)}s`)}
                                  </p>
                                  {event.customer_count && (
                                    <p className="text-xs text-slate-500">
                                      <Users className="w-3 h-3 inline mr-1" />
                                      {event.customer_count} customers
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right hidden">
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

            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 max-h-[800px] overflow-y-auto xl:col-span-3">
              {selectedEvent ? (
                <EventDetails
                  event={selectedEvent}
                  substation={substations.find(s => s.id === selectedEvent.substation_id)}
                  impacts={impacts}
                  onStatusChange={updateEventStatus}
                  onEventDeleted={handleEventDeleted}
                  onEventUpdated={loadData}
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
                {filters.showOnlyStandaloneEvents && <li>• Only Standalone Events</li>}
                {filters.showFalseEventsOnly && <li>• Show False Events Only</li>}
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

      {/* Create Event Modal */}
      {showCreateEventModal && (() => {
        console.log('🎨 Modal is now rendering, showCreateEventModal:', showCreateEventModal);
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <Plus className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-bold text-gray-900">Create New Event</h2>
              </div>
              <button
                onClick={handleCloseCreateEventModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreateEvent} className="p-6 space-y-6">
              {/* Basic Information Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  📋 Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Event Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={eventFormData.event_type}
                      onChange={(e) => handleCreateEventFormChange('event_type', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.event_type ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    >
                      <option value="voltage_dip">Voltage Dip</option>
                      <option value="voltage_swell">Voltage Swell</option>
                      <option value="harmonic">Harmonic Distortion</option>
                      <option value="interruption">Supply Interruption</option>
                      <option value="transient">Transient Event</option>
                      <option value="flicker">Voltage Flicker</option>
                    </select>
                    {formErrors.event_type && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.event_type}</p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timestamp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={eventFormData.timestamp}
                      onChange={(e) => handleCreateEventFormChange('timestamp', e.target.value)}
                      max={new Date().toISOString().slice(0, 16)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.timestamp ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {formErrors.timestamp && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.timestamp}</p>
                    )}
                  </div>

                  {/* Substation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Substation <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={eventFormData.substation_id}
                      onChange={(e) => {
                        handleCreateEventFormChange('substation_id', e.target.value);
                        // Auto-fill voltage level from substation
                        const substation = substations.find(s => s.id === e.target.value);
                        if (substation) {
                          handleCreateEventFormChange('voltage_level', substation.voltage_level);
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.substation_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    >
                      <option value="">Select substation...</option>
                      {substations.map(sub => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} ({sub.code}) - {sub.voltage_level}
                        </option>
                      ))}
                    </select>
                    {formErrors.substation_id && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.substation_id}</p>
                    )}
                  </div>

                  {/* Severity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Severity <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={eventFormData.severity}
                      onChange={(e) => handleCreateEventFormChange('severity', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.severity ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    {formErrors.severity && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.severity}</p>
                    )}
                  </div>

                  {/* Event Type (Mother/Child) */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Relationship
                    </label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="event_relationship"
                          checked={!eventFormData.is_child_event}
                          onChange={() => {
                            handleCreateEventFormChange('is_child_event', false);
                            handleCreateEventFormChange('parent_event_id', '');
                          }}
                          className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Standalone Event</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="event_relationship"
                          checked={eventFormData.is_child_event}
                          onChange={() => handleCreateEventFormChange('is_child_event', true)}
                          className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Child Event</span>
                      </label>
                    </div>
                  </div>

                  {/* Mother Event Selection (shown only when is_child_event is true) */}
                  {eventFormData.is_child_event && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mother Event <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={eventFormData.parent_event_id}
                        onChange={(e) => handleCreateEventFormChange('parent_event_id', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          formErrors.parent_event_id ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      >
                        <option value="">Select mother event...</option>
                        {events
                          .filter(e => {
                            // Only show events that:
                            // 1. Are not child events themselves
                            // 2. From the same substation (if substation is selected)
                            // 3. Within last 24 hours of selected timestamp
                            const isNotChild = !e.is_child_event;
                            const sameSubstation = !eventFormData.substation_id || e.substation_id === eventFormData.substation_id;
                            const eventTime = new Date(e.timestamp).getTime();
                            const formTime = new Date(eventFormData.timestamp).getTime();
                            const within24Hours = Math.abs(eventTime - formTime) <= 24 * 60 * 60 * 1000; // 24 hours
                            
                            return isNotChild && sameSubstation && within24Hours;
                          })
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map(event => (
                            <option key={event.id} value={event.id}>
                              {event.event_type.replace('_', ' ')} - {new Date(event.timestamp).toLocaleString()} 
                              {event.is_mother_event ? ' (Mother Event)' : ''} 
                              - {event.substation?.name || event.substation?.code || 'Unknown'}
                            </option>
                          ))}
                      </select>
                      {formErrors.parent_event_id && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.parent_event_id}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Showing events from the same substation within 24 hours of selected timestamp
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Measurement Details Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  ⚡ Measurement Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* PQ Meter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PQ Meter
                    </label>
                    <select
                      value={eventFormData.meter_id}
                      onChange={(e) => handleCreateEventFormChange('meter_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select meter (optional)...</option>
                      {meters
                        .filter(m => !eventFormData.substation_id || m.substation_id === eventFormData.substation_id)
                        .map(meter => (
                          <option key={meter.id} value={meter.id}>
                            {meter.meter_id} | {meter.location}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Circuit ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Circuit ID
                    </label>
                    <input
                      type="text"
                      value={eventFormData.circuit_id}
                      onChange={(e) => handleCreateEventFormChange('circuit_id', e.target.value)}
                      placeholder="e.g., H1, H2, H3"
                      maxLength={50}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (ms)
                    </label>
                    <input
                      type="number"
                      value={eventFormData.duration_ms}
                      onChange={(e) => handleCreateEventFormChange('duration_ms', parseInt(e.target.value) || 0)}
                      min="1"
                      max="300000"
                      placeholder="1000"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.duration_ms ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.duration_ms && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.duration_ms}</p>
                    )}
                  </div>

                  {/* Remaining Voltage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remaining Voltage (%)
                    </label>
                    <input
                      type="number"
                      value={eventFormData.remaining_voltage}
                      onChange={(e) => handleCreateEventFormChange('remaining_voltage', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="85.5"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.remaining_voltage ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.remaining_voltage && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.remaining_voltage}</p>
                    )}
                  </div>

                  {/* Magnitude */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Magnitude (%, THD%)
                    </label>
                    <input
                      type="number"
                      value={eventFormData.magnitude}
                      onChange={(e) => handleCreateEventFormChange('magnitude', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.1"
                      placeholder="15.5"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.magnitude ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.magnitude && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.magnitude}</p>
                    )}
                  </div>

                  {/* Affected Phases */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Affected Phases
                    </label>
                    <div className="flex gap-4 items-center pt-2">
                      {['A', 'B', 'C'].map(phase => (
                        <label key={phase} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={eventFormData.affected_phases.includes(phase)}
                            onChange={() => handleTogglePhase(phase)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium">Phase {phase}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  🔍 Additional Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Cause */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cause
                    </label>
                    <select
                      value={eventFormData.cause}
                      onChange={(e) => handleCreateEventFormChange('cause', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select cause (optional)...</option>
                      <option value="Equipment Failure">Equipment Failure</option>
                      <option value="Lightning Strike">Lightning Strike</option>
                      <option value="Overload">Overload</option>
                      <option value="Tree Contact">Tree Contact</option>
                      <option value="Animal Contact">Animal Contact</option>
                      <option value="Cable Fault">Cable Fault</option>
                      <option value="Transformer Failure">Transformer Failure</option>
                      <option value="Circuit Breaker Trip">Circuit Breaker Trip</option>
                      <option value="Planned Maintenance">Planned Maintenance</option>
                      <option value="Weather Conditions">Weather Conditions</option>
                      <option value="Third Party Damage">Third Party Damage</option>
                      <option value="Aging Infrastructure">Aging Infrastructure</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>

                  {/* Equipment Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Equipment Type
                    </label>
                    <input
                      type="text"
                      value={eventFormData.equipment_type}
                      onChange={(e) => handleCreateEventFormChange('equipment_type', e.target.value)}
                      placeholder="e.g., Transformer, Circuit Breaker"
                      maxLength={100}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Weather */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weather
                    </label>
                    <select
                      value={eventFormData.weather}
                      onChange={(e) => handleCreateEventFormChange('weather', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select weather (optional)...</option>
                      <option value="Sunny">Sunny</option>
                      <option value="Rainy">Rainy</option>
                      <option value="Stormy">Stormy</option>
                      <option value="Cloudy">Cloudy</option>
                      <option value="Windy">Windy</option>
                      <option value="Clear">Clear</option>
                    </select>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={eventFormData.address}
                      onChange={(e) => handleCreateEventFormChange('address', e.target.value)}
                      placeholder="Event location address"
                      maxLength={200}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Remarks */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remarks
                    </label>
                    <textarea
                      value={eventFormData.remarks}
                      onChange={(e) => handleCreateEventFormChange('remarks', e.target.value)}
                      placeholder="Additional notes about the event..."
                      maxLength={500}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseCreateEventModal}
                  disabled={creatingEvent}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingEvent}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creatingEvent ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Create Event
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* Import Results Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <Upload className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">CSV Import Results</h2>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResults(null);
                }}
                disabled={isImporting}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              {isImporting ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-600 text-lg">Importing events...</p>
                  <p className="text-slate-500 text-sm mt-2">Please wait while we process your CSV file</p>
                </div>
              ) : importResults ? (
                <>
                  {/* Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-gray-600">Success</span>
                        </div>
                        <div className="text-3xl font-bold text-green-600">{importResults.success}</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                          <X className="w-5 h-5 text-red-600" />
                          <span className="text-sm font-medium text-gray-600">Failed</span>
                        </div>
                        <div className="text-3xl font-bold text-red-600">{importResults.failed}</div>
                      </div>
                    </div>
                  </div>

                  {/* Error Details */}
                  {importResults.errors.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Error Details ({importResults.errors.length})
                      </h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {importResults.errors.map((error, index) => (
                          <div
                            key={index}
                            className="bg-red-50 border border-red-200 rounded-lg p-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                                {error.row}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-gray-900">Row {error.row}</span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-sm font-medium text-red-700">Column: {error.column}</span>
                                </div>
                                <p className="text-sm text-gray-700">{error.message}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {importResults.success > 0 && importResults.failed === 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                      <Check className="w-12 h-12 text-green-600 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-green-900 mb-2">
                        All Events Imported Successfully!
                      </h3>
                      <p className="text-green-700">
                        {importResults.success} event{importResults.success > 1 ? 's' : ''} have been added to the system.
                      </p>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Footer Actions */}
            {!isImporting && importResults && (
              <div className="border-t border-gray-200 p-6 bg-gray-50 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportResults(null);
                  }}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
