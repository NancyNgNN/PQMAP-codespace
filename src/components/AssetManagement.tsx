import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PQMeter, Substation } from '../types/database';
import { Database, Activity, X, Check, Info, Filter, Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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

  useEffect(() => {
    loadData();
  }, []);

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
    </div>
  );
}
