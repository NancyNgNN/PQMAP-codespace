import { useState, useRef, useEffect } from 'react';
import { TrendingUp, Download } from 'lucide-react';
import { PQEvent } from '../../types/database';
import html2canvas from 'html2canvas';

interface InsightChartProps {
  events: PQEvent[];
}

interface MonthlyData {
  month: string;
  year2023: number;
  year2024: number;
  year2025: number;
}

interface SubstationData {
  substationName: string;
  count: number;
}

export default function InsightChart({ events }: InsightChartProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear]; // e.g., [2023, 2024, 2025]

  // Close dropdown when clicking outside
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

  // Filter: only voltage_dip, mother events, not false events
  const getVoltageDipMotherEvents = (): PQEvent[] => {
    return events.filter(event => 
      event.event_type === 'voltage_dip' &&
      event.is_mother_event === true &&
      event.false_event === false
    );
  };

  const voltageDipEvents = getVoltageDipMotherEvents();

  // Debug: Log the filtered events
  console.log('Total events passed to InsightChart:', events.length);
  console.log('Filtered voltage_dip mother events:', voltageDipEvents.length);
  console.log('Sample events:', voltageDipEvents.slice(0, 5).map(e => ({ 
    timestamp: e.timestamp, 
    year: new Date(e.timestamp).getFullYear(),
    month: new Date(e.timestamp).getMonth() + 1,
    substation: e.substation?.name 
  })));

  // Prepare monthly data for the upper chart
  const getMonthlyData = (): MonthlyData[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData: MonthlyData[] = months.map((month) => ({
      month,
      year2023: 0,
      year2024: 0,
      year2025: 0,
    }));

    voltageDipEvents.forEach(event => {
      const eventDate = new Date(event.timestamp);
      const eventYear = eventDate.getFullYear();
      const eventMonth = eventDate.getMonth(); // 0-11

      if (eventYear === years[0]) {
        monthlyData[eventMonth].year2023++;
      } else if (eventYear === years[1]) {
        monthlyData[eventMonth].year2024++;
      } else if (eventYear === years[2]) {
        monthlyData[eventMonth].year2025++;
      }
    });

    return monthlyData;
  };

  // Prepare substation data for the lower chart (substations with > 10 voltage dip events)
  const getSubstationData = (): SubstationData[] => {
    const substationCounts: Record<string, { name: string; count: number }> = {};

    voltageDipEvents.forEach(event => {
      if (event.substation?.name) {
        const name = event.substation.name;
        if (!substationCounts[name]) {
          substationCounts[name] = { name, count: 0 };
        }
        substationCounts[name].count++;
      }
    });

    // Filter substations with > 10 events and sort by count descending
    return Object.values(substationCounts)
      .filter(item => item.count > 10)
      .sort((a, b) => b.count - a.count)
      .map(item => ({
        substationName: item.name,
        count: item.count,
      }));
  };

  const monthlyData = getMonthlyData();
  const substationData = getSubstationData();

  // Calculate max value for scaling the upper chart
  const maxMonthlyValue = Math.max(
    ...monthlyData.flatMap(d => [d.year2023, d.year2024, d.year2025]),
    1 // Prevent division by zero
  );

  // Calculate max value for scaling the lower chart
  const maxSubstationValue = Math.max(...substationData.map(d => d.count), 1);

  const handleExportChart = async () => {
    if (!chartRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = `insight-for-improvement-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setShowExportDropdown(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
      <div ref={chartRef} className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-slate-700" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Insight for Improvement</h2>
              <p className="text-sm text-slate-600 mt-1">
                Voltage dip analysis ({years[0]}-{years[2]})
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
              </div>
            )}
          </div>
        </div>

        {/* Upper Chart: Monthly Voltage Dips by Year */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-700 mb-4">
            No. of Voltage Dips (0%-90%) by Month in {years[0]}, {years[1]}, {years[2]}
          </h3>
          
          {/* Legend */}
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-400 rounded"></div>
              <span className="text-xs text-slate-600">{years[0]}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-xs text-slate-600">{years[1]}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-700 rounded"></div>
              <span className="text-xs text-slate-600">{years[2]}</span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="relative h-64">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-xs text-slate-500 text-right pr-2">
              <span>{maxMonthlyValue}</span>
              <span>{Math.round(maxMonthlyValue * 0.75)}</span>
              <span>{Math.round(maxMonthlyValue * 0.5)}</span>
              <span>{Math.round(maxMonthlyValue * 0.25)}</span>
              <span>0</span>
            </div>

            {/* Chart area */}
            <div className="ml-10 flex flex-col" style={{ height: 'calc(100% - 24px)' }}>
              <div className="flex-1 flex items-end justify-between gap-1">
                {monthlyData.map((data, index) => {
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center h-full">
                      {/* Bars container */}
                      <div className="w-full flex items-end justify-center gap-0.5 h-full">
                        {/* Year 1 Bar */}
                        <div className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                          {data.year2023 > 0 ? (
                            <>
                              <span className="text-[10px] font-semibold text-slate-700 mb-1">
                                {data.year2023}
                              </span>
                              <div
                                className="w-full bg-amber-400 rounded-t transition-all duration-300 min-h-[4px]"
                                style={{ height: `${Math.max((data.year2023 / maxMonthlyValue) * 100, 2)}%` }}
                              />
                            </>
                          ) : (
                            <div className="w-full h-0"></div>
                          )}
                        </div>
                        
                        {/* Year 2 Bar */}
                        <div className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                          {data.year2024 > 0 ? (
                            <>
                              <span className="text-[10px] font-semibold text-slate-700 mb-1">
                                {data.year2024}
                              </span>
                              <div
                                className="w-full bg-blue-500 rounded-t transition-all duration-300 min-h-[4px]"
                                style={{ height: `${Math.max((data.year2024 / maxMonthlyValue) * 100, 2)}%` }}
                              />
                            </>
                          ) : (
                            <div className="w-full h-0"></div>
                          )}
                        </div>
                        
                        {/* Year 3 Bar */}
                        <div className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                          {data.year2025 > 0 ? (
                            <>
                              <span className="text-[10px] font-semibold text-slate-700 mb-1">
                                {data.year2025}
                              </span>
                              <div
                                className="w-full bg-slate-700 rounded-t transition-all duration-300 min-h-[4px]"
                                style={{ height: `${Math.max((data.year2025 / maxMonthlyValue) * 100, 2)}%` }}
                              />
                            </>
                          ) : (
                            <div className="w-full h-0"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Month labels row */}
              <div className="flex justify-between gap-1 mt-2">
                {monthlyData.map((data, index) => (
                  <div key={index} className="flex-1 text-center">
                    <span className="text-[10px] text-slate-600 font-medium">{data.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lower Chart: Voltage Dips by Substation (>10 events) */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-4">
            No. of Voltage Dips (0%-90%) by Equipment Category in {years[0]}, {years[1]}, {years[2]}
          </h3>

          {substationData.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No substations with more than 10 voltage dip events</p>
            </div>
          ) : (
            <div className="space-y-3">
              {substationData.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  {/* Substation name */}
                  <div className="w-24 text-xs font-medium text-slate-700 text-right">
                    {item.substationName}
                  </div>
                  
                  {/* Bar container */}
                  <div className="flex-1 relative h-8 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-500 transition-all duration-300 flex items-center justify-end pr-2"
                      style={{ width: `${(item.count / maxSubstationValue) * 100}%` }}
                    >
                      <span className="text-xs font-bold text-white">{item.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs font-semibold text-amber-900 mb-2">💡 General Insight</p>
          <p className="text-sm text-amber-800">
            {substationData.length > 0 ? (
              <>
                <span className="font-bold">{substationData[0].substationName}</span> has the highest 
                number of voltage dip events with <span className="font-bold">{substationData[0].count}</span> occurrences. 
                Focus improvement efforts on these fragile rings.
              </>
            ) : (
              'All substations are performing well with voltage dip events below threshold (≤10).'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
