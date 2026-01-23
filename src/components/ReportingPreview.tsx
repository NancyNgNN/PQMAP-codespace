import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDown, ArrowUp, ArrowUpDown, Clock, Download, FileText, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { getVoltageProfiles } from '../services/meterReadingsService';
import type { PQMeter, Substation, VoltageProfile } from '../types/database';
import { calculateAvailabilityPercent, getExpectedCount, getTimeRangeDates, TimeRangePreset } from '../utils/availability';

export default function ReportingPreview() {
  const [meters, setMeters] = useState<PQMeter[]>([]);
  const [substations, setSubstations] = useState<Substation[]>([]);
  const [profiles, setProfiles] = useState<VoltageProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingReadings, setLoadingReadings] = useState(false);

  const [timeRange, setTimeRange] = useState<TimeRangePreset>('24h');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [reportFilters, setReportFilters] = useState({
    substations: [] as string[],
    status: 'all',
    searchText: ''
  });

  const [showSubstationDropdown, setShowSubstationDropdown] = useState(false);
  const [sortField, setSortField] = useState<string>('site_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [readingCounts, setReadingCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadBaseData();
    loadProfiles();
  }, []);

  useEffect(() => {
    if (meters.length > 0) {
      loadReadingCounts();
    }
  }, [meters, timeRange, customStartDate, customEndDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportDropdown && !target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
      if (showSubstationDropdown && !target.closest('.substation-dropdown-container')) {
        setShowSubstationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown, showSubstationDropdown]);

  const loadBaseData = async () => {
    try {
      const [metersRes, substationsRes] = await Promise.all([
        supabase.from('pq_meters').select('*'),
        supabase.from('substations').select('*')
      ]);

      if (!metersRes.error) setMeters(metersRes.data || []);
      if (!substationsRes.error) setSubstations(substationsRes.data || []);
    } catch (error) {
      console.error('Error loading base data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const data = await getVoltageProfiles();
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading voltage profiles:', error);
      setProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const loadReadingCounts = async () => {
    const { startDate, endDate } = getTimeRangeDates(timeRange, customStartDate, customEndDate);
    setLoadingReadings(true);

    try {
      const { data, error } = await supabase
        .from('meter_voltage_readings')
        .select('meter_id, timestamp')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (error) {
        throw error;
      }

      const counts: Record<string, number> = {};
      (data || []).forEach((row) => {
        const meterId = row.meter_id as string;
        counts[meterId] = (counts[meterId] || 0) + 1;
      });

      setReadingCounts(counts);
    } catch (error) {
      console.error('Error loading meter readings:', error);
      setReadingCounts({});
    } finally {
      setLoadingReadings(false);
    }
  };

  const substationMap = useMemo(() => {
    return substations.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {} as Record<string, Substation>);
  }, [substations]);

  const hoursDiff = useMemo(() => {
    const { startDate, endDate } = getTimeRangeDates(timeRange, customStartDate, customEndDate);
    return getExpectedCount(startDate, endDate);
  }, [timeRange, customStartDate, customEndDate]);

  const availabilityData = useMemo(() => {
    return meters.map((meter) => {
      const count = readingCounts[meter.id] || 0;
      const expectedCount = hoursDiff;
      const availability = calculateAvailabilityPercent(count, expectedCount);

      return {
        ...meter,
        communicationCount: count,
        expectedCount,
        availability: Math.round(availability * 100) / 100
      };
    });
  }, [meters, readingCounts, hoursDiff]);

  const filteredData = useMemo(() => {
    return availabilityData.filter((meter) => {
      if (reportFilters.substations.length > 0 && !reportFilters.substations.includes(meter.substation_id)) {
        return false;
      }

      if (reportFilters.status !== 'all' && meter.status !== reportFilters.status) {
        return false;
      }

      if (reportFilters.searchText) {
        const searchLower = reportFilters.searchText.toLowerCase();
        const matchesSiteId = meter.site_id?.toLowerCase().includes(searchLower);
        const matchesMeterId = meter.meter_id?.toLowerCase().includes(searchLower);
        if (!matchesSiteId && !matchesMeterId) return false;
      }

      return true;
    });
  }, [availabilityData, reportFilters]);

  const sortedData = useMemo(() => {
    const data = [...filteredData];

    data.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
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
          aVal = (a as any)[sortField] || '';
          bVal = (b as any)[sortField] || '';
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [filteredData, sortField, sortDirection, substationMap]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalActiveMeters = filteredData.filter(m => m.availability >= 90).length;
  const totalAvailability = filteredData.length > 0
    ? Math.round((filteredData.reduce((sum, m) => sum + m.availability, 0) / filteredData.length) * 100) / 100
    : 0;

  const reportActiveFilterCount =
    reportFilters.substations.length +
    (reportFilters.status !== 'all' ? 1 : 0) +
    (reportFilters.searchText ? 1 : 0);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleClearReportFilters = () => {
    setReportFilters({
      substations: [],
      status: 'all',
      searchText: ''
    });
    setCurrentPage(1);
  };

  const handleExport = async (format: 'excel' | 'csv') => {
    setIsExporting(true);
    setShowExportDropdown(false);

    try {
      const exportData = sortedData.map((meter) => ({
        'Site ID': meter.site_id || '-',
        'Meter ID': meter.meter_id,
        'Substation': substationMap[meter.substation_id]?.name || 'Unknown',
        'Substation Code': substationMap[meter.substation_id]?.code || '-',
        'Status': meter.status,
        'Count': meter.communicationCount,
        'Expected': meter.expectedCount,
        'Availability (%)': meter.availability.toFixed(2)
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 12 },
        { wch: 15 },
        { wch: 25 },
        { wch: 15 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 16 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Meter Communication');

      const fileName = `Meter_Communication_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;

      if (format === 'excel') {
        XLSX.writeFile(wb, fileName);
      } else {
        XLSX.writeFile(wb, fileName, { bookType: 'csv' });
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export as ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-8 h-8 text-slate-700" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reporting (Preview)</h1>
          <p className="text-slate-600 mt-1">Early access reporting features for phased testing</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-3 rounded-xl">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Meter Communication</h2>
              <p className="text-sm text-slate-600 mt-1">Availability reporting based on meter communication data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative export-dropdown-container">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={isExporting}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
                title="Export Meter Communication"
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
          </div>
        </div>

        {/* Time Range Configuration */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-semibold text-slate-700">Time Range:</span>
            </div>
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

            {timeRange === 'custom' && (
              <div className="flex items-center gap-2 ml-2">
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
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-4 mt-4">
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
              <p className="text-2xl font-bold text-slate-900">{filteredData.length}</p>
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
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 mt-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1">
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

              <div className="relative substation-dropdown-container">
                <button
                  onClick={() => setShowSubstationDropdown(!showSubstationDropdown)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50 flex items-center gap-2"
                  title="Filter by Substation"
                >
                  Substations ({reportFilters.substations.length})
                </button>
                {showSubstationDropdown && (
                  <div className="absolute z-20 mt-2 w-64 bg-white border border-slate-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    <div className="p-2 border-b border-slate-200 flex gap-2">
                      <button
                        onClick={() => setReportFilters({ ...reportFilters, substations: substations.map(s => s.id) })}
                        className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setReportFilters({ ...reportFilters, substations: [] })}
                        className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="p-2">
                      {substations.map(sub => (
                        <label key={sub.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0">
                          <input
                            type="checkbox"
                            checked={reportFilters.substations.includes(sub.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setReportFilters({ ...reportFilters, substations: [...reportFilters.substations, sub.id] });
                              } else {
                                setReportFilters({ ...reportFilters, substations: reportFilters.substations.filter(id => id !== sub.id) });
                              }
                            }}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm font-medium text-slate-700">{sub.code} - {sub.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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
        <div className="mt-4">
          {loading || loadingReadings ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white border-b-2 border-slate-300 z-10">
                  <tr>
                    <th className="py-3 px-4 text-left">
                      <button
                        onClick={() => handleSort('site_id')}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-blue-600"
                      >
                        Site ID
                        {sortField === 'site_id'
                          ? sortDirection === 'asc'
                            ? <ArrowUp className="w-3 h-3" />
                            : <ArrowDown className="w-3 h-3" />
                          : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-left">
                      <button
                        onClick={() => handleSort('meter_id')}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-blue-600"
                      >
                        Meter ID
                        {sortField === 'meter_id'
                          ? sortDirection === 'asc'
                            ? <ArrowUp className="w-3 h-3" />
                            : <ArrowDown className="w-3 h-3" />
                          : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-left">
                      <button
                        onClick={() => handleSort('substation')}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-blue-600"
                      >
                        Substation
                        {sortField === 'substation'
                          ? sortDirection === 'asc'
                            ? <ArrowUp className="w-3 h-3" />
                            : <ArrowDown className="w-3 h-3" />
                          : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-left">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-blue-600"
                      >
                        Status
                        {sortField === 'status'
                          ? sortDirection === 'asc'
                            ? <ArrowUp className="w-3 h-3" />
                            : <ArrowDown className="w-3 h-3" />
                          : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleSort('count')}
                        className="flex items-center justify-end gap-1 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-blue-600 ml-auto"
                      >
                        Count
                        {sortField === 'count'
                          ? sortDirection === 'asc'
                            ? <ArrowUp className="w-3 h-3" />
                            : <ArrowDown className="w-3 h-3" />
                          : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Expected
                    </th>
                    <th className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleSort('availability')}
                        className="flex items-center justify-end gap-1 text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-blue-600 ml-auto"
                      >
                        Availability
                        {sortField === 'availability'
                          ? sortDirection === 'asc'
                            ? <ArrowUp className="w-3 h-3" />
                            : <ArrowDown className="w-3 h-3" />
                          : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((meter) => (
                      <tr key={meter.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-slate-900">{meter.site_id || '-'}</td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">{meter.meter_id}</td>
                        <td className="py-3 px-4 text-sm text-slate-700">{substationMap[meter.substation_id]?.name || 'Unknown'}</td>
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
                        <td className="py-3 px-4 text-sm text-slate-900 text-right font-semibold">{meter.communicationCount}</td>
                        <td className="py-3 px-4 text-sm text-slate-600 text-right">{meter.expectedCount}</td>
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
                          <Activity className="w-12 h-12 text-slate-300" />
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
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length} meters
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowDown className="w-5 h-5 rotate-90" />
                </button>
                <span className="px-4 py-2 bg-slate-100 rounded-lg font-semibold text-slate-900">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowDown className="w-5 h-5 -rotate-90" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Voltage Profiles</h2>
            <p className="text-sm text-slate-600 mt-1">Read-only profiles for voltage/current viewing</p>
          </div>
        </div>

        {loadingProfiles ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : profiles.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Profile Name</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Type</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Value</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Voltage Level</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Parameters</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Meters</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Updated</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm font-semibold text-slate-900">{profile.profile_name}</td>
                    <td className="py-3 px-4 text-sm text-slate-700 capitalize">{profile.data_type}</td>
                    <td className="py-3 px-4 text-sm text-slate-700 capitalize">{profile.value_type}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{profile.voltage_level || 'All'}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {profile.parameters?.length ? profile.parameters.join(', ') : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {profile.selected_meters?.length ?? 0}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {new Date(profile.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No profiles found</p>
            <p className="text-sm text-slate-500 mt-1">Profiles will appear after server-side ingestion or setup</p>
          </div>
        )}
      </div>
    </div>
  );
}