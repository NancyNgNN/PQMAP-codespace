import { useState, useEffect } from 'react';
import { Clock, Zap, AlertTriangle, Users, ArrowLeft, GitBranch, Trash2, ChevronDown, ChevronUp, CheckCircle, XCircle, Ungroup, Download, FileText, Edit, Save, X as XIcon, Upload, FileDown, Wrench } from 'lucide-react';
import { PQEvent, Substation, EventCustomerImpact, IDRRecord, PQServiceRecord, PQMeter, Customer } from '../../types/database';
import { supabase } from '../../lib/supabase';
import WaveformViewer from './WaveformViewer';
import { MotherEventGroupingService } from '../../services/mother-event-grouping';
import { ExportService } from '../../services/exportService';
import CustomerEventHistoryPanel from './CustomerEventHistoryPanel';
import PSBGConfigModal from './PSBGConfigModal';

type TabType = 'overview' | 'technical' | 'impact' | 'services' | 'children' | 'timeline' | 'idr';

interface EventDetailsProps {
  event: PQEvent;
  substation?: Substation;
  impacts: EventCustomerImpact[];
  initialTab?: TabType;
  onStatusChange: (eventId: string, status: string) => void;
  onEventDeleted?: () => void;
  onEventUpdated?: () => void;
}

export default function EventDetails({ event: initialEvent, substation: initialSubstation, impacts: initialImpacts, initialTab, onStatusChange, onEventDeleted, onEventUpdated }: EventDetailsProps) {
  // Navigation state
  const [currentEvent, setCurrentEvent] = useState<PQEvent>(initialEvent);
  const [currentSubstation, setCurrentSubstation] = useState<Substation | undefined>(initialSubstation);
  const [currentImpacts, setCurrentImpacts] = useState<EventCustomerImpact[]>(initialImpacts);
  const [currentMeter, setCurrentMeter] = useState<PQMeter | null>(null);
  const [navigationStack, setNavigationStack] = useState<Array<{
    event: PQEvent;
    substation?: Substation;
    impacts: EventCustomerImpact[];
  }>>([]);
  
  // Tab state - remembers last viewed tab
  const [activeTab, setActiveTab] = useState<TabType>(initialTab ?? 'overview');
  
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
    circuit: '',
    faulty_component: '',
    external_internal: '' as 'external' | 'internal' | '',
  });
  const [savingIDR, setSavingIDR] = useState(false);

  // PQ Services state
  const [services, setServices] = useState<PQServiceRecord[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Customer event history panel state
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Waveform data state
  const [waveformCsvData, setWaveformCsvData] = useState<string | null>(null);

  // PSBG Cause management state
  const [showPSBGConfig, setShowPSBGConfig] = useState(false);
  const [psbgOptions, setPsbgOptions] = useState<string[]>([
    'VEGETATION',
    'DAMAGED BY THIRD PARTY',
    'UNCONFIRMED',
    'ANIMALS, BIRDS, INSECTS'
  ]);
  const [usedPsbgOptions, setUsedPsbgOptions] = useState<string[]>([]);

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

  const loadServices = async (eventId: string) => {
    try {
      setLoadingServices(true);
      const { data, error } = await supabase
        .from('pq_service_records')
        .select('*, customer:customers(*), engineer:profiles(*)')
        .eq('event_id', eventId)
        .order('service_date', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('❌ Error loading PQ services:', error);
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const loadMeter = async (meterId: string | null) => {
    if (!meterId) {
      setCurrentMeter(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('pq_meters')
        .select('*')
        .eq('id', meterId)
        .single();

      if (error) throw error;
      setCurrentMeter(data);
    } catch (error) {
      console.error('❌ Error loading meter:', error);
      setCurrentMeter(null);
    }
  };

  // Load IDR record for current event
  useEffect(() => {
    loadIDRRecord(currentEvent.id);
  }, [currentEvent.id]);

  // Load PQ services for current event
  useEffect(() => {
    loadServices(currentEvent.id);
  }, [currentEvent.id]);

  // Load meter for current event
  useEffect(() => {
    loadMeter(currentEvent.meter_id);
  }, [currentEvent.meter_id]);

  // Load demo waveform data (for demonstration purposes)
  useEffect(() => {
    const loadDemoWaveform = async () => {
      try {
        // For demonstration, load the sample CSV for all events
        const response = await fetch('/BKP0227_20260126 101655_973.csv');
        if (response.ok) {
          const csvText = await response.text();
          setWaveformCsvData(csvText);
        } else {
          console.warn('⚠️ Demo waveform CSV not found, using fallback');
          setWaveformCsvData(null);
        }
      } catch (error) {
        console.error('❌ Error loading demo waveform:', error);
        setWaveformCsvData(null);
      }
    };

    loadDemoWaveform();
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

  // Load used PSBG options when component mounts
  useEffect(() => {
    const loadUsedPsbgOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('pq_events')
          .select('psbg_cause')
          .not('psbg_cause', 'is', null);

        if (error) throw error;

        const used = [...new Set(data?.map(d => d.psbg_cause).filter(Boolean) || [])];
        setUsedPsbgOptions(used);
      } catch (error) {
        console.error('❌ Error loading used PSBG options:', error);
        setUsedPsbgOptions([]);
      }
    };

    loadUsedPsbgOptions();
  }, []);

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
          circuit: data.circuit || '',
          faulty_component: data.faulty_component || '',
          external_internal: data.external_internal || '',
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
          circuit: '',
          faulty_component: '',
          external_internal: '',
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
          ),
          meter:meter_id (
            id,
            circuit_id,
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

  // Mark mother event and all its children as false events
  const handleMarkMotherAndChildrenAsFalse = async () => {
    const confirmMessage = `Are you sure you want to mark this mother event and ALL its ${childEvents.length} child event(s) as false events? This action will keep them grouped but mark them all as false detections.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setMarkingFalse(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const remarkAddition = `\n[Marked as false event (entire group) on ${timestamp}]`;

      // Update mother event
      const { error: motherError } = await supabase
        .from('pq_events')
        .update({
          false_event: true,
          remarks: (currentEvent.remarks || '') + remarkAddition
        })
        .eq('id', currentEvent.id);

      if (motherError) {
        throw motherError;
      }

      // Update all child events
      for (const childEvent of childEvents) {
        const { error: childError } = await supabase
          .from('pq_events')
          .update({
            false_event: true,
            remarks: (childEvent.remarks || '') + remarkAddition
          })
          .eq('id', childEvent.id);

        if (childError) {
          throw childError;
        }
      }

      console.log(`✅ Successfully marked mother event and ${childEvents.length} child event(s) as false events`);
      
      // Reload current event and children
      await loadChildEvents(currentEvent.id);
      
      // Update current event state
      setCurrentEvent(prev => ({ ...prev, false_event: true }));
      
      // Notify parent component
      if (onEventUpdated) {
        onEventUpdated();
      }

      alert(`Successfully marked mother event and ${childEvents.length} child event(s) as false events.`);
    } catch (error) {
      console.error('❌ Error marking mother and children as false events:', error);
      alert('Failed to mark events as false. Please try again.');
    } finally {
      setMarkingFalse(false);
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
            `Event_${currentEvent.id.substring(0, 8)}_Export_${Date.now()}.pdf`
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

  // PSBG Cause handler
  const handlePsbgCauseChange = async (newPsbgCause: string) => {
    const validValues: Array<'VEGETATION' | 'DAMAGED BY THIRD PARTY' | 'UNCONFIRMED' | 'ANIMALS, BIRDS, INSECTS'> = [
      'VEGETATION', 'DAMAGED BY THIRD PARTY', 'UNCONFIRMED', 'ANIMALS, BIRDS, INSECTS'
    ];
    const validatedValue = validValues.includes(newPsbgCause as any) ? newPsbgCause as typeof validValues[number] : null;

    try {
      const { error } = await supabase
        .from('pq_events')
        .update({ psbg_cause: validatedValue })
        .eq('id', currentEvent.id);

      if (error) throw error;

      // Update local state
      setCurrentEvent({ ...currentEvent, psbg_cause: validatedValue });

      // Notify parent to reload data
      if (onEventUpdated) {
        onEventUpdated();
      }

      console.log('✅ PSBG cause updated successfully');
    } catch (error) {
      console.error('❌ Error updating PSBG cause:', error);
      alert('Failed to update PSBG cause. Please try again.');
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
            {currentEvent.false_event && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded">
                False Event
              </span>
            )}
            {currentEvent.is_late_event && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded">
                Late Event
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
              <>
                <button
                  onClick={handleUngroupEvents}
                  disabled={ungrouping}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all disabled:opacity-50"
                  title="Ungroup Events"
                >
                  <Ungroup className="w-5 h-5" />
                </button>
                <button
                  onClick={handleMarkMotherAndChildrenAsFalse}
                  disabled={markingFalse || childEvents.length === 0}
                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-50"
                  title="Mark Mother and All Children as False"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </>
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
          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'services'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              PQ Services ({services.length})
            </div>
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
            {/* AC1 - Core Event Data Card */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Core Event Data
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Incident Time */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Incident Time</label>
                    <p className="text-base font-semibold text-slate-900 mt-1">
                      {new Date(currentEvent.timestamp).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })} {new Date(currentEvent.timestamp).toLocaleTimeString('en-GB', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit',
                        hour12: false 
                      })}
                    </p>
                  </div>

                  {/* Voltage Level */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Voltage Level</label>
                    <p className="text-base font-semibold text-slate-900 mt-1">
                      {currentMeter?.voltage_level || 'N/A'}
                    </p>
                  </div>

                  {/* Source Substation */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Source Substation</label>
                    <p className="text-base font-semibold text-slate-900 mt-1">
                      {currentSubstation ? `${currentSubstation.code} - ${currentSubstation.name}` : 'N/A'}
                    </p>
                    {currentMeter?.site_id && (
                      <p className="text-xs text-slate-500 mt-0.5">Site ID: {currentMeter.site_id}</p>
                    )}
                  </div>

                  {/* Transformer No. & Ring Number */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Transformer No. & Ring Number</label>
                    <p className="text-base font-semibold text-slate-900 mt-1">
                      {currentMeter?.circuit_id || 'N/A'} • TTNR0003
                    </p>
                    {currentMeter?.meter_id && (
                      <p className="text-xs text-slate-500 mt-0.5">Meter: {currentMeter.meter_id}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AC2 - Magnitude & Duration Card */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Magnitude & Duration
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-4 gap-4">
                  {/* Phase Percentages */}
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <label className="text-xs font-semibold text-purple-700 uppercase tracking-wide block mb-1">VL1 (%)</label>
                    <p className="text-2xl font-bold text-purple-900">
                      {currentEvent.v1 !== null && currentEvent.v1 !== undefined ? currentEvent.v1.toFixed(2) : 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Phase A</p>
                  </div>

                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <label className="text-xs font-semibold text-purple-700 uppercase tracking-wide block mb-1">VL2 (%)</label>
                    <p className="text-2xl font-bold text-purple-900">
                      {currentEvent.v2 !== null && currentEvent.v2 !== undefined ? currentEvent.v2.toFixed(2) : 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Phase B</p>
                  </div>

                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <label className="text-xs font-semibold text-purple-700 uppercase tracking-wide block mb-1">VL3 (%)</label>
                    <p className="text-2xl font-bold text-purple-900">
                      {currentEvent.v3 !== null && currentEvent.v3 !== undefined ? currentEvent.v3.toFixed(2) : 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Phase C</p>
                  </div>

                  {/* Duration */}
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <label className="text-xs font-semibold text-purple-700 uppercase tracking-wide block mb-1">Duration</label>
                    <p className="text-2xl font-bold text-purple-900">
                      {currentEvent.duration_ms !== null && currentEvent.duration_ms !== undefined
                        ? currentEvent.duration_ms < 1000
                          ? `${currentEvent.duration_ms}ms`
                          : `${(currentEvent.duration_ms / 1000).toFixed(2)}s`
                        : 'N/A'
                      }
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Total time</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AC3 - Binary Indicators Row */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Event Indicators
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Min Volt Indicator */}
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Min Volt (Below 70%)</label>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const hasMinVoltage = 
                          (currentEvent.v1 !== null && currentEvent.v1 < 70) ||
                          (currentEvent.v2 !== null && currentEvent.v2 < 70) ||
                          (currentEvent.v3 !== null && currentEvent.v3 < 70);
                        return hasMinVoltage ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Yes</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">No</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* False Alarm */}
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">False Alarm</label>
                    <div className="flex items-center gap-2">
                      {currentEvent.false_event ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Yes</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-600" />
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">No</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AC4 - Classification & Workflow Card */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-500 to-slate-600 px-4 py-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Classification & Workflow
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Event Type & Severity */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Event Type</label>
                    <p className="text-base font-semibold text-slate-900 mt-1 capitalize">
                      {currentEvent.event_type.replace('_', ' ')}
                    </p>
                    <div className="mt-2">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Severity</label>
                      <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold capitalize ${
                        currentEvent.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        currentEvent.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        currentEvent.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {currentEvent.severity}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</label>
                    <div className="mt-1">
                      <span className={`inline-block px-4 py-2 rounded-lg text-base font-semibold ${
                        currentEvent.status === 'new' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                        currentEvent.status === 'investigating' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                        currentEvent.status === 'resolved' ? 'bg-green-100 text-green-800 border border-green-300' :
                        'bg-slate-100 text-slate-800 border border-slate-300'
                      }`}>
                        {currentEvent.status === 'new' ? 'New' : 
                         currentEvent.status === 'investigating' ? 'Investigating' : 
                         currentEvent.status === 'resolved' ? 'Closed' : 
                         currentEvent.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Event ID: <span className="font-mono text-slate-700">{currentEvent.id.slice(0, 8)}...</span>
                    </p>
                  </div>
                </div>

                {/* Additional Information Row */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Magnitude</label>
                      <p className="text-slate-900 font-medium mt-0.5">
                        {currentEvent.magnitude !== null && currentEvent.magnitude !== undefined 
                          ? `${currentEvent.magnitude.toFixed(2)}%` 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Affected Phases</label>
                      <p className="text-slate-900 font-medium mt-0.5">
                        {currentEvent.affected_phases.join(', ')}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Customer Count</label>
                      <p className="text-slate-900 font-medium mt-0.5">
                        {currentEvent.customer_count !== null ? currentEvent.customer_count : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Region & OC Information */}
                {(currentMeter?.region || currentMeter?.oc) && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {currentMeter.region && (
                        <div>
                          <label className="text-xs font-semibold text-slate-600">Region</label>
                          <p className="text-slate-900 font-medium mt-0.5">{currentMeter.region}</p>
                        </div>
                      )}
                      {currentMeter.oc && (
                        <div>
                          <label className="text-xs font-semibold text-slate-600">Operating Center (OC)</label>
                          <p className="text-slate-900 font-medium mt-0.5">{currentMeter.oc}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Harmonic Information Card - Only for harmonic events */}
            {currentEvent.event_type === 'harmonic' && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Harmonic Information
                  </h3>
                </div>
                <div className="p-4">
                  {currentEvent.harmonic_event && typeof currentEvent.harmonic_event === 'object' ? (
                    <>
                      {/* 380V Display - 30 new columns in 2-column grid with 9 groups */}
                      {currentEvent.meter?.voltage_level === '380V' ? (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                          {/* Left Column */}
                          <div className="space-y-3">
                            {/* Group 1: Voltage (V) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">Voltage (V)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Va: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.voltage_va !== null && currentEvent.harmonic_event.voltage_va !== undefined ? currentEvent.harmonic_event.voltage_va.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Vb: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.voltage_vb !== null && currentEvent.harmonic_event.voltage_vb !== undefined ? currentEvent.harmonic_event.voltage_vb.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Vc: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.voltage_vc !== null && currentEvent.harmonic_event.voltage_vc !== undefined ? currentEvent.harmonic_event.voltage_vc.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Group 2: Current (IL)(A) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">Current (IL)(A)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Ia: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.current_ia !== null && currentEvent.harmonic_event.current_ia !== undefined ? currentEvent.harmonic_event.current_ia.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Ib: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.current_ib !== null && currentEvent.harmonic_event.current_ib !== undefined ? currentEvent.harmonic_event.current_ib.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Ic: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.current_ic !== null && currentEvent.harmonic_event.current_ic !== undefined ? currentEvent.harmonic_event.current_ic.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">IL Max: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.il_max !== null && currentEvent.harmonic_event.il_max !== undefined ? currentEvent.harmonic_event.il_max.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Group 3: THD (Voltage)(%) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">THD (Voltage)(%)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Phase A: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_voltage_a !== null && currentEvent.harmonic_event.thd_voltage_a !== undefined ? currentEvent.harmonic_event.thd_voltage_a.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase B: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_voltage_b !== null && currentEvent.harmonic_event.thd_voltage_b !== undefined ? currentEvent.harmonic_event.thd_voltage_b.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase C: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_voltage_c !== null && currentEvent.harmonic_event.thd_voltage_c !== undefined ? currentEvent.harmonic_event.thd_voltage_c.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Group 4: THD odd (Current) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">THD odd (Current)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Phase A: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_odd_current_a !== null && currentEvent.harmonic_event.thd_odd_current_a !== undefined ? currentEvent.harmonic_event.thd_odd_current_a.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase B: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_odd_current_b !== null && currentEvent.harmonic_event.thd_odd_current_b !== undefined ? currentEvent.harmonic_event.thd_odd_current_b.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase C: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_odd_current_c !== null && currentEvent.harmonic_event.thd_odd_current_c !== undefined ? currentEvent.harmonic_event.thd_odd_current_c.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Group 5: THD even */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">THD even</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Phase A: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_even_a !== null && currentEvent.harmonic_event.thd_even_a !== undefined ? currentEvent.harmonic_event.thd_even_a.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase B: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_even_b !== null && currentEvent.harmonic_event.thd_even_b !== undefined ? currentEvent.harmonic_event.thd_even_b.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase C: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_even_c !== null && currentEvent.harmonic_event.thd_even_c !== undefined ? currentEvent.harmonic_event.thd_even_c.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Right Column */}
                          <div className="space-y-3">
                            {/* Group 6: THD (Current)(%) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">THD (Current)(%)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Phase A: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_current_a !== null && currentEvent.harmonic_event.thd_current_a !== undefined ? currentEvent.harmonic_event.thd_current_a.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase B: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_current_b !== null && currentEvent.harmonic_event.thd_current_b !== undefined ? currentEvent.harmonic_event.thd_current_b.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase C: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.thd_current_c !== null && currentEvent.harmonic_event.thd_current_c !== undefined ? currentEvent.harmonic_event.thd_current_c.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Group 7: TDD Odd (Current) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">TDD Odd (Current)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Phase A: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_odd_current_a !== null && currentEvent.harmonic_event.tdd_odd_current_a !== undefined ? currentEvent.harmonic_event.tdd_odd_current_a.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase B: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_odd_current_b !== null && currentEvent.harmonic_event.tdd_odd_current_b !== undefined ? currentEvent.harmonic_event.tdd_odd_current_b.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase C: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_odd_current_c !== null && currentEvent.harmonic_event.tdd_odd_current_c !== undefined ? currentEvent.harmonic_event.tdd_odd_current_c.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Group 8: TDD even (Current) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">TDD even (Current)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Phase A: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_even_current_a !== null && currentEvent.harmonic_event.tdd_even_current_a !== undefined ? currentEvent.harmonic_event.tdd_even_current_a.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase B: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_even_current_b !== null && currentEvent.harmonic_event.tdd_even_current_b !== undefined ? currentEvent.harmonic_event.tdd_even_current_b.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase C: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_even_current_c !== null && currentEvent.harmonic_event.tdd_even_current_c !== undefined ? currentEvent.harmonic_event.tdd_even_current_c.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Group 9: TDD (Current)(%) */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">TDD (Current)(%)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">Phase A: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_current_a !== null && currentEvent.harmonic_event.tdd_current_a !== undefined ? currentEvent.harmonic_event.tdd_current_a.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase B: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_current_b !== null && currentEvent.harmonic_event.tdd_current_b !== undefined ? currentEvent.harmonic_event.tdd_current_b.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Phase C: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_current_c !== null && currentEvent.harmonic_event.tdd_current_c !== undefined ? currentEvent.harmonic_event.tdd_current_c.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            
                            {/* Additional info: TDD Limit & Non-Compliance */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">Compliance</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">TDD Limit: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.tdd_limit !== null && currentEvent.harmonic_event.tdd_limit !== undefined ? currentEvent.harmonic_event.tdd_limit.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">Non-Compliance: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.non_compliance !== null && currentEvent.harmonic_event.non_compliance !== undefined ? currentEvent.harmonic_event.non_compliance.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* 400kV/132kV/11kV Display - Original I1/I2/I3 columns */
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                          {/* Left Column: THD & TEHD */}
                          <div className="space-y-3">
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">THD (Total Harmonic Distortion)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">I1 THD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I1_THD_10m !== null && currentEvent.harmonic_event.I1_THD_10m !== undefined ? currentEvent.harmonic_event.I1_THD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I2 THD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I2_THD_10m !== null && currentEvent.harmonic_event.I2_THD_10m !== undefined ? currentEvent.harmonic_event.I2_THD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I3 THD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I3_THD_10m !== null && currentEvent.harmonic_event.I3_THD_10m !== undefined ? currentEvent.harmonic_event.I3_THD_10m.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">TEHD (Total Even Harmonic Distortion)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">I1 TEHD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I1_TEHD_10m !== null && currentEvent.harmonic_event.I1_TEHD_10m !== undefined ? currentEvent.harmonic_event.I1_TEHD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I2 TEHD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I2_TEHD_10m !== null && currentEvent.harmonic_event.I2_TEHD_10m !== undefined ? currentEvent.harmonic_event.I2_TEHD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I3 TEHD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I3_TEHD_10m !== null && currentEvent.harmonic_event.I3_TEHD_10m !== undefined ? currentEvent.harmonic_event.I3_TEHD_10m.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Right Column: TOHD & TDD */}
                          <div className="space-y-3">
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">TOHD (Total Odd Harmonic Distortion)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">I1 TOHD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I1_TOHD_10m !== null && currentEvent.harmonic_event.I1_TOHD_10m !== undefined ? currentEvent.harmonic_event.I1_TOHD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I2 TOHD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I2_TOHD_10m !== null && currentEvent.harmonic_event.I2_TOHD_10m !== undefined ? currentEvent.harmonic_event.I2_TOHD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I3 TOHD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I3_TOHD_10m !== null && currentEvent.harmonic_event.I3_TOHD_10m !== undefined ? currentEvent.harmonic_event.I3_TOHD_10m.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-purple-700 mb-2">TDD (Total Demand Distortion)</p>
                              <div className="space-y-1.5">
                                <p className="text-sm text-slate-600">I1 TDD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I1_TDD_10m !== null && currentEvent.harmonic_event.I1_TDD_10m !== undefined ? currentEvent.harmonic_event.I1_TDD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I2 TDD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I2_TDD_10m !== null && currentEvent.harmonic_event.I2_TDD_10m !== undefined ? currentEvent.harmonic_event.I2_TDD_10m.toFixed(2) : 'N/A'}</span></p>
                                <p className="text-sm text-slate-600">I3 TDD 10m: <span className="font-semibold text-slate-900">{currentEvent.harmonic_event.I3_TDD_10m !== null && currentEvent.harmonic_event.I3_TDD_10m !== undefined ? currentEvent.harmonic_event.I3_TDD_10m.toFixed(2) : 'N/A'}</span></p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6 text-slate-500">
                      <p className="text-sm">No harmonic data available for this event.</p>
                      <p className="text-xs mt-1">All values show N/A</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PSBG Cause Field */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-700 text-sm font-semibold">PSBG Cause:</span>
                <button
                  onClick={() => setShowPSBGConfig(true)}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                  title="Manage PSBG Cause Options"
                >
                  <Wrench className="w-4 h-4" />
                </button>
              </div>
              <select
                value={currentEvent.psbg_cause || ''}
                onChange={(e) => handlePsbgCauseChange(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select PSBG Cause</option>
                {psbgOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* Cause Display (PSBG takes priority, falls back to IDR cause) */}
            {(currentEvent.psbg_cause || currentEvent.cause) && (
              <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
                <span className="text-slate-600 text-sm font-semibold">
                  {currentEvent.psbg_cause ? 'Cause (IDR):' : 'Cause:'}
                </span>
                <p className="text-slate-900 mt-1">
                  {currentEvent.psbg_cause ? (currentEvent.cause || 'Not specified') : currentEvent.cause}
                </p>
              </div>
            )}

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

            {/* False Event Actions - Only show for voltage_dip and voltage_swell */}
            {(() => {
              console.log('🔍 [Convert Button Condition]', {
                activeTab,
                event_type: currentEvent.event_type,
                false_event: currentEvent.false_event,
                shouldShow: currentEvent.false_event === true && (currentEvent.event_type === 'voltage_dip' || currentEvent.event_type === 'voltage_swell')
              });
              return currentEvent.false_event && (currentEvent.event_type === 'voltage_dip' || currentEvent.event_type === 'voltage_swell');
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
                {/* False Event - Only show for voltage_dip and voltage_swell */}
                {(currentEvent.event_type === 'voltage_dip' || currentEvent.event_type === 'voltage_swell') && (
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
                )}
              </dl>
            </div>

            {/* SARFI Analysis - Hidden for harmonic events */}
            {currentEvent.event_type !== 'harmonic' && (
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-4">SARFI Analysis</h4>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-600">S10:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_10 !== null ? currentEvent.sarfi_10.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S20:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_20 !== null ? currentEvent.sarfi_20.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S30:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_30 !== null ? currentEvent.sarfi_30.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S40:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_40 !== null ? currentEvent.sarfi_40.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S50:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_50 !== null ? currentEvent.sarfi_50.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S60:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_60 !== null ? currentEvent.sarfi_60.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S70:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_70 !== null ? currentEvent.sarfi_70.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S80:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_80 !== null ? currentEvent.sarfi_80.toFixed(5) : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">S90:</dt>
                    <dd className="font-semibold text-slate-900">{currentEvent.sarfi_90 !== null ? currentEvent.sarfi_90.toFixed(5) : 'N/A'}</dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Waveform Display */}
            <WaveformViewer 
              csvData={waveformCsvData} 
              event={currentEvent}
              eventType={currentEvent.event_type}
            />
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
                            <button
                              onClick={() => {
                                console.log('👆 [EventDetails] Customer clicked:', {
                                  customer_id: impact.customer_id,
                                  hasCustomerObject: !!impact.customer,
                                  customer: impact.customer ? {
                                    id: impact.customer.id,
                                    name: impact.customer.name,
                                    account_number: impact.customer.account_number,
                                    address: impact.customer.address
                                  } : 'No customer object'
                                });
                                if (impact.customer) {
                                  setSelectedCustomer(impact.customer);
                                  setShowCustomerHistory(true);
                                }
                              }}
                              disabled={!impact.customer}
                              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline text-left disabled:text-slate-900 disabled:cursor-default disabled:hover:no-underline"
                              title={impact.customer ? 'Click to view event history' : 'Customer data not available'}
                            >
                              {impact.customer?.name || `[Customer ID: ${impact.customer_id}]`}
                            </button>
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
                            {childEvent.meter?.circuit_id || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {childEvent.meter?.voltage_level || 'N/A'}
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
        {activeTab === 'services' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                PQ Service Records
              </h3>
              <div className="text-sm text-slate-600">
                {services.length} service{services.length !== 1 ? 's' : ''} logged for this event
              </div>
            </div>

            {loadingServices ? (
              <div className="py-12 text-center text-slate-500">
                <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                <p className="mt-3">Loading services...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                <Wrench className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="font-medium text-lg">No PQ services found</p>
                <p className="text-sm mt-1">No service records have been logged for this event yet</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Service Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Service Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Content
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Engineer
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {services.map((service) => {
                      const serviceTypeLabels: Record<string, string> = {
                        site_survey: 'Site Survey',
                        harmonic_analysis: 'Harmonic Analysis',
                        consultation: 'Consultation',
                        on_site_study: 'On-site Study',
                        power_quality_audit: 'Power Quality Audit',
                        installation_support: 'Installation Support',
                      };

                      return (
                        <tr key={service.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                            {new Date(service.service_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {serviceTypeLabels[service.service_type] || service.service_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {service.customer ? (
                              <div>
                                <div className="font-medium">{service.customer.name}</div>
                                <div className="text-xs text-slate-500">{service.customer.account_number}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {service.content ? (
                              <div className="max-w-md truncate" title={service.content}>
                                {service.content}
                              </div>
                            ) : (
                              <span className="text-slate-400">No content</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                            {service.engineer?.full_name || (
                              <span className="text-slate-400">Not assigned</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {services.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Read-Only View</p>
                    <p className="text-xs text-blue-700 mt-1">
                      This tab displays PQ service records linked to this event. To add, edit, or view full details, please use the PQ Services module.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
              {/* IDR Core Information */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-500 rounded"></span>
                  IDR Core Information
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


              {/* Fault & Asset Location */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-red-500 rounded"></span>
                  Fault & Asset Location
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
                    <label className="text-xs font-medium text-slate-600">Circuit</label>
                    {isEditingIDR ? (
                      <input
                        type="text"
                        value={idrFormData.circuit}
                        onChange={(e) => setIDRFormData({ ...idrFormData, circuit: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.circuit || '-'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Region</label>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{currentSubstation?.region || '-'}</p>
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
              </div>

              {/* Root Cause Analysis */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-yellow-500 rounded"></span>
                  Root Cause Analysis
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
                    <label className="text-xs font-medium text-slate-600">Faulty Component</label>
                    {isEditingIDR ? (
                      <input
                        type="text"
                        value={idrFormData.faulty_component}
                        onChange={(e) => setIDRFormData({ ...idrFormData, faulty_component: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.faulty_component || '-'}</p>
                    )}
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
                </div>
              </div>

              {/* Extended Technical Detail */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-purple-500 rounded"></span>
                  Extended Technical Detail
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600">External / Internal</label>
                    {isEditingIDR ? (
                      <select
                        value={idrFormData.external_internal}
                        onChange={(e) => setIDRFormData({ ...idrFormData, external_internal: e.target.value as 'external' | 'internal' | '' })}
                        className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        <option value="external">External</option>
                        <option value="internal">Internal</option>
                      </select>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 mt-1">{idrFormData.external_internal ? (idrFormData.external_internal === 'external' ? 'External' : 'Internal') : '-'}</p>
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

                  <div className="grid grid-cols-2 gap-2">
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
                  </div>
                </div>
              </div>

              {/* Environment & Operations */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 lg:col-span-2">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-orange-500 rounded"></span>
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

      {/* Customer Event History Panel */}
      {showCustomerHistory && selectedCustomer && (
        <CustomerEventHistoryPanel
          customer={selectedCustomer}
          onClose={() => {
            setShowCustomerHistory(false);
            setSelectedCustomer(null);
          }}
        />
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

  {/* PSBG Config Modal */}
  {showPSBGConfig && (
    <PSBGConfigModal
      isOpen={showPSBGConfig}
      onClose={() => setShowPSBGConfig(false)}
      onSave={setPsbgOptions}
      currentOptions={psbgOptions}
      usedOptions={usedPsbgOptions}
    />
  )}
}
