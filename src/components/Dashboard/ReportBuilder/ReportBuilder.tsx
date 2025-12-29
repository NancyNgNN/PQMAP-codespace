import { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Save, 
  RefreshCw,
  Share2,
  Plus,
  Filter,
  Calculator,
  X
} from 'lucide-react';
import { PQEvent, Substation } from '../../../types/database';
import { 
  ReportConfig, 
  DateFilterPreset, 
  CalculatedField,
  SavedReport,
  ReportFilter 
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
import DateFilterPanel from './DateFilterPanel';
import CalculatedFieldEditor from './CalculatedFieldEditor';
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
  
  // Calculated fields
  const [calculatedFields, setCalculatedFields] = useState<CalculatedField[]>([]);
  const [showCalculatedFieldEditor, setShowCalculatedFieldEditor] = useState(false);
  
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
      filtered = filtered.filter(e => e.is_valid !== false);
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

  // Prepare data with calculated fields
  const pivotData = useMemo(() => {
    return filteredEvents.map(event => {
      const substation = substations.find(s => s.id === event.substation_id);
      const baseData: any = {
        'Event ID': event.id,
        'Timestamp': new Date(event.timestamp).toLocaleString(),
        'Date': new Date(event.timestamp).toLocaleDateString(),
        'Time': new Date(event.timestamp).toLocaleTimeString(),
        'Year': new Date(event.timestamp).getFullYear(),
        'Month': new Date(event.timestamp).toLocaleString('default', { month: 'long' }),
        'Day': new Date(event.timestamp).getDate(),
        'Weekday': new Date(event.timestamp).toLocaleString('default', { weekday: 'long' }),
        'Hour': new Date(event.timestamp).getHours(),
        'Quarter': `Q${Math.floor(new Date(event.timestamp).getMonth() / 3) + 1}`,
        'Substation': substation?.name || 'Unknown',
        'Region': substation?.region || 'Unknown',
        'Feeder': event.feeder_id || 'N/A',
        'Event Type': event.event_type,
        'Severity': event.severity,
        'Duration (ms)': event.duration_ms || 0,
        'Duration (s)': (event.duration_ms || 0) / 1000,
        'Voltage Dip (%)': event.voltage_dip_percent || 0,
        'Affected Customers': event.affected_customers || 0,
        'Root Cause': event.root_cause || 'Unknown',
        'Status': event.status,
        'Weather': event.weather_condition || 'Unknown',
        'Is Valid': event.is_valid ? 'Yes' : 'No',
      };

      // Add calculated fields
      calculatedFields.forEach(field => {
        try {
          // Simple expression evaluation (you can enhance this with a proper parser)
          const value = evaluateExpression(field.expression, baseData);
          baseData[field.name] = value;
        } catch (error) {
          console.error(`Error calculating field ${field.name}:`, error);
          baseData[field.name] = null;
        }
      });

      return baseData;
    });
  }, [filteredEvents, substations, calculatedFields]);

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

  useEffect(() => {
    loadSavedReports();
  }, [user]);

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
      .or(`user_id.eq.${user.id},shared_with.cs.{${user.id}}`)
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
        user_id: user.id,
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    console.log('[ReportBuilder] Refreshing data...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(pivotData);
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
    
    if (pivotData.length > 0) {
      autoTable(doc, {
        head: [Object.keys(pivotData[0])],
        body: pivotData.slice(0, 100).map(row => Object.values(row)),
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
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          {/* Date Filter */}
          <div className="col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Filter className="w-4 h-4 inline mr-1" />
              Date Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterPreset)}
              className="w-full text-sm border-slate-300 rounded px-3 py-2"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="last_quarter">Last Quarter</option>
              <option value="this_year">This Year</option>
              <option value="last_year">Last Year</option>
              <option value="last_3_years">Last 3 Years</option>
              <option value="custom">Custom Range...</option>
            </select>
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

          {/* Event Type Filter */}
          <div className="col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Types</label>
            <select
              multiple
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(Array.from(e.target.selectedOptions, option => option.value))}
              className="w-full text-sm border-slate-300 rounded px-3 py-2"
              size={3}
            >
              {eventTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
            <select
              multiple
              value={severityFilter}
              onChange={(e) => setSeverityFilter(Array.from(e.target.selectedOptions, option => option.value))}
              className="w-full text-sm border-slate-300 rounded px-3 py-2"
              size={3}
            >
              {severityLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          {/* Include False Events */}
          <div className="col-span-2">
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

        {/* Calculated Fields & Saved Reports Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCalculatedFieldEditor(true)}
              className="px-3 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Calculated Fields ({calculatedFields.length})
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
      </div>

      {/* Pivot Table */}
      <div className="overflow-auto">
        <PivotTableUI
          data={pivotData}
          onChange={s => setPivotState(s)}
          renderers={Object.assign({}, TableRenderers, PlotlyRenderers)}
          {...pivotState}
        />
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">How to use:</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Use date range and filters to narrow down your data</li>
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
          availableFields={Object.keys(pivotData[0] || {})}
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
