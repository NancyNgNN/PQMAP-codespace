import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ZoomIn, ZoomOut, RotateCcw, Activity } from 'lucide-react';

interface WaveformData {
  timestamp: string;
  v1: number;
  v2: number;
  v3: number;
}

interface WaveformViewerProps {
  csvData: string | null;
  event?: any;
  eventType?: string;
}

const WaveformViewer: React.FC<WaveformViewerProps> = ({ csvData, event, eventType }) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeView, setActiveView] = useState<'combined' | 'v1' | 'v2' | 'v3'>('combined');
  const [harmonicView, setHarmonicView] = useState<'thd' | 'tehd' | 'tohd'>('thd');

  // Parse CSV data
  const parsedData = useMemo<WaveformData[]>(() => {
    if (!csvData) return [];

    try {
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) return [];

      // Skip header row
      const dataLines = lines.slice(1);
      
      return dataLines.map(line => {
        const [timestamp, v1, v2, v3] = line.split(',');
        return {
          timestamp: timestamp.trim(),
          v1: parseFloat(v1),
          v2: parseFloat(v2),
          v3: parseFloat(v3)
        };
      }).filter(d => !isNaN(d.v1) && !isNaN(d.v2) && !isNaN(d.v3));
    } catch (error) {
      console.error('Error parsing CSV data:', error);
      return [];
    }
  }, [csvData]);

  // Apply zoom by slicing data (zoom into center of waveform)
  const displayData = useMemo(() => {
    if (parsedData.length === 0) {
      console.log('📊 [WaveformViewer] No parsed data available');
      return [];
    }
    
    console.log('📊 [WaveformViewer] Calculating display data:', {
      totalPoints: parsedData.length,
      zoomLevel: zoomLevel,
      zoomPercentage: `${zoomLevel}%`
    });
    
    // Calculate how much of the waveform to show based on zoom level
    // 100% = show all data, 75% = show 75% of data centered, 200% = show 50% of data (zoomed in 2x)
    const visibleRatio = 100 / zoomLevel;
    const visiblePoints = Math.floor(parsedData.length * visibleRatio);
    
    console.log('📊 [WaveformViewer] Zoom calculation:', {
      visibleRatio: visibleRatio.toFixed(2),
      visiblePoints: visiblePoints,
      percentageOfData: `${(visibleRatio * 100).toFixed(1)}%`
    });
    
    // Center the visible window
    const startIndex = Math.floor((parsedData.length - visiblePoints) / 2);
    const endIndex = startIndex + visiblePoints;
    
    const slicedData = parsedData.slice(startIndex, endIndex);
    
    console.log('📊 [WaveformViewer] Display data result:', {
      startIndex,
      endIndex,
      displayedPoints: slicedData.length,
      firstTimestamp: slicedData[0]?.timestamp,
      lastTimestamp: slicedData[slicedData.length - 1]?.timestamp
    });
    
    return slicedData;
  }, [parsedData, zoomLevel]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (parsedData.length === 0) {
      return {
        v1: { min: 0, max: 0, rms: 0 },
        v2: { min: 0, max: 0, rms: 0 },
        v3: { min: 0, max: 0, rms: 0 }
      };
    }

    const calculateStats = (values: number[]) => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const rms = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length);
      return { min, max, rms };
    };

    return {
      v1: calculateStats(parsedData.map(d => d.v1)),
      v2: calculateStats(parsedData.map(d => d.v2)),
      v3: calculateStats(parsedData.map(d => d.v3))
    };
  }, [parsedData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white border-2 border-slate-300 rounded-lg shadow-xl p-3">
        <p className="text-xs font-semibold text-slate-600 mb-2">
          {payload[0].payload.timestamp}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-semibold">{entry.name}:</span>
            <span className="font-mono">{entry.value.toFixed(2)} V</span>
          </div>
        ))}
      </div>
    );
  };

  // Format timestamp for X-axis
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const ms = date.getMilliseconds();
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    } catch {
      return timestamp;
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => {
      const newZoom = Math.min(prev + 25, 200);
      console.log('🔍 [WaveformViewer] Zoom In:', prev, '→', newZoom);
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - 25, 50);
      console.log('🔍 [WaveformViewer] Zoom Out:', prev, '→', newZoom);
      return newZoom;
    });
  };

  const handleResetZoom = () => {
    console.log('🔍 [WaveformViewer] Reset Zoom to 100%');
    setZoomLevel(100);
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Render harmonic analysis for harmonic events
  if (eventType === 'harmonic') {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-white" />
              <h3 className="font-semibold text-white">Harmonic Analysis</h3>
            </div>
            <div className="flex items-center gap-2">
              {/* View Tabs */}
              <div className="flex items-center gap-1 bg-white/20 rounded-lg p-1">
                <button
                  onClick={() => setHarmonicView('thd')}
                  className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                    harmonicView === 'thd'
                      ? 'bg-white text-purple-600 shadow-md'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  THD
                </button>
                <button
                  onClick={() => setHarmonicView('tehd')}
                  className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                    harmonicView === 'tehd'
                      ? 'bg-white text-purple-600 shadow-md'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  TEHD
                </button>
                <button
                  onClick={() => setHarmonicView('tohd')}
                  className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                    harmonicView === 'tohd'
                      ? 'bg-white text-purple-600 shadow-md'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  TOHD
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Summary */}
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="font-semibold text-slate-700">Voltage Channel Ua</span>
              </div>
              <div className="ml-5 text-slate-600 space-y-0.5">
                <div>RMS: <span className="font-mono">6.496 KV</span></div>
                <div>Fundamental RMS: <span className="font-mono">4.59 KV</span></div>
                <div className="font-semibold text-purple-700">THD: 3.85%</div>
                <div>TOHD: 2.72%</div>
                <div>TEHD: 2.73%</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="font-semibold text-slate-700">Voltage Channel Ub</span>
              </div>
              <div className="ml-5 text-slate-600 space-y-0.5">
                <div>RMS: <span className="font-mono">4.948 KV</span></div>
                <div>Fundamental RMS: <span className="font-mono">3.472 KV</span></div>
                <div className="font-semibold text-purple-700">THD: 10.71%</div>
                <div>TOHD: 7.65%</div>
                <div>TEHD: 7.45%</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-semibold text-slate-700">Voltage Channel Uc</span>
              </div>
              <div className="ml-5 text-slate-600 space-y-0.5">
                <div>RMS: <span className="font-mono">6.639 KV</span></div>
                <div>Fundamental RMS: <span className="font-mono">4.692 KV</span></div>
                <div className="font-semibold text-purple-700">THD: 3.52%</div>
                <div>TOHD: 2.42%</div>
                <div>TEHD: 2.55%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Harmonic Charts Placeholder */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Channel Ua */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <h4 className="text-sm font-semibold text-orange-600">Channel Ua - {harmonicView.toUpperCase()}</h4>
              </div>
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-12">
                <p className="text-center text-slate-500 font-medium">
                  📊 Harmonic histogram chart - To be implemented later
                </p>
                <p className="text-center text-xs text-slate-400 mt-2">
                  Will show harmonic components 2-62+ with magnitude bars
                </p>
              </div>
            </div>

            {/* Channel Ub */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <h4 className="text-sm font-semibold text-purple-600">Channel Ub - {harmonicView.toUpperCase()}</h4>
              </div>
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-12">
                <p className="text-center text-slate-500 font-medium">
                  📊 Harmonic histogram chart - To be implemented later
                </p>
                <p className="text-center text-xs text-slate-400 mt-2">
                  Will show harmonic components 2-62+ with magnitude bars
                </p>
              </div>
            </div>

            {/* Channel Uc */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <h4 className="text-sm font-semibold text-green-600">Channel Uc - {harmonicView.toUpperCase()}</h4>
              </div>
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-12">
                <p className="text-center text-slate-500 font-medium">
                  📊 Harmonic histogram chart - To be implemented later
                </p>
                <p className="text-center text-xs text-slate-400 mt-2">
                  Will show harmonic components 2-62+ with magnitude bars
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="bg-slate-50 px-4 py-2 border-t border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <div>
              <span className="font-semibold">Freq Nominal:</span> 50 Hz
              <span className="mx-2 text-slate-400">•</span>
              <span className="font-semibold">Voltage Level:</span> {event?.voltage_level || 'N/A'}
            </div>
            <div className="text-slate-500">
              💡 Harmonic analysis based on 10-minute averaging (IEEE 519)
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!csvData || parsedData.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8">
        <div className="text-center">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No waveform data available</p>
          <p className="text-sm text-slate-500 mt-1">
            Waveform capture data has not been recorded for this event
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-white" />
            <h3 className="font-semibold text-white">Waveform Analysis</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* View Selector */}
            <div className="flex items-center gap-1 bg-white/20 rounded-lg p-1">
              <button
                onClick={() => setActiveView('combined')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                  activeView === 'combined'
                    ? 'bg-white text-indigo-600 shadow-md'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Combined
              </button>
              <button
                onClick={() => setActiveView('v1')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                  activeView === 'v1'
                    ? 'bg-white text-red-600 shadow-md'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                V1
              </button>
              <button
                onClick={() => setActiveView('v2')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                  activeView === 'v2'
                    ? 'bg-white text-green-600 shadow-md'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                V2
              </button>
              <button
                onClick={() => setActiveView('v3')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                  activeView === 'v3'
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                V3
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 bg-white/20 rounded-lg p-2">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                className="p-1.5 text-white hover:bg-white/20 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              
              {/* Zoom Slider */}
              <input
                type="range"
                min="50"
                max="200"
                step="25"
                value={zoomLevel}
                onChange={(e) => {
                  const newZoom = parseInt(e.target.value);
                  console.log('🎚️ [WaveformViewer] Slider changed:', zoomLevel, '→', newZoom);
                  setZoomLevel(newZoom);
                }}
                className="w-24 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none 
                          [&::-webkit-slider-thumb]:w-4 
                          [&::-webkit-slider-thumb]:h-4 
                          [&::-webkit-slider-thumb]:bg-white 
                          [&::-webkit-slider-thumb]:rounded-full 
                          [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-webkit-slider-thumb]:shadow-md
                          [&::-moz-range-thumb]:w-4 
                          [&::-moz-range-thumb]:h-4 
                          [&::-moz-range-thumb]:bg-white 
                          [&::-moz-range-thumb]:rounded-full 
                          [&::-moz-range-thumb]:cursor-pointer
                          [&::-moz-range-thumb]:border-0
                          [&::-moz-range-thumb]:shadow-md"
                title={`Zoom: ${zoomLevel}%`}
              />
              
              <span className="px-2 text-xs font-semibold text-white min-w-[60px] text-center">
                {zoomLevel}%
              </span>
              
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 200}
                className="p-1.5 text-white hover:bg-white/20 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 text-white hover:bg-white/20 rounded transition-all ml-1"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="flex-1">
              <span className="font-semibold text-slate-700">V1:</span>
              <span className="ml-2 text-slate-600">
                Min: {stats.v1.min.toFixed(1)} V
              </span>
              <span className="mx-1 text-slate-400">|</span>
              <span className="text-slate-600">
                Max: {stats.v1.max.toFixed(1)} V
              </span>
              <span className="mx-1 text-slate-400">|</span>
              <span className="text-slate-600">
                RMS: {stats.v1.rms.toFixed(1)} V
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <span className="font-semibold text-slate-700">V2:</span>
              <span className="ml-2 text-slate-600">
                Min: {stats.v2.min.toFixed(1)} V
              </span>
              <span className="mx-1 text-slate-400">|</span>
              <span className="text-slate-600">
                Max: {stats.v2.max.toFixed(1)} V
              </span>
              <span className="mx-1 text-slate-400">|</span>
              <span className="text-slate-600">
                RMS: {stats.v2.rms.toFixed(1)} V
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <div className="flex-1">
              <span className="font-semibold text-slate-700">V3:</span>
              <span className="ml-2 text-slate-600">
                Min: {stats.v3.min.toFixed(1)} V
              </span>
              <span className="mx-1 text-slate-400">|</span>
              <span className="text-slate-600">
                Max: {stats.v3.max.toFixed(1)} V
              </span>
              <span className="mx-1 text-slate-400">|</span>
              <span className="text-slate-600">
                RMS: {stats.v3.rms.toFixed(1)} V
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Waveform Charts */}
      <div className="p-4">
        {activeView === 'combined' ? (
          /* Combined View - All 3 Phases */
          <div onWheel={handleWheel}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={displayData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTimestamp}
                  tick={{ fontSize: 11 }}
                  stroke="#64748b"
                />
                <YAxis 
                  label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#475569' } }}
                  tick={{ fontSize: 11 }}
                  stroke="#64748b"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Line 
                  type="monotone" 
                  dataKey="v1" 
                  stroke="#ef4444" 
                  name="V1"
                  strokeWidth={1.5}
                  dot={false}
                  animationDuration={300}
                />
                <Line 
                  type="monotone" 
                  dataKey="v2" 
                  stroke="#22c55e" 
                  name="V2"
                  strokeWidth={1.5}
                  dot={false}
                  animationDuration={300}
                />
                <Line 
                  type="monotone" 
                  dataKey="v3" 
                  stroke="#3b82f6" 
                  name="V3"
                  strokeWidth={1.5}
                  dot={false}
                  animationDuration={300}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Individual Phase Views */
          <div className="space-y-4" onWheel={handleWheel}>
            {activeView === 'v1' && (
              <div>
                <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  Phase V1
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={displayData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fee2e2" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                      tick={{ fontSize: 11 }}
                      stroke="#dc2626"
                    />
                    <YAxis 
                      label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#dc2626' } }}
                      tick={{ fontSize: 11 }}
                      stroke="#dc2626"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="v1" 
                      stroke="#ef4444" 
                      name="V1"
                      strokeWidth={2}
                      dot={false}
                      animationDuration={300}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeView === 'v2' && (
              <div>
                <h4 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Phase V2
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={displayData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                      tick={{ fontSize: 11 }}
                      stroke="#16a34a"
                    />
                    <YAxis 
                      label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#16a34a' } }}
                      tick={{ fontSize: 11 }}
                      stroke="#16a34a"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="v2" 
                      stroke="#22c55e" 
                      name="V2"
                      strokeWidth={2}
                      dot={false}
                      animationDuration={300}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeView === 'v3' && (
              <div>
                <h4 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  Phase V3
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={displayData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                      tick={{ fontSize: 11 }}
                      stroke="#2563eb"
                    />
                    <YAxis 
                      label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#2563eb' } }}
                      tick={{ fontSize: 11 }}
                      stroke="#2563eb"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="v3" 
                      stroke="#3b82f6" 
                      name="V3"
                      strokeWidth={2}
                      dot={false}
                      animationDuration={300}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-slate-50 px-4 py-2 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <div>
            <span className="font-semibold">{parsedData.length}</span> samples recorded
            <span className="mx-2 text-slate-400">•</span>
            <span className="font-semibold">{displayData.length}</span> points displayed
          </div>
          <div className="text-slate-500">
            💡 Use mouse wheel to zoom • Hover for values
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaveformViewer;
