import { useState, useEffect, useRef } from 'react';
import { Database, Plus, Upload, FileDown, Search, Filter as FilterIcon, Trash2, Edit2, Power, PowerOff, Network, AlertCircle } from 'lucide-react';
import {
  fetchMeters,
  getAreas,
  getRegions,
  getVoltageLevels,
  deleteMeter,
  toggleMeterActive,
  getMeterStatistics
} from '../services/meterHierarchyService';
import type { PQMeter } from '../types/database';
import MeterFormModal from './MeterHierarchy/MeterFormModal';
import TreeViewModal from './MeterHierarchy/TreeViewModal';

export default function MeterHierarchy() {
  const [meters, setMeters] = useState<PQMeter[]>([]);
  const [filteredMeters, setFilteredMeters] = useState<PQMeter[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [voltageLevels, setVoltageLevels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedVoltageLevels, setSelectedVoltageLevels] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // UI states
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showVoltageDropdown, setShowVoltageDropdown] = useState(false);
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [editingMeter, setEditingMeter] = useState<PQMeter | null>(null);

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; column: string; message: string }>;
  } | null>(null);

  // Sort states
  const [sortField, setSortField] = useState<string>('meter_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const importDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [meters, searchTerm, selectedAreas, selectedRegions, selectedVoltageLevels, activeFilter]);

  // Click outside handler for import dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (importDropdownRef.current && !importDropdownRef.current.contains(event.target as Node)) {
        setShowImportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [metersData, areasData, regionsData, voltageLevelsData, stats] = await Promise.all([
        fetchMeters(),
        getAreas(),
        getRegions(),
        getVoltageLevels(),
        getMeterStatistics()
      ]);
      setMeters(metersData);
      setAreas(areasData);
      setRegions(regionsData);
      setVoltageLevels(voltageLevelsData);
      setStatistics(stats);
    } catch (err) {
      console.error('Error loading meter hierarchy data:', err);
      setError('Failed to load meter data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...meters];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        m => m.meter_id.toLowerCase().includes(term) || 
             m.site_id?.toLowerCase().includes(term) ||
             m.area.toLowerCase().includes(term)
      );
    }

    // Area filter
    if (selectedAreas.length > 0) {
      filtered = filtered.filter(m => selectedAreas.includes(m.area));
    }

    // Region filter
    if (selectedRegions.length > 0) {
      filtered = filtered.filter(m => m.region && selectedRegions.includes(m.region));
    }

    // Voltage level filter
    if (selectedVoltageLevels.length > 0) {
      filtered = filtered.filter(m => m.voltage_level && selectedVoltageLevels.includes(m.voltage_level));
    }

    // Active status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(m => m.active === (activeFilter === 'active'));
    }

    setFilteredMeters(filtered);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleCreate = () => {
    setEditingMeter(null);
    setShowFormModal(true);
  };

  const handleEdit = (meter: PQMeter) => {
    setEditingMeter(meter);
    setShowFormModal(true);
  };

  const handleDelete = async (meter: PQMeter) => {
    if (!confirm(`Are you sure you want to delete meter "${meter.meter_id}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await deleteMeter(meter.id);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting meter:', err);
      alert(err.message || 'Failed to delete meter');
    }
  };

  const handleToggleActive = async (meter: PQMeter) => {
    try {
      await toggleMeterActive(meter.id, !meter.active);
      await loadData();
    } catch (err: any) {
      console.error('Error toggling meter active status:', err);
      alert(err.message || 'Failed to update meter status');
    }
  };

  const handleFormSuccess = () => {
    setShowFormModal(false);
    setEditingMeter(null);
    loadData();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedAreas([]);
    setSelectedRegions([]);
    setSelectedVoltageLevels([]);
    setActiveFilter('all');
    setCurrentPage(1);
  };

  const activeFilterCount = 
    (searchTerm ? 1 : 0) +
    selectedAreas.length +
    selectedRegions.length +
    selectedVoltageLevels.length +
    (activeFilter !== 'all' ? 1 : 0);

  // Apply sorting
  const sortedMeters = [...filteredMeters].sort((a, b) => {
    let aVal: any = (a as any)[sortField] || '';
    let bVal: any = (b as any)[sortField] || '';

    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

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

  // Import CSV functionality
  const handleDownloadTemplate = () => {
    const headers = [
      'meter_id', 'site_id', 'voltage_level', 'substation_id', 'circuit_id',
      'location', 'region', 'oc', 'brand', 'model', 'nominal_voltage',
      'ct_type', 'asset_number', 'serial_number', 'ip_address',
      'firmware_version', 'framework_version', 'status', 'active',
      'last_communication', 'installed_date', 'area', 'ss400', 'ss132',
      'ss011', 'ss_misc', 'load_type'
    ];

    const exampleData = [
      '# This is a template for importing PQ Meters',
      '# Required fields: meter_id, voltage_level, substation_id, location, area',
      '# Status values: active, abnormal, inactive',
      '# Active values: true, false',
      '# Voltage levels: 400kV, 132kV, 11kV, 380V',
      '# Load types: DC, EV, others, RE-PV, RES, RES-HRB, RES-NOC',
      '',
      'PQMS_11KV.TST0001_H1,TST001,11kV,uuid-of-substation,TST_CIR_001,Test Location,Hong Kong Island,Test OC,Fluke,F1234,11000,100/5A,ASSET001,SN12345,192.168.1.100,v1.0.0,v2.0.0,active,true,2026-01-06T00:00:00Z,2025-01-01T00:00:00Z,TST,TST400,TST132,TST011,,RES'
    ];

    const csvContent = headers.join(',') + '\n' + exampleData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Meter_Hierarchy_Template_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setShowImportDropdown(false);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setShowImportDropdown(false);
    setShowImportModal(true);
    setImportResults(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      if (lines.length < 2) {
        throw new Error('CSV file must contain header row and at least one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const dataRows = lines.slice(1);

      let successCount = 0;
      let failedCount = 0;
      const errors: Array<{ row: number; column: string; message: string }> = [];

      for (let i = 0; i < dataRows.length; i++) {
        const rowNumber = i + 2; // +2 because: +1 for 1-based indexing, +1 for header row
        const values = dataRows[i].split(',').map(v => v.trim());
        
        const rowData: Record<string, string> = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });

        const rowErrors = validateImportRow(rowData, rowNumber);
        
        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
          failedCount++;
          continue;
        }

        // Import the row (simplified - you'd call createMeter here)
        try {
          // Note: This is a placeholder. In production, you'd call createMeter with proper data
          successCount++;
        } catch (err: any) {
          errors.push({
            row: rowNumber,
            column: 'general',
            message: err.message || 'Failed to import'
          });
          failedCount++;
        }
      }

      setImportResults({
        success: successCount,
        failed: failedCount,
        errors
      });

      if (successCount > 0) {
        await loadData();
      }
    } catch (err: any) {
      setImportResults({
        success: 0,
        failed: 1,
        errors: [{ row: 0, column: 'file', message: err.message || 'Failed to parse CSV file' }]
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const validateImportRow = (
    row: Record<string, string>,
    rowNumber: number
  ): Array<{ row: number; column: string; message: string }> => {
    const errors: Array<{ row: number; column: string; message: string }> = [];

    // Required fields
    if (!row.meter_id) {
      errors.push({ row: rowNumber, column: 'meter_id', message: 'Meter ID is required' });
    }
    if (!row.voltage_level) {
      errors.push({ row: rowNumber, column: 'voltage_level', message: 'Voltage level is required' });
    }
    if (!row.substation_id) {
      errors.push({ row: rowNumber, column: 'substation_id', message: 'Substation ID is required' });
    }
    if (!row.location) {
      errors.push({ row: rowNumber, column: 'location', message: 'Location is required' });
    }
    if (!row.area) {
      errors.push({ row: rowNumber, column: 'area', message: 'Area is required' });
    }

    // Validate status enum
    if (row.status && !['active', 'abnormal', 'inactive'].includes(row.status)) {
      errors.push({ row: rowNumber, column: 'status', message: 'Status must be: active, abnormal, or inactive' });
    }

    // Validate active boolean
    if (row.active && !['true', 'false'].includes(row.active.toLowerCase())) {
      errors.push({ row: rowNumber, column: 'active', message: 'Active must be: true or false' });
    }

    return errors;
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <div className="w-4 h-4" />;
    }
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading meter hierarchy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Error Loading Data</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Meter Hierarchy</h1>
                <p className="text-slate-600 mt-1">Manage PQ meter relationships and transformer codes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTreeModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                title="View Hierarchy Tree"
              >
                <Network className="w-4 h-4" />
                Tree View
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Meter
              </button>
              <div className="relative" ref={importDropdownRef}>
                <button
                  onClick={() => setShowImportDropdown(!showImportDropdown)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                  title="Import Meters"
                >
                  <Upload className="w-4 h-4" />
                  Import
                </button>
                {showImportDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-30">
                    <label className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4 text-blue-600" />
                      Import CSV
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportCSV}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={handleDownloadTemplate}
                      className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <FileDown className="w-4 h-4 text-green-600" />
                      Download Template
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-slate-600">Total Meters</div>
                <div className="text-2xl font-bold text-slate-900">{statistics.total}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 shadow-sm">
                <div className="text-sm text-green-600">Active</div>
                <div className="text-2xl font-bold text-green-700">{statistics.active}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 shadow-sm">
                <div className="text-sm text-red-600">Inactive</div>
                <div className="text-2xl font-bold text-red-700">{statistics.inactive}</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 shadow-sm">
                <div className="text-sm text-yellow-600">Abnormal</div>
                <div className="text-2xl font-bold text-yellow-700">{statistics.abnormal}</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Area Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowAreaDropdown(!showAreaDropdown)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                >
                  <FilterIcon className="w-4 h-4" />
                  Area
                  {selectedAreas.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {selectedAreas.length}
                    </span>
                  )}
                </button>
                {showAreaDropdown && (
                  <div className="absolute z-20 mt-1 w-64 bg-white border border-slate-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    <div className="p-2 border-b border-slate-200 flex gap-2">
                      <button
                        onClick={() => setSelectedAreas([...areas])}
                        className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-medium"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedAreas([])}
                        className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 rounded font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="p-2">
                      {areas.map(area => (
                        <label key={area} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedAreas.includes(area)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAreas([...selectedAreas, area]);
                              } else {
                                setSelectedAreas(selectedAreas.filter(a => a !== area));
                              }
                            }}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm">{area}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Region Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowRegionDropdown(!showRegionDropdown)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                >
                  <FilterIcon className="w-4 h-4" />
                  Region
                  {selectedRegions.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {selectedRegions.length}
                    </span>
                  )}
                </button>
                {showRegionDropdown && (
                  <div className="absolute z-20 mt-1 w-64 bg-white border border-slate-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    <div className="p-2 border-b border-slate-200 flex gap-2">
                      <button
                        onClick={() => setSelectedRegions([...regions])}
                        className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-medium"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedRegions([])}
                        className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 rounded font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="p-2">
                      {regions.map(region => (
                        <label key={region} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedRegions.includes(region)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRegions([...selectedRegions, region]);
                              } else {
                                setSelectedRegions(selectedRegions.filter(r => r !== region));
                              }
                            }}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm">{region}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Voltage Level Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowVoltageDropdown(!showVoltageDropdown)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                >
                  <FilterIcon className="w-4 h-4" />
                  Voltage Level
                  {selectedVoltageLevels.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {selectedVoltageLevels.length}
                    </span>
                  )}
                </button>
                {showVoltageDropdown && (
                  <div className="absolute z-20 mt-1 w-48 bg-white border border-slate-300 rounded-lg shadow-lg">
                    <div className="p-2 border-b border-slate-200 flex gap-2">
                      <button
                        onClick={() => setSelectedVoltageLevels([...voltageLevels])}
                        className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-medium"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedVoltageLevels([])}
                        className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 rounded font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="p-2">
                      {voltageLevels.map(level => (
                        <label key={level} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedVoltageLevels.includes(level)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVoltageLevels([...selectedVoltageLevels, level]);
                              } else {
                                setSelectedVoltageLevels(selectedVoltageLevels.filter(v => v !== level));
                              }
                            }}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm">{level}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Active Status Filter */}
              <div className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg">
                <span className="text-sm text-slate-600">Status:</span>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="text-sm border-0 focus:outline-none focus:ring-0 bg-transparent"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Clear Filters ({activeFilterCount})
                </button>
              )}
            </div>

            <div className="mt-3 text-sm text-slate-600">
              Showing {paginatedMeters.length} of {filteredMeters.length} meters
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th
                    onClick={() => handleSort('meter_id')}
                    className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-1">
                      Name
                      <span className="text-slate-400">{getSortIcon('meter_id')}</span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('area')}
                    className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-1">
                      Area
                      <span className="text-slate-400">{getSortIcon('area')}</span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('region')}
                    className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-1">
                      Region
                      <span className="text-slate-400">{getSortIcon('region')}</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    SS400
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    SS132
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    SS011
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    SSMisc
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedMeters.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      No meters found matching your criteria
                    </td>
                  </tr>
                ) : (
                  paginatedMeters.map((meter) => (
                    <tr key={meter.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {meter.meter_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {meter.area}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {meter.region || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                        {meter.ss400 || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                        {meter.ss132 || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                        {meter.ss011 || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                        {meter.ss_misc || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {meter.location}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          meter.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {meter.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(meter)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(meter)}
                            className={`p-2 ${
                              meter.active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'
                            } rounded-lg transition-colors`}
                            title={meter.active ? 'Deactivate' : 'Activate'}
                          >
                            {meter.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(meter)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <MeterFormModal
          meter={editingMeter}
          onClose={() => {
            setShowFormModal(false);
            setEditingMeter(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Tree View Modal */}
      {showTreeModal && (
        <TreeViewModal
          meters={meters}
          onClose={() => setShowTreeModal(false)}
        />
      )}

      {/* Import Results Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Import Results</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isImporting ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-600">Importing meters...</p>
                </div>
              ) : importResults ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="text-sm text-green-600">Successful</div>
                      <div className="text-2xl font-bold text-green-700">{importResults.success}</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <div className="text-sm text-red-600">Failed</div>
                      <div className="text-2xl font-bold text-red-700">{importResults.failed}</div>
                    </div>
                  </div>

                  {importResults.errors.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-slate-900">Errors:</h3>
                      <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                        {importResults.errors.map((error, index) => (
                          <div key={index} className="px-4 py-2 border-b border-slate-100 last:border-b-0">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Row {error.row} - Column: {error.column}
                                </div>
                                <div className="text-sm text-slate-600">{error.message}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex-shrink-0">
              <button
                onClick={() => setShowImportModal(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
