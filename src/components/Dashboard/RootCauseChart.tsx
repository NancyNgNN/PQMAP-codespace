import { useState, useRef, useEffect } from 'react';
import { BarChart3, Settings2, Download } from 'lucide-react';
import { PQEvent, RootCauseFilters } from '../../types/database';
import RootCauseConfigModal from './RootCauseConfigModal';
import html2canvas from 'html2canvas';

interface RootCauseChartProps {
  events: PQEvent[];
}

export default function RootCauseChart({ events }: RootCauseChartProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [filters, setFilters] = useState<RootCauseFilters>(() => {
    const saved = localStorage.getItem('rootCauseFilters');
    return saved ? JSON.parse(saved) : { profileId: '', startDate: '', endDate: '' };
  });

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('rootCauseFilters', JSON.stringify(filters));
  }, [filters]);

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

  // Filter events based on criteria (all events including child events, but exclude false events)
  const getFilteredEvents = (): PQEvent[] => {
    return events.filter(event => {
      // Exclude false events
      if (event.false_event) return false;
      
      // Date range filter
      if (filters.startDate && new Date(event.timestamp) < new Date(filters.startDate)) return false;
      if (filters.endDate && new Date(event.timestamp) > new Date(filters.endDate)) return false;
      
      return true;
    });
  };

  const filteredEvents = getFilteredEvents();

  const rootCauseCounts = filteredEvents.reduce((acc, event) => {
    // Use PSBG cause first, then fall back to cause field
    const cause = event.psbg_cause || event.cause || 'Unknown';
    acc[cause] = (acc[cause] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const rootCauseData = Object.entries(rootCauseCounts)
    .map(([cause, count]) => ({
      cause,
      count,
      percentage: filteredEvents.length > 0 ? (count / filteredEvents.length) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Show top 10 causes

  const colors = [
    'from-blue-500 to-blue-600',
    'from-cyan-500 to-cyan-600',
    'from-teal-500 to-teal-600',
    'from-green-500 to-green-600',
    'from-amber-500 to-amber-600',
    'from-orange-500 to-orange-600',
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
    'from-red-500 to-red-600',
    'from-indigo-500 to-indigo-600',
  ];

  const handleApplyFilters = (newFilters: RootCauseFilters) => {
    setFilters(newFilters);
    setIsConfigOpen(false);
  };

  const handleExportChart = async () => {
    if (!chartRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = `root-cause-analysis-${new Date().toISOString().split('T')[0]}.png`;
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
            <BarChart3 className="w-6 h-6 text-slate-700" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Root Cause Analysis</h2>
              <p className="text-sm text-slate-600 mt-1">
                {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} analyzed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <button
              onClick={() => setIsConfigOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg"
              title="Configure Filters"
            >
              <Settings2 className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {rootCauseData.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm mt-1">Try adjusting your date filters</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {rootCauseData.map((item, index) => (
                <div key={item.cause}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">{item.cause}</span>
                    <span className="text-sm font-bold text-slate-900">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-700 mb-2">Analysis Summary</p>
              <p className="text-sm text-slate-600">
                Most common cause: <span className="font-bold text-slate-900">{rootCauseData[0]?.cause}</span> ({rootCauseData[0]?.percentage.toFixed(1)}% of events)
              </p>
            </div>
          </>
        )}
      </div>

      {isConfigOpen && (
        <RootCauseConfigModal
          filters={filters}
          onApply={handleApplyFilters}
          onClose={() => setIsConfigOpen(false)}
        />
      )}
    </div>
  );
}
