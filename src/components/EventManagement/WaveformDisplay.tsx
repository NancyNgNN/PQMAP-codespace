import { WaveformData } from '../../types/database';
import { TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface WaveformDisplayProps {
  data: WaveformData;
}

export default function WaveformDisplay({ data }: WaveformDisplayProps) {
  const { voltage, current } = data;

  const voltageValues = voltage.map((point) => point.value);
  const currentValues = current.map((point) => point.value);

  if (voltageValues.length === 0 || currentValues.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        No waveform data available
      </div>
    );
  }

  const maxVoltage = Math.max(...voltageValues);
  const minVoltage = Math.min(...voltageValues);
  const maxCurrent = Math.max(...currentValues);
  const minCurrent = Math.min(...currentValues);

  const pointCount = Math.min(voltage.length, current.length);
  const chartData = Array.from({ length: pointCount }).map((_, index) => {
    const voltagePoint = voltage[index];
    const currentPoint = current[index];
    return {
      time: voltagePoint?.time ?? currentPoint?.time ?? index,
      voltage: voltagePoint?.value ?? null,
      current: currentPoint?.value ?? null,
    };
  });

  const samplingRate =
    voltage.length > 1 && voltage[1].time > voltage[0].time
      ? Math.round(1 / (voltage[1].time - voltage[0].time))
      : 1000;

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
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
              <XAxis dataKey="time" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                formatter={(value) => {
                  if (typeof value === 'number') return value.toFixed(2);
                  if (typeof value === 'string') return value;
                  if (value == null) return '';
                  return String(value);
                }}
                labelFormatter={(label) => `t=${label}`}
              />
              <Line
                type="monotone"
                dataKey="current"
                dot={false}
                stroke="#06b6d4"
                strokeWidth={1}
                isAnimationActive={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="voltage"
                dot={false}
                stroke="#3b82f6"
                strokeWidth={1.5}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
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
          <p className="text-xs text-slate-500 mt-1">Min: {minCurrent.toFixed(2)}%</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-600 mb-1">Sampling Rate</p>
          <p className="text-lg font-bold text-slate-900">{samplingRate}Hz</p>
        </div>
      </div>
    </div>
  );
}
