import { Wrench, Plus, CheckCircle } from 'lucide-react';

export default function PQServices() {
  const services = [
    {
      id: 1,
      customer: 'Hong Kong Hospital',
      date: '2025-10-28',
      type: 'Harmonic Analysis',
      findings: 'THD within acceptable limits. Minor harmonics from medical equipment detected.',
      recommendations: 'Install harmonic filters on MRI equipment to reduce 5th and 7th harmonics.',
      standard: 'IEEE519',
      status: 'completed',
    },
    {
      id: 2,
      customer: 'MTR Corporation',
      date: '2025-10-25',
      type: 'Site Survey',
      findings: 'Voltage fluctuations during peak hours. Power factor at 0.85.',
      recommendations: 'Install power factor correction capacitors. Consider load balancing.',
      standard: 'IEC61000',
      status: 'completed',
    },
    {
      id: 3,
      customer: 'Shopping Mall 3',
      date: '2025-10-20',
      type: 'Consultation',
      findings: 'Frequent voltage dips affecting escalators and HVAC systems.',
      recommendations: 'Upgrade transformer capacity. Install voltage regulators.',
      standard: 'ITIC',
      status: 'completed',
    },
  ];

  const standards = [
    { name: 'ITIC Curve', description: 'Information Technology Industry Council power acceptability curve' },
    { name: 'SEMI F47', description: 'Semiconductor equipment power quality requirements' },
    { name: 'IEC 61000', description: 'Electromagnetic compatibility standards' },
    { name: 'IEEE 519', description: 'Harmonic control in electrical power systems' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="w-8 h-8 text-slate-700" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">PQ Services</h1>
            <p className="text-slate-600 mt-1">Power quality consultation and service records</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all">
          <Plus className="w-5 h-5" />
          <span className="font-semibold">New Service Record</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <p className="text-sm font-medium text-slate-600 mb-2">Total Services</p>
          <p className="text-3xl font-bold text-slate-900">{services.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <p className="text-sm font-medium text-slate-600 mb-2">This Month</p>
          <p className="text-3xl font-bold text-blue-600">8</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <p className="text-sm font-medium text-slate-600 mb-2">Site Surveys</p>
          <p className="text-3xl font-bold text-cyan-600">12</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <p className="text-sm font-medium text-slate-600 mb-2">Consultations</p>
          <p className="text-3xl font-bold text-teal-600">15</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Service Records</h2>
        <div className="space-y-4">
          {services.map((service) => (
            <div key={service.id} className="p-5 border border-slate-200 rounded-lg hover:border-slate-300 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{service.customer}</h3>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {service.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>{service.date}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-semibold">
                      {service.type}
                    </span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-semibold">
                      {service.standard}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Findings</p>
                  <p className="text-sm text-slate-600">{service.findings}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Recommendations</p>
                  <p className="text-sm text-slate-600">{service.recommendations}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg p-6 text-white">
        <h2 className="text-xl font-bold mb-4">Benchmark Standards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {standards.map((standard, index) => (
            <div key={index} className="p-4 bg-white/10 rounded-lg backdrop-blur">
              <p className="font-semibold mb-2">{standard.name}</p>
              <p className="text-sm opacity-75">{standard.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
