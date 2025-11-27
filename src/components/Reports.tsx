import { FileText, Download, Calendar } from 'lucide-react';
import { useState } from 'react';

export default function Reports() {
  const [selectedReportType, setSelectedReportType] = useState('supply_reliability');

  const reportTypes = [
    { id: 'supply_reliability', name: 'Supply Reliability Report', description: 'IDR and fault analysis' },
    { id: 'annual_pq', name: 'Annual PQ Performance', description: 'EN50160 and IEEE519 compliance' },
    { id: 'meter_availability', name: 'Meter Availability', description: 'Communication and uptime stats' },
    { id: 'customer_impact', name: 'Customer Impact Analysis', description: 'Affected customers and downtime' },
    { id: 'harmonic_analysis', name: 'Harmonic Analysis', description: 'THD trends and violations' },
    { id: 'voltage_quality', name: 'Voltage Quality', description: 'Dips, swells, and interruptions' },
  ];

  const recentReports = [
    { title: 'Q3 2025 Supply Reliability', date: '2025-10-15', type: 'supply_reliability', status: 'completed' },
    { title: 'September 2025 PQ Performance', date: '2025-10-01', type: 'annual_pq', status: 'completed' },
    { title: 'Meter Availability - Week 40', date: '2025-10-08', type: 'meter_availability', status: 'completed' },
    { title: 'Harmonic Analysis - Central District', date: '2025-10-12', type: 'harmonic_analysis', status: 'completed' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-8 h-8 text-slate-700" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reporting Tools</h1>
          <p className="text-slate-600 mt-1">Generate and manage power quality reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Generate New Report</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Report Type</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reportTypes.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => setSelectedReportType(type.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedReportType === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">{type.name}</p>
                    <p className="text-sm text-slate-600 mt-1">{type.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Start Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  defaultValue="2025-10-01"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">End Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  defaultValue="2025-10-31"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Report Format</label>
              <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option>PDF Document</option>
                <option>Excel Spreadsheet</option>
                <option>CSV Data Export</option>
                <option>HTML Report</option>
              </select>
            </div>

            <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
              Generate Report
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Reports</h2>
          <div className="space-y-3">
            {recentReports.map((report, index) => (
              <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-sm">{report.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <p className="text-xs text-slate-600">{report.date}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    {report.status}
                  </span>
                </div>
                <button className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium text-slate-700">
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg p-6 text-white">
        <h2 className="text-xl font-bold mb-4">Report Standards Compliance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white/10 rounded-lg backdrop-blur">
            <p className="text-sm font-medium mb-2 opacity-90">EN 50160</p>
            <p className="text-2xl font-bold">98.2%</p>
            <p className="text-xs mt-1 opacity-75">Voltage quality standard</p>
          </div>
          <div className="p-4 bg-white/10 rounded-lg backdrop-blur">
            <p className="text-sm font-medium mb-2 opacity-90">IEEE 519</p>
            <p className="text-2xl font-bold">95.8%</p>
            <p className="text-xs mt-1 opacity-75">Harmonic control standard</p>
          </div>
          <div className="p-4 bg-white/10 rounded-lg backdrop-blur">
            <p className="text-sm font-medium mb-2 opacity-90">IEC 61000</p>
            <p className="text-2xl font-bold">97.5%</p>
            <p className="text-xs mt-1 opacity-75">EMC standard compliance</p>
          </div>
        </div>
      </div>
    </div>
  );
}
