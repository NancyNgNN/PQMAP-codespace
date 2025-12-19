import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PQMeter, Substation } from '../types/database';
import { Database, Activity, X, Check, Info, Filter, Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, BarChart3, Clock, Calendar, Settings2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FilterState {
  status: string;
  substations: string[];
  voltageLevels: string[];
  circuitId: string;
  brand: string;
  model: string;
  searchText: string;
}

export default function AssetManagement() {
  const [meters, setMeters] = useState<PQMeter[]>([]);
  const [substations, setSubstations] = useState<Substation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeter, setSelectedMeter] = useState<PQMeter | null>(null);
  
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
  const getTimeRangeDates = (): { startDate: Date; endDate: Date } => {
    const now = new Date();
    let endDate = new Date(now);
    let startDate = new Date(now);

    switch (timeRange) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        }
        break;
    }

    return { startDate, endDate };
  };

  const calculateAvailability = (meterId: string): { count: number; expectedCount: number; availability: number } => {
    const { startDate, endDate } = getTimeRangeDates();
    const communications = communicationData[meterId] || [];
    
    // Count communications within time range
    const count = communications.filter(date => 
      date >= startDate && date <= endDate
    ).length;

    // Calculate expected count (1 per hour)
    const hoursDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
    const expectedCount = Math.max(1, hoursDiff);

    // Calculate availability percentage
    const availability = expectedCount > 0 ? (count / expectedCount) * 100 : 0;

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

  const statusStats = {
    active: meters.filter(m => m.status === 'active').length,
    abnormal: meters.filter(m => m.status === 'abnormal').length,
    inactive: meters.filter(m => m.status === 'inactive').length,
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
        'Active': meter.active !== undefined ? (meter.active ? 'Yes' : 'No') : '-',
        'Region': meter.region || '-',
        'IP Address': meter.ip_address || '-',
        'Meter Type': meter.meter_type || '-',
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
                      {meter.voltage_level === '11kV' ? (meter.ss011 || '-') : '-'}
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
                        onClick={() => setSelectedMeter(meter)}
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Meter Details</h3>
              <button
                onClick={() => setSelectedMeter(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

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
                    <p className="text-xs font-medium text-slate-600 mb-1">Active</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedMeter.active !== undefined ? (
                        selectedMeter.active ? (
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
                    <p className="text-xs font-medium text-slate-600 mb-1">Meter Type</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.meter_type || '-'}</p>
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

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4">
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
                      const { startDate, endDate } = getTimeRangeDates();
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
    </div>
  );
}
