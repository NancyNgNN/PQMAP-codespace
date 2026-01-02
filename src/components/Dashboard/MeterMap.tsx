import { useState, useRef, useEffect } from 'react';
import { Settings2, Download } from 'lucide-react';
import { PQMeter, Substation, LoadType } from '../../types/database';
import { supabase } from '../../lib/supabase';
import html2canvas from 'html2canvas';
import MeterMapConfigModal from './MeterMapConfigModal';

interface MeterMapProps {
  substations: Substation[];
  onNavigateToMeter?: (meterId: string) => void;
}

interface MeterDot {
  id: string;
  meterId: string;
  loadType: LoadType | null;
  substationId: string;
  substationName: string;
  voltageLevel: string | null;
  status: string;
  x: number;
  y: number;
  color: string;
}

interface MeterMapFilters {
  loadTypes: LoadType[];
  voltageLevels: string[];
  substations: string[];
  searchText: string;
  profileId: string;
}

// Hong Kong geographic bounds (same as SubstationMap)
const HK_BOUNDS = {
  north: 22.58,
  south: 22.15,
  west: 113.83,
  east: 114.41
};

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 720;

// Load type colors matching database defaults
const LOAD_TYPE_COLORS: Record<LoadType, string> = {
  'DC': '#9333EA',      // Purple
  'EV': '#06B6D4',      // Cyan
  'RE-PV': '#22C55E',   // Green
  'RES-HRB': '#EF4444', // Red
  'RES-NOC': '#3B82F6', // Blue
  'RES': '#F59E0B',     // Amber
  'others': '#EAB308'   // Yellow
};

// Status colors (matching AssetManagement)
const STATUS_COLORS = {
  active: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  abnormal: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  inactive: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' }
};

