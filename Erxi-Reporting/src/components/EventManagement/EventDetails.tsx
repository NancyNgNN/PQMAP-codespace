import { useState, useEffect } from 'react';
import { Clock, MapPin, Zap, AlertTriangle, Users, ArrowLeft, GitBranch, Trash2, ChevronDown, ChevronUp, CheckCircle, XCircle, Ungroup, Download, FileText, Edit, Save, X as XIcon, Upload, FileDown } from 'lucide-react';
import { PQEvent, Substation, EventCustomerImpact, IDRRecord } from '../../types/database';
import { supabase } from '../../lib/supabase';
import WaveformDisplay from './WaveformDisplay';
import { MotherEventGroupingService } from '../../services/mother-event-grouping';
import { ExportService } from '../../services/exportService';

type TabType = 'overview' | 'technical' | 'impact' | 'children' | 'timeline' | 'idr';

interface EventDetailsProps {
  event: PQEvent;
  substation?: Substation;
  impacts: EventCustomerImpact[];
  onStatusChange: (eventId: string, status: string) => void;
  onEventDeleted?: () => void;
  onEventUpdated?: () => void;
}

export default function EventDetails({ event: initialEvent, substation: initialSubstation, impacts: initialImpacts, onStatusChange, onEventDeleted, onEventUpdated }: EventDetailsProps) {
  // Navigation state
  const [currentEvent, setCurrentEvent] = useState<PQEvent>(initialEvent);
  const [currentSubstation, setCurrentSubstation] = useState<Substation | undefined>(initialSubstation);
  const [currentImpacts, setCurrentImpacts] = useState<EventCustomerImpact[]>(initialImpacts);
  const [navigationStack, setNavigationStack] = useState<Array<{
    event: PQEvent;
    substation?: Substation;
    impacts: EventCustomerImpact[];
  }>>([]);
  
  // Tab state - remembers last viewed tab
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Child events state
  const [childEvents, setChildEvents] = useState<PQEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [childEventsExpanded, setChildEventsExpanded] = useState(false);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Ungroup state
  const [ungrouping, setUngrouping] = useState(false);
  const [isUngroupMode, setIsUngroupMode] = useState(false);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  
  // Mark False state
  const [isMarkFalseMode, setIsMarkFalseMode] = useState(false);
  const [selectedFalseChildIds, setSelectedFalseChildIds] = useState<string[]>([]);
  const [markingFalse, setMarkingFalse] = useState(false);
  
  // Export states
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // IDR upload states
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResults, setImportResults] = useState<{
    successful: number;
    failed: number;
    errors: Array<{ row: number; column: string; message: string; eventId?: string }>;
  } | null>(null);

  // IDR editing states
  const [isEditingIDR, setIsEditingIDR] = useState(false);
  const [idrRecord, setIDRRecord] = useState<IDRRecord | null>(null);
  const [loadingIDR, setLoadingIDR] = useState(false);
  const [idrFormData, setIDRFormData] = useState({
    idr_no: '',
    status: currentEvent.status,
    voltage_level: '',
    address: '',
    duration_ms: 0,
    v1: 0,
    v2: 0,
    v3: 0,
    equipment_type: '',
    cause_group: '',
    cause: '',
    remarks: '',
    object_part_group: '',
    object_part_code: '',
    damage_group: '',
    damage_code: '',
    fault_type: '',
    outage_type: '',
    weather: '',
    weather_condition: '',
    responsible_oc: '',
    total_cmi: 0,
    equipment_affected: '',
    restoration_actions: '',
    notes: '',
  });
  const [savingIDR, setSavingIDR] = useState(false);

  // Update state when props change
  useEffect(() => {
    console.log('🔍 [EventDetails] Props updated:', {
      eventId: initialEvent.id,
      impactCount: initialImpacts.length,
      firstImpactSample: initialImpacts[0] ? {
        id: initialImpacts[0].id,
        customer_id: initialImpacts[0].customer_id,
        hasCustomerObject: !!initialImpacts[0].customer,
        customerName: initialImpacts[0].customer?.name,
        customerAddress: initialImpacts[0].customer?.address,
        impactLevel: initialImpacts[0].impact_level
      } : 'No impacts'
    });
    
    setCurrentEvent(initialEvent);
    setCurrentSubstation(initialSubstation);
    setCurrentImpacts(initialImpacts);
    // Clear navigation stack when switching to a new top-level event
    setNavigationStack([]);
  }, [initialEvent, initialSubstation, initialImpacts]);

  // Load IDR record for current event
  useEffect(() => {
    loadIDRRecord(currentEvent.id);
  }, [currentEvent.id]);

  // Load child events for mother events
  useEffect(() => {
    if (currentEvent.is_mother_event) {
      loadChildEvents(currentEvent.id);
    } else {
      setChildEvents([]);
    }
  }, [currentEvent.id, currentEvent.is_mother_event]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportDropdown && !target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
      if (showUploadDropdown && !target.closest('.upload-dropdown-container')) {
        setShowUploadDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown, showUploadDropdown]);

  const loadIDRRecord = async (eventId: string) => {
    setLoadingIDR(true);
    try {
      const { data, error } = await supabase
        .from('idr_records')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading IDR record:', error);
      }
      
      if (data) {
        console.log('✅ IDR record loaded:', data);
        setIDRRecord(data);
        // Populate form with IDR record data
        setIDRFormData({
          idr_no: data.idr_no || '',
          status: data.status || currentEvent.status,
          voltage_level: data.voltage_level || '',
          address: data.address || '',
          duration_ms: data.duration_ms || 0,
          v1: data.v1 || 0,
          v2: data.v2 || 0,
          v3: data.v3 || 0,
          equipment_type: data.equipment_type || '',
          cause_group: data.cause_group || '',
          cause: data.cause || '',
          remarks: data.remarks || '',
          object_part_group: data.object_part_group || '',
          object_part_code: data.object_part_code || '',
          damage_group: data.damage_group || '',
          damage_code: data.damage_code || '',
          fault_type: data.fault_type || '',
          outage_type: data.outage_type || '',
          weather: data.weather || '',
          weather_condition: data.weather_condition || '',
          responsible_oc: data.responsible_oc || '',
          total_cmi: data.total_cmi || 0,
          equipment_affected: data.equipment_affected || '',
          restoration_actions: data.restoration_actions || '',
          notes: data.notes || '',
        });
      } else {
        console.log('ℹ️ No IDR record found, showing empty form');
        setIDRRecord(null);
        // Reset form to empty
        setIDRFormData({
          idr_no: '',
          status: currentEvent.status,
          voltage_level: '',
          address: '',
          duration_ms: 0,
          v1: 0,
          v2: 0,
          v3: 0,
          equipment_type: '',
          cause_group: '',
          cause: '',
          remarks: '',
          object_part_group: '',
          object_part_code: '',
          damage_group: '',
          damage_code: '',
          fault_type: '',
          outage_type: '',
          weather: '',
          weather_condition: '',
          responsible_oc: '',
          total_cmi: 0,
          equipment_affected: '',
          restoration_actions: '',
          notes: '',
        });
      }
    } catch (error) {
      console.error('Error loading IDR record:', error);
    } finally {
      setLoadingIDR(false);
    }
  };

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

      const { data: impactsData, error: impactsError } = await supabase
        .from('event_customer_impact')
        .select(`
          *,
          customer:customers (
            id,
            name,
            account_number,
            address
          )
        `)
        .eq('event_id', childEvent.id);

      console.log('🔍 [handleChildEventClick] Child event impacts loaded:', {
        childEventId: childEvent.id,
        impactCount: impactsData?.length || 0,
        error: impactsError,
        firstImpactSample: impactsData?.[0] ? {
          id: impactsData[0].id,
          customer_id: impactsData[0].customer_id,
          hasCustomer: !!impactsData[0].customer,
          customerName: impactsData[0].customer?.name
        } : 'No impacts'
      });

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

  const handleUngroupEvents = async () => {
    if (!confirm('Are you sure you want to ungroup these events? All child events will become independent events.')) {
      return;
    }

    setUngrouping(true);
    try {
      const success = await MotherEventGroupingService.ungroupEvents(currentEvent.id);
      
      if (success) {
        console.log('Events ungrouped successfully');
        if (onEventUpdated) {
          onEventUpdated();
        }
      } else {
        alert('Failed to ungroup events. Please try again.');
      }
    } catch (error) {
      console.error('Error ungrouping events:', error);
      alert('Failed to ungroup events. Please try again.');
    } finally {
      setUngrouping(false);
    }
  };

  // Toggle ungroup mode - shows checkboxes
  const handleUngroupMode = () => {
    setIsUngroupMode(true);
    setSelectedChildIds([]);
  };

  // Cancel ungroup mode - hides checkboxes and clears selection
  const handleCancelUngroup = () => {
    setIsUngroupMode(false);
    setSelectedChildIds([]);
  };

  // Save ungroup - ungroup selected children
  const handleSaveUngroup = async () => {
    if (selectedChildIds.length === 0) {
      alert('Please select at least one child event to ungroup.');
      return;
    }

    const confirmMessage = `Are you sure you want to ungroup ${selectedChildIds.length} selected event(s)? They will become standalone events.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setUngrouping(true);
    try {
      const success = await MotherEventGroupingService.ungroupSpecificEvents(selectedChildIds);
      
      if (success) {
        console.log(`Successfully ungrouped ${selectedChildIds.length} event(s)`);
        // Reset ungroup mode and selection
        setIsUngroupMode(false);
        setSelectedChildIds([]);
        // Reload child events and notify parent
        await loadChildEvents(currentEvent.id);
        if (onEventUpdated) {
          onEventUpdated();
        }
      } else {
        alert('Failed to ungroup selected events. Please try again.');
      }
    } catch (error) {
      console.error('Error ungrouping selected events:', error);
      alert('Failed to ungroup selected events. Please try again.');
    } finally {
      setUngrouping(false);
    }
  };

  // Handle checkbox selection toggle
  const handleCheckboxChange = (childId: string) => {
    setSelectedChildIds(prev => {
      if (prev.includes(childId)) {
        return prev.filter(id => id !== childId);
      } else {
        return [...prev, childId];
      }
    });
  };

  // Toggle select all checkboxes
  const handleSelectAllChildren = () => {
    if (selectedChildIds.length === childEvents.length) {
      setSelectedChildIds([]);
    } else {
      setSelectedChildIds(childEvents.map(child => child.id));
    }
  };

  // Convert false event to normal event
  const handleConvertFalseToStandalone = async () => {
    console.log('🔄 [handleConvertFalseToStandalone] Starting conversion', {
      eventId: currentEvent.id,
      false_event: currentEvent.false_event,
      is_child_event: currentEvent.is_child_event,
      parent_event_id: currentEvent.parent_event_id
    });

    if (!confirm('Are you sure you want to convert this false event to a normal event? This will mark it as a real event.')) {
      return;
    }

    try {
      const updateData: any = {
        false_event: false,
        parent_event_id: null,
        is_child_event: false,
        remarks: (currentEvent.remarks || '') + `\n[Converted from false event on ${new Date().toISOString().split('T')[0]}]`
      };

      const { error } = await supabase
        .from('pq_events')
        .update(updateData)
        .eq('id', currentEvent.id);

      if (error) throw error;

      console.log('✅ Successfully converted false event to standalone event');
      
      // Update local state
      setCurrentEvent({ ...currentEvent, ...updateData });
      
      // Notify parent to reload data
      if (onEventUpdated) {
        onEventUpdated();
      }

      alert('Event successfully converted to standalone event.');
    } catch (error) {
      console.error('❌ Error converting false event to standalone:', error);
      alert('Failed to convert event. Please try again.');
    }
  };

  // Toggle mark false mode - shows checkboxes
  const handleMarkFalseMode = () => {
    setIsMarkFalseMode(true);
    setSelectedFalseChildIds([]);
  };

  // Cancel mark false mode - hides checkboxes and clears selection
  const handleCancelMarkFalse = () => {
    setIsMarkFalseMode(false);
    setSelectedFalseChildIds([]);
  };

  // Save mark false - mark selected children as false events
  const handleSaveMarkFalse = async () => {
    if (selectedFalseChildIds.length === 0) {
      alert('Please select at least one child event to mark as false.');
      return;
    }

    const confirmMessage = `Are you sure you want to mark ${selectedFalseChildIds.length} selected event(s) as false events? They will be removed from this event group.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setMarkingFalse(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const updateData: any = {
        false_event: true,
        validated_by_adms: true, // Required by database constraint
        parent_event_id: null,
        is_child_event: false,
      };

      // Update all selected child events
      for (const childId of selectedFalseChildIds) {
        const childEvent = childEvents.find(c => c.id === childId);
        const remarkAddition = `\n[Marked as false event, removed from group on ${timestamp}]`;
        
        const { error } = await supabase
          .from('pq_events')
          .update({
            ...updateData,
            remarks: (childEvent?.remarks || '') + remarkAddition
          })
          .eq('id', childId);

        if (error) {
          console.error(`Error marking child ${childId} as false:`, error);
          throw error;
        }
      }

      console.log(`✅ Successfully marked ${selectedFalseChildIds.length} child event(s) as false events`);
      
      // Reset mark false mode and selection
      setIsMarkFalseMode(false);
      setSelectedFalseChildIds([]);
      
      // Reload child events and notify parent
      await loadChildEvents(currentEvent.id);
      if (onEventUpdated) {
        onEventUpdated();
      }

      alert(`Successfully marked ${selectedFalseChildIds.length} event(s) as false events.`);
    } catch (error) {
      console.error('❌ Error marking child events as false:', error);
      alert('Failed to mark events as false. Please try again.');
    } finally {
      setMarkingFalse(false);
    }
  };

  // Handle checkbox selection toggle for mark false
  const handleMarkFalseCheckboxChange = (childId: string) => {
    setSelectedFalseChildIds(prev => {
      if (prev.includes(childId)) {
        return prev.filter(id => id !== childId);
      } else {
        return [...prev, childId];
      }
    });
  };

  // Toggle select all checkboxes for mark false (only non-false events)
  const handleSelectAllForMarkFalse = () => {
    const nonFalseChildren = childEvents.filter(child => !child.false_event);
    if (selectedFalseChildIds.length === nonFalseChildren.length) {
      setSelectedFalseChildIds([]);
    } else {
      setSelectedFalseChildIds(nonFalseChildren.map(child => child.id));
    }
  };

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    setIsExporting(true);
    setShowExportDropdown(false);
    
    try {
      // Export current event and its children (if mother event)
      const eventsToExport: PQEvent[] = [currentEvent];
      if (currentEvent.is_mother_event && childEvents.length > 0) {
        eventsToExport.push(...childEvents);
      }
      
      // Create substations map
      const substationsMap = new Map<string, Substation>();
      if (currentSubstation) {
        substationsMap.set(currentSubstation.id, currentSubstation);
      }
      
      // Load substations for child events
      for (const child of childEvents) {
        if (child.substation_id && !substationsMap.has(child.substation_id)) {
          const { data } = await supabase
            .from('substations')
            .select('*')
            .eq('id', child.substation_id)
            .single();
          if (data) substationsMap.set(data.id, data);
        }
      }
      
      // Export based on format
      switch (format) {
        case 'excel':
          await ExportService.exportToExcel(
            eventsToExport, 
            substationsMap,
            `Event_${currentEvent.id.substring(0, 8)}_Export_${Date.now()}.xlsx`
          );
          break;
        case 'csv':
          await ExportService.exportToCSV(
            eventsToExport,
            substationsMap,
            `Event_${currentEvent.id.substring(0, 8)}_Export_${Date.now()}.csv`
          );
          break;
        case 'pdf':
          await ExportService.exportToPDF(
            eventsToExport,
            substationsMap,
            `Event_${currentEvent.id.substring(0, 8)}_Export_${Date.now()}.pdf`,
            true
          );
          break;
      }
      
      console.log(`✅ Successfully exported event and ${childEvents.length} children as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export event as ${format.toUpperCase()}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  // IDR CSV Upload Functions
  const handleDownloadIDRTemplate = () => {
    const headers = [
      'Event ID',
      'Cause',
      'Duration (minutes)',
      'Equipment Affected',
      'Restoration Actions',
      'Notes'
    ];

    const exampleRow = [
      'example-event-id',
      'Equipment Failure',
      '15',
      'Transformer TR-001',
      'Replaced fuse, restored power',
      'Scheduled maintenance recommended'
    ];

    const commentLines = [
      '# IDR CSV Import Template',
      '# Required fields: Event ID, Cause, Duration (minutes)',
      '# Optional fields: Equipment Affected, Restoration Actions, Notes',
      '# Event ID must exist in the system',
      '# Other fields will be auto-populated from the event record',
      ''
    ];

    const csvContent = [
      ...commentLines,
      headers.join(','),
      exampleRow.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `IDR_Import_Template_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    console.log('✅ IDR CSV template downloaded');
  };

  const validateIDRRow = async (row: any, rowIndex: number): Promise<{ valid: boolean; errors: Array<{ row: number; column: string; message: string }> }> => {
    const errors: Array<{ row: number; column: string; message: string }> = [];

    // Required: Event ID
    if (!row['Event ID'] || row['Event ID'].trim() === '') {
      errors.push({ row: rowIndex, column: 'Event ID', message: 'Event ID is required' });
    }

    // Required: Cause
    if (!row['Cause'] || row['Cause'].trim() === '') {
      errors.push({ row: rowIndex, column: 'Cause', message: 'Cause is required' });
    }

    // Required: Duration (minutes)
    if (!row['Duration (minutes)'] || row['Duration (minutes)'].trim() === '') {
      errors.push({ row: rowIndex, column: 'Duration (minutes)', message: 'Duration is required' });
    } else {
      const duration = parseInt(row['Duration (minutes)']);
      if (isNaN(duration) || duration < 0) {
        errors.push({ row: rowIndex, column: 'Duration (minutes)', message: 'Duration must be a positive number' });
      }
    }

    // Validate Event ID exists in database
    if (row['Event ID'] && row['Event ID'].trim() !== '') {
      const { data: eventData, error: eventError } = await supabase
        .from('pq_events')
        .select('id')
        .eq('id', row['Event ID'].trim())
        .single();

      if (eventError || !eventData) {
        errors.push({ row: rowIndex, column: 'Event ID', message: `Event ID '${row['Event ID']}' not found in system` });
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const handleImportIDRCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setShowUploadDropdown(false);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
      
      if (lines.length < 2) {
        alert('CSV file is empty or invalid');
        setIsUploading(false);
        return;
      }

      // Parse CSV
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      console.log(`📋 Parsing ${rows.length} IDR records from CSV`);

      // Validate all rows
      const validationResults = await Promise.all(
        rows.map((row, index) => validateIDRRow(row, index + 2)) // +2 because of header and 1-indexed
      );

      const allErrors = validationResults.flatMap(r => r.errors);
      const validRows = rows.filter((_, index) => validationResults[index].valid);

      console.log(`✅ Valid rows: ${validRows.length}, ❌ Invalid rows: ${rows.length - validRows.length}`);

      // Import valid rows
      let successful = 0;
      let failed = 0;
      const importErrors: Array<{ row: number; column: string; message: string; eventId?: string }> = [...allErrors];

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const originalIndex = rows.indexOf(row) + 2;

        try {
          const eventId = row['Event ID'].trim();
          const durationMinutes = parseInt(row['Duration (minutes)']);

          // Fetch event data to auto-populate fields
          const { data: eventData, error: eventFetchError } = await supabase
            .from('pq_events')
            .select('*')
            .eq('id', eventId)
            .single();

          if (eventFetchError || !eventData) {
            throw new Error(`Failed to fetch event data for ${eventId}`);
          }

          // Prepare IDR record with auto-populated fields from event
          const idrData = {
            event_id: eventId,
            idr_no: eventData.idr_no || null,
            status: eventData.status || null,
            voltage_level: eventData.voltage_level || null,
            address: eventData.address || null,
            duration_ms: durationMinutes * 60 * 1000, // Convert minutes to milliseconds
            v1: eventData.v1 || null,
            v2: eventData.v2 || null,
            v3: eventData.v3 || null,
            equipment_type: eventData.equipment_type || null,
            cause_group: eventData.cause_group || null,
            cause: row['Cause'].trim(), // From CSV (REQUIRED)
            remarks: eventData.remarks || null,
            object_part_group: eventData.object_part_group || null,
            object_part_code: eventData.object_part_code || null,
            damage_group: eventData.damage_group || null,
            damage_code: eventData.damage_code || null,
            fault_type: eventData.fault_type || null,
            outage_type: eventData.outage_type || null,
            weather: eventData.weather || null,
            weather_condition: eventData.weather_condition || null,
            responsible_oc: eventData.responsible_oc || null,
            total_cmi: eventData.total_cmi || null,
            equipment_affected: row['Equipment Affected']?.trim() || null,
            restoration_actions: row['Restoration Actions']?.trim() || null,
            notes: row['Notes']?.trim() || null,
            uploaded_by: user?.id || null,
            upload_source: 'csv_import' as const,
          };

          // Upsert IDR record
          const { error: upsertError } = await supabase
            .from('idr_records')
            .upsert(idrData, {
              onConflict: 'event_id',
              ignoreDuplicates: false
            });

          if (upsertError) {
            throw upsertError;
          }

          successful++;
          console.log(`✅ Row ${originalIndex}: IDR record imported for event ${eventId}`);
        } catch (error: any) {
          failed++;
          importErrors.push({
            row: originalIndex,
            column: 'Import',
            message: error.message || 'Failed to import record',
            eventId: row['Event ID']
          });
          console.error(`❌ Row ${originalIndex}: Import failed`, error);
        }
      }

      // Show results
      setImportResults({
        successful,
        failed: failed + (rows.length - validRows.length),
        errors: importErrors
      });
      setShowImportModal(true);

      // Reload IDR record if we just imported for current event
      if (validRows.some(r => r['Event ID'].trim() === currentEvent.id)) {
        await loadIDRRecord(currentEvent.id);
      }

      if (onEventUpdated) onEventUpdated();

    } catch (error: any) {
      console.error('CSV import error:', error);
      alert(`Failed to import CSV: ${error.message}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
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

  // Calculate child events severity distribution for preview
  const getChildEventsSummary = () => {
    const severityCounts = childEvents.reduce((acc, child) => {
      acc[child.severity] = (acc[child.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const parts = [];
    if (severityCounts.critical) parts.push(`${severityCounts.critical} Critical`);
    if (severityCounts.high) parts.push(`${severityCounts.high} High`);
    if (severityCounts.medium) parts.push(`${severityCounts.medium} Medium`);
    if (severityCounts.low) parts.push(`${severityCounts.low} Low`);
    
    return parts.join(', ');
  };

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

      {/* Header with Title and Delete Button */}
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
            {currentEvent.is_mother_event && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded">
                Mother
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Export Button */}
            <div className="relative export-dropdown-container">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={isExporting}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
                title="Export Event"
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
            
            {currentEvent.is_mother_event && (
              <button
                onClick={handleUngroupEvents}
                disabled={ungrouping}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all disabled:opacity-50"
                title="Ungroup Events"
              >
                <Ungroup className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Delete Event"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-600 mt-1">ID: {currentEvent.id.substring(0, 8)}</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            className={`px-4 py-2 font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'technical'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Technical
          </button>
          <button
            onClick={() => setActiveTab('impact')}
            className={`px-4 py-2 font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'impact'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer Impact
          </button>
          {currentEvent.is_mother_event && (
            <button
              onClick={() => setActiveTab('children')}
              className={`px-4 py-2 font-semibold text-sm whitespace-nowrap transition-all ${
                activeTab === 'children'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Child Events ({childEvents.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'timeline'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveTab('idr')}
            className={`px-4 py-2 font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'idr'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              IDR
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Basic Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-semibold">Location</span>
                </div>
                <p className="text-slate-900 font-medium">{currentSubstation?.name}</p>
                <p className="text-sm text-slate-600">{currentSubstation?.voltage_level}</p>
                {currentEvent.voltage_level && (
                  <p className="text-xs text-blue-600 mt-1">⚡ Event Level: {currentEvent.voltage_level}</p>
                )}
                {currentEvent.site_id && (
                  <p className="text-xs text-slate-600 mt-1">Site ID: {currentEvent.site_id}</p>
                )}
                {currentEvent.region && (
                  <p className="text-xs text-slate-600 mt-1">Region: {currentEvent.region}</p>
                )}
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

            {/* Event Information */}
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
                {currentEvent.circuit_id && (
                  <div>
                    <span className="text-slate-600">Circuit:</span>
                    <span className="ml-2 font-semibold text-slate-900">
                      {currentEvent.circuit_id}
                    </span>
                  </div>
                )}
              </div>
              {currentEvent.cause && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <span className="text-slate-600 text-sm">Cause:</span>
                  <p className="font-semibold text-slate-900 mt-1">{currentEvent.cause}</p>
                </div>
              )}
            </div>

            {/* Status Management */}
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

            {/* False Event Actions */}
            {(() => {
              console.log('🔍 [Convert Button Condition]', {
                activeTab,
                false_event: currentEvent.false_event,
                shouldShow: currentEvent.false_event === true
              });
              return currentEvent.false_event;
            })() && (
              <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <div>
                      <h3 className="font-semibold text-slate-900">False Event Detected</h3>
                      <p className="text-sm text-slate-600 mt-0.5">
                        This event has been validated as a false detection
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleConvertFalseToStandalone}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold shadow-md hover:shadow-lg"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Convert to normal event
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TECHNICAL TAB */}
        {activeTab === 'technical' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Technical Specifications */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <h4 className="font-semibold text-slate-900 mb-4">Technical Specifications</h4>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-slate-600">Voltage Level:</dt>
                  <dd className="text-lg font-semibold text-slate-900 mt-1">
                    {currentEvent.voltage_level || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-600">Circuit ID:</dt>
                  <dd className="text-lg font-semibold text-slate-900 mt-1">
                    {currentEvent.circuit_id || 'N/A'}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm text-slate-600 mb-2">Remaining Voltage:</dt>
                  <dd className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-900">
                        {currentEvent.remaining_voltage ? `${currentEvent.remaining_voltage.toFixed(1)}%` : 'N/A'}
                      </span>
                      <span className="text-slate-600">of nominal</span>
                    </div>
                    {currentEvent.remaining_voltage && (
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            currentEvent.remaining_voltage >= 90 ? 'bg-green-500' :
                            currentEvent.remaining_voltage >= 70 ? 'bg-yellow-500' :
                            currentEvent.remaining_voltage >= 50 ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${currentEvent.remaining_voltage}%` }}
                        />
                      </div>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-600">ADMS Validated:</dt>
                  <dd className="flex items-center gap-2 mt-1">
                    {currentEvent.validated_by_adms ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-700">Yes</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-slate-400" />
                        <span className="font-semibold text-slate-600">No</span>
                      </>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-600">Special Event:</dt>
                  <dd className="flex items-center gap-2 mt-1">
                    {currentEvent.is_special_event ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-semibold">
                        ⭐ Excluded from SARFI
                      </span>
                    ) : (
                      <span className="text-slate-600 text-sm">No</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-600">False Event:</dt>
                  <dd className="flex items-center gap-2 mt-1">
                    {currentEvent.false_event ? (
                      <>
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-red-700">Yes</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-700">No</span>
                      </>
                    )}
                  </dd>
                </div>
                {currentEvent.grouping_type && (
                  <div className="col-span-2">
                    <dt className="text-sm text-slate-600">Grouping Info:</dt>
                    <dd className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded text-sm font-semibold ${
                        currentEvent.grouping_type === 'automatic' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {currentEvent.grouping_type === 'automatic' ? '🤖 Automatic' : '👤 Manual'}
                      </span>
                      {currentEvent.grouped_at && (
                        <span className="text-sm text-slate-600">
                          on {new Date(currentEvent.grouped_at).toLocaleString()}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Waveform Display */}
            <WaveformDisplay data={waveformData} />
          </div>
        )}

        {/* CUSTOMER IMPACT TAB */}
        {activeTab === 'impact' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Impact Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg text-center">
                <div className="text-3xl font-bold text-yellow-900">
                  {currentEvent.customer_count || 0}
                </div>
                <div className="text-sm text-yellow-700 mt-1">Total Customers</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-900">
                  {currentImpacts.length}
                </div>
                <div className="text-sm text-blue-700 mt-1">Detailed Records</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg text-center">
                <div className="text-3xl font-bold text-purple-900">
                  {currentImpacts.length > 0 
                    ? Math.round(currentImpacts.reduce((sum, imp) => sum + (imp.estimated_downtime_min || 0), 0) / currentImpacts.length)
                    : 0}
                </div>
                <div className="text-sm text-purple-700 mt-1">Avg Downtime (min)</div>
              </div>
            </div>

            {/* Customer Impact Table */}
            {currentImpacts.length > 0 ? (
              <div>
                <h3 className="flex items-center gap-2 mb-3 font-semibold text-slate-900">
                  <Users className="w-5 h-5" />
                  Detailed Customer Records
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {currentImpacts.map((impact, index) => {
                    // Debug logging for each impact
                    if (index === 0) {
                      console.log('🔍 [EventDetails] Rendering impacts in Customer Impact tab:', {
                        totalCount: currentImpacts.length,
                        firstImpact: {
                          id: impact.id,
                          customer_id: impact.customer_id,
                          hasCustomerObject: !!impact.customer,
                          customerName: impact.customer?.name || 'NO NAME',
                          customerAddress: impact.customer?.address || 'NO ADDRESS',
                          customerAccount: impact.customer?.account_number || 'NO ACCOUNT',
                          impactLevel: impact.impact_level,
                          downtime: impact.estimated_downtime_min
                        },
                        allImpactStructure: impact
                      });
                    }
                    
                    return (
                      <div key={impact.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {impact.customer?.name || `[Customer ID: ${impact.customer_id}]`}
                            </p>
                            <p className="text-sm text-slate-600">
                              {impact.customer?.address || '[No address]'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Account: {impact.customer?.account_number || '[No account]'}
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
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No detailed customer impact records available</p>
                {currentEvent.customer_count && currentEvent.customer_count > 0 && (
                  <p className="text-sm mt-2">Total affected: {currentEvent.customer_count} customers</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* CHILD EVENTS TAB */}
        {activeTab === 'children' && currentEvent.is_mother_event && (
          <div className="space-y-6 animate-fadeIn">
            {/* Collapsible Header */}
            <button
              onClick={() => setChildEventsExpanded(!childEventsExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-150 transition-all"
            >
              <div className="flex items-center gap-3">
                <GitBranch className="w-5 h-5 text-purple-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900">
                    Child Events ({childEvents.length})
                  </h3>
                  {!childEventsExpanded && childEvents.length > 0 && (
                    <p className="text-sm text-slate-600">
                      {getChildEventsSummary()}
                    </p>
                  )}
                </div>
              </div>
              {childEventsExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              )}
            </button>

            {/* Ungroup & Mark False Action Buttons */}
            {childEventsExpanded && childEvents.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  {isUngroupMode && (
                    <>
                      <input
                        type="checkbox"
                        checked={selectedChildIds.length === childEvents.length}
                        onChange={handleSelectAllChildren}
                        className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="font-medium">
                        {selectedChildIds.length > 0 
                          ? `${selectedChildIds.length} selected`
                          : 'Select all'
                        }
                      </span>
                    </>
                  )}
                  {isMarkFalseMode && (
                    <>
                      <input
                        type="checkbox"
                        checked={selectedFalseChildIds.length === childEvents.filter(c => !c.false_event).length && childEvents.filter(c => !c.false_event).length > 0}
                        onChange={handleSelectAllForMarkFalse}
                        className="h-4 w-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                      />
                      <span className="font-medium">
                        {selectedFalseChildIds.length > 0 
                          ? `${selectedFalseChildIds.length} selected`
                          : 'Select all'
                        }
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isUngroupMode && !isMarkFalseMode ? (
                    <>
                      <button
                        onClick={handleUngroupMode}
                        disabled={ungrouping || markingFalse}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <Ungroup className="w-4 h-4" />
                        Ungroup
                      </button>
                      {childEvents.some(child => !child.false_event) && (
                        <button
                          onClick={handleMarkFalseMode}
                          disabled={ungrouping || markingFalse}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Mark False
                        </button>
                      )}
                    </>
                  ) : isUngroupMode ? (
                    <>
                      <button
                        onClick={handleCancelUngroup}
                        disabled={ungrouping}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <XIcon className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveUngroup}
                        disabled={ungrouping || selectedChildIds.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {ungrouping ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleCancelMarkFalse}
                        disabled={markingFalse}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <XIcon className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveMarkFalse}
                        disabled={markingFalse || selectedFalseChildIds.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {markingFalse ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Expandable Table */}
            {childEventsExpanded && (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                {loading ? (
                  <div className="py-12 text-center text-slate-500">
                    Loading child events...
                  </div>
                ) : childEvents.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {(isUngroupMode || isMarkFalseMode) && (
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-12">
                            <input
                              type="checkbox"
                              checked={
                                isUngroupMode 
                                  ? selectedChildIds.length === childEvents.length
                                  : selectedFalseChildIds.length === childEvents.filter(c => !c.false_event).length && childEvents.filter(c => !c.false_event).length > 0
                              }
                              onChange={isUngroupMode ? handleSelectAllChildren : handleSelectAllForMarkFalse}
                              className={`h-4 w-4 rounded border-slate-300 ${
                                isUngroupMode ? 'text-blue-600 focus:ring-blue-500' : 'text-red-600 focus:ring-red-500'
                              }`}
                            />
                          </th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Meter</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Severity</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Circuit</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">V. Level</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Rem. %</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {childEvents.map((childEvent, index) => {
                        const isFalseEvent = childEvent.false_event;
                        const isDisabledInMarkFalseMode = isMarkFalseMode && isFalseEvent;
                        
                        return (
                          <tr
                            key={childEvent.id}
                            className={`transition-colors ${
                              (isUngroupMode || isMarkFalseMode) ? '' : 'cursor-pointer hover:bg-slate-50'
                            } ${
                              selectedChildIds.includes(childEvent.id) ? 'bg-blue-50' : ''
                            } ${
                              selectedFalseChildIds.includes(childEvent.id) ? 'bg-red-50' : ''
                            } ${
                              isDisabledInMarkFalseMode ? 'opacity-50 bg-slate-100' : ''
                            }`}
                            onClick={() => {
                              if (!isUngroupMode && !isMarkFalseMode) {
                                handleChildEventClick(childEvent);
                              }
                            }}
                          >
                            {isUngroupMode && (
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedChildIds.includes(childEvent.id)}
                                  onChange={() => handleCheckboxChange(childEvent.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                />
                              </td>
                            )}
                            {isMarkFalseMode && (
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedFalseChildIds.includes(childEvent.id)}
                                  onChange={() => handleMarkFalseCheckboxChange(childEvent.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  disabled={isFalseEvent}
                                  className="h-4 w-4 text-red-600 rounded border-slate-300 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={isFalseEvent ? 'Already marked as false event' : 'Select to mark as false'}
                                />
                              </td>
                            )}
                          <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900 capitalize">
                                {childEvent.event_type.replace('_', ' ')}
                              </span>
                              {isFalseEvent && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded border border-orange-300">
                                  FALSE EVENT
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {new Date(childEvent.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                            {childEvent.meter_id || 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              childEvent.severity === 'critical' ? 'bg-red-100 text-red-700' :
                              childEvent.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                              childEvent.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {childEvent.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {childEvent.circuit_id || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {childEvent.voltage_level || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                            {childEvent.remaining_voltage ? `${childEvent.remaining_voltage.toFixed(1)}%` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {childEvent.duration_ms && childEvent.duration_ms < 1000
                              ? `${childEvent.duration_ms}ms`
                              : `${((childEvent.duration_ms || 0) / 1000).toFixed(2)}s`
                            }
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChildEventClick(childEvent);
                              }}
                              className="text-blue-600 hover:text-blue-700 text-sm font-semibold hover:underline"
                            >
                              View →
                            </button>
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-12 text-center text-slate-500">
                    <GitBranch className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No child events found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <h4 className="font-semibold text-slate-900 mb-6">Event Lifecycle Timeline</h4>
              
              <div className="space-y-6 relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-purple-200" />
                
                {/* Created */}
                <div className="flex items-start gap-4 relative">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm z-10">
                    1
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">📅 Record Created</span>
                      <span className="text-sm text-slate-600">
                        {new Date(currentEvent.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">Event entered into system</p>
                  </div>
                </div>

                {/* Detected */}
                <div className="flex items-start gap-4 relative">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm z-10">
                    2
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">👁️ Event Detected</span>
                      <span className="text-sm text-slate-600">
                        {new Date(currentEvent.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      Duration: {currentEvent.duration_ms && currentEvent.duration_ms < 1000
                        ? `${currentEvent.duration_ms}ms`
                        : `${((currentEvent.duration_ms || 0) / 1000).toFixed(2)}s`
                      }
                    </p>
                  </div>
                </div>

                {/* Grouped (if applicable) */}
                {currentEvent.grouped_at && (
                  <div className="flex items-start gap-4 relative">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm z-10">
                      3
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">🔗 Event Grouped</span>
                        <span className="text-sm text-slate-600">
                          {new Date(currentEvent.grouped_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {currentEvent.grouping_type === 'automatic' ? '🤖 Automatically grouped' : '👤 Manually grouped'}
                      </p>
                    </div>
                  </div>
                )}

                {/* False Event Detection (if applicable) */}
                {currentEvent.false_event && currentEvent.remarks?.includes('[Marked as false event') && (
                  <div className="flex items-start gap-4 relative">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm z-10">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">🚫 Marked as False Event</span>
                        <span className="text-sm text-slate-600">
                          {currentEvent.remarks.match(/\[Marked as false event.*?(\d{4}-\d{2}-\d{2})/)?.[1] || 'Unknown date'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">Event validated as false detection</p>
                    </div>
                  </div>
                )}

                {/* Converted from False Event (if applicable) */}
                {!currentEvent.false_event && currentEvent.remarks?.includes('[Converted from false event') && (
                  <div className="flex items-start gap-4 relative">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm z-10">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">✅ Converted from False Event</span>
                        <span className="text-sm text-slate-600">
                          {currentEvent.remarks.match(/\[Converted from false event.*?(\d{4}-\d{2}-\d{2})/)?.[1] || 'Unknown date'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">Re-validated as real event</p>
                    </div>
                  </div>
                )}

                {/* Resolved (if applicable) */}
                {currentEvent.resolved_at && (
                  <div className="flex items-start gap-4 relative">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm z-10">
                      ✓
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">✅ Event Resolved</span>
                        <span className="text-sm text-slate-600">
                          {new Date(currentEvent.resolved_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">Event marked as resolved</p>
                    </div>
                  </div>
                )}

                {/* Current Status (if not resolved) */}
                {!currentEvent.resolved_at && (
                  <div className="flex items-start gap-4 relative">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm z-10 animate-pulse">
                      ●
                    </div>
                    <div className="flex-1 pt-1">
                      <span className="font-semibold text-blue-700 capitalize">
                        Current Status: {currentEvent.status}
                      </span>
                      <p className="text-sm text-slate-600 mt-1">Event is being monitored</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Duration */}
              <div className="mt-8 pt-6 border-t border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total Lifecycle Duration:</span>
                  <span className="font-bold text-purple-900">
                    {currentEvent.resolved_at
                      ? `${Math.round((new Date(currentEvent.resolved_at).getTime() - new Date(currentEvent.created_at).getTime()) / 1000 / 60)} minutes`
                      : 'Ongoing'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IDR TAB */}
        {activeTab === 'idr' && (
          <div className="space-y-4 animate-fadeIn">
            {loadingIDR ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-slate-600">Loading IDR record...</span>
              </div>
            ) : (
              <>
            {/* Edit/Save/Cancel Buttons */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-slate-900">Incident Data Record (IDR)</span>
                {idrRecord && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                    Saved
                  </span>
                )}
                {currentEvent.manual_create_idr && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                    Manual
                  </span>
                )}
                {!currentEvent.manual_create_idr && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                    Auto
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isEditingIDR ? (
                  <>
                    {/* Upload Button with Dropdown */}
                    <div className="relative upload-dropdown-container">
                      <button
                        onClick={() => setShowUploadDropdown(!showUploadDropdown)}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload
                            <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>

                      {/* Upload Dropdown Menu */}
                      {showUploadDropdown && !isUploading && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-30 overflow-hidden">
                          <label className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors">
                            <Upload className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-slate-700">Import CSV</span>
                            <input
                              type="file"
                              accept=".csv"
                              onChange={handleImportIDRCSV}
                              className="hidden"
                            />
                          </label>
                          <button
                            onClick={handleDownloadIDRTemplate}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors text-left"
                          >
                            <FileDown className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-slate-700">Download Template</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Edit Button */}
                    <button
                      onClick={() => {
                        setIsEditingIDR(true);
                        // Keep existing form data (already loaded from idr_records or empty)
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        setSavingIDR(true);
                        try {
                          // Validate required fields
                          if (!idrFormData.cause || idrFormData.cause.trim() === '') {
                            alert('Cause is required. Please enter a cause before saving.');
                            setSavingIDR(false);
                            return;
                          }

                          // Get current user
                          const { data: { user } } = await supabase.auth.getUser();

                          // Prepare IDR record data
                          const idrData = {
                            event_id: currentEvent.id,
                            idr_no: idrFormData.idr_no || null,
                            status: idrFormData.status || null,
                            voltage_level: idrFormData.voltage_level || null,
                            address: idrFormData.address || null,
                            duration_ms: idrFormData.duration_ms || null,
                            v1: idrFormData.v1 || null,
                            v2: idrFormData.v2 || null,
                            v3: idrFormData.v3 || null,
                            equipment_type: idrFormData.equipment_type || null,
                            cause_group: idrFormData.cause_group || null,
                            cause: idrFormData.cause,
                            remarks: idrFormData.remarks || null,
                            object_part_group: idrFormData.object_part_group || null,
                            object_part_code: idrFormData.object_part_code || null,
                            damage_group: idrFormData.damage_group || null,
                            damage_code: idrFormData.damage_code || null,
                            fault_type: idrFormData.fault_type || null,
                            outage_type: idrFormData.outage_type || null,
                            weather: idrFormData.weather || null,
                            weather_condition: idrFormData.weather_condition || null,
                            responsible_oc: idrFormData.responsible_oc || null,
                            total_cmi: idrFormData.total_cmi || null,
                            equipment_affected: idrFormData.equipment_affected || null,
                            restoration_actions: idrFormData.restoration_actions || null,
                            notes: idrFormData.notes || null,
                            uploaded_by: user?.id || null,
                            upload_source: 'manual_entry',
                          };

                          // Upsert IDR record (insert or update if exists)
                          const { data, error } = await supabase
                            .from('idr_records')
                            .upsert(idrData, {
                              onConflict: 'event_id',
                              ignoreDuplicates: false
                            })
                            .select()
                            .single();

                          if (error) {
                            console.error('Error saving IDR record:', error);
                            alert('Failed to save IDR changes. Please try again.');
                          } else {
                            console.log('✅ IDR record saved successfully:', data);
                            setIDRRecord(data);
                            setIsEditingIDR(false);
                            if (onEventUpdated) onEventUpdated();
                          }
                        } catch (error) {
                          console.error('Error saving IDR record:', error);
                          alert('An unexpected error occurred. Please try again.');
                        } finally {
                          setSavingIDR(false);
                        }
                      }}
                      disabled={savingIDR}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {savingIDR ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingIDR(false);
                        // Reload from idr_records (or reset to empty if no record)
                        loadIDRRecord(currentEvent.id);
                      }}
                      disabled={savingIDR}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold disabled:opacity-50"
                    >
                      <XIcon className="w-4 h-4" />
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* IDR Content - Grouped Cards Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Basic Information */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-500 rounded"></span>
                  Basic Information
                </h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600">IDR No.</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.idr_no}
                          onChange={(e) => setIDRFormData({ ...idrFormData, idr_no: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter IDR No."
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.idr_no || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Timestamp</label>
                      <p className="text-sm font-semibold text-slate-900 mt-1">
                        {new Date(currentEvent.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Status</label>
                      {isEditingIDR ? (
                        <select
                          value={idrFormData.status}
                          onChange={(e) => setIDRFormData({ ...idrFormData, status: e.target.value as any })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="new">New</option>
                          <option value="acknowledged">Acknowledged</option>
                          <option value="investigating">Investigating</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      ) : (
                        <span className={`inline-flex mt-1 px-2 py-0.5 rounded text-xs font-semibold ${
                          idrFormData.status === 'resolved' ? 'bg-green-100 text-green-700' :
                          idrFormData.status === 'investigating' ? 'bg-blue-100 text-blue-700' :
                          idrFormData.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {idrFormData.status || currentEvent.status}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Voltage Level</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.voltage_level}
                          onChange={(e) => setIDRFormData({ ...idrFormData, voltage_level: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.voltage_level || '-'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Duration (ms)</label>
                    {isEditingIDR ? (
                      <input
                        type="number"
                        value={idrFormData.duration_ms}
                        onChange={(e) => setIDRFormData({ ...idrFormData, duration_ms: Number(e.target.value) })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">
                        {idrFormData.duration_ms ? `${idrFormData.duration_ms} ms (${(idrFormData.duration_ms / 1000).toFixed(2)}s)` : '-'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Location & Equipment */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-green-500 rounded"></span>
                  Location & Equipment
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Region</label>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{currentSubstation?.region || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Address</label>
                    {isEditingIDR ? (
                      <input
                        type="text"
                        value={idrFormData.address}
                        onChange={(e) => setIDRFormData({ ...idrFormData, address: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.address || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Equipment Type</label>
                    {isEditingIDR ? (
                      <input
                        type="text"
                        value={idrFormData.equipment_type}
                        onChange={(e) => setIDRFormData({ ...idrFormData, equipment_type: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.equipment_type || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Fault Details */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-red-500 rounded"></span>
                  Fault Details
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Faulty Phase</label>
                    <div className="mt-1 space-y-1">
                      {['A', 'B', 'C'].map(phase => {
                        const isAffected = currentEvent.affected_phases.includes(phase);
                        const voltage = phase === 'A' ? currentEvent.v1 : phase === 'B' ? currentEvent.v2 : currentEvent.v3;
                        return (
                          <div key={phase} className="flex items-center justify-between text-sm">
                            <span className="font-medium">Phase {phase}:</span>
                            <span className={`flex items-center gap-1 ${isAffected ? 'text-red-600 font-semibold' : 'text-green-600'}`}>
                              {voltage ? `${voltage}V` : '-'}
                              {isAffected ? ' (affected)' : ' ✓'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <label className="text-xs font-medium text-slate-600">V1 (V)</label>
                      {isEditingIDR ? (
                        <input
                          type="number"
                          step="0.1"
                          value={idrFormData.v1}
                          onChange={(e) => setIDRFormData({ ...idrFormData, v1: Number(e.target.value) })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.v1 || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">V2 (V)</label>
                      {isEditingIDR ? (
                        <input
                          type="number"
                          step="0.1"
                          value={idrFormData.v2}
                          onChange={(e) => setIDRFormData({ ...idrFormData, v2: Number(e.target.value) })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.v2 || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">V3 (V)</label>
                      {isEditingIDR ? (
                        <input
                          type="number"
                          step="0.1"
                          value={idrFormData.v3}
                          onChange={(e) => setIDRFormData({ ...idrFormData, v3: Number(e.target.value) })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.v3 || '-'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Fault Type</label>
                    {isEditingIDR ? (
                      <input
                        type="text"
                        value={idrFormData.fault_type}
                        onChange={(e) => setIDRFormData({ ...idrFormData, fault_type: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.fault_type || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Cause Analysis */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-yellow-500 rounded"></span>
                  Cause Analysis
                </h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Cause Group</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.cause_group}
                          onChange={(e) => setIDRFormData({ ...idrFormData, cause_group: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.cause_group || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Cause</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.cause}
                          onChange={(e) => setIDRFormData({ ...idrFormData, cause: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.cause || '-'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Remarks</label>
                    {isEditingIDR ? (
                      <textarea
                        value={idrFormData.remarks}
                        onChange={(e) => setIDRFormData({ ...idrFormData, remarks: e.target.value })}
                        rows={2}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.remarks || '-'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Object Part Group</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.object_part_group}
                          onChange={(e) => setIDRFormData({ ...idrFormData, object_part_group: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.object_part_group || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Object Part Code</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.object_part_code}
                          onChange={(e) => setIDRFormData({ ...idrFormData, object_part_code: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.object_part_code || '-'}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Damage Group</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.damage_group}
                          onChange={(e) => setIDRFormData({ ...idrFormData, damage_group: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.damage_group || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Damage Code</label>
                      {isEditingIDR ? (
                        <input
                          type="text"
                          value={idrFormData.damage_code}
                          onChange={(e) => setIDRFormData({ ...idrFormData, damage_code: e.target.value })}
                          className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.damage_code || '-'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Environment & Operations */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 lg:col-span-2">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-purple-500 rounded"></span>
                  Environment & Operations
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Weather (Code)</label>
                    {isEditingIDR ? (
                      <input
                        type="text"
                        value={idrFormData.weather}
                        onChange={(e) => setIDRFormData({ ...idrFormData, weather: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g., W01"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.weather || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Weather Condition</label>
                    {isEditingIDR ? (
                      <input
                        type="text"
                        value={idrFormData.weather_condition}
                        onChange={(e) => setIDRFormData({ ...idrFormData, weather_condition: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g., Heavy Rain"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.weather_condition || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Outage Type</label>
                    {isEditingIDR ? (
                      <input
                        type="text"
                        value={idrFormData.outage_type}
                        onChange={(e) => setIDRFormData({ ...idrFormData, outage_type: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.outage_type || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Responsible OC</label>
                    {isEditingIDR ? (
                      <input
                        type="text"
                        value={idrFormData.responsible_oc}
                        onChange={(e) => setIDRFormData({ ...idrFormData, responsible_oc: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.responsible_oc || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Total CMI</label>
                    {isEditingIDR ? (
                      <input
                        type="number"
                        value={idrFormData.total_cmi}
                        onChange={(e) => setIDRFormData({ ...idrFormData, total_cmi: Number(e.target.value) })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.total_cmi || '-'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
              </>
            )}
          </div>
        )}
      </div>

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

      {/* IDR Import Results Modal */}
      {showImportModal && importResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${
                  importResults.failed === 0 ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {importResults.failed === 0 ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">IDR Import Results</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {importResults.successful} successful, {importResults.failed} failed
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResults(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Success Summary */}
              {importResults.successful > 0 && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-green-900">
                      Successfully Imported: {importResults.successful} record(s)
                    </h4>
                  </div>
                  <p className="text-sm text-green-700">
                    IDR records have been created or updated in the system.
                  </p>
                </div>
              )}

              {/* Errors Summary */}
              {importResults.errors.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <h4 className="font-semibold text-red-900">
                      Errors: {importResults.errors.length} issue(s)
                    </h4>
                  </div>
                  
                  {/* Errors Table */}
                  <div className="border border-red-200 rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-red-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-red-900">Row</th>
                            <th className="px-3 py-2 text-left font-semibold text-red-900">Event ID</th>
                            <th className="px-3 py-2 text-left font-semibold text-red-900">Column</th>
                            <th className="px-3 py-2 text-left font-semibold text-red-900">Error Message</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100">
                          {importResults.errors.map((error, idx) => (
                            <tr key={idx} className="hover:bg-red-50">
                              <td className="px-3 py-2 font-mono text-slate-700">{error.row}</td>
                              <td className="px-3 py-2 font-mono text-slate-700 text-xs">
                                {error.eventId ? error.eventId.substring(0, 8) : '-'}
                              </td>
                              <td className="px-3 py-2 text-slate-700">{error.column}</td>
                              <td className="px-3 py-2 text-red-700">{error.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-2">
                    💡 Tip: Fix the errors in your CSV file and try importing again.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResults(null);
                }}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
