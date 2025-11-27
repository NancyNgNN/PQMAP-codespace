import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PQMeter, Substation } from '../types/database';
import { Database, MapPin, Activity, Calendar } from 'lucide-react';

export default function AssetManagement() {
  const [meters, setMeters] = useState<PQMeter[]>([]);
  const [substations, setSubstations] = useState<Substation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [metersRes, substationsRes] = await Promise.all([
        supabase.from('pq_meters').select('*'),
        supabase.from('substations').select('*'),
      ]);

      if (!metersRes.error) setMeters(metersRes.data);
      if (!substationsRes.error) setSubstations(substationsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const substationMap = substations.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {} as Record<string, Substation>);

  const filteredMeters = meters.filter(m => filter === 'all' || m.status === filter);

  const statusStats = {
    active: meters.filter(m => m.status === 'active').length,
    abnormal: meters.filter(m => m.status === 'abnormal').length,
    inactive: meters.filter(m => m.status === 'inactive').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-8 h-8 text-slate-700" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Asset Management</h1>
          <p className="text-slate-600 mt-1">Monitor power quality meters and equipment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Active Meters</p>
              <p className="text-3xl font-bold text-green-600">{statusStats.active}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-xl">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Abnormal Meters</p>
              <p className="text-3xl font-bold text-orange-600">{statusStats.abnormal}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-xl">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Inactive Meters</p>
              <p className="text-3xl font-bold text-red-600">{statusStats.inactive}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-xl">
              <Activity className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Meter Inventory</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="abnormal">Abnormal</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Meter ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Substation</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Location</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Last Communication</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Firmware</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeters.map((meter) => {
                const substation = substationMap[meter.substation_id];
                return (
                  <tr key={meter.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{meter.meter_id}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{substation?.name || 'Unknown'}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{meter.location}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        meter.status === 'active' ? 'bg-green-100 text-green-700' :
                        meter.status === 'abnormal' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {meter.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {new Date(meter.last_communication).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">{meter.firmware_version}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