export default function MeterMap({ substations, onNavigateToMeter }: MeterMapProps) {
  const [meters, setMeters] = useState<PQMeter[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredMeter, setHoveredMeter] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  
  const [filters, setFilters] = useState<MeterMapFilters>(() => {
    const saved = localStorage.getItem('meterMapFilters');
    return saved ? JSON.parse(saved) : { 
      loadTypes: [], 
      voltageLevels: [], 
      substations: [], 
      searchText: '',
      profileId: '' 
    };
  });

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMeters();
  }, []);

  useEffect(() => {
    localStorage.setItem('meterMapFilters', JSON.stringify(filters));
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

  const loadMeters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pq_meters')
        .select('*')
        .order('meter_id');

      if (error) throw error;
      setMeters(data || []);
    } catch (error) {
      console.error('Error loading meters:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert latitude/longitude to pixel coordinates
  const latLngToPixel = (lat: number, lng: number): { x: number; y: number } => {
    const x = ((lng - HK_BOUNDS.west) / (HK_BOUNDS.east - HK_BOUNDS.west)) * MAP_WIDTH;
    const y = ((HK_BOUNDS.north - lat) / (HK_BOUNDS.north - HK_BOUNDS.south)) * MAP_HEIGHT;
    return { x, y };
  };

  // Get substation map for lookups
  const substationMap = substations.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {} as Record<string, Substation>);

  // Filter meters based on criteria
  const getFilteredMeters = (): PQMeter[] => {
    return meters.filter(meter => {
      // Load type filter
      if (filters.loadTypes.length > 0) {
        if (!meter.load_type || !filters.loadTypes.includes(meter.load_type as LoadType)) {
          return false;
        }
      }

      // Voltage level filter
      if (filters.voltageLevels.length > 0) {
        if (!meter.voltage_level || !filters.voltageLevels.includes(meter.voltage_level)) {
          return false;
        }
      }

      // Substation filter
      if (filters.substations.length > 0 && !filters.substations.includes(meter.substation_id)) {
        return false;
      }

      // Text search (meter_id, site_id)
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesMeterId = meter.meter_id?.toLowerCase().includes(searchLower);
        const matchesSiteId = meter.site_id?.toLowerCase().includes(searchLower);
        if (!matchesMeterId && !matchesSiteId) return false;
      }

      return true;
    });
  };

  // Calculate dot data for each meter
  const calculateDots = (): MeterDot[] => {
    const filteredMeters = getFilteredMeters();
    
    return filteredMeters.map(meter => {
      const substation = substationMap[meter.substation_id];
      if (!substation || !substation.latitude || !substation.longitude) {
        return null;
      }

      const { x, y } = latLngToPixel(substation.latitude, substation.longitude);
      
      // Determine color based on load_type
      const color = meter.load_type ? LOAD_TYPE_COLORS[meter.load_type] : '#6B7280'; // Gray for unknown
      
      return {
        id: meter.id,
        meterId: meter.meter_id,
        loadType: meter.load_type as LoadType || null,
        substationId: meter.substation_id,
        substationName: substation.name,
        voltageLevel: meter.voltage_level || null,
        status: meter.status,
        x,
        y,
        color
      };
    }).filter(Boolean) as MeterDot[];
  };

  const dots = calculateDots();
  const filteredMeters = getFilteredMeters();

  // Get unique values for filters
  const uniqueLoadTypes = Array.from(new Set(meters.map(m => m.load_type).filter(Boolean))) as LoadType[];
  const uniqueVoltageLevels = Array.from(new Set(meters.map(m => m.voltage_level).filter((v): v is string => Boolean(v)))).sort();

  const handleDotClick = (meterId: string) => {
    // Navigate to Asset Management with selected meter
    if (onNavigateToMeter) {
      onNavigateToMeter(meterId);
    }
  };

  const handleDotHover = (meterId: string | null, event?: React.MouseEvent) => {
    setHoveredMeter(meterId);
    if (meterId && event) {
      const rect = mapRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltipPos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        });
      }
    }
  };

  const handleExportImage = async () => {
    if (!mapRef.current) return;

    setIsExporting(true);
    setShowExportDropdown(false);

    try {
      const canvas = await html2canvas(mapRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Meter_Map_${new Date().toISOString().split('T')[0]}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export map');
    } finally {
      setIsExporting(false);
    }
  };

  const handleApplyFilters = (newFilters: MeterMapFilters) => {
    setFilters(newFilters);
    setIsConfigOpen(false);
  };

  const activeFilterCount = 
    filters.loadTypes.length +
    filters.voltageLevels.length +
    filters.substations.length +
    (filters.searchText ? 1 : 0);

  const hoveredDot = dots.find(d => d.id === hoveredMeter);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <div className="flex items-center justify-center h-96">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Meter Map</h2>
          <p className="text-sm text-slate-600 mt-1">
            {filteredMeters.length} meter{filteredMeters.length !== 1 ? 's' : ''} displayed
            {activeFilterCount > 0 && ` (${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} active)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Button */}
          <div className="relative export-dropdown-container">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={isExporting}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
              title="Export Map"
            >
              <Download className="w-5 h-5" />
            </button>
            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                <button
                  onClick={handleExportImage}
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

      {/* Legend */}
      <div className="mb-4 p-4 bg-slate-50 rounded-lg">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Load Types:</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(LOAD_TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-slate-600">{type}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-400" />
            <span className="text-xs text-slate-600">Unknown</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div
        ref={mapRef}
        className="relative bg-slate-100 rounded-lg overflow-hidden"
        style={{
          width: '100%',
          paddingTop: '60%', // Aspect ratio 5:3
          position: 'relative'
        }}
      >
        {/* Hong Kong Map Background */}
        <img
          src="/hong-kong-map.png"
          alt="Hong Kong"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        {/* SVG Overlay for Dots */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {dots.map((dot) => (
            <circle
              key={dot.id}
              cx={dot.x}
              cy={dot.y}
              r={6}
              fill={dot.color}
              stroke="white"
              strokeWidth={2}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleDotClick(dot.id)}
              onMouseEnter={(e) => handleDotHover(dot.id, e as any)}
              onMouseLeave={() => handleDotHover(null)}
            />
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredDot && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: tooltipPos.x + 10,
              top: tooltipPos.y + 10,
              transform: 'translate(0, -50%)'
            }}
          >
            <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-3 min-w-[250px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-900">{hoveredDot.meterId}</span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    STATUS_COLORS[hoveredDot.status as keyof typeof STATUS_COLORS]?.bg || 'bg-slate-100'
                  } ${
                    STATUS_COLORS[hoveredDot.status as keyof typeof STATUS_COLORS]?.text || 'text-slate-700'
                  } font-medium capitalize`}
                >
                  {hoveredDot.status}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">Load Type:</span>
                  <div className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: hoveredDot.color }}
                    />
                    <span className="text-xs font-medium text-slate-900">
                      {hoveredDot.loadType || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-600">
                  <span className="font-medium">Substation:</span> {hoveredDot.substationName}
                </div>
                {hoveredDot.voltageLevel && (
                  <div className="text-xs text-slate-600">
                    <span className="font-medium">Voltage Level:</span> {hoveredDot.voltageLevel}
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <span className="text-xs text-blue-600 font-medium">
                    Click to view details →
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {dots.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <p className="text-lg font-medium">No meters found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          </div>
        )}
      </div>

      {/* Config Modal */}
      {isConfigOpen && (
        <MeterMapConfigModal
          filters={filters}
          onApply={handleApplyFilters}
          onClose={() => setIsConfigOpen(false)}
          uniqueLoadTypes={uniqueLoadTypes}
          uniqueVoltageLevels={uniqueVoltageLevels}
          substations={substations}
        />
      )}
    </div>
  );
}
