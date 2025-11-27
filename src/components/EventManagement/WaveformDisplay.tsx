import { WaveformData } from '../../types/database';
import { TrendingUp } from 'lucide-react';

interface WaveformDisplayProps {
  data: WaveformData;
}

export default function WaveformDisplay({ data }: WaveformDisplayProps) {
  const { voltage, current, timestamps } = data;

  const maxVoltage = Math.max(...voltage);
  const minVoltage = Math.min(...voltage);
  const maxCurrent = Math.max(...current);
  const minCurrent = Math.min(...current);

  const normalizeVoltage = (v: number) => {
    return ((v - minVoltage) / (maxVoltage - minVoltage)) * 80 + 10;
  };

  const normalizeCurrent = (c: number) => {
    return ((c - minCurrent) / (maxCurrent - minCurrent)) * 80 + 10;
  };

  const voltagePath = voltage
    .map((v, i) => {
      const x = (i / voltage.length) * 100;
      const y = 100 - normalizeVoltage(v);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const currentPath = current
    .map((c, i) => {
      const x = (i / current.length) * 100;
      const y = 100 - normalizeCurrent(c);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-900">Waveform Analysis</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-500"></div>
            <span className="text-xs text-slate-600">Voltage</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-cyan-500"></div>
            <span className="text-xs text-slate-600">Current</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-lg">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-64"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="voltageGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0.2 }} />
            </linearGradient>
            <linearGradient id="currentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#06b6d4', stopOpacity: 0.2 }} />
            </linearGradient>
          </defs>

          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1="0"
              y1={i * 10}
              x2="100"
              y2={i * 10}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.2"
            />
          ))}

          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={i * 10}
              y1="0"
              x2={i * 10}
              y2="100"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.2"
            />
          ))}

          <path
            d={currentPath}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="0.5"
            opacity="0.7"
          />

          <path
            d={voltagePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="0.8"
          />
        </svg>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-600 mb-1">Peak Voltage</p>
          <p className="text-lg font-bold text-slate-900">{maxVoltage.toFixed(2)}%</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-600 mb-1">Min Voltage</p>
          <p className="text-lg font-bold text-slate-900">{minVoltage.toFixed(2)}%</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-600 mb-1">Peak Current</p>
          <p className="text-lg font-bold text-slate-900">{maxCurrent.toFixed(2)}%</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-600 mb-1">Sampling Rate</p>
          <p className="text-lg font-bold text-slate-900">{data.sampling_rate}Hz</p>
        </div>
      </div>
    </div>
  );
}
