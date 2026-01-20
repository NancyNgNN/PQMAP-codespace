import { useState, useRef, useEffect } from 'react';
import { Settings2, Download } from 'lucide-react';
import { Substation, PQEvent, SubstationMapFilters } from '../../types/database';
import html2canvas from 'html2canvas';
import SubstationEventsTable from './SubstationEventsTable';
import MapConfigModal from './MapConfigModal';

interface SubstationMapProps {
  substations: Substation[];
  events: PQEvent[];
}

interface SubstationBubble {
  id: string;
  name: string;
  code: string;
  region: string;
  x: number;
  y: number;
  eventCount: number;
  color: string;
  radius: number;
}

// Hong Kong geographic bounds
const HK_BOUNDS = {
  north: 22.58,
  south: 22.15,
  west: 113.83,
  east: 114.41
};

const MAP_WIDTH = 800;
const MAP_HEIGHT = 480;

export default function SubstationMap({ substations, events }: SubstationMapProps) {
  const [selectedSubstation, setSelectedSubstation] = useState<string | null>(null);
  const [hoveredSubstation, setHoveredSubstation] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  
  const [filters, setFilters] = useState<SubstationMapFilters>(() => {
    const saved = localStorage.getItem('substationMapFilters');
    return saved ? JSON.parse(saved) : { profileId: '', startDate: '', endDate: '' };
  });

  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('substationMapFilters', JSON.stringify(filters));
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

  // Convert latitude/longitude to pixel coordinates
  const latLngToPixel = (lat: number, lng: number): { x: number; y: number } => {
    const x = ((lng - HK_BOUNDS.west) / (HK_BOUNDS.east - HK_BOUNDS.west)) * MAP_WIDTH;
    const y = ((HK_BOUNDS.north - lat) / (HK_BOUNDS.north - HK_BOUNDS.south)) * MAP_HEIGHT;
    return { x, y };
  };

  // Filter events based on criteria
  const getFilteredEvents = (): PQEvent[] => {
    return events.filter(event => {
      // Only mother events
      if (!event.is_mother_event) return false;
      
      // Exclude false events
      if (event.false_event) return false;
      
      // Date range filter
      if (filters.startDate && new Date(event.timestamp) < new Date(filters.startDate)) return false;
      if (filters.endDate && new Date(event.timestamp) > new Date(filters.endDate)) return false;
      
      return true;
    });
  };

  // Calculate bubble data for each substation
  const calculateBubbles = (): SubstationBubble[] => {
    const filteredEvents = getFilteredEvents();
    
    return substations.map(substation => {
      if (!substation.latitude || !substation.longitude) {
        return null;
      }

      const eventCount = filteredEvents.filter(e => e.substation_id === substation.id).length;
      
      // Skip substations with no incidents
      if (eventCount === 0) {
        return null;
      }
      
      // Determine color and size based on event count
      let color = '#22c55e'; // Green for 1-2
      let radius = 10;
      
      if (eventCount > 10) {
        color = '#ef4444'; // Red for >10
        radius = 20;
      } else if (eventCount >= 3 && eventCount <= 9) {
        color = '#eab308'; // Yellow for 3-9
        radius = 15;
      }
      
      const { x, y } = latLngToPixel(substation.latitude, substation.longitude);
      
      return {
        id: substation.id,
        name: substation.name,
        code: substation.code,
        region: substation.region || '',
        x,
        y,
        eventCount,
        color,
        radius
      };
    }).filter(Boolean) as SubstationBubble[];
  };

  const bubbles = calculateBubbles();
  const filteredEvents = getFilteredEvents();

  const handleBubbleClick = (substationId: string) => {
    setSelectedSubstation(substationId);
  };

  const handleBubbleHover = (substationId: string | null, event?: React.MouseEvent) => {
    setHoveredSubstation(substationId);
    if (substationId && event) {
      const rect = mapRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltipPos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        });
      }
    }
  };

  const handleExportMap = async () => {
    if (!mapRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(mapRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = `substation-map-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setShowExportDropdown(false);
    }
  };

  const handleApplyFilters = (newFilters: SubstationMapFilters) => {
    setFilters(newFilters);
    setIsConfigOpen(false);
  };

  const selectedSubstationData = substations.find(s => s.id === selectedSubstation);
  const hoveredBubble = bubbles.find(b => b.id === hoveredSubstation);

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
      {/* Map Section - 60% */}
      <div className="p-6" style={{ height: '60%', minHeight: '500px' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Substation Map View</h2>
            <p className="text-sm text-slate-600 mt-1">
              {filteredEvents.length} incident{filteredEvents.length !== 1 ? 's' : ''} detected
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative export-dropdown-container">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={isExporting}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
                title="Export Map and Data"
              >
                <Download className="w-5 h-5" />
              </button>
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                  <button
                    onClick={handleExportMap}
                    disabled={isExporting}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Map as Image
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

        {/* Map Container */}
        <div
          ref={mapRef}
          className="relative bg-slate-50 rounded-xl overflow-hidden border border-slate-200"
          style={{
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            backgroundImage: 'url(/hong-kong-map.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            margin: '0 auto'
          }}
        >
          <svg
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            className="absolute inset-0"
          >
            {bubbles.map(bubble => (
              <g key={bubble.id}>
                <circle
                  cx={bubble.x}
                  cy={bubble.y}
                  r={bubble.radius}
                  fill={bubble.color}
                  opacity={0.7}
                  stroke={selectedSubstation === bubble.id ? '#3b82f6' : 'white'}
                  strokeWidth={selectedSubstation === bubble.id ? 3 : 2}
                  className="cursor-pointer transition-all hover:opacity-90"
                  onClick={() => handleBubbleClick(bubble.id)}
                  onMouseEnter={(e) => handleBubbleHover(bubble.id, e)}
                  onMouseLeave={() => handleBubbleHover(null)}
                  onMouseMove={(e) => handleBubbleHover(bubble.id, e)}
                />
              </g>
            ))}
          </svg>

          {/* Tooltip */}
          {hoveredBubble && (
            <div
              className="absolute bg-slate-900 text-white px-3 py-2 rounded-lg text-sm pointer-events-none z-10 shadow-lg"
              style={{
                left: tooltipPos.x + 10,
                top: tooltipPos.y + 10
              }}
            >
              <div className="font-semibold">{hoveredBubble.name}</div>
              <div className="text-xs text-slate-300">Code: {hoveredBubble.code}</div>
              <div className="text-xs text-slate-300">Region: {hoveredBubble.region}</div>
              <div className="text-xs text-slate-300 mt-1">
                {hoveredBubble.eventCount} incident{hoveredBubble.eventCount !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-green-500"></div>
            <span className="text-sm text-slate-600">1-2 incidents</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-slate-600">3-9 incidents</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-500"></div>
            <span className="text-sm text-slate-600">&gt;10 incidents</span>
          </div>
        </div>
      </div>

      {/* Table Section - 40% */}
      <div className="border-t border-slate-200" style={{ height: '40%', minHeight: '300px' }}>
        <SubstationEventsTable
          substation={selectedSubstationData}
          events={filteredEvents}
          filters={filters}
        />
      </div>

      {/* Config Modal */}
      {isConfigOpen && (
        <MapConfigModal
          filters={filters}
          onApply={handleApplyFilters}
          onClose={() => setIsConfigOpen(false)}
        />
      )}
    </div>
  );
}
