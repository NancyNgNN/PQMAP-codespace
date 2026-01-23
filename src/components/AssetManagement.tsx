import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PQMeter, Substation, PQEvent, EventType, EventStatus, PQServiceRecord, RealtimePQData } from '../types/database';
import { getLatestMeterReading } from '../services/meterReadingsService';
import { Database, Activity, X, Check, Info, Filter, Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, BarChart3, Clock, Zap, AlertCircle, Wrench, Radio, Network } from 'lucide-react';
import * as XLSX from 'xlsx';
import TreeViewModal from './MeterHierarchy/TreeViewModal';
import { calculateAvailabilityPercent, getExpectedCount, getTimeRangeDates } from '../utils/availability';

interface FilterState {
  status: string;
  substations: string[];
  voltageLevels: string[];
  circuitId: string;
  brand: string;
  model: string;
  searchText: string;
}

interface AssetManagementProps {
  selectedMeterId?: string | null;
  onClearSelectedMeter?: () => void;
}

interface LatestMeterReading {
  timestamp: string;
  v1: number | null;
  v2: number | null;
  v3: number | null;
  i1: number | null;
  i2: number | null;
  i3: number | null;
}

export default function AssetManagement({ selectedMeterId, onClearSelectedMeter }: AssetManagementProps = {}) {
  const [meters, setMeters] = useState<PQMeter[]>([]);
  const [substations, setSubstations] = useState<Substation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeter, setSelectedMeter] = useState<PQMeter | null>(null);
  
  // Meter detail modal states
  const [activeTab, setActiveTab] = useState<'info' | 'events' | 'services' | 'realtime'>('info');
  
  // Event history states
  const [meterEvents, setMeterEvents] = useState<PQEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventFilters, setEventFilters] = useState({
    startDate: '',
    endDate: '',
    eventTypes: [] as EventType[],
    statuses: [] as EventStatus[]
  });
  const [eventPage, setEventPage] = useState(1);
  const eventsPerPage = 20;
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // PQ Services states
  const [meterServices, setMeterServices] = useState<PQServiceRecord[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  
  // Realtime PQ data states
  const [realtimeData, setRealtimeData] = useState<RealtimePQData | null>(null);
  const [loadingRealtime, setLoadingRealtime] = useState(false);
  const [latestReading, setLatestReading] = useState<LatestMeterReading | null>(null);
  const [loadingLatestReading, setLoadingLatestReading] = useState(false);
  const [latestReadingError, setLatestReadingError] = useState<string | null>(null);
  
  // Filter states
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    substations: [],
    voltageLevels: [],
    circuitId: '',
    brand: '',
    model: '',
    searchText: ''
  });
  
  // Export states
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Tree view state
  const [showTreeModal, setShowTreeModal] = useState(false);
  
  // Sort states
  const [sortField, setSortField] = useState<string>('meter_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Availability Report states
  const [showAvailabilityReport, setShowAvailabilityReport] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'custom'>('24h');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [reportFilters, setReportFilters] = useState({
    substations: [] as string[],
    status: 'all',
    searchText: ''
  });
  const [reportSortField, setReportSortField] = useState<string>('site_id');
  const [reportSortDirection, setReportSortDirection] = useState<'asc' | 'desc'>('asc');
  const [reportCurrentPage, setReportCurrentPage] = useState(1);
  const reportItemsPerPage = 20;

  // Mock communication data (placeholder for demonstration)
  const [communicationData, setCommunicationData] = useState<Record<string, Date[]>>({});

  useEffect(() => {
    loadData();
  }, []);

  // Generate mock communication data for past 30 days (placeholder)
  useEffect(() => {
    if (meters.length > 0 && Object.keys(communicationData).length === 0) {
      generateMockCommunicationData();
    }
  }, [meters]);

  // Debug: Log sort state changes
  useEffect(() => {
    console.log('Sort state changed - Field:', sortField, 'Direction:', sortDirection);
  }, [sortField, sortDirection]);

  // Handle selectedMeterId from Dashboard navigation
  useEffect(() => {
    if (selectedMeterId && meters.length > 0) {
      const meter = meters.find(m => m.id === selectedMeterId);
      if (meter) {
        setSelectedMeter(meter);
        loadMeterEvents(meter);
        loadMeterServices(meter);
        loadRealtimeData();
        // Clear the selectedMeterId after opening modal
        if (onClearSelectedMeter) {
          onClearSelectedMeter();
        }
      }
    }
  }, [selectedMeterId, meters]);

  useEffect(() => {
    if (selectedMeter && activeTab === 'realtime') {
      loadLatestReading(selectedMeter.id);
    }
  }, [selectedMeter, activeTab]);

  const loadData = async () => {
    try {
      const [metersRes, substationsRes] = await Promise.all([
        supabase.from('pq_meters').select('*'),
        supabase.from('substations').select('*'),
      ]);

      if (!metersRes.error) setMeters(metersRes.data);
      if (!substationsRes.error) setSubstations(substationsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load events for a specific meter
  const loadMeterEvents = async (meter: PQMeter) => {
    setLoadingEvents(true);
    try {
      // Note: pq_events.meter_id is UUID (FK to pq_meters.id), not TEXT
      // So we match with meter.id, not meter.meter_id
      let query = supabase
        .from('pq_events')
        .select(`
          *,
          meter:meter_id (
            id,
            meter_id,
            circuit_id,
            voltage_level
          )
        `)
        .eq('meter_id', meter.id)  // ✅ Use meter.id (UUID) instead of meter.meter_id (TEXT)
        .order('timestamp', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error loading meter events:', error);
        setMeterEvents([]);
      } else {
        setMeterEvents(data || []);
        console.log(`✅ Loaded ${data?.length || 0} events for meter ${meter.meter_id} (ID: ${meter.id})`);
      }
    } catch (error) {
      console.error('Error loading meter events:', error);
      setMeterEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Load PQ Services for a specific meter
  const loadMeterServices = async (meter: PQMeter) => {
    setLoadingServices(true);
    try {
      // Step 1: Get all events for this meter
      const { data: events, error: eventsError } = await supabase
        .from('pq_events')
        .select('id')
        .eq('meter_id', meter.id);

      if (eventsError) {
        console.error('Error loading meter events for services:', eventsError);
        setMeterServices([]);
        return;
      }

      const eventIds = events?.map(e => e.id) || [];

      if (eventIds.length === 0) {
        setMeterServices([]);
        return;
      }

      // Step 2: Get services linked to these events
      const { data: services, error: servicesError } = await supabase
        .from('pq_service_records')
        .select('*, customer:customers(*), engineer:profiles(*)')
        .in('event_id', eventIds)
        .order('service_date', { ascending: false });

      if (servicesError) {
        console.error('Error loading services:', servicesError);
        setMeterServices([]);
      } else {
        setMeterServices(services || []);
        console.log(`✅ Loaded ${services?.length || 0} services for meter ${meter.meter_id}`);
      }
    } catch (error) {
      console.error('Error loading meter services:', error);
      setMeterServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  // Generate mock realtime PQ data
  const generateRealtimeData = (): RealtimePQData => {
    const randomInRange = (min: number, max: number) => 
      Math.random() * (max - min) + min;

    const voltageNominal = 220; // Nominal voltage (V)
    const currentNominal = 100; // Nominal current (A)

    return {
      // Volts/Amps Section
      vln: {
        phaseA: randomInRange(voltageNominal * 0.95, voltageNominal * 1.05),
        phaseB: randomInRange(voltageNominal * 0.95, voltageNominal * 1.05),
        phaseC: randomInRange(voltageNominal * 0.95, voltageNominal * 1.05),
        avg: voltageNominal
      },
      vll: {
        phaseA: randomInRange(380 * 0.95, 380 * 1.05),
        phaseB: randomInRange(380 * 0.95, 380 * 1.05),
        phaseC: randomInRange(380 * 0.95, 380 * 1.05),
        avg: 380
      },
      current: {
        phaseA: randomInRange(currentNominal * 0.7, currentNominal * 1.2),
        phaseB: randomInRange(currentNominal * 0.7, currentNominal * 1.2),
        phaseC: randomInRange(currentNominal * 0.7, currentNominal * 1.2),
        total: currentNominal
      },
      activePower: {
        phaseA: randomInRange(15, 25),
        phaseB: randomInRange(15, 25),
        phaseC: randomInRange(15, 25),
        total: randomInRange(50, 70)
      },
      reactivePower: {
        phaseA: randomInRange(5, 10),
        phaseB: randomInRange(5, 10),
        phaseC: randomInRange(5, 10),
        total: randomInRange(15, 25)
      },
      apparentPower: {
        phaseA: randomInRange(16, 27),
        phaseB: randomInRange(16, 27),
        phaseC: randomInRange(16, 27),
        total: randomInRange(52, 73)
      },
      frequency: {
        phaseA: randomInRange(49.95, 50.05),
        phaseB: randomInRange(49.95, 50.05),
        phaseC: randomInRange(49.95, 50.05),
        avg: 50.00
      },
      powerFactor: {
        phaseA: randomInRange(0.85, 0.95),
        phaseB: randomInRange(0.85, 0.95),
        phaseC: randomInRange(0.85, 0.95),
        avg: 0.90
      },
      // Power Quality Section
      v2Unb: randomInRange(0.5, 2.0),
      vThd: {
        phaseA: randomInRange(1.0, 3.0),
        phaseB: randomInRange(1.0, 3.0),
        phaseC: randomInRange(1.0, 3.0),
        avg: randomInRange(1.0, 3.0)
      },
      iThf: {
        phaseA: randomInRange(2.0, 5.0),
        phaseB: randomInRange(2.0, 5.0),
        phaseC: randomInRange(2.0, 5.0),
        avg: randomInRange(2.0, 5.0)
      },
      iThdOdd: {
        phaseA: randomInRange(1.5, 4.0),
        phaseB: randomInRange(1.5, 4.0),
        phaseC: randomInRange(1.5, 4.0),
        avg: randomInRange(1.5, 4.0)
      },
      iTdd: {
        phaseA: randomInRange(3.0, 7.0),
        phaseB: randomInRange(3.0, 7.0),
        phaseC: randomInRange(3.0, 7.0),
        avg: randomInRange(3.0, 7.0)
      },
      iTddOdd: {
        phaseA: randomInRange(2.5, 6.0),
        phaseB: randomInRange(2.5, 6.0),
        phaseC: randomInRange(2.5, 6.0),
        avg: randomInRange(2.5, 6.0)
      },
      pst: {
        phaseA: randomInRange(0.2, 0.8),
        phaseB: randomInRange(0.2, 0.8),
        phaseC: randomInRange(0.2, 0.8),
        avg: randomInRange(0.2, 0.8)
      },
      plt: {
        phaseA: randomInRange(0.15, 0.6),
        phaseB: randomInRange(0.15, 0.6),
        phaseC: randomInRange(0.15, 0.6),
        avg: randomInRange(0.15, 0.6)
      },
      timestamp: new Date().toISOString()
    };
  };

  // Load realtime data (mock for now)
  const loadRealtimeData = () => {
    setLoadingRealtime(true);
    // Simulate API delay
    setTimeout(() => {
      setRealtimeData(generateRealtimeData());
      setLoadingRealtime(false);
    }, 500);
  };

  const loadLatestReading = async (meterId: string) => {
    setLoadingLatestReading(true);
    setLatestReadingError(null);

    try {
      const data = await getLatestMeterReading(meterId);
      if (data) {
        setLatestReading({
          timestamp: data.timestamp,
          v1: data.v1,
          v2: data.v2,
          v3: data.v3,
          i1: data.i1,
          i2: data.i2,
          i3: data.i3,
        });
      } else {
        setLatestReading(null);
      }
    } catch (error: any) {
      console.error('Error loading latest meter reading:', error);
      setLatestReading(null);
      setLatestReadingError(error?.message || 'Failed to load latest reading');
    } finally {
      setLoadingLatestReading(false);
    }
  };

  // Generate mock hourly communication records for past 30 days
  const generateMockCommunicationData = () => {
    const now = new Date();
    const mockData: Record<string, Date[]> = {};

    meters.forEach(meter => {
      const communications: Date[] = [];
      
      // Generate hourly records for past 30 days
      for (let day = 0; day < 30; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const timestamp = new Date(now);
          timestamp.setDate(timestamp.getDate() - day);
          timestamp.setHours(timestamp.getHours() - hour, 0, 0, 0);

          // Simulate different availability patterns based on meter status
          let shouldAdd = false;
          
          if (meter.status === 'active') {
            // Active meters: 95-100% availability (miss ~2-5% randomly)
            shouldAdd = Math.random() > 0.02;
          } else if (meter.status === 'abnormal') {
            // Abnormal meters: 50-90% availability
            shouldAdd = Math.random() > 0.3;
          } else {
            // Inactive meters: 0-30% availability
            shouldAdd = Math.random() > 0.85;
          }

          if (shouldAdd) {
            communications.push(timestamp);
          }
        }
      }

      mockData[meter.id] = communications;
    });

    setCommunicationData(mockData);
    console.log('Generated mock communication data for', meters.length, 'meters');
  };

  const substationMap = substations.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {} as Record<string, Substation>);

  // Sorting handler
  const handleSort = (field: string) => {
    console.log('handleSort called with field:', field);
    console.log('Current sortField:', sortField, 'sortDirection:', sortDirection);
    
    if (sortField === field) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      console.log('Toggling direction to:', newDirection);
      setSortDirection(newDirection);
    } else {
      console.log('Changing sort field to:', field, 'direction: asc');
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Get unique values for filter dropdowns
  const uniqueBrands = Array.from(new Set(meters.map(m => m.brand).filter(Boolean))).sort();
  const uniqueModels = Array.from(new Set(meters.map(m => m.model).filter(Boolean))).sort();
  const uniqueVoltageLevels = Array.from(new Set(meters.map(m => m.voltage_level).filter(Boolean))).sort();

  // Apply all filters (AND logic)
  const filteredMeters = meters.filter(meter => {
    // Status filter
    if (filters.status !== 'all' && meter.status !== filters.status) return false;
    
    // Substation filter
    if (filters.substations.length > 0 && !filters.substations.includes(meter.substation_id)) return false;
    
    // Voltage level filter
    if (filters.voltageLevels.length > 0 && !filters.voltageLevels.includes(meter.voltage_level || '')) return false;
    
    // Circuit ID filter
    if (filters.circuitId && !meter.circuit_id?.toLowerCase().includes(filters.circuitId.toLowerCase())) return false;
    
    // Brand filter
    if (filters.brand && meter.brand !== filters.brand) return false;
    
    // Model filter
    if (filters.model && meter.model !== filters.model) return false;
    
    // Text search (meter_id, site_id, ip_address)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const matchesMeterId = meter.meter_id?.toLowerCase().includes(searchLower);
      const matchesSiteId = meter.site_id?.toLowerCase().includes(searchLower);
      const matchesIpAddress = meter.ip_address?.toLowerCase().includes(searchLower);
      if (!matchesMeterId && !matchesSiteId && !matchesIpAddress) return false;
    }
    
    return true;
  });

  // Count active filters
  const activeFilterCount = 
    (filters.status !== 'all' ? 1 : 0) +
    filters.substations.length +
    filters.voltageLevels.length +
    (filters.circuitId ? 1 : 0) +
    (filters.brand ? 1 : 0) +
    (filters.model ? 1 : 0) +
    (filters.searchText ? 1 : 0);

  // Availability Report Functions
  const calculateAvailability = (meterId: string): { count: number; expectedCount: number; availability: number } => {
    const { startDate, endDate } = getTimeRangeDates(timeRange, customStartDate, customEndDate);
    const communications = communicationData[meterId] || [];
    
    // Count communications within time range
    const count = communications.filter(date => 
      date >= startDate && date <= endDate
    ).length;

    // Calculate expected count (1 per hour)
    const expectedCount = getExpectedCount(startDate, endDate);

    // Calculate availability percentage
    const availability = calculateAvailabilityPercent(count, expectedCount);

    return { count, expectedCount, availability };
  };

  const getAvailabilityData = () => {
    return meters.map(meter => {
      const { count, expectedCount, availability } = calculateAvailability(meter.id);
      return {
        ...meter,
        communicationCount: count,
        expectedCount,
        availability: Math.round(availability * 100) / 100 // Round to 2 decimal places
      };
    });
  };

  // Filter availability data based on report filters
  const filteredAvailabilityData = getAvailabilityData().filter(meter => {
    // Substation filter
    if (reportFilters.substations.length > 0 && !reportFilters.substations.includes(meter.substation_id)) return false;
    
    // Status filter
    if (reportFilters.status !== 'all' && meter.status !== reportFilters.status) return false;
    
    // Text search (site_id, meter_id)
    if (reportFilters.searchText) {
      const searchLower = reportFilters.searchText.toLowerCase();
      const matchesSiteId = meter.site_id?.toLowerCase().includes(searchLower);
      const matchesMeterId = meter.meter_id?.toLowerCase().includes(searchLower);
      if (!matchesSiteId && !matchesMeterId) return false;
    }
    
    return true;
  });

  // Sort availability data
  const sortedAvailabilityData = [...filteredAvailabilityData].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (reportSortField) {
      case 'substation':
        aVal = substationMap[a.substation_id]?.name || '';
        bVal = substationMap[b.substation_id]?.name || '';
        break;
      case 'availability':
        aVal = a.availability;
        bVal = b.availability;
        break;
      case 'count':
        aVal = a.communicationCount;
        bVal = b.communicationCount;
        break;
      default:
        aVal = (a as any)[reportSortField] || '';
        bVal = (b as any)[reportSortField] || '';
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return reportSortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return reportSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination for availability report
  const availabilityTotalPages = Math.ceil(sortedAvailabilityData.length / reportItemsPerPage);
  const paginatedAvailabilityData = sortedAvailabilityData.slice(
    (reportCurrentPage - 1) * reportItemsPerPage,
    reportCurrentPage * reportItemsPerPage
  );

  // Calculate summary stats
  const totalActiveMeters = filteredAvailabilityData.filter(m => m.availability >= 90).length;
  const totalAvailability = filteredAvailabilityData.length > 0
    ? Math.round((filteredAvailabilityData.reduce((sum, m) => sum + m.availability, 0) / filteredAvailabilityData.length) * 100) / 100
    : 0;

  const handleReportSort = (field: string) => {
    if (reportSortField === field) {
      setReportSortDirection(reportSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setReportSortField(field);
      setReportSortDirection('asc');
    }
    setReportCurrentPage(1);
  };

  const handleClearReportFilters = () => {
    setReportFilters({
      substations: [],
      status: 'all',
      searchText: ''
    });
    setReportCurrentPage(1);
  };

  const reportActiveFilterCount = 
    reportFilters.substations.length +
    (reportFilters.status !== 'all' ? 1 : 0) +
    (reportFilters.searchText ? 1 : 0);

  // Apply sorting
  const sortedMeters = [...filteredMeters].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    // Get values based on sort field
    switch (sortField) {
      case 'substation':
        aVal = substationMap[a.substation_id]?.name || '';
        bVal = substationMap[b.substation_id]?.name || '';
        break;
      case 'last_communication':
        aVal = a.last_communication ? new Date(a.last_communication).getTime() : 0;
        bVal = b.last_communication ? new Date(b.last_communication).getTime() : 0;
        break;
      default:
        aVal = (a as any)[sortField] || '';
        bVal = (b as any)[sortField] || '';
    }

    // Handle different types
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedMeters.length / itemsPerPage);
  const paginatedMeters = sortedMeters.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate statistics for enabled meters only (enable !== false)
  const enabledMeters = meters.filter(m => m.enable !== false);
  const statusStats = {
    active: enabledMeters.filter(m => m.status === 'active').length,
    abnormal: enabledMeters.filter(m => m.status === 'abnormal').length,
    inactive: enabledMeters.filter(m => m.status === 'inactive').length,
    total: enabledMeters.length
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      substations: [],
      voltageLevels: [],
      circuitId: '',
      brand: '',
      model: '',
      searchText: ''
    });
    setCurrentPage(1);
  };

  // Export handlers
  const handleExport = async (format: 'excel' | 'csv') => {
    setIsExporting(true);
    setShowExportDropdown(false);

    try {
      const exportData = filteredMeters.map(meter => ({
        'Meter ID': meter.meter_id,
        'Site ID': meter.site_id || '-',
        'Voltage Level': meter.voltage_level || '-',
        'Substation': substationMap[meter.substation_id]?.name || 'Unknown',
        'Substation Code': substationMap[meter.substation_id]?.code || '-',
        'Circuit': meter.circuit_id || '-',
        'Area': meter.area || '-',
        'Location': meter.location || '-',
        'SS400': meter.ss400 || '-',
        'SS132': meter.ss132 || '-',
        'SS011': meter.ss011 || '-',
        'Status': meter.status,
        'OC': meter.oc || '-',
        'Brand': meter.brand || '-',
        'Model': meter.model || '-',
        'Nominal Voltage': meter.nominal_voltage ? `${meter.nominal_voltage} kV` : '-',
        'Enable': meter.enable !== undefined ? (meter.enable ? 'Yes' : 'No') : '-',
        'Region': meter.region || '-',
        'IP Address': meter.ip_address || '-',
        'Load Type': meter.load_type || '-',
        'CT Type': meter.ct_type || '-',
        'Asset Number': meter.asset_number || '-',
        'Serial Number': meter.serial_number || '-',
        'Firmware Version': meter.firmware_version || '-',
        'Framework Version': meter.framework_version || '-',
        'Installed Date': meter.installed_date ? new Date(meter.installed_date).toLocaleDateString() : '-',
        'Last Communication': meter.last_communication ? new Date(meter.last_communication).toLocaleString() : 'Never'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Meter ID
        { wch: 12 }, // Site ID
        { wch: 12 }, // Voltage Level
        { wch: 25 }, // Substation
        { wch: 15 }, // Substation Code
        { wch: 12 }, // Circuit
        { wch: 10 }, // Area
        { wch: 20 }, // Location
        { wch: 12 }, // SS400
        { wch: 12 }, // SS132
        { wch: 12 }, // SS011
        { wch: 10 }, // Status
        { wch: 8 },  // OC
        { wch: 12 }, // Brand
        { wch: 15 }, // Model
        { wch: 15 }, // Nominal Voltage
        { wch: 8 },  // Active
        { wch: 10 }, // Region
        { wch: 15 }, // IP Address
        { wch: 12 }, // Meter Type
        { wch: 12 }, // CT Type
        { wch: 15 }, // Asset Number
        { wch: 15 }, // Serial Number
        { wch: 15 }, // Firmware Version
        { wch: 15 }, // Framework Version
        { wch: 15 }, // Installed Date
        { wch: 20 }  // Last Communication
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Meter Inventory');

      const fileName = `Meter_Inventory_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      
      if (format === 'excel') {
        XLSX.writeFile(wb, fileName);
      } else {
        XLSX.writeFile(wb, fileName, { bookType: 'csv' });
      }

      console.log(`Exported ${filteredMeters.length} meters as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export as ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportDropdown && !target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-8 h-8 text-slate-700" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Asset Management</h1>
          <p className="text-slate-600 mt-1">Monitor power quality meters and equipment</p>
        </div>
      </div>

      {/* KPI Cards with Availability Report Button */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Meter Status Overview</h2>
          <button
            onClick={() => setShowAvailabilityReport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
            title="View Availability Report"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="font-semibold">Availability Report</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">Active Meters</p>
                <p className="text-3xl font-bold text-green-600">{statusStats.active}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-xl">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">Abnormal Meters</p>
                <p className="text-3xl font-bold text-orange-600">{statusStats.abnormal}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">Inactive Meters</p>
                <p className="text-3xl font-bold text-red-600">{statusStats.inactive}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-xl">
                <Activity className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Meter Inventory</h2>
            <p className="text-sm text-slate-600 mt-1">
              Showing {paginatedMeters.length} of {sortedMeters.length} meters
              {activeFilterCount > 0 && ` (${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active)`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Tree View Button */}
            <button
              onClick={() => setShowTreeModal(true)}
              className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all flex items-center gap-2"
              title="View Meter Hierarchy Tree"
            >
              <Network className="w-5 h-5" />
              <span className="text-sm font-medium">Tree View</span>
            </button>
            
            {/* Export Button */}
            <div className="relative export-dropdown-container">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={isExporting}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
                title="Export Meters"
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
                </div>
              )}
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-all"
              title="Filter Meters"
            >
              <Filter className="w-5 h-5" />
              <span className="font-semibold">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-3 px-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <button 
                    onClick={() => {
                      console.log('Sorting by meter_id, current:', sortField, sortDirection);
                      handleSort('meter_id');
                    }} 
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    Meter ID
                    {sortField === 'meter_id' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <button 
                    onClick={() => {
                      console.log('Sorting by site_id, current:', sortField, sortDirection);
                      handleSort('site_id');
                    }} 
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    Site ID
                    {sortField === 'site_id' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <button 
                    onClick={() => {
                      console.log('Sorting by voltage_level, current:', sortField, sortDirection);
                      handleSort('voltage_level');
                    }} 
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    Volt Level
                    {sortField === 'voltage_level' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <button 
                    onClick={() => {
                      console.log('Sorting by substation, current:', sortField, sortDirection);
                      handleSort('substation');
                    }} 
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    Substation
                    {sortField === 'substation' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <button 
                    onClick={() => {
                      console.log('Sorting by circuit_id, current:', sortField, sortDirection);
                      handleSort('circuit_id');
                    }} 
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    Circuit
                    {sortField === 'circuit_id' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <button 
                    onClick={() => {
                      console.log('Sorting by area, current:', sortField, sortDirection);
                      handleSort('area');
                    }} 
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    Area
                    {sortField === 'area' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <button 
                    onClick={() => {
                      console.log('Sorting by location, current:', sortField, sortDirection);
                      handleSort('location');
                    }} 
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    Location
                    {sortField === 'location' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <button 
                    onClick={() => {
                      console.log('Sorting by ss400, current:', sortField, sortDirection);
                      handleSort('ss400');
                    }} 
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    SS400
                    {sortField === 'ss400' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <button 
                    onClick={() => {
                      console.log('Sorting by ss132, current:', sortField, sortDirection);
                      handleSort('ss132');
                    }} 
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    SS132
                    {sortField === 'ss132' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <button 
                    onClick={() => {
                      console.log('Sorting by ss011, current:', sortField, sortDirection);
                      handleSort('ss011');
                    }} 
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    SS011
                    {sortField === 'ss011' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-2 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <button 
                    onClick={() => {
                      console.log('Sorting by status, current:', sortField, sortDirection);
                      handleSort('status');
                    }} 
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors mx-auto"
                  >
                    Status
                    {sortField === 'status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-2 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedMeters.length > 0 ? (
                paginatedMeters.map((meter) => {
                  const substation = substationMap[meter.substation_id];
                  return (
                    <tr key={meter.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2 text-sm font-medium text-slate-900">{meter.meter_id}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">{meter.site_id || '-'}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">{meter.voltage_level || '-'}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">{substation?.name || 'Unknown'}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">{meter.circuit_id || '-'}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">{meter.area || '-'}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">{meter.location || '-'}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">
                      {meter.voltage_level === '400kV' ? (meter.ss400 || '-') : '-'}
                    </td>
                    <td className="py-2 px-2 text-sm text-slate-700">
                      {(meter.voltage_level === '132kV' || meter.voltage_level === '11kV') ? (meter.ss132 || '-') : '-'}
                    </td>
                    <td className="py-2 px-2 text-sm text-slate-700">
                      {(meter.voltage_level === '11kV' || meter.voltage_level === '380V') ? (meter.ss011 || '-') : '-'}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        meter.status === 'active' ? 'bg-green-100 text-green-700' :
                        meter.status === 'abnormal' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {meter.status}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => {
                          setSelectedMeter(meter);
                          setActiveTab('info');
                          setEventPage(1);
                          setEventFilters({ startDate: '', endDate: '', eventTypes: [], statuses: [] });
                          setSelectedEventId(null);
                          loadMeterEvents(meter);
                          loadMeterServices(meter);
                          loadRealtimeData();
                        }}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="View Details"
                      >
                        <Info className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                );
              })
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center">
                    <div className="text-slate-400">
                      <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-semibold">No meters found</p>
                      <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 bg-slate-100 rounded-lg font-semibold text-slate-900">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50">
          <div className="bg-white h-full w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Filter className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">Filter Meters</h2>
                </div>
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-slate-300 text-sm">
                {sortedMeters.length} of {meters.length} meters match
              </p>
            </div>

            {/* Filter Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Search */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Meter ID, Site ID, or IP Address..."
                    value={filters.searchText}
                    onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status ({meters.length})</option>
                  <option value="active">Active ({statusStats.active})</option>
                  <option value="abnormal">Abnormal ({statusStats.abnormal})</option>
                  <option value="inactive">Inactive ({statusStats.inactive})</option>
                </select>
              </div>

              {/* Substation */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Substation ({filters.substations.length} selected)
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-300 rounded-lg p-2 space-y-1">
                  {substations.map((sub) => {
                    const meterCount = meters.filter(m => m.substation_id === sub.id).length;
                    return (
                      <label
                        key={sub.id}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.substations.includes(sub.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({ ...filters, substations: [...filters.substations, sub.id] });
                            } else {
                              setFilters({ ...filters, substations: filters.substations.filter(id => id !== sub.id) });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 flex-1">
                          {sub.code} - {sub.name}
                        </span>
                        <span className="text-xs text-slate-500">({meterCount})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Voltage Level */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Voltage Level ({filters.voltageLevels.length} selected)
                </label>
                <div className="space-y-2">
                  {uniqueVoltageLevels.map((level) => {
                    if (!level) return null;
                    const meterCount = meters.filter(m => m.voltage_level === level).length;
                    return (
                      <label
                        key={level}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.voltageLevels.includes(level)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({ ...filters, voltageLevels: [...filters.voltageLevels, level] });
                            } else {
                              setFilters({ ...filters, voltageLevels: filters.voltageLevels.filter(v => v !== level) });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 flex-1">{level}</span>
                        <span className="text-xs text-slate-500">({meterCount})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Circuit ID */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Circuit ID
                </label>
                <input
                  type="text"
                  placeholder="Enter circuit ID..."
                  value={filters.circuitId}
                  onChange={(e) => setFilters({ ...filters, circuitId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Brand
                </label>
                <select
                  value={filters.brand}
                  onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Brands</option>
                  {uniqueBrands.map((brand) => {
                    const meterCount = meters.filter(m => m.brand === brand).length;
                    return (
                      <option key={brand} value={brand}>
                        {brand} ({meterCount})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Model
                </label>
                <select
                  value={filters.model}
                  onChange={(e) => setFilters({ ...filters, model: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Models</option>
                  {uniqueModels.map((model) => {
                    const meterCount = meters.filter(m => m.model === model).length;
                    return (
                      <option key={model} value={model}>
                        {model} ({meterCount})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-6 bg-slate-50 space-y-3">
              <button
                onClick={handleClearFilters}
                className="w-full px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all"
              >
                Clear All Filters
              </button>
              <button
                onClick={() => setShowFilterPanel(false)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meter Detail Modal */}
      {selectedMeter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-slate-700 to-slate-800 text-white px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Meter Details</h3>
                  <p className="text-slate-300 text-sm mt-1">{selectedMeter.meter_id} - {selectedMeter.site_id || 'N/A'}</p>
                </div>
                <button
                  onClick={() => setSelectedMeter(null)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
                    activeTab === 'info'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Meter Information
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('events')}
                  className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
                    activeTab === 'events'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Event History ({meterEvents.length})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('services')}
                  className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
                    activeTab === 'services'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    PQ Services ({meterServices.length})
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('realtime');
                    loadRealtimeData(); // Refresh data when switching to realtime tab
                    if (selectedMeter) {
                      loadLatestReading(selectedMeter.id);
                    }
                  }}
                  className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
                    activeTab === 'realtime'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    Realtime Data
                  </div>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'info' && (
                <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Meter ID</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.meter_id}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Site ID</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.site_id || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      selectedMeter.status === 'active' ? 'bg-green-100 text-green-700' :
                      selectedMeter.status === 'abnormal' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedMeter.status}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Enable</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedMeter.enable !== undefined ? (
                        selectedMeter.enable ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <Check className="w-4 h-4" /> Yes
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center gap-1">
                            <X className="w-4 h-4" /> No
                          </span>
                        )
                      ) : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location & Network */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Location & Network</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Substation</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {substationMap[selectedMeter.substation_id]?.name || 'Unknown'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Circuit</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.circuit_id || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Area</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.area || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Location</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.location || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Region</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.region || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">OC</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.oc || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">IP Address</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.ip_address || '-'}</p>
                  </div>
                  {selectedMeter.ss400 && (
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-slate-600 mb-1">SS400 (400kV Transformer)</p>
                      <p className="text-sm font-semibold text-slate-900">{selectedMeter.ss400}</p>
                    </div>
                  )}
                  {selectedMeter.ss132 && (
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-slate-600 mb-1">SS132 (132kV Transformer)</p>
                      <p className="text-sm font-semibold text-slate-900">{selectedMeter.ss132}</p>
                    </div>
                  )}
                  {selectedMeter.ss011 && (
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-slate-600 mb-1">SS011 (11kV Transformer)</p>
                      <p className="text-sm font-semibold text-slate-900">{selectedMeter.ss011}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Equipment Specifications */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Equipment Specifications</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Brand</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.brand || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Model</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.model || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Load Type</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.load_type || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Voltage Level</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.voltage_level || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Nominal Voltage</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedMeter.nominal_voltage ? `${selectedMeter.nominal_voltage} kV` : '-'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">CT Type</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.ct_type || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Asset Tracking */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Asset Tracking</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Asset Number</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.asset_number || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Serial Number</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.serial_number || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Firmware Version</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.firmware_version || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Framework Version</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.framework_version || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Installed Date</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedMeter.installed_date 
                        ? new Date(selectedMeter.installed_date).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Last Communication</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedMeter.last_communication 
                        ? new Date(selectedMeter.last_communication).toLocaleString()
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
                </div>
              )}

              {activeTab === 'events' && (() => {
                // Apply event filters
                let filteredEvents = [...meterEvents];

                // Date range filter
                if (eventFilters.startDate) {
                  filteredEvents = filteredEvents.filter(e => 
                    new Date(e.timestamp) >= new Date(eventFilters.startDate)
                  );
                }
                if (eventFilters.endDate) {
                  filteredEvents = filteredEvents.filter(e => 
                    new Date(e.timestamp) <= new Date(eventFilters.endDate + 'T23:59:59')
                  );
                }

                // Event type filter
                if (eventFilters.eventTypes.length > 0) {
                  filteredEvents = filteredEvents.filter(e => 
                    eventFilters.eventTypes.includes(e.event_type)
                  );
                }

                // Status filter
                if (eventFilters.statuses.length > 0) {
                  filteredEvents = filteredEvents.filter(e => 
                    eventFilters.statuses.includes(e.status)
                  );
                }

                // Calculate event type breakdown
                const eventTypeBreakdown = filteredEvents.reduce((acc, event) => {
                  acc[event.event_type] = (acc[event.event_type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                // Pagination
                const totalEventPages = Math.ceil(filteredEvents.length / eventsPerPage);
                const paginatedEvents = filteredEvents.slice(
                  (eventPage - 1) * eventsPerPage,
                  eventPage * eventsPerPage
                );

                // Quick date filters
                const setQuickDateFilter = (type: 'today' | '7days' | '30days' | 'year') => {
                  const end = new Date().toISOString().split('T')[0];
                  let start = '';
                  
                  switch (type) {
                    case 'today':
                      start = end;
                      break;
                    case '7days':
                      start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      break;
                    case '30days':
                      start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      break;
                    case 'year':
                      start = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
                      break;
                  }
                  
                  setEventFilters({ ...eventFilters, startDate: start, endDate: end });
                  setEventPage(1);
                };

                const eventTypeOptions: EventType[] = ['voltage_dip', 'voltage_swell', 'harmonic', 'interruption', 'transient', 'flicker'];
                const statusOptions: EventStatus[] = ['new', 'acknowledged', 'investigating', 'resolved'];

                return (
                  <div className="p-6 space-y-4">
                    {loadingEvents ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium text-blue-700 mb-1">Total Events</p>
                                <p className="text-2xl font-bold text-blue-900">{filteredEvents.length}</p>
                              </div>
                              <Zap className="w-8 h-8 text-blue-600" />
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg border border-slate-200">
                            <p className="text-xs font-medium text-slate-700 mb-2">By Type</p>
                            <div className="space-y-1">
                              {Object.entries(eventTypeBreakdown).slice(0, 3).map(([type, count]) => (
                                <div key={type} className="flex justify-between text-xs">
                                  <span className="text-slate-600 capitalize">{type.replace('_', ' ')}</span>
                                  <span className="font-semibold text-slate-900">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Compact Filters - Pattern 1 from STYLES_GUIDE.md */}
                        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                          {/* Date Quick Filters */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-2">Quick Date Filters</label>
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => setQuickDateFilter('today')}
                                className="px-2 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 transition-colors"
                              >
                                Today
                              </button>
                              <button
                                onClick={() => setQuickDateFilter('7days')}
                                className="px-2 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 transition-colors"
                              >
                                Last 7 Days
                              </button>
                              <button
                                onClick={() => setQuickDateFilter('30days')}
                                className="px-2 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 transition-colors"
                              >
                                Last 30 Days
                              </button>
                              <button
                                onClick={() => setQuickDateFilter('year')}
                                className="px-2 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 transition-colors"
                              >
                                This Year
                              </button>
                              <button
                                onClick={() => {
                                  setEventFilters({ startDate: '', endDate: '', eventTypes: [], statuses: [] });
                                  setEventPage(1);
                                }}
                                className="px-2 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-red-50 hover:border-red-500 hover:text-red-700 transition-colors"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>

                          {/* Date Range Inputs */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                              <input
                                type="date"
                                value={eventFilters.startDate}
                                onChange={(e) => {
                                  setEventFilters({ ...eventFilters, startDate: e.target.value });
                                  setEventPage(1);
                                }}
                                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                              <input
                                type="date"
                                value={eventFilters.endDate}
                                onChange={(e) => {
                                  setEventFilters({ ...eventFilters, endDate: e.target.value });
                                  setEventPage(1);
                                }}
                                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          {/* Event Type Filter */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Event Type</label>
                            <div className="flex gap-2 flex-wrap">
                              {eventTypeOptions.map(type => (
                                <button
                                  key={type}
                                  onClick={() => {
                                    setEventFilters({
                                      ...eventFilters,
                                      eventTypes: eventFilters.eventTypes.includes(type)
                                        ? eventFilters.eventTypes.filter(t => t !== type)
                                        : [...eventFilters.eventTypes, type]
                                    });
                                    setEventPage(1);
                                  }}
                                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                    eventFilters.eventTypes.includes(type)
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-blue-50'
                                  }`}
                                >
                                  {type.replace('_', ' ')}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Status Filter */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                            <div className="flex gap-2 flex-wrap">
                              {statusOptions.map(status => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    setEventFilters({
                                      ...eventFilters,
                                      statuses: eventFilters.statuses.includes(status)
                                        ? eventFilters.statuses.filter(s => s !== status)
                                        : [...eventFilters.statuses, status]
                                    });
                                    setEventPage(1);
                                  }}
                                  className={`px-2 py-1 text-xs font-medium rounded transition-colors capitalize ${
                                    eventFilters.statuses.includes(status)
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-blue-50'
                                  }`}
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Events Table */}
                        {filteredEvents.length > 0 ? (
                          <>
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-50">
                                  <tr className="border-b border-slate-200">
                                    <th className="py-2 px-3 text-left font-semibold text-slate-700">Timestamp</th>
                                    <th className="py-2 px-3 text-left font-semibold text-slate-700">Event Type</th>
                                    <th className="py-2 px-3 text-center font-semibold text-slate-700">Duration (ms)</th>
                                    <th className="py-2 px-3 text-center font-semibold text-slate-700">Voltage %</th>
                                    <th className="py-2 px-3 text-center font-semibold text-slate-700">Customers</th>
                                    <th className="py-2 px-3 text-center font-semibold text-slate-700">Status</th>
                                    <th className="py-2 px-3 text-left font-semibold text-slate-700">Circuit</th>
                                    <th className="py-2 px-3 text-left font-semibold text-slate-700">Root Cause</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paginatedEvents.map(event => (
                                    <tr
                                      key={event.id}
                                      onClick={() => setSelectedEventId(selectedEventId === event.id ? null : event.id)}
                                      className={`border-b border-slate-100 transition-colors cursor-pointer ${
                                        selectedEventId === event.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                                      }`}
                                    >
                                      <td className="py-2 px-3 text-slate-900">
                                        {new Date(event.timestamp).toLocaleString()}
                                      </td>
                                      <td className="py-2 px-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 capitalize">
                                          {event.event_type.replace('_', ' ')}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-center text-slate-900">
                                        {event.duration_ms || '-'}
                                      </td>
                                      <td className="py-2 px-3 text-center text-slate-900">
                                        {event.remaining_voltage !== null ? `${event.remaining_voltage}%` : '-'}
                                      </td>
                                      <td className="py-2 px-3 text-center text-slate-900">
                                        {event.customer_count || 0}
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                          event.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                          event.status === 'investigating' ? 'bg-yellow-100 text-yellow-700' :
                                          event.status === 'acknowledged' ? 'bg-blue-100 text-blue-700' :
                                          'bg-slate-100 text-slate-700'
                                        }`}>
                                          {event.status}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-slate-900">
                                        {event.meter?.circuit_id || '-'}
                                      </td>
                                      <td className="py-2 px-3 text-slate-600">
                                        {event.cause || event.remarks || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination */}
                            {totalEventPages > 1 && (
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-slate-600">
                                  Page {eventPage} of {totalEventPages} ({filteredEvents.length} events)
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setEventPage(prev => Math.max(1, prev - 1))}
                                    disabled={eventPage === 1}
                                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </button>
                                  <span className="px-3 py-1 bg-slate-100 rounded text-xs font-semibold text-slate-900">
                                    {eventPage}
                                  </span>
                                  <button
                                    onClick={() => setEventPage(prev => Math.min(totalEventPages, prev + 1))}
                                    disabled={eventPage === totalEventPages}
                                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                            <p className="text-slate-600 font-medium">No events found</p>
                            <p className="text-sm text-slate-500 mt-1">
                              {meterEvents.length === 0 
                                ? 'This meter has no recorded events'
                                : 'Try adjusting your filters'}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

              {/* PQ Services Tab */}
              {activeTab === 'services' && (
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900">PQ Service History</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Services performed related to events from this meter
                    </p>
                  </div>

                  {loadingServices ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : meterServices.length > 0 ? (
                    <div className="space-y-4">
                      {meterServices.map((service) => (
                        <div key={service.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                                  {service.service_type.replace(/_/g, ' ').toUpperCase()}
                                </span>
                                <span className="text-sm text-slate-600">
                                  {new Date(service.service_date).toLocaleDateString('en-GB')}
                                </span>
                              </div>
                              {service.customer && (
                                <p className="text-sm font-medium text-slate-700">
                                  Customer: {service.customer.name}
                                </p>
                              )}
                            </div>
                            {service.engineer && (
                              <div className="text-right">
                                <p className="text-xs text-slate-500">Engineer</p>
                                <p className="text-sm font-medium text-slate-700">{service.engineer.full_name}</p>
                              </div>
                            )}
                          </div>

                          {service.benchmark_standard && (
                            <div className="mb-2">
                              <span className="text-xs font-medium text-slate-600">Benchmark: </span>
                              <span className="text-xs text-slate-700">{service.benchmark_standard}</span>
                            </div>
                          )}

                          {service.findings && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-slate-600 mb-1">Findings:</p>
                              <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">
                                {service.findings}
                              </p>
                            </div>
                          )}

                          {service.recommendations && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-slate-600 mb-1">Recommendations:</p>
                              <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">
                                {service.recommendations}
                              </p>
                            </div>
                          )}

                          {service.event_id && (
                            <div className="mt-2 pt-2 border-t border-slate-100">
                              <span className="text-xs text-slate-500">Related Event ID: </span>
                              <span className="text-xs font-mono text-slate-700">{service.event_id.slice(0, 8)}...</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Wrench className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium">No PQ Services Found</p>
                      <p className="text-sm text-slate-500 mt-1">
                        No services have been recorded for events from this meter
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Realtime Data Tab */}
              {activeTab === 'realtime' && (
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Realtime Power Quality Data</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        Live measurements from meter {selectedMeter.meter_id}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        loadRealtimeData();
                        if (selectedMeter) {
                          loadLatestReading(selectedMeter.id);
                        }
                      }}
                      disabled={loadingRealtime}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {loadingRealtime ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>

                  {loadingRealtime ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : realtimeData ? (
                    <div className="space-y-6">
                      {/* Latest Reading (DB) */}
                      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-800 text-white px-4 py-2 font-semibold flex items-center justify-between">
                          <span>Latest Voltage/Current Reading (DB)</span>
                          {loadingLatestReading && (
                            <span className="text-xs text-slate-200">Loading...</span>
                          )}
                        </div>
                        <div className="p-4">
                          {latestReadingError && (
                            <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                              {latestReadingError}
                            </div>
                          )}

                          {latestReading ? (
                            <div className="space-y-3">
                              <div className="text-xs text-slate-500 text-right">
                                Timestamp: {new Date(latestReading.timestamp).toLocaleString()}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                  <p className="text-xs font-semibold text-slate-600 mb-2">Voltage (V)</p>
                                  <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div className="text-center">
                                      <p className="text-xs text-slate-500">V1</p>
                                      <p className="font-bold text-slate-900">{latestReading.v1 ?? '-'} </p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-slate-500">V2</p>
                                      <p className="font-bold text-slate-900">{latestReading.v2 ?? '-'} </p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-slate-500">V3</p>
                                      <p className="font-bold text-slate-900">{latestReading.v3 ?? '-'} </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                  <p className="text-xs font-semibold text-slate-600 mb-2">Current (A)</p>
                                  <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div className="text-center">
                                      <p className="text-xs text-slate-500">I1</p>
                                      <p className="font-bold text-slate-900">{latestReading.i1 ?? '-'} </p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-slate-500">I2</p>
                                      <p className="font-bold text-slate-900">{latestReading.i2 ?? '-'} </p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-slate-500">I3</p>
                                      <p className="font-bold text-slate-900">{latestReading.i3 ?? '-'} </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-slate-600">
                              No database readings available yet. Latest values will appear after server-side ingestion.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="text-xs text-slate-500 text-right">
                        Last updated: {new Date(realtimeData.timestamp).toLocaleString()}
                      </div>

                      {/* Volts/Amps Section */}
                      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-blue-600 text-white px-4 py-2 font-semibold">
                          Volts/Amps
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold text-slate-700 border-b border-slate-200">Parameter</th>
                                <th className="px-4 py-2 text-center font-semibold text-slate-700 border-b border-slate-200">Phase A</th>
                                <th className="px-4 py-2 text-center font-semibold text-slate-700 border-b border-slate-200">Phase B</th>
                                <th className="px-4 py-2 text-center font-semibold text-slate-700 border-b border-slate-200">Phase C</th>
                                <th className="px-4 py-2 text-center font-semibold text-slate-700 border-b border-slate-200">Total/Avg</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700 border-b border-slate-100">Vln (V)</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.vln.phaseA.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.vln.phaseB.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.vln.phaseC.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900 border-b border-slate-100">{realtimeData.vln.avg.toFixed(2)}</td>
                              </tr>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700 border-b border-slate-100">Vll (V)</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.vll.phaseA.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.vll.phaseB.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.vll.phaseC.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900 border-b border-slate-100">{realtimeData.vll.avg.toFixed(2)}</td>
                              </tr>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700 border-b border-slate-100">Current (A)</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.current.phaseA.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.current.phaseB.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.current.phaseC.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900 border-b border-slate-100">{realtimeData.current.total.toFixed(2)}</td>
                              </tr>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700 border-b border-slate-100">Active Power (kW)</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.activePower.phaseA.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.activePower.phaseB.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.activePower.phaseC.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900 border-b border-slate-100">{realtimeData.activePower.total.toFixed(2)}</td>
                              </tr>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700 border-b border-slate-100">Reactive Power (kVAR)</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.reactivePower.phaseA.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.reactivePower.phaseB.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.reactivePower.phaseC.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900 border-b border-slate-100">{realtimeData.reactivePower.total.toFixed(2)}</td>
                              </tr>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700 border-b border-slate-100">Apparent Power (kVA)</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.apparentPower.phaseA.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.apparentPower.phaseB.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.apparentPower.phaseC.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900 border-b border-slate-100">{realtimeData.apparentPower.total.toFixed(2)}</td>
                              </tr>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700 border-b border-slate-100">Frequency (Hz)</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.frequency.phaseA.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.frequency.phaseB.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.frequency.phaseC.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900 border-b border-slate-100">{realtimeData.frequency.avg.toFixed(2)}</td>
                              </tr>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700">Power Factor (Ref: -IEEE, +ve: Lagging)</td>
                                <td className="px-4 py-2 text-center text-slate-900">{realtimeData.powerFactor.phaseA.toFixed(3)}</td>
                                <td className="px-4 py-2 text-center text-slate-900">{realtimeData.powerFactor.phaseB.toFixed(3)}</td>
                                <td className="px-4 py-2 text-center text-slate-900">{realtimeData.powerFactor.phaseC.toFixed(3)}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900">{realtimeData.powerFactor.avg.toFixed(3)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Power Quality Section */}
                      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-amber-600 text-white px-4 py-2 font-semibold">
                          Power Quality
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold text-slate-700 border-b border-slate-200">Parameter</th>
                                <th className="px-4 py-2 text-center font-semibold text-slate-700 border-b border-slate-200">Phase A</th>
                                <th className="px-4 py-2 text-center font-semibold text-slate-700 border-b border-slate-200">Phase B</th>
                                <th className="px-4 py-2 text-center font-semibold text-slate-700 border-b border-slate-200">Phase C</th>
                                <th className="px-4 py-2 text-center font-semibold text-slate-700 border-b border-slate-200">Total/Avg</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700 border-b border-slate-100">V2 Unb (%)</td>
                                <td colSpan={3} className="px-4 py-2 text-center text-slate-400 border-b border-slate-100">--</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900 border-b border-slate-100">{realtimeData.v2Unb.toFixed(2)}</td>
                              </tr>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700 border-b border-slate-100">V THD (%)</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.vThd.phaseA.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.vThd.phaseB.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.vThd.phaseC.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900 border-b border-slate-100">{realtimeData.vThd.avg.toFixed(2)}</td>
                              </tr>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700 border-b border-slate-100">I THF (%)</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.iThf.phaseA.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.iThf.phaseB.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.iThf.phaseC.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900 border-b border-slate-100">{realtimeData.iThf.avg.toFixed(2)}</td>
                              </tr>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700 border-b border-slate-100">I THD odd (%)</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.iThdOdd.phaseA.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.iThdOdd.phaseB.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.iThdOdd.phaseC.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900 border-b border-slate-100">{realtimeData.iThdOdd.avg.toFixed(2)}</td>
                              </tr>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700 border-b border-slate-100">I TDD (%)</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.iTdd.phaseA.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.iTdd.phaseB.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.iTdd.phaseC.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900 border-b border-slate-100">{realtimeData.iTdd.avg.toFixed(2)}</td>
                              </tr>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700 border-b border-slate-100">I TDD odd (%)</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.iTddOdd.phaseA.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.iTddOdd.phaseB.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.iTddOdd.phaseC.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900 border-b border-slate-100">{realtimeData.iTddOdd.avg.toFixed(2)}</td>
                              </tr>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700 border-b border-slate-100">Pst</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.pst.phaseA.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.pst.phaseB.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900 border-b border-slate-100">{realtimeData.pst.phaseC.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900 border-b border-slate-100">{realtimeData.pst.avg.toFixed(2)}</td>
                              </tr>
                              <tr className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700">Plt</td>
                                <td className="px-4 py-2 text-center text-slate-900">{realtimeData.plt.phaseA.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900">{realtimeData.plt.phaseB.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-slate-900">{realtimeData.plt.phaseC.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900">{realtimeData.plt.avg.toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Radio className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium">No Realtime Data Available</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Click refresh to load the latest measurements
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 bg-slate-50 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setSelectedMeter(null)}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tree View Modal */}
      {showTreeModal && (
        <TreeViewModal
          meters={meters}
          onClose={() => setShowTreeModal(false)}
        />
      )}

      {/* Availability Report Modal */}
      {showAvailabilityReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6" />
                <div>
                  <h3 className="text-xl font-bold">Meter Availability Report</h3>
                  <p className="text-blue-100 text-sm">Communication performance monitoring</p>
                </div>
              </div>
              <button
                onClick={() => setShowAvailabilityReport(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Time Range Configuration */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-600" />
                  <span className="text-sm font-semibold text-slate-700">Time Range:</span>
                </div>
                
                {/* Preset Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTimeRange('24h')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      timeRange === '24h'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                    }`}
                  >
                    Last 24 Hours
                  </button>
                  <button
                    onClick={() => setTimeRange('7d')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      timeRange === '7d'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => setTimeRange('30d')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      timeRange === '30d'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                    }`}
                  >
                    Last 30 Days
                  </button>
                  <button
                    onClick={() => setTimeRange('custom')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      timeRange === 'custom'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                    }`}
                  >
                    Custom Range
                  </button>
                </div>

                {/* Custom Date Inputs */}
                {timeRange === 'custom' && (
                  <div className="flex items-center gap-2 ml-4">
                    <input
                      type="datetime-local"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-slate-600">to</span>
                    <input
                      type="datetime-local"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Summary Section */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs font-medium text-slate-600 mb-1">Time Range</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {(() => {
                      const { startDate, endDate } = getTimeRangeDates(timeRange, customStartDate, customEndDate);
                      return `${startDate.toLocaleString('en-GB', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })} to ${endDate.toLocaleString('en-GB', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}`;
                    })()}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs font-medium text-slate-600 mb-1">Total Meters</p>
                  <p className="text-2xl font-bold text-slate-900">{filteredAvailabilityData.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-xs font-medium text-green-700 mb-1">Active Meters (≥90%)</p>
                  <p className="text-2xl font-bold text-green-700">{totalActiveMeters}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-xs font-medium text-blue-700 mb-1">Total Availability</p>
                  <p className="text-2xl font-bold text-blue-700">{totalAvailability}%</p>
                </div>
              </div>
            </div>

            {/* Filter Section */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 flex-1">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Site ID or Meter ID..."
                      value={reportFilters.searchText}
                      onChange={(e) => setReportFilters({ ...reportFilters, searchText: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Substation Filter */}
                  <select
                    multiple
                    value={reportFilters.substations}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setReportFilters({ ...reportFilters, substations: selected });
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 min-w-[150px]"
                    size={1}
                  >
                    <option value="">All Substations</option>
                    {substations.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={reportFilters.status}
                    onChange={(e) => setReportFilters({ ...reportFilters, status: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="abnormal">Abnormal</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                {reportActiveFilterCount > 0 && (
                  <button
                    onClick={handleClearReportFilters}
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all"
                  >
                    Clear Filters ({reportActiveFilterCount})
                  </button>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white border-b-2 border-slate-300 z-10">
                    <tr>
                      {/* Site ID */}
                      <th className="py-3 px-4 text-left">
                        <button
                          onClick={() => handleReportSort('site_id')}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-blue-600"
                        >
                          Site ID
                          {reportSortField === 'site_id' ? (
                            reportSortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      </th>

                      {/* Meter ID */}
                      <th className="py-3 px-4 text-left">
                        <button
                          onClick={() => handleReportSort('meter_id')}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-blue-600"
                        >
                          Meter ID
                          {reportSortField === 'meter_id' ? (
                            reportSortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      </th>

                      {/* Substation */}
                      <th className="py-3 px-4 text-left">
                        <button
                          onClick={() => handleReportSort('substation')}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-blue-600"
                        >
                          Substation
                          {reportSortField === 'substation' ? (
                            reportSortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      </th>

                      {/* Status */}
                      <th className="py-3 px-4 text-left">
                        <button
                          onClick={() => handleReportSort('status')}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-blue-600"
                        >
                          Status
                          {reportSortField === 'status' ? (
                            reportSortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      </th>

                      {/* Count */}
                      <th className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleReportSort('count')}
                          className="flex items-center justify-end gap-1 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-blue-600 ml-auto"
                        >
                          Count
                          {reportSortField === 'count' ? (
                            reportSortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      </th>

                      {/* Expected */}
                      <th className="py-3 px-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Expected
                      </th>

                      {/* Availability */}
                      <th className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleReportSort('availability')}
                          className="flex items-center justify-end gap-1 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-blue-600 ml-auto"
                        >
                          Availability
                          {reportSortField === 'availability' ? (
                            reportSortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAvailabilityData.length > 0 ? (
                      paginatedAvailabilityData.map((meter) => (
                        <tr key={meter.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-sm text-slate-900">
                            {meter.site_id || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-900">
                            {meter.meter_id}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700">
                            {substationMap[meter.substation_id]?.name || 'Unknown'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              meter.status === 'active' 
                                ? 'bg-green-100 text-green-700' 
                                : meter.status === 'abnormal'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {meter.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-900 text-right font-semibold">
                            {meter.communicationCount}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600 text-right">
                            {meter.expectedCount}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                              meter.availability >= 90 
                                ? 'bg-green-100 text-green-700' 
                                : meter.availability >= 50
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {meter.availability.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Database className="w-12 h-12 text-slate-300" />
                            <p className="text-slate-500 font-medium">No meters match the current filters</p>
                            <button
                              onClick={handleClearReportFilters}
                              className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                            >
                              Clear all filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {availabilityTotalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                  <div className="text-sm text-slate-600">
                    Showing {((reportCurrentPage - 1) * reportItemsPerPage) + 1} to {Math.min(reportCurrentPage * reportItemsPerPage, sortedAvailabilityData.length)} of {sortedAvailabilityData.length} meters
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setReportCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={reportCurrentPage === 1}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="px-4 py-2 bg-slate-100 rounded-lg font-semibold text-slate-900">
                      {reportCurrentPage} / {availabilityTotalPages}
                    </span>
                    <button
                      onClick={() => setReportCurrentPage(prev => Math.min(availabilityTotalPages, prev + 1))}
                      disabled={reportCurrentPage === availabilityTotalPages}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                <span className="font-semibold">{filteredAvailabilityData.length}</span> meters displayed
              </div>
              <button
                onClick={() => setShowAvailabilityReport(false)}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tree View Modal */}
      {showTreeModal && (
        <TreeViewModal
          meters={meters}
          onClose={() => setShowTreeModal(false)}
        />
      )}
    </div>
  );
}
