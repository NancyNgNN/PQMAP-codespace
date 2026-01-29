import { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { SubstationMapFilters, SubstationMapProfile } from '../../types/database';

interface MapConfigModalProps {
  filters: SubstationMapFilters;
  onApply: (filters: SubstationMapFilters) => void;
  onClose: () => void;
}

export default function MapConfigModal({ filters, onApply, onClose }: MapConfigModalProps) {
  const [startDate, setStartDate] = useState(filters.startDate || '');
  const [endDate, setEndDate] = useState(filters.endDate || '');
  const [includeFalseEvents, setIncludeFalseEvents] = useState(filters.includeFalseEvents ?? false);
  const [motherEventsOnly, setMotherEventsOnly] = useState(filters.motherEventsOnly ?? true);
  const [voltageLevels, setVoltageLevels] = useState<string[]>(filters.voltageLevels || []);
  const [profiles, setProfiles] = useState<SubstationMapProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState(filters.profileId || '');
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDescription, setNewProfileDescription] = useState('');
  
  // Available voltage levels
  const availableVoltageLevels = ['400kV', '132kV', '33kV', '11kV', '380V'];

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    const saved = localStorage.getItem('substationMapProfiles');
    if (saved) {
      const parsedProfiles = JSON.parse(saved);
      setProfiles(parsedProfiles);
    }
  };

  const saveProfiles = (updatedProfiles: SubstationMapProfile[]) => {
    localStorage.setItem('substationMapProfiles', JSON.stringify(updatedProfiles));
    setProfiles(updatedProfiles);
  };

  const handleLoadProfile = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setStartDate(profile.start_date);
      setEndDate(profile.end_date);
      setSelectedProfileId(profileId);
    }
  };
  
  const handleToggleVoltageLevel = (level: string) => {
    if (voltageLevels.includes(level)) {
      setVoltageLevels(voltageLevels.filter(v => v !== level));
    } else {
      setVoltageLevels([...voltageLevels, level]);
    }
  };

  const handleSaveNewProfile = () => {
    if (!newProfileName.trim() || !startDate || !endDate) {
      alert('Please provide profile name and date range');
      return;
    }

    const newProfile: SubstationMapProfile = {
      id: Date.now().toString(),
      name: newProfileName.trim(),
      description: newProfileDescription.trim() || null,
      start_date: startDate,
      end_date: endDate,
      is_default: profiles.length === 0, // First profile becomes default
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    saveProfiles([...profiles, newProfile]);
    setNewProfileName('');
    setNewProfileDescription('');
    setShowNewProfile(false);
    setSelectedProfileId(newProfile.id);
  };

  const handleDeleteProfile = (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    
    const updatedProfiles = profiles.filter(p => p.id !== profileId);
    
    // If deleted profile was default, make first profile default
    if (profiles.find(p => p.id === profileId)?.is_default && updatedProfiles.length > 0) {
      updatedProfiles[0].is_default = true;
    }
    
    saveProfiles(updatedProfiles);
    
    if (selectedProfileId === profileId) {
      setSelectedProfileId('');
    }
  };

  const handleSetDefault = (profileId: string) => {
    const updatedProfiles = profiles.map(p => ({
      ...p,
      is_default: p.id === profileId
    }));
    saveProfiles(updatedProfiles);
  };

  const handleApply = () => {
    onApply({
      profileId: selectedProfileId,
      startDate,
      endDate,
      includeFalseEvents,
      motherEventsOnly,
      voltageLevels
    });
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setIncludeFalseEvents(false);
    setMotherEventsOnly(true);
    setVoltageLevels([]);
    setSelectedProfileId('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Map Configuration</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Date Range Filter */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Date Range Filter</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          
          {/* Event Type Filters */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Event Type Filters</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeFalseEvents}
                  onChange={(e) => setIncludeFalseEvents(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Include False Events</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={motherEventsOnly}
                  onChange={(e) => setMotherEventsOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Mother Events Only</span>
              </label>
            </div>
          </div>
          
          {/* Voltage Level Filter */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Voltage Level</h3>
            <div className="space-y-2">
              {availableVoltageLevels.map(level => (
                <label key={level} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voltageLevels.includes(level)}
                    onChange={() => handleToggleVoltageLevel(level)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">{level}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Saved Profiles */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Saved Profiles</h3>
              <button
                onClick={() => setShowNewProfile(!showNewProfile)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
              >
                {showNewProfile ? 'Cancel' : '+ New Profile'}
              </button>
            </div>

            {/* New Profile Form */}
            {showNewProfile && (
              <div className="bg-slate-50 p-4 rounded-lg mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Profile Name *
                  </label>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g., Q1 2024"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newProfileDescription}
                    onChange={(e) => setNewProfileDescription(e.target.value)}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSaveNewProfile}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Profile
                </button>
              </div>
            )}

            {/* Profile List */}
            {profiles.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No saved profiles. Create one to save your date range preferences.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {profiles.map(profile => (
                  <div
                    key={profile.id}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      selectedProfileId === profile.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLoadProfile(profile.id)}
                            className="text-left flex-1"
                          >
                            <div className="font-semibold text-slate-900">
                              {profile.name}
                              {profile.is_default && (
                                <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            {profile.description && (
                              <div className="text-sm text-slate-600 mt-0.5">
                                {profile.description}
                              </div>
                            )}
                            <div className="text-xs text-slate-500 mt-1">
                              {profile.start_date} to {profile.end_date}
                            </div>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {!profile.is_default && (
                          <button
                            onClick={() => handleSetDefault(profile.id)}
                            className="p-1.5 hover:bg-slate-100 rounded text-xs text-slate-600"
                            title="Set as default"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteProfile(profile.id)}
                          className="p-1.5 hover:bg-red-50 rounded text-red-600"
                          title="Delete profile"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
          >
            Clear Filters
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
