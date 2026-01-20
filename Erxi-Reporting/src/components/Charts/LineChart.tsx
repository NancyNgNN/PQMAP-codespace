interface DataPoint {
  timestamp: string;
  [key: string]: number | string;
}

interface LineChartProps {
  data: DataPoint[];
  parameters: string[];
  title?: string;
  height?: number;
  showLegend?: boolean;
}

const COLORS: { [key: string]: string } = {
  V1: '#000000',
  V2: '#ef4444',
  V3: '#3b82f6',
  I1: '#000000',
  I2: '#ef4444',
  I3: '#3b82f6'
};

export default function LineChart({ 
  data, 
  parameters, 
  title, 
  height = 200,
  showLegend = true 
}: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 rounded border border-slate-200">
        <p className="text-sm text-slate-400">No data available</p>
      </div>
    );
  }

  // Calculate min and max values across all parameters
  let minValue = Infinity;
  let maxValue = -Infinity;

  parameters.forEach(param => {
    data.forEach(point => {
      const value = point[param] as number;
      if (typeof value === 'number') {
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
    });
  });

  // Add 10% padding to the range
  const range = maxValue - minValue;
  const padding = range * 0.1;
  minValue -= padding;
  maxValue += padding;

  // Normalize value to SVG coordinates
  const normalize = (value: number) => {
    if (maxValue === minValue) return 50;
    return ((value - minValue) / (maxValue - minValue)) * 80 + 10;
  };

  // Generate path for each parameter
  const generatePath = (param: string) => {
    return data
      .map((point, i) => {
        const value = point[param] as number;
        if (typeof value !== 'number') return '';
        
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - normalize(value);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate y-axis labels
  const yAxisLabels = [
    maxValue.toFixed(1),
    ((maxValue + minValue) / 2).toFixed(1),
    minValue.toFixed(1)
  ];

  return (
    <div className="space-y-2">
      {title && (
        <h4 className="text-sm font-semibold text-slate-700 text-center">{title}</h4>
      )}
      
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-slate-500 pr-2">
          {yAxisLabels.map((label, i) => (
            <div key={i} className="text-right">{label}</div>
          ))}
        </div>

        {/* Chart area */}
        <div className="ml-12 mr-2">
          <svg
            viewBox="0 0 100 100"
            style={{ height: `${height}px` }}
            className="w-full bg-white border border-slate-200 rounded"
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={i}
                x1="0"
                y1={i * 25}
                x2="100"
                y2={i * 25}
                stroke="#e2e8f0"
                strokeWidth="0.2"
              />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={i}
                x1={i * 25}
                y1="0"
                x2={i * 25}
                y2="100"
                stroke="#e2e8f0"
                strokeWidth="0.2"
              />
            ))}

            {/* Data lines */}
            {parameters.map(param => (
              <path
                key={param}
                d={generatePath(param)}
                fill="none"
                stroke={COLORS[param] || '#3b82f6'}
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* X-axis labels */}
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>{formatTimestamp(data[0].timestamp)}</span>
            {data.length > 1 && (
              <span>{formatTimestamp(data[data.length - 1].timestamp)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center justify-center gap-4 text-xs">
          {parameters.map(param => (
            <span key={param} className="flex items-center gap-1">
              <div 
                className="w-3 h-3" 
                style={{ backgroundColor: COLORS[param] || '#3b82f6' }}
              />
              {param}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
