import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Weight } from 'lucide-react';
import { SARFIProfile, SARFIProfileWeight, PQMeter } from '../../types/database';

export default function SARFIProfileManagement() {
  const [profiles, setProfiles] = useState<SARFIProfile[]>([]);
  const [meters, setMeters] = useState<PQMeter[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SARFIProfile | null>(null);
  const [weights, setWeights] = useState<SARFIProfileWeight[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingWeight, setEditingWeight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newProfile, setNewProfile] = useState({
    name: '',
    year: new Date().getFullYear(),
    description: '',
  });

  // TODO: Load profiles, meters, and weights from API
  useEffect(() => {
    // fetchProfiles();
    // fetchMeters();
  }, []);

  useEffect(() => {
    if (selectedProfile) {
      // fetchWeights(selectedProfile.id);
    }
  }, [selectedProfile]);

  const handleCreateProfile = async () => {
    setLoading(true);
    try {
      // TODO: API call to create profile
      // const response = await supabase.from('sarfi_profiles').insert(newProfile);
      setIsCreating(false);
      setNewProfile({ name: '', year: new Date().getFullYear(), description: '' });
    } catch (error) {
      console.error('Error creating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile? All associated weights will be deleted.')) {
      return;
    }
    setLoading(true);
    try {
      // TODO: API call to delete profile
      // await supabase.from('sarfi_profiles').delete().eq('id', profileId);
      setProfiles(profiles.filter(p => p.id !== profileId));
      if (selectedProfile?.id === profileId) {
        setSelectedProfile(null);
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWeight = async (weightId: string, newValue: number) => {
    setLoading(true);
    try {
      // TODO: API call to update weight
      // await supabase.from('sarfi_profile_weights').update({ weight_factor: newValue }).eq('id', weightId);
      setWeights(weights.map(w => w.id === weightId ? { ...w, weight_factor: newValue } : w));
      setEditingWeight(null);
    } catch (error) {
      console.error('Error updating weight:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWeight = async (meterId: string) => {
    if (!selectedProfile) return;
    setLoading(true);
    try {
      // TODO: API call to add weight
      // await supabase.from('sarfi_profile_weights').insert({
      //   profile_id: selectedProfile.id,
      //   meter_id: meterId,
      //   weight_factor: 1.0
      // });
    } catch (error) {
      console.error('Error adding weight:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">SARFI Profile Management</h1>
          <p className="text-slate-600 mt-2">
            Manage SARFI calculation profiles and meter weighting factors
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profiles List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Profiles</h2>
                <button
                  onClick={() => setIsCreating(true)}
                  className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {isCreating && (
                  <div className="p-4 bg-blue-50 space-y-3">
                    <input
                      type="text"
                      placeholder="Profile Name"
                      value={newProfile.name}
                      onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Year"
                      value={newProfile.year}
                      onChange={(e) => setNewProfile({ ...newProfile, year: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={newProfile.description}
                      onChange={(e) => setNewProfile({ ...newProfile, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateProfile}
                        disabled={!newProfile.name || loading}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4 inline mr-1" />
                        Save
                      </button>
                      <button
                        onClick={() => setIsCreating(false)}
                        className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {profiles.length === 0 && !isCreating && (
                  <div className="p-8 text-center text-slate-500">
                    <Weight className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No profiles yet</p>
                    <p className="text-xs mt-1">Click + to create one</p>
                  </div>
                )}

                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedProfile?.id === profile.id
                        ? 'bg-blue-50 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedProfile(profile)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{profile.name}</h3>
                        <p className="text-sm text-slate-600">Year: {profile.year}</p>
                        {profile.description && (
                          <p className="text-xs text-slate-500 mt-1">{profile.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              profile.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {profile.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProfile(profile.id);
                        }}
                        className="p-1 hover:bg-red-50 rounded text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weighting Factors */}
          <div className="lg:col-span-2">
            {selectedProfile ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">
                    Weighting Factors - {selectedProfile.name}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Configure meter-specific weighting factors for SARFI calculations
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                          Meter ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                          Voltage Level
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">
                          Weight Factor
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {weights.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            <Weight className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">No weighting factors configured</p>
                            <button
                              onClick={() => {/* TODO: Show meter selection */}}
                              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                            >
                              Add Meters
                            </button>
                          </td>
                        </tr>
                      )}

                      {weights.map((weight) => (
                        <tr key={weight.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {weight.meter?.meter_id || weight.meter_id}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {weight.meter?.location || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {weight.meter?.substation?.voltage_level || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {editingWeight === weight.id ? (
                              <input
                                type="number"
                                step="0.0001"
                                defaultValue={weight.weight_factor}
                                onBlur={(e) => handleUpdateWeight(weight.id, parseFloat(e.target.value))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateWeight(weight.id, parseFloat(e.currentTarget.value));
                                  }
                                }}
                                className="w-24 px-2 py-1 border border-blue-300 rounded text-sm text-center"
                                autoFocus
                              />
                            ) : (
                              <span className="text-sm font-semibold text-slate-900">
                                {weight.weight_factor.toFixed(4)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setEditingWeight(weight.id)}
                              className="p-1 hover:bg-blue-50 rounded text-blue-600"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <Weight className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Select a Profile
                </h3>
                <p className="text-slate-600">
                  Choose a profile from the list to view and edit weighting factors
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
