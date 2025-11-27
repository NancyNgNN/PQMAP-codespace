import { TrendingUp } from 'lucide-react';
import { SARFIMetrics } from '../../types/database';

interface SARFIChartProps {
  metrics: SARFIMetrics[];
}

export default function SARFIChart({ metrics }: SARFIChartProps) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const aggregatedData = metrics.reduce((acc, metric) => {
    const key = `${metric.period_year}-${metric.period_month}`;
    if (!acc[key]) {
      acc[key] = {
        year: metric.period_year,
        month: metric.period_month,
        sarfi_70: 0,
        sarfi_80: 0,
        sarfi_90: 0,
        count: 0,
      };
    }
    acc[key].sarfi_70 += metric.sarfi_70;
    acc[key].sarfi_80 += metric.sarfi_80;
    acc[key].sarfi_90 += metric.sarfi_90;
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(aggregatedData).map((d: any) => ({
    label: `${monthNames[d.month - 1]} ${d.year}`,
    sarfi_70: d.sarfi_70 / d.count,
    sarfi_80: d.sarfi_80 / d.count,
    sarfi_90: d.sarfi_90 / d.count,
  }));

  const maxValue = Math.max(
    ...chartData.flatMap(d => [d.sarfi_70, d.sarfi_80, d.sarfi_90])
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-slate-700" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">SARFI Metrics Trend</h2>
            <p className="text-sm text-slate-600">System Average RMS Variation Frequency Index</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs text-slate-600">SARFI-70</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
            <span className="text-xs text-slate-600">SARFI-80</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-500"></div>
            <span className="text-xs text-slate-600">SARFI-90</span>
          </div>
        </div>
      </div>

      <div className="relative h-64">
        <div className="absolute inset-0 flex items-end justify-between gap-2">
          {chartData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center gap-0.5 h-48">
                <div
                  className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t w-full transition-all hover:opacity-80"
                  style={{ height: `${(data.sarfi_70 / maxValue) * 100}%` }}
                  title={`SARFI-70: ${data.sarfi_70.toFixed(2)}`}
                />
                <div
                  className="bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t w-full transition-all hover:opacity-80"
                  style={{ height: `${(data.sarfi_80 / maxValue) * 100}%` }}
                  title={`SARFI-80: ${data.sarfi_80.toFixed(2)}`}
                />
                <div
                  className="bg-gradient-to-t from-teal-500 to-teal-400 rounded-t w-full transition-all hover:opacity-80"
                  style={{ height: `${(data.sarfi_90 / maxValue) * 100}%` }}
                  title={`SARFI-90: ${data.sarfi_90.toFixed(2)}`}
                />
              </div>
              <span className="text-xs text-slate-600 font-medium">{data.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-600 mb-1">Avg SARFI-70</p>
            <p className="text-lg font-bold text-slate-900">
              {(chartData.reduce((acc, d) => acc + d.sarfi_70, 0) / chartData.length).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Avg SARFI-80</p>
            <p className="text-lg font-bold text-slate-900">
              {(chartData.reduce((acc, d) => acc + d.sarfi_80, 0) / chartData.length).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Avg SARFI-90</p>
            <p className="text-lg font-bold text-slate-900">
              {(chartData.reduce((acc, d) => acc + d.sarfi_90, 0) / chartData.length).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
