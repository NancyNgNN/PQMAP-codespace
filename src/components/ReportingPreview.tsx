import { FileText, Activity, Info } from 'lucide-react';

export default function ReportingPreview() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-8 h-8 text-slate-700" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reporting (Preview)</h1>
          <p className="text-slate-600 mt-1">Early access reporting features for phased testing</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-3 rounded-xl">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Meter Communication (Preview)</h2>
              <p className="text-sm text-slate-600 mt-1">Availability reporting based on meter communication data</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
            Preview
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-1">Data Source</p>
            <p className="text-sm font-semibold text-slate-900">meter_voltage_readings</p>
            <p className="text-xs text-slate-500 mt-1">Latest readings per meter (server-side ingestion)</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-1">Phase Target</p>
            <p className="text-sm font-semibold text-slate-900">Phase 3</p>
            <p className="text-xs text-slate-500 mt-1">Replace mock data with live queries</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-1">Exports</p>
            <p className="text-sm font-semibold text-slate-900">CSV / Excel</p>
            <p className="text-xs text-slate-500 mt-1">Follow standard export patterns</p>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Phase 1 Scaffold</p>
            <p className="text-sm text-blue-800 mt-1">
              This page is intentionally lightweight for testing navigation and permissions. Data-driven views will
              be integrated in later phases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}