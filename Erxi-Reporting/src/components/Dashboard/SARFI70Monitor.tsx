import { useState, useEffect, useRef } from 'react';
import { Download, TrendingUp } from 'lucide-react';
import { PQEvent, Substation } from '../../types/database';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

interface SARFI70MonitorProps {
  events: PQEvent[];
  substations: Substation[];
}

interface MonthlyData {
  year: number;
  month: number;
  label: string;
  sarfi70Score: number;
  eventCount: number;
}

interface TableEvent {
  sequence: number;
  substationCode: string;
  voltageLevel: string;
  timestamp: string;
  oc: string;
  sarfi70: number;
  eventId: string;
}

type SortColumn = 'sequence' | 'substationCode' | 'voltageLevel' | 'timestamp' | 'oc' | 'sarfi70';
type SortDirection = 'asc' | 'desc';

export default function SARFI70Monitor({ events, substations }: SARFI70MonitorProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyData | null>(null);
  const [tableEvents, setTableEvents] = useState<TableEvent[]>([]);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const chartRef = useRef<HTMLDivElement>(null);

  // Create substations map for quick lookup
  const substationsMap = new Map<string, Substation>();
  substations.forEach(sub => substationsMap.set(sub.id, sub));

  // Calculate monthly SARFI-70 scores for the last 3 years
  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = currentYear - 2; // 3 years: 2023, 2024, 2025

    const monthlyMap = new Map<string, { sarfi70Sum: number; count: number }>();

    // Filter voltage_dip mother events excluding false events
    const validEvents = events.filter(
      e => e.event_type === 'voltage_dip' && 
           e.is_mother_event && 
           !e.false_event
    );

    // Aggregate SARFI-70 by month
    validEvents.forEach(event => {
      const eventDate = new Date(event.timestamp);
      const year = eventDate.getFullYear();
      const month = eventDate.getMonth() + 1; // 1-12

      if (year >= startYear && year <= currentYear) {
        const key = `${year}-${month}`;
        const existing = monthlyMap.get(key) || { sarfi70Sum: 0, count: 0 };
        
        // Sum up SARFI-70 values (treat null as 0)
        const sarfi70Value = event.sarfi_70 || 0;
        monthlyMap.set(key, {
          sarfi70Sum: existing.sarfi70Sum + sarfi70Value,
          count: existing.count + 1
        });
      }
    });

    // Generate complete 3-year monthly data
    const data: MonthlyData[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let year = startYear; year <= currentYear; year++) {
      for (let month = 1; month <= 12; month++) {
        // Don't show future months
        if (year === currentYear && month > now.getMonth() + 1) continue;

        const key = `${year}-${month}`;
        const monthData = monthlyMap.get(key) || { sarfi70Sum: 0, count: 0 };
        
        data.push({
          year,
          month,
          label: `${monthNames[month - 1]} ${year}`,
          sarfi70Score: monthData.sarfi70Sum,
          eventCount: monthData.count
        });
      }
    }

    setMonthlyData(data);
  }, [events]);

  // Handle chart point click
  const handleMonthClick = (monthData: MonthlyData) => {
    setSelectedMonth(monthData);
    setCurrentPage(1); // Reset to first page

    // Get all voltage_dip mother events for the selected month
    const validEvents = events.filter(e => {
      if (e.event_type !== 'voltage_dip') return false;
      if (!e.is_mother_event) return false;
      if (e.false_event) return false;

      const eventDate = new Date(e.timestamp);
      return eventDate.getFullYear() === monthData.year && 
             eventDate.getMonth() + 1 === monthData.month;
    });

    // Convert to table format
    const tableData: TableEvent[] = validEvents.map((event, index) => {
      const substation = substationsMap.get(event.substation_id || '');
      return {
        sequence: index + 1,
        substationCode: substation?.code || 'N/A',
        voltageLevel: event.voltage_level || 'N/A',
        timestamp: event.timestamp,
        oc: event.oc || 'N/A',
        sarfi70: event.sarfi_70 || 0,
        eventId: event.id
      };
    });

    setTableEvents(tableData);
  };

  // Sorting logic
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedEvents = [...tableEvents].sort((a, b) => {
    let aVal: any = a[sortColumn];
    let bVal: any = b[sortColumn];

    // Handle timestamp sorting
    if (sortColumn === 'timestamp') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvents = sortedEvents.slice(startIndex, startIndex + itemsPerPage);

  // Export functionality
  const handleExportChart = async () => {
    if (!chartRef.current) return;
    
    setIsExporting(true);
    setShowExportDropdown(false);

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      const link = document.createElement('a');
      link.download = `SARFI70_Monitor_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export chart');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to Excel with chart image and data table
  const handleExportExcel = async () => {
    if (!chartRef.current || !selectedMonth) return;
    
    setIsExporting(true);
    setShowExportDropdown(false);

    try {
      // Note: Chart image embedding in Excel requires exceljs library
      // For now, exporting data table only. To add image, install exceljs
      // const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2 });
      // const imageData = canvas.toDataURL('image/png');

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Prepare data table
      const tableData = sortedEvents.map(event => ({
        'Sequence': event.sequence,
        'S/S': event.substationCode,
        'Voltage Level': event.voltageLevel,
        'Incident Timestamp': formatTimestamp(event.timestamp),
        'OC': event.oc,
        'SARFI-70': event.sarfi70.toFixed(4)
      }));

      // Create worksheet with header
      const ws = XLSX.utils.aoa_to_sheet([
        ['SARFI-70 KPI Monitoring Report'],
        [`Selected Month: ${selectedMonth.label}`],
        [`Total Events: ${tableEvents.length}`],
        [`Generated: ${new Date().toLocaleString()}`],
        [], // Empty row
        ['Chart Image Below:'],
        [] // Empty row for image space - image will be added later
      ]);

      // Add table data starting from row 8 (after image space)
      XLSX.utils.sheet_add_json(ws, tableData, { origin: 'A20' }); // Leave space for image

      // Set column widths
      ws['!cols'] = [
        { wch: 10 },  // Sequence
        { wch: 15 },  // S/S
        { wch: 15 },  // Voltage Level
        { wch: 20 },  // Incident Timestamp
        { wch: 10 },  // OC
        { wch: 12 }   // SARFI-70
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'SARFI-70 Report');

      // Generate Excel file
      const fileName = `SARFI70_Report_${selectedMonth.year}_${String(selectedMonth.month).padStart(2, '0')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      // Note: Adding actual image to Excel requires additional library (like exceljs)
      // Current implementation exports data table. Image export to Excel would require exceljs library.
      console.log('Excel export completed. Note: Chart image saved separately as PNG.');
      
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Failed to export to Excel');
    } finally {
      setIsExporting(false);
    }
  };

  // Click outside handler for dropdown
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

  // Calculate max score across all years for unified Y-axis
  const maxScore = Math.max(...monthlyData.map(d => d.sarfi70Score), 1);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div ref={chartRef} className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-slate-700" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">SARFI-70 KPI Monitoring</h2>
            <p className="text-sm text-slate-600 mt-1">
              3-year comparison of SARFI-70 scores by month
            </p>
          </div>
        </div>
        <div className="relative export-dropdown-container">
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={isExporting}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
            title="Export Chart"
          >
            <Download className="w-5 h-5" />
          </button>
          
          {showExportDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
              <button
                onClick={handleExportChart}
                disabled={isExporting}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export as Image
              </button>
              <button
                onClick={handleExportExcel}
                disabled={isExporting || !selectedMonth}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Single Line Chart with Three Years Overlapping */}
      <div className="mb-6">
        <div className="relative h-80 bg-slate-50 rounded-lg p-4">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-slate-600 py-4">
            <span>{maxScore.toFixed(4)}</span>
            <span>{(maxScore * 0.75).toFixed(4)}</span>
            <span>{(maxScore * 0.5).toFixed(4)}</span>
            <span>{(maxScore * 0.25).toFixed(4)}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="ml-16 h-full relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="border-t border-slate-300"></div>
              ))}
            </div>

            {/* Vertical grid lines for months */}
            <div className="absolute inset-0 flex justify-between">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="border-l border-slate-200"></div>
              ))}
            </div>

            {/* Line chart - Plot all three years on same 12-month axis */}
            <svg className="absolute inset-0 w-full h-full">
              {[2023, 2024, 2025].map((year) => {
                const yearData = monthlyData.filter(d => d.year === year);
                if (yearData.length === 0) return null;

                const yearColor = year === 2023 ? '#eab308' : year === 2024 ? '#3b82f6' : '#1e3a8a';

                return (
                  <g key={year}>
                    {/* Lines connecting points */}
                    {yearData.map((data, index) => {
                      if (index === 0) return null;

                      const prevData = yearData[index - 1];
                      // Map month (1-12) to position (0-11)
                      const x1 = ((prevData.month - 1) / 11) * 100;
                      const x2 = ((data.month - 1) / 11) * 100;
                      const y1 = 100 - (prevData.sarfi70Score / maxScore) * 100;
                      const y2 = 100 - (data.sarfi70Score / maxScore) * 100;

                      return (
                        <line
                          key={`line-${year}-${index}`}
                          x1={`${x1}%`}
                          y1={`${y1}%`}
                          x2={`${x2}%`}
                          y2={`${y2}%`}
                          stroke={yearColor}
                          strokeWidth="2.5"
                        />
                      );
                    })}

                    {/* Data points */}
                    {yearData.map((data) => {
                      const x = ((data.month - 1) / 11) * 100;
                      const y = 100 - (data.sarfi70Score / maxScore) * 100;

                      return (
                        <g key={`point-${year}-${data.month}`}>
                          <circle
                            cx={`${x}%`}
                            cy={`${y}%`}
                            r="5"
                            fill={yearColor}
                            stroke="white"
                            strokeWidth="2"
                            className="cursor-pointer hover:r-7 transition-all"
                            onClick={() => handleMonthClick(data)}
                          >
                            <title>{`${data.label}\nSARFI-70: ${data.sarfi70Score.toFixed(4)}\nEvents: ${data.eventCount}`}</title>
                          </circle>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* X-axis labels (12 months) */}
          <div className="ml-16 mt-2 flex justify-between text-xs text-slate-600">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
              <span key={i}>{month}</span>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm text-slate-600">2023</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-slate-600">2024</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-900 rounded"></div>
            <span className="text-sm text-slate-600">2025</span>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {selectedMonth && (
        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Events for {selectedMonth.label} ({tableEvents.length} events)
          </h3>

          {tableEvents.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No events found for this month
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th 
                        className="px-4 py-3 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('sequence')}
                      >
                        Sequence {sortColumn === 'sequence' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-4 py-3 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('substationCode')}
                      >
                        S/S {sortColumn === 'substationCode' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-4 py-3 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('voltageLevel')}
                      >
                        Voltage Level {sortColumn === 'voltageLevel' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-4 py-3 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('timestamp')}
                      >
                        Incident Timestamp {sortColumn === 'timestamp' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-4 py-3 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('oc')}
                      >
                        OC {sortColumn === 'oc' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-4 py-3 text-right font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('sarfi70')}
                      >
                        SARFI-70 {sortColumn === 'sarfi70' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedEvents.map((event) => (
                      <tr key={event.eventId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">{event.sequence}</td>
                        <td className="px-4 py-3 text-slate-700">{event.substationCode}</td>
                        <td className="px-4 py-3 text-slate-700">{event.voltageLevel}</td>
                        <td className="px-4 py-3 text-slate-700">{formatTimestamp(event.timestamp)}</td>
                        <td className="px-4 py-3 text-slate-700">{event.oc}</td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {event.sarfi70.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-slate-600">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedEvents.length)} of {sortedEvents.length} events
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 text-sm rounded ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
