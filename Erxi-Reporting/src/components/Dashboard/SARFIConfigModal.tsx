import { useState } from 'react';
import { X, Settings } from 'lucide-react';
import { SARFIFilters, SARFIProfile } from '../../types/database';

interface SARFIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SARFIFilters;
  onApply: (filters: SARFIFilters) => void;
  profiles: SARFIProfile[];
}

export default function SARFIConfigModal({ 
  isOpen, 
  onClose, 
  filters, 
  onApply,
  profiles 
}: SARFIConfigModalProps) {
  const [localFilters, setLocalFilters] = useState<SARFIFilters>(filters);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleCancel = () => {
    setLocalFilters(filters); // Reset to original
    onClose();
  };

  const voltageLevels = ['All', '400kV', '132kV', '11kV', '380V', 'Others'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold text-white">SARFI Configuration</h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Profile Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Profile
            </label>
            <select
              value={localFilters.profileId}
              onChange={(e) => setLocalFilters({ ...localFilters, profileId: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="">Select Profile</option>
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} ({profile.year})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Profiles define weighting factors for SARFI calculations
            </p>
          </div>

          {/* Voltage Level */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Voltage Level
            </label>
            <select
              value={localFilters.voltageLevel}
              onChange={(e) => setLocalFilters({ ...localFilters, voltageLevel: e.target.value as any })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              {voltageLevels.map(level => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* Exclude Special Events */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Exclude Special Events
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Exclude events during typhoon or maintenance mode
              </p>
            </div>
            <button
              onClick={() => setLocalFilters({ 
                ...localFilters, 
                excludeSpecialEvents: !localFilters.excludeSpecialEvents 
              })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localFilters.excludeSpecialEvents ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localFilters.excludeSpecialEvents ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Data Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Data Type
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setLocalFilters({ ...localFilters, dataType: 'magnitude' })}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  localFilters.dataType === 'magnitude'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Magnitude
              </button>
              <button
                onClick={() => setLocalFilters({ ...localFilters, dataType: 'duration' })}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  localFilters.dataType === 'duration'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                disabled
                title="Coming soon"
              >
                Duration
                <span className="text-xs ml-1">(Soon)</span>
              </button>
            </div>
          </div>

          {/* Show Data Table */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Show Data Table
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Display detailed meter data below the chart
              </p>
            </div>
            <button
              onClick={() => setLocalFilters({ 
                ...localFilters, 
                showDataTable: !localFilters.showDataTable 
              })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localFilters.showDataTable ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localFilters.showDataTable ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!localFilters.profileId}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
