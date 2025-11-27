import { PieChart } from 'lucide-react';
import { PQEvent } from '../../types/database';

interface RootCauseChartProps {
  events: PQEvent[];
}

export default function RootCauseChart({ events }: RootCauseChartProps) {
  const rootCauseCounts = events.reduce((acc, event) => {
    const cause = event.root_cause || 'Unknown';
    acc[cause] = (acc[cause] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const rootCauseData = Object.entries(rootCauseCounts)
    .map(([cause, count]) => ({
      cause,
      count,
      percentage: (count / events.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  const colors = [
    'from-blue-500 to-blue-600',
    'from-cyan-500 to-cyan-600',
    'from-teal-500 to-teal-600',
    'from-green-500 to-green-600',
    'from-amber-500 to-amber-600',
    'from-orange-500 to-orange-600',
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <PieChart className="w-6 h-6 text-slate-700" />
        <h2 className="text-xl font-bold text-slate-900">Root Cause Analysis</h2>
      </div>

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
    </div>
  );
}
