import { useState, useEffect, useRef } from 'react';
import { Database, Plus, Download, Search, Filter as FilterIcon, Trash2, Edit2, AlertCircle } from 'lucide-react';
import {
  fetchSubstations,
  getVoltageLevels,
  getRegions,
  deleteSubstation,
  checkSubstationDependencies
} from '../services/scadaService';
import type { Substation, SubstationStatus } from '../types/database';
import SubstationFormModal from './SCADA/SubstationFormModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SCADA() {
  const [substations, setSubstations] = useState<Substation[]>([]);
  const [filteredSubstations, setFilteredSubstations] = useState<Substation[]>([]);
  const [voltageLevels, setVoltageLevels] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoltageLevels, setSelectedVoltageLevels] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<SubstationStatus[]>([]);

  // UI states
  const [showVoltageDropdown, setShowVoltageDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSubstation, setEditingSubstation] = useState<Substation | null>(null);

  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [substations, searchTerm, selectedVoltageLevels, selectedRegions, selectedStatuses]);

  // Click outside handler for export dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [substationsData, voltageLevelsData, regionsData] = await Promise.all([
        fetchSubstations(),
        getVoltageLevels(),
        getRegions()
      ]);
      setSubstations(substationsData);
      setVoltageLevels(voltageLevelsData);
      setRegions(regionsData);
    } catch (err) {
      console.error('Error loading SCADA data:', err);
      setError('Failed to load substation data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...substations];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        s => s.code.toLowerCase().includes(term) || s.name.toLowerCase().includes(term)
      );
    }

    // Voltage level filter
    if (selectedVoltageLevels.length > 0) {
      filtered = filtered.filter(s => selectedVoltageLevels.includes(s.voltage_level));
    }

    // Region filter
    if (selectedRegions.length > 0) {
      filtered = filtered.filter(s => selectedRegions.includes(s.region));
    }

    // Status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(s => selectedStatuses.includes(s.status));
    }

    setFilteredSubstations(filtered);
  };

  const handleCreate = () => {
    setEditingSubstation(null);
    setShowFormModal(true);
  };

  const handleEdit = (substation: Substation) => {
    setEditingSubstation(substation);
    setShowFormModal(true);
  };

  const handleDelete = async (substation: Substation) => {
    try {
      // Check dependencies
      const deps = await checkSubstationDependencies(substation.id);
      
      if (deps.hasMeters || deps.hasEvents) {
        alert(
          `Cannot delete substation "${substation.name}":\n\n` +
          `- Linked Meters: ${deps.meterCount}\n` +
          `- Linked Events: ${deps.eventCount}\n\n` +
          `Please remove these dependencies first.`
        );
        return;
      }

      if (!confirm(`Are you sure you want to delete substation "${substation.name}" (${substation.code})?`)) {
        return;
      }

      await deleteSubstation(substation.id);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting substation:', err);
      alert(err.message || 'Failed to delete substation');
    }
  };

  const handleFormSuccess = () => {
    setShowFormModal(false);
    setEditingSubstation(null);
    loadData();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedVoltageLevels([]);
    setSelectedRegions([]);
    setSelectedStatuses([]);
  };

  const handleExportExcel = () => {
    const data = filteredSubstations.map(s => ({
      'S/S Code': s.code,
      'Substation Name': s.name,
      'Voltage Level': s.voltage_level,
      'Latitude': s.latitude,
      'Longitude': s.longitude,
      'Region': s.region,
      'Status': s.status,
      'Last Updated By': s.updated_by_profile?.full_name || '-',
      'Last Updated': new Date(s.updated_at).toLocaleString()
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Substations');

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // S/S Code
      { wch: 30 }, // Substation Name
      { wch: 15 }, // Voltage Level
      { wch: 12 }, // Latitude
      { wch: 12 }, // Longitude
      { wch: 20 }, // Region
      { wch: 15 }, // Status
      { wch: 25 }, // Last Updated By
      { wch: 20 }  // Last Updated
    ];

    XLSX.writeFile(wb, `SCADA_Substations_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportDropdown(false);
  };

  const handleExportCSV = () => {
    const headers = [
      'S/S Code', 'Substation Name', 'Voltage Level', 'Latitude', 'Longitude',
      'Region', 'Status', 'Last Updated By', 'Last Updated'
    ];

    const rows = filteredSubstations.map(s => [
      s.code,
      s.name,
      s.voltage_level,
      s.latitude,
      s.longitude,
      s.region,
      s.status,
      s.updated_by_profile?.full_name || '-',
      new Date(s.updated_at).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SCADA_Substations_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setShowExportDropdown(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text('SCADA Substation Master Data', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Total Records: ${filteredSubstations.length}`, 14, 28);

    const tableData = filteredSubstations.map(s => [
      s.code,
      s.name,
      s.voltage_level,
      `${s.latitude.toFixed(4)}`,
      `${s.longitude.toFixed(4)}`,
      s.region,
      s.status,
      s.updated_by_profile?.full_name || '-',
      new Date(s.updated_at).toLocaleDateString()
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Code', 'Name', 'Voltage', 'Lat', 'Long', 'Region', 'Status', 'Updated By', 'Updated']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 50 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 30 },
        6: { cellWidth: 25 },
        7: { cellWidth: 35 },
        8: { cellWidth: 25 }
      }
    });

    doc.save(`SCADA_Substations_${new Date().toISOString().split('T')[0]}.pdf`);
    setShowExportDropdown(false);
  };

  const getStatusBadgeClass = (status: SubstationStatus): string => {
    switch (status) {
      case 'operational':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'maintenance':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'offline':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const activeFilterCount = 
    (searchTerm ? 1 : 0) +
    (selectedVoltageLevels.length > 0 ? 1 : 0) +
    (selectedRegions.length > 0 ? 1 : 0) +
    (selectedStatuses.length > 0 ? 1 : 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading SCADA data...</p>
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
                <h1 className="text-2xl font-bold text-gray-900">SCADA</h1>
                <p className="text-slate-600 mt-1">Substation Master Data Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Substation
              </button>
              <div className="relative" ref={exportDropdownRef}>
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Export Data"
                >
                  <Download className="w-5 h-5" />
                </button>
                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                    <button
                      onClick={handleExportExcel}
                      className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export to Excel
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export to CSV
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export to PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  <div className="absolute z-20 mt-1 w-64 bg-white border border-slate-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
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

              {/* Status Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                >
                  <FilterIcon className="w-4 h-4" />
                  Status
                  {selectedStatuses.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {selectedStatuses.length}
                    </span>
                  )}
                </button>
                {showStatusDropdown && (
                  <div className="absolute z-20 mt-1 w-48 bg-white border border-slate-300 rounded-lg shadow-lg">
                    <div className="p-2">
                      {(['operational', 'maintenance', 'offline'] as SubstationStatus[]).map(status => (
                        <label key={status} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedStatuses.includes(status)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStatuses([...selectedStatuses, status]);
                              } else {
                                setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                              }
                            }}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm capitalize">{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
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
              Showing {filteredSubstations.length} of {substations.length} substations
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    S/S Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Substation Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Voltage Level
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Latitude
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Longitude
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Last Updated By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredSubstations.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      No substations found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredSubstations.map((substation) => (
                    <tr key={substation.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {substation.code}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {substation.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {substation.voltage_level}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                        {substation.latitude.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                        {substation.longitude.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {substation.region}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusBadgeClass(substation.status)}`}>
                          {substation.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {substation.updated_by_profile?.full_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(substation.updated_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(substation)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(substation)}
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
        </div>
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <SubstationFormModal
          substation={editingSubstation}
          onClose={() => {
            setShowFormModal(false);
            setEditingSubstation(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
