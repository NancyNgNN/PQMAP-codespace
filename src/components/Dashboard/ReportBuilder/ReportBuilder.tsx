import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Save, 
  RefreshCw,
  Share2,
  Filter,
  Calculator,
  X,
  ChevronDown,
  ChevronUp,
  Group
} from 'lucide-react';
import { PQEvent, Substation } from '../../../types/database';
import { 
  ReportConfig, 
  DateFilterPreset, 
  CalculatedField,
  SavedReport,
  GroupedField
} from '../../../types/report';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import 'react-pivottable/pivottable.css';
import TableRenderers from 'react-pivottable/TableRenderers';
import Plot from 'react-plotly.js';
import createPlotlyRenderers from 'react-pivottable/PlotlyRenderers';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CalculatedFieldEditor from './CalculatedFieldEditor';
import GroupingEditor from './GroupingEditor';
import ShareReportModal from './ShareReportModal';

const PlotlyRenderers = createPlotlyRenderers(Plot);

interface ReportBuilderProps {
  events: PQEvent[];
  substations: Substation[];
}

export default function ReportBuilder({ events, substations }: ReportBuilderProps) {
  const { user } = useAuth();
  const [pivotState, setPivotState] = useState<any>({});
  const [reportName, setReportName] = useState('Untitled Report');
  const [description, setDescription] = useState('');
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(15);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Date filter
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>('last_3_years');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  
  // Filters
  const [includeFalseEvents, setIncludeFalseEvents] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState<string[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  
  // Dropdown states
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);
  const [showSeverityDropdown, setShowSeverityDropdown] = useState(false);
  
  // Collapse state
  const [criteriaCollapsed, setCriteriaCollapsed] = useState(false);
  const [fieldsCollapsed, setFieldsCollapsed] = useState(false);
  
  // Manual refresh - separate display data from table data
  const [displayData, setDisplayData] = useState<any[]>([]);
  
  // Calculated fields
  const [calculatedFields, setCalculatedFields] = useState<CalculatedField[]>([]);
  const [showCalculatedFieldEditor, setShowCalculatedFieldEditor] = useState(false);
  
  // Grouped fields
  const [groupedFields, setGroupedFields] = useState<GroupedField[]>([]);
  const [showGroupingEditor, setShowGroupingEditor] = useState(false);
  
  // Share modal
  const [showShareModal, setShowShareModal] = useState(false);

  // Filter events based on criteria
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Date filter
    const now = new Date();
    let startDate: Date | null = null;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'yesterday':
        startDate = new Date(now.setDate(now.getDate() - 1));
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last_7_days':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'last_30_days':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        filtered = filtered.filter(e => {
          const eventDate = new Date(e.timestamp);
          return eventDate >= startDate! && eventDate <= endLastMonth;
        });
        startDate = null; // Already filtered
        break;
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'last_quarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        const year = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const q = lastQuarter < 0 ? 3 : lastQuarter;
        startDate = new Date(year, q * 3, 1);
        const endLastQuarter = new Date(year, (q + 1) * 3, 0);
        filtered = filtered.filter(e => {
          const eventDate = new Date(e.timestamp);
          return eventDate >= startDate! && eventDate <= endLastQuarter;
        });
        startDate = null;
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        const endLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        filtered = filtered.filter(e => {
          const eventDate = new Date(e.timestamp);
          return eventDate >= startDate! && eventDate <= endLastYear;
        });
        startDate = null;
        break;
      case 'last_3_years':
        startDate = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
        break;
      case 'custom':
        if (customDateStart && customDateEnd) {
          startDate = new Date(customDateStart);
          const endDate = new Date(customDateEnd);
          filtered = filtered.filter(e => {
            const eventDate = new Date(e.timestamp);
            return eventDate >= startDate! && eventDate <= endDate;
          });
          startDate = null;
        }
        break;
    }

    if (startDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= startDate!);
    }

    // False events filter
    if (!includeFalseEvents) {
      filtered = filtered.filter(e => e.false_event !== true);
    }

    // Event type filter
    if (eventTypeFilter.length > 0) {
      filtered = filtered.filter(e => eventTypeFilter.includes(e.event_type));
    }

    // Severity filter
    if (severityFilter.length > 0) {
      filtered = filtered.filter(e => severityFilter.includes(e.severity));
    }

    return filtered;
  }, [events, dateFilter, customDateStart, customDateEnd, includeFalseEvents, eventTypeFilter, severityFilter]);

  const evaluateExpression = (expression: string, data: any): any => {
    try {
      // Replace field names in expression with values
      let evaluableExpr = expression;
      Object.keys(data).forEach(key => {
        const regex = new RegExp(`\\[${key}\\]`, 'g');
        evaluableExpr = evaluableExpr.replace(regex, String(data[key]));
      });
      
      // Evaluate (use with caution in production - consider a safer parser)
      return eval(evaluableExpr);
    } catch (error) {
      return null;
    }
  };

  const applyGrouping = (value: any, groupedField: GroupedField): string => {
    const { grouping } = groupedField;
    console.log(`[Grouping] Applying ${grouping.type} grouping to value:`, value);

    if (grouping.type === 'time') {
      // Time grouping
      const date = new Date(value);
      if (isNaN(date.getTime())) return 'Invalid Date';

      const { interval, unit } = grouping;
      
      if (unit === 'days') {
        const startOfPeriod = new Date(date);
        startOfPeriod.setHours(0, 0, 0, 0);
        const daysSinceEpoch = Math.floor(startOfPeriod.getTime() / (1000 * 60 * 60 * 24));
        const periodNumber = Math.floor(daysSinceEpoch / interval);
        const periodStart = new Date(periodNumber * interval * 24 * 60 * 60 * 1000);
        const periodEnd = new Date((periodNumber + 1) * interval * 24 * 60 * 60 * 1000 - 1);
        return `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;
      } else if (unit === 'weeks') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const weekNumber = Math.floor(startOfWeek.getTime() / (1000 * 60 * 60 * 24 * 7 * interval));
        const periodStart = new Date(weekNumber * interval * 7 * 24 * 60 * 60 * 1000);
        const periodEnd = new Date((weekNumber + 1) * interval * 7 * 24 * 60 * 60 * 1000 - 1);
        return `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;
      } else if (unit === 'months') {
        const periodNumber = Math.floor((date.getFullYear() * 12 + date.getMonth()) / interval);
        const startYear = Math.floor(periodNumber * interval / 12);
        const startMonth = (periodNumber * interval) % 12;
        if (interval === 1) {
          return new Date(startYear, startMonth).toLocaleString('default', { year: 'numeric', month: 'long' });
        } else {
          const endMonth = (startMonth + interval - 1) % 12;
          const endYear = startYear + Math.floor((startMonth + interval - 1) / 12);
          return `${new Date(startYear, startMonth).toLocaleString('default', { month: 'short', year: 'numeric' })} - ${new Date(endYear, endMonth).toLocaleString('default', { month: 'short', year: 'numeric' })}`;
        }
      } else if (unit === 'quarters') {
        const quarter = Math.floor(date.getMonth() / 3);
        const periodNumber = Math.floor((date.getFullYear() * 4 + quarter) / interval);
        const startYear = Math.floor(periodNumber * interval / 4);
        const startQuarter = (periodNumber * interval) % 4;
        if (interval === 1) {
          return `Q${startQuarter + 1} ${startYear}`;
        } else {
          const endQuarter = (startQuarter + interval - 1) % 4;
          const endYear = startYear + Math.floor((startQuarter + interval - 1) / 4);
          return `Q${startQuarter + 1} ${startYear} - Q${endQuarter + 1} ${endYear}`;
        }
      } else if (unit === 'years') {
        const periodNumber = Math.floor(date.getFullYear() / interval);
        const startYear = periodNumber * interval;
        if (interval === 1) {
          return startYear.toString();
        } else {
          return `${startYear} - ${startYear + interval - 1}`;
        }
      }
    } else if (grouping.type === 'numeric') {
      // Numeric range grouping
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return 'Invalid Number';

      for (const range of grouping.ranges) {
        if (numValue >= range.min && numValue < range.max) {
          return range.label;
        }
      }
      return 'Out of Range';
    } else if (grouping.type === 'categorical') {
      // Categorical grouping
      const strValue = String(value);
      for (const group of grouping.groups) {
        if (group.values.includes(strValue)) {
          return group.label;
        }
      }
      return 'Ungrouped';
    }

    return String(value);
  };

  useEffect(() => {
    loadSavedReports();
  }, [user]);
  
  // Initialize display data on first load
  useEffect(() => {
    handleRefresh();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowDateDropdown(false);
        setShowEventTypeDropdown(false);
        setShowSeverityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        handleRefresh();
      }, refreshInterval * 60 * 1000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const loadSavedReports = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('saved_reports')
      .select('*')
      .or(`created_by.eq.${user.id},shared_with.cs.{${user.id}}`)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setSavedReports(data as SavedReport[]);
    }
  };

  const handleSaveReport = async () => {
    if (!user) {
      alert('Please sign in to save reports');
      return;
    }

    const reportConfig: ReportConfig = {
      id: selectedReport || crypto.randomUUID(),
      name: reportName,
      description,
      dateFilter,
      customDateRange: dateFilter === 'custom' ? {
        start: customDateStart,
        end: customDateEnd,
      } : undefined,
      filters: [],
      rows: pivotState.rows || [],
      cols: pivotState.cols || [],
      vals: pivotState.vals || [],
      aggregatorName: pivotState.aggregatorName || 'Count',
      rendererName: pivotState.rendererName || 'Table',
      calculatedFields,
      groupedFields,
      includeFalseEvents,
      refreshInterval: autoRefresh ? refreshInterval : undefined,
      createdBy: user.id,
      createdAt: selectedReport ? savedReports.find(r => r.id === selectedReport)?.created_at || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('saved_reports')
      .upsert({
        id: reportConfig.id,
        created_by: user.id,
        name: reportName,
        description,
        config: reportConfig,
        is_public: false,
        shared_with: selectedReport ? savedReports.find(r => r.id === selectedReport)?.shared_with || [] : [],
      });

    if (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report');
    } else {
      alert('Report saved successfully!');
      loadSavedReports();
      setSelectedReport(reportConfig.id);
    }
  };

  const handleLoadReport = async (reportId: string) => {
    const report = savedReports.find(r => r.id === reportId);
    if (!report) return;

    const config = report.config as ReportConfig;
    setReportName(config.name);
    setDescription(config.description || '');
    setSelectedReport(reportId);
    setDateFilter(config.dateFilter);
    if (config.customDateRange) {
      setCustomDateStart(config.customDateRange.start);
      setCustomDateEnd(config.customDateRange.end);
    }
    setGroupedFields(config.groupedFields || []);
    setCalculatedFields(config.calculatedFields || []);
    setIncludeFalseEvents(config.includeFalseEvents);
    
    setPivotState({
      rows: config.rows,
      cols: config.cols,
      vals: config.vals,
      aggregatorName: config.aggregatorName,
      rendererName: config.rendererName,
    });

    if (config.refreshInterval) {
      setAutoRefresh(true);
      setRefreshInterval(config.refreshInterval);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    console.log('[ReportBuilder] ===== REFRESH STARTED =====');
    console.log('[ReportBuilder] Filtered events count:', filteredEvents.length);
    console.log('[ReportBuilder] Calculated fields:', calculatedFields.length);
    console.log('[ReportBuilder] Grouped fields:', groupedFields.length);
    console.log('[ReportBuilder] Enabled grouped fields:', groupedFields.filter(f => f.enabled).length);
    
    // If no events, create a template row with all field names to show available fields
    if (filteredEvents.length === 0) {
      const templateRow = {
        'Event ID': 'No data',
        'IDR No.': 'No data',
        'Timestamp': 'No data',
        'Date': 'yyyy/mm/dd',
        'Time': 'HH:MI',
        'Year': 0,
        'Month': 'No data',
        'Day': 0,
        'Weekday': 'No data',
        'Hour': 0,
        'Quarter': 'No data',
        'Voltage Level': 'No data',
        'Circuit': 'No data',
        'Faulty Phase': 'No data',
        'Duration (ms)': 0,
        'Duration (s)': 0,
        'VL1(%)': 0,
        'VL2(%)': 0,
        'VL3(%)': 0,
        'Remaining Voltage (%)': 0,
        'Region': 'No data',
        'Weather': 'No data',
        'Equipment Category': 'No data',
        'Equipment': 'No data',
        'Cause Group': 'No data',
        'Cause': 'No data',
        'Faulty Component': 'No data',
        'Remark (Cause / Reason)': 'No data',
        'Minimum': 0,
        'Interference by': 'No data',
        'Object Part Group': 'No data',
        'Object Part Code': 'No data',
        'Damage Group': 'No data',
        'Damage Code': 'No data',
        'Total CMI': 0,
        'Manual Created IDR': 'No',
        'Distribution Fault': 'No',
        'Substation': 'No data',
        'Meter ID': 'No data',
        'Event Type': 'No data',
        'Severity': 'No data',
        'Affected Customers': 0,
        'Root Cause': 'No data',
        'Status': 'No data',
        'Is Valid': 'No data',
      };
      setDisplayData([templateRow]);
      setIsRefreshing(false);
      setLastRefresh(new Date());
      console.log('[ReportBuilder] No events - showing template row with all field names');
      return;
    }
    
    // Update display data from current filtered events
    const newDisplayData = filteredEvents.map(event => {
      const substation = substations.find(s => s.id === event.substation_id);
      const eventDate = new Date(event.timestamp);
      
      // Format date as YYYY/MM/DD
      const formattedDate = `${eventDate.getFullYear()}/${String(eventDate.getMonth() + 1).padStart(2, '0')}/${String(eventDate.getDate()).padStart(2, '0')}`;
      
      // Format time as HH:MI
      const formattedTime = `${String(eventDate.getHours()).padStart(2, '0')}:${String(eventDate.getMinutes()).padStart(2, '0')}`;
      
      // Determine faulty phase from affected_phases array
      const faultyPhase = event.affected_phases && event.affected_phases.length > 0 
        ? event.affected_phases.map((p: string) => `L${p === 'A' ? '1' : p === 'B' ? '2' : '3'}`).join(', ')
        : 'N/A';
      
      const baseData: any = {
        'Event ID': event.id,
        'IDR No.': event.idr_no || 'N/A',
        'Timestamp': eventDate.toLocaleString(),
        'Date': formattedDate,
        'Time': formattedTime,
        'Year': eventDate.getFullYear(),
        'Month': eventDate.toLocaleString('default', { month: 'long' }),
        'Day': eventDate.getDate(),
        'Weekday': eventDate.toLocaleString('default', { weekday: 'long' }),
        'Hour': eventDate.getHours(),
        'Quarter': `Q${Math.floor(eventDate.getMonth() / 3) + 1}`,
        'Voltage Level': event.voltage_level || 'N/A',
        'Circuit': event.circuit_id || 'N/A',
        'Faulty Phase': faultyPhase,
        'Duration (ms)': event.duration_ms || 0,
        'Duration (s)': (event.duration_ms || 0) / 1000,
        'VL1(%)': event.v1 || 0,
        'VL2(%)': event.v2 || 0,
        'VL3(%)': event.v3 || 0,
        'Remaining Voltage (%)': event.remaining_voltage || 0,
        'Region': substation?.region || event.oc || 'Unknown',
        'Weather': event.weather || 'N/A',
        'Equipment Category': event.equipment_type || 'N/A',
        'Equipment': event.equipment_type || 'N/A',
        'Cause Group': event.cause_group || 'Unknown',
        'Cause': event.cause || 'Unknown',
        'Faulty Component': event.object_part_code || 'N/A',
        'Remark (Cause / Reason)': event.remarks || event.description || 'N/A',
        'Minimum': event.remaining_voltage || 0,
        'Interference by': 'N/A', // Not in schema, placeholder
        'Object Part Group': event.object_part_group || 'N/A',
        'Object Part Code': event.object_part_code || 'N/A',
        'Damage Group': event.damage_group || 'N/A',
        'Damage Code': event.damage_code || 'N/A',
        'Total CMI': event.total_cmi || 0,
        'Manual Created IDR': event.idr_no ? 'Yes' : 'No',
        'Distribution Fault': event.outage_type === 'distribution' ? 'Yes' : 'No',
        'Substation': substation?.name || 'Unknown',
        'Meter ID': event.meter_id || 'N/A',
        'Event Type': event.event_type,
        'Severity': event.severity,
        'Affected Customers': event.customer_count || 0,
        'Root Cause': event.cause || event.cause_group || 'Unknown',
        'Status': event.status,
        'Is Valid': !event.false_event ? 'Yes' : 'No',
      };

      // Add calculated fields
      calculatedFields.forEach(field => {
        try {
          const value = evaluateExpression(field.expression, baseData);
          baseData[field.name] = value;
        } catch (error) {
          console.error(`Error calculating field ${field.name}:`, error);
          baseData[field.name] = null;
        }
      });

      // Add grouped fields (only enabled ones)
      groupedFields.filter(f => f.enabled).forEach(field => {
        try {
          const sourceValue = baseData[field.grouping.sourceField];
          if (sourceValue === undefined) {
            console.warn(`[Grouping] Source field '${field.grouping.sourceField}' not found in baseData. Available fields:`, Object.keys(baseData));
          }
          const groupedValue = applyGrouping(sourceValue, field);
          baseData[field.name] = groupedValue;
        } catch (error) {
          console.error(`[Grouping] Error grouping field ${field.name}:`, error);
          baseData[field.name] = null;
        }
      });

      return baseData;
    });
    
    setDisplayData(newDisplayData);
    console.log('[ReportBuilder] Display data updated:', newDisplayData.length);
    if (newDisplayData.length > 0) {
      console.log('[ReportBuilder] Sample row fields:', Object.keys(newDisplayData[0]));
      console.log('[ReportBuilder] Sample row data:', newDisplayData[0]);
    }
    console.log('[ReportBuilder] ===== REFRESH COMPLETE =====');
    await new Promise(resolve => setTimeout(resolve, 500));
    setLastRefresh(new Date());
    setIsRefreshing(false);
  }, [filteredEvents, substations, calculatedFields, groupedFields]);

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(displayData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${reportName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(reportName, 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Events: ${filteredEvents.length}`, 14, 36);
    doc.text(`Date Range: ${dateFilter}`, 14, 42);
    
    if (description) {
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(description, 180);
      doc.text(splitText, 14, 50);
    }

    const startY = description ? 60 : 50;
    
    if (displayData.length > 0) {
      autoTable(doc, {
        head: [Object.keys(displayData[0])],
        body: displayData.slice(0, 100).map(row => Object.values(row)),
        startY,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    doc.save(`${reportName}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const eventTypes = Array.from(new Set(events.map(e => e.event_type)));
  const severityLevels = Array.from(new Set(events.map(e => e.severity)));

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            <div className="flex-1">
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="text-xl font-bold text-slate-900 border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description..."
                className="block text-sm text-slate-600 mt-1 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Refresh Controls */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1 hover:bg-slate-200 rounded disabled:opacity-50"
                title="Refresh now"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto
              </label>
              
              {autoRefresh && (
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="text-sm border-slate-300 rounded px-2 py-1"
                >
                  <option value={1}>1 min</option>
                  <option value={5}>5 min</option>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>1 hour</option>
                </select>
              )}
              
              <span className="text-xs text-slate-500">
                {lastRefresh.toLocaleTimeString()}
              </span>
            </div>

            {/* Export */}
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              title="Export to Excel"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>

            <button
              onClick={handleExportPDF}
              className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              title="Export to PDF"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>

            {/* Share */}
            {selectedReport && (
              <button
                onClick={() => setShowShareModal(true)}
                className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            )}

            {/* Save */}
            <button
              onClick={handleSaveReport}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            
            {/* Separator */}
            <div className="h-8 w-px bg-slate-300"></div>
            
            {/* Collapse/Expand Criteria Button */}
            <button
              onClick={() => setCriteriaCollapsed(!criteriaCollapsed)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title={criteriaCollapsed ? "Expand Filters & Criteria" : "Collapse Filters & Criteria"}
            >
              {criteriaCollapsed ? (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              )}
            </button>
            
            {/* Collapse/Expand Fields Button */}
            <button
              onClick={() => setFieldsCollapsed(!fieldsCollapsed)}
              className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
              title={fieldsCollapsed ? "Show Field Selector (Rows/Columns)" : "Hide Field Selector (Rows/Columns)"}
            >
              {fieldsCollapsed ? (
                <ChevronDown className="w-5 h-5 text-purple-600" />
              ) : (
                <ChevronUp className="w-5 h-5 text-purple-600" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Criteria Section */}
        {!criteriaCollapsed && (
          <>
        {/* Filters Row */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          {/* Date Filter - Dropdown with single select (not checkboxes since only one can be selected) */}
          <div className="col-span-3 relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Filter className="w-4 h-4 inline mr-1" />
              Date Range
            </label>
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="w-full text-sm border border-slate-300 rounded px-3 py-2 bg-white hover:bg-slate-50 flex items-center justify-between"
            >
              <span className="text-slate-700">{dateFilter.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            
            {showDateDropdown && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                <div className="p-2">
                  {[
                    { value: 'all', label: 'All Time' },
                    { value: 'today', label: 'Today' },
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'last_7_days', label: 'Last 7 Days' },
                    { value: 'last_30_days', label: 'Last 30 Days' },
                    { value: 'this_month', label: 'This Month' },
                    { value: 'last_month', label: 'Last Month' },
                    { value: 'this_quarter', label: 'This Quarter' },
                    { value: 'last_quarter', label: 'Last Quarter' },
                    { value: 'this_year', label: 'This Year' },
                    { value: 'last_year', label: 'Last Year' },
                    { value: 'last_3_years', label: 'Last 3 Years' },
                    { value: 'custom', label: 'Custom Range...' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setDateFilter(option.value as DateFilterPreset);
                        setShowDateDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded ${
                        dateFilter === option.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Custom Date Range */}
          {dateFilter === 'custom' && (
            <>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customDateStart}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                  className="w-full text-sm border-slate-300 rounded px-3 py-2"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={customDateEnd}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                  className="w-full text-sm border-slate-300 rounded px-3 py-2"
                />
              </div>
            </>
          )}

          {/* Event Type Filter - Dropdown with Checkboxes */}
          <div className={`${dateFilter === 'custom' ? 'col-span-3' : 'col-span-3'} relative`}>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Types</label>
            <button
              onClick={() => setShowEventTypeDropdown(!showEventTypeDropdown)}
              className="w-full text-sm border border-slate-300 rounded px-3 py-2 bg-white hover:bg-slate-50 flex items-center justify-between"
            >
              <span className="text-slate-700 truncate">
                {eventTypeFilter.length === 0 ? 'All Event Types' : 
                 eventTypeFilter.length === eventTypes.length ? 'All Selected' :
                 `${eventTypeFilter.length} selected`}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
            
            {showEventTypeDropdown && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {/* Select All / Clear All */}
                <div className="p-2 border-b border-slate-200 flex gap-2">
                  <button
                    onClick={() => setEventTypeFilter(eventTypes)}
                    className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setEventTypeFilter([])}
                    className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200 font-medium"
                  >
                    Clear All
                  </button>
                </div>
                
                {/* Checkbox Options */}
                <div className="p-2">
                  {eventTypes.map(type => (
                    <label
                      key={type}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={eventTypeFilter.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEventTypeFilter(prev => [...prev, type]);
                          } else {
                            setEventTypeFilter(prev => prev.filter(v => v !== type));
                          }
                        }}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm font-medium text-slate-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Severity Filter - Dropdown with Checkboxes */}
          <div className={`${dateFilter === 'custom' ? 'col-span-2' : 'col-span-2'} relative`}>
            <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
            <button
              onClick={() => setShowSeverityDropdown(!showSeverityDropdown)}
              className="w-full text-sm border border-slate-300 rounded px-3 py-2 bg-white hover:bg-slate-50 flex items-center justify-between"
            >
              <span className="text-slate-700 truncate">
                {severityFilter.length === 0 ? 'All Severities' : 
                 severityFilter.length === severityLevels.length ? 'All Selected' :
                 `${severityFilter.length} selected`}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
            
            {showSeverityDropdown && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {/* Select All / Clear All */}
                <div className="p-2 border-b border-slate-200 flex gap-2">
                  <button
                    onClick={() => setSeverityFilter(severityLevels)}
                    className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSeverityFilter([])}
                    className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200 font-medium"
                  >
                    Clear All
                  </button>
                </div>
                
                {/* Checkbox Options */}
                <div className="p-2">
                  {severityLevels.map(level => (
                    <label
                      key={level}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={severityFilter.includes(level)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSeverityFilter(prev => [...prev, level]);
                          } else {
                            setSeverityFilter(prev => prev.filter(v => v !== level));
                          }
                        }}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm font-medium text-slate-700">{level}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Include False Events */}
          <div className={`${dateFilter === 'custom' ? 'col-span-2' : 'col-span-2'}`}>
            <label className="block text-sm font-medium text-slate-700 mb-1">Options</label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeFalseEvents}
                onChange={(e) => setIncludeFalseEvents(e.target.checked)}
                className="rounded"
              />
              Include false events
            </label>
          </div>
        </div>

        {/* Calculated Fields & Grouped Fields & Saved Reports Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCalculatedFieldEditor(true)}
              className="px-3 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Calculated Fields ({calculatedFields.length})
            </button>
            
            <button
              onClick={() => setShowGroupingEditor(true)}
              className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Group className="w-4 h-4" />
              Grouping ({groupedFields.length})
            </button>

            {calculatedFields.length > 0 && (
              <div className="flex gap-2">
                {calculatedFields.map(field => (
                  <span
                    key={field.id}
                    className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded flex items-center gap-1"
                  >
                    {field.name}
                    <button
                      onClick={() => setCalculatedFields(fields => fields.filter(f => f.id !== field.id))}
                      className="hover:text-amber-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {groupedFields.length > 0 && (
              <div className="flex gap-2">
                {groupedFields.map(field => (
                  <span
                    key={field.id}
                    className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                      field.enabled 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-slate-200 text-slate-500'
                    }`}
                    title={field.enabled ? 'Enabled' : 'Disabled - Click to edit in Grouping Editor'}
                  >
                    {!field.enabled && '⏸ '}
                    {field.name}
                    <button
                      onClick={() => setGroupedFields(fields => fields.filter(f => f.id !== field.id))}
                      className={field.enabled ? 'hover:text-purple-900' : 'hover:text-slate-700'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Saved Reports Dropdown */}
          {savedReports.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Load saved:</span>
              <select
                value={selectedReport || ''}
                onChange={(e) => handleLoadReport(e.target.value)}
                className="text-sm border-slate-300 rounded px-3 py-1"
              >
                <option value="">Select a report...</option>
                {savedReports.map(report => (
                  <option key={report.id} value={report.id}>
                    {report.name} {report.user_id !== user?.id && '(Shared)'} - {new Date(report.updated_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Event Count */}
        <div className="mt-2 text-sm text-slate-600">
          Showing <strong>{filteredEvents.length.toLocaleString()}</strong> events of <strong>{events.length.toLocaleString()}</strong> total
        </div>
        </>
        )}
      </div>

      {/* Pivot Table */}
      <div className="overflow-auto">
        <style>{`
          ${fieldsCollapsed ? `
            .pvtUi .pvtUnused,
            .pvtUi .pvtAxisContainer,
            .pvtUi .pvtVals {
              display: none !important;
            }
            .pvtUi {
              display: flex;
              flex-direction: column;
            }
            .pvtUi > table {
              width: 100% !important;
            }
          ` : ''}
        `}</style>
        <PivotTableUI
          key={`pivot-${displayData.length}-${lastRefresh.getTime()}`}
          data={displayData}
          onChange={(s: any) => setPivotState(s)}
          renderers={Object.assign({}, TableRenderers, PlotlyRenderers)}
          {...pivotState}
        />
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">How to use:</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Use date range and filters to narrow down your data (updates count only)</li>
          <li>Click the refresh button (double-arrow icon) to update the table with filtered data</li>
          <li>Create grouped fields for time intervals, numeric ranges, or categorical groups</li>
          <li>Drag fields from the top into Rows, Columns, or Values</li>
          <li>Select chart type from the dropdown (Table, Bar Chart, Line Chart, etc.)</li>
          <li>Click aggregation functions to change (Count, Sum, Average, etc.)</li>
          <li>Create calculated fields for custom metrics (e.g., downtime cost)</li>
          <li>Save your report configuration for future use</li>
          <li>Share reports with colleagues</li>
          <li>Export to Excel or PDF for distribution</li>
        </ul>
      </div>

      {/* Modals */}
      {showCalculatedFieldEditor && (
        <CalculatedFieldEditor
          fields={calculatedFields}
          onSave={(fields) => {
            setCalculatedFields(fields);
            setShowCalculatedFieldEditor(false);
          }}
          onClose={() => setShowCalculatedFieldEditor(false)}
          availableFields={Object.keys(displayData[0] || {})}
        />
      )}

      {showGroupingEditor && (
        <GroupingEditor
          fields={groupedFields}
          availableFields={Object.keys(displayData[0] || {})}
          onSave={(fields) => {
            setGroupedFields(fields);
            setShowGroupingEditor(false);
            // Refresh to apply new groupings
            setTimeout(() => handleRefresh(), 100);
          }}
          onClose={() => setShowGroupingEditor(false)}
        />
      )}

      {showShareModal && selectedReport && (
        <ShareReportModal
          reportId={selectedReport}
          onClose={() => setShowShareModal(false)}
          onShared={() => {
            loadSavedReports();
            setShowShareModal(false);
          }}
        />
      )}
    </div>
  );
}
