import { useState, useEffect } from 'react';
import { X, Save, Trash2, Edit2 } from 'lucide-react';
import { LoadType } from '../../types/database';

interface MeterMapFilters {
  loadTypes: LoadType[];
  voltageLevels: string[];
  substations: string[];
  searchText: string;
  profileId: string;
}

interface FilterProfile {
  id: string;
  name: string;
  filters: Omit<MeterMapFilters, 'profileId'>;
}

interface MeterMapConfigModalProps {
  filters: MeterMapFilters;
  onApply: (filters: MeterMapFilters) => void;
  onClose: () => void;
  uniqueLoadTypes: LoadType[];
  uniqueVoltageLevels: string[];
  substations: Array<{ id: string; name: string }>;
}

const LOAD_TYPE_COLORS: Record<LoadType, string> = {
  'DC': '#9333EA',
  'EV': '#06B6D4',
  'RE-PV': '#22C55E',
  'RES-HRB': '#EF4444',
  'RES-NOC': '#3B82F6',
  'RES': '#F59E0B',
  'others': '#EAB308'
};

export default function MeterMapConfigModal({
  filters,
  onApply,
  onClose,
  uniqueLoadTypes,
  uniqueVoltageLevels,
  substations
}: MeterMapConfigModalProps) {
  const [localFilters, setLocalFilters] = useState<MeterMapFilters>(filters);
  const [profiles, setProfiles] = useState<FilterProfile[]>(() => {
    const saved = localStorage.getItem('meterMapProfiles');
    return saved ? JSON.parse(saved) : [];
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('meterMapProfiles', JSON.stringify(profiles));
  }, [profiles]);

  const handleSaveProfile = () => {
    if (!profileName.trim()) {
      alert('Please enter a profile name');
      return;
    }

    const filterData = {
      loadTypes: localFilters.loadTypes,
      voltageLevels: localFilters.voltageLevels,
      substations: localFilters.substations,
      searchText: localFilters.searchText
    };

    if (editingProfileId) {
      setProfiles(profiles.map(p =>
        p.id === editingProfileId
          ? { ...p, name: profileName, filters: filterData }
          : p
      ));
    } else {
      const newProfile: FilterProfile = {
        id: Date.now().toString(),
        name: profileName,
        filters: filterData
      };
      setProfiles([...profiles, newProfile]);
    }

    setShowProfileModal(false);
    setProfileName('');
    setEditingProfileId(null);
  };

  const handleLoadProfile = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setLocalFilters({
        ...profile.filters,
        profileId: profileId
      });
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    if (confirm('Are you sure you want to delete this profile?')) {
      setProfiles(profiles.filter(p => p.id !== profileId));
      if (localFilters.profileId === profileId) {
        setLocalFilters({ ...localFilters, profileId: '' });
      }
    }
  };

  const handleEditProfile = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setProfileName(profile.name);
      setEditingProfileId(profileId);
      setShowProfileModal(true);
    }
  };

  const handleClearFilters = () => {
    setLocalFilters({
      loadTypes: [],
      voltageLevels: [],
      substations: [],
      searchText: '',
      profileId: ''
    });
  };

  const handleApply = () => {
    onApply(localFilters);
  };

  const activeFilterCount =
    localFilters.loadTypes.length +
    localFilters.voltageLevels.length +
    localFilters.substations.length +
    (localFilters.searchText ? 1 : 0);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Configure Meter Map Filters</h3>
              <p className="text-sm text-slate-600 mt-1">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Profile Management */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Filter Profile
              </label>
              <div className="flex gap-2">
                <select
                  value={localFilters.profileId}
                  onChange={(e) => handleLoadProfile(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a profile...</option>
                  {profiles.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setProfileName('');
                    setEditingProfileId(null);
                    setShowProfileModal(true);
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                  title="Save Current Filters"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
              {localFilters.profileId && (
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => handleEditProfile(localFilters.profileId)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProfile(localFilters.profileId)}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={localFilters.searchText}
                onChange={(e) => setLocalFilters({ ...localFilters, searchText: e.target.value })}
                placeholder="Meter ID or Site ID..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Load Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Load Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {uniqueLoadTypes.map(loadType => (
                  <label key={loadType} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={localFilters.loadTypes.includes(loadType)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLocalFilters({ ...localFilters, loadTypes: [...localFilters.loadTypes, loadType] });
                        } else {
                          setLocalFilters({ ...localFilters, loadTypes: localFilters.loadTypes.filter(t => t !== loadType) });
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: LOAD_TYPE_COLORS[loadType] }}
                      />
                      <span className="text-sm text-slate-700">{loadType}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Voltage Level Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Voltage Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                {uniqueVoltageLevels.map(level => (
                  <label key={level} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={localFilters.voltageLevels.includes(level)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLocalFilters({ ...localFilters, voltageLevels: [...localFilters.voltageLevels, level] });
                        } else {
                          setLocalFilters({ ...localFilters, voltageLevels: localFilters.voltageLevels.filter(l => l !== level) });
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{level}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Substation Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Substation
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-3">
                {substations.map(substation => (
                  <label key={substation.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={localFilters.substations.includes(substation.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLocalFilters({ ...localFilters, substations: [...localFilters.substations, substation.id] });
                        } else {
                          setLocalFilters({ ...localFilters, substations: localFilters.substations.filter(s => s !== substation.id) });
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{substation.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 flex gap-2">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Save Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingProfileId ? 'Edit Profile' : 'Save Filter Profile'}
            </h3>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Profile name..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setProfileName('');
                  setEditingProfileId(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
