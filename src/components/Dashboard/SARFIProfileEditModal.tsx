import { useState, useEffect } from 'react';
import { X, Edit2, ChevronDown } from 'lucide-react';
import { SARFIProfile, PQMeter } from '../../types/database';
import { supabase } from '../../lib/supabase';

interface SARFIProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SARFIProfile | null;
  onSave: () => void;
}

export default function SARFIProfileEditModal({ 
  isOpen, 
  onClose, 
  profile,
  onSave
}: SARFIProfileEditModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMeterIds, setSelectedMeterIds] = useState<string[]>([]);
  const [meters, setMeters] = useState<PQMeter[]>([]);
  const [showMeterDropdown, setShowMeterDropdown] = useState(false);
  const [meterSearchQuery, setMeterSearchQuery] = useState('');
  const [voltageFilter, setVoltageFilter] = useState<string>('All');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadMeters();
      if (profile) {
        setName(profile.name);
        setDescription(profile.description || '');
        loadProfileMeters(profile.id);
      } else {
        // New profile defaults
        setName('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setSelectedMeterIds([]);
      }
    }
  }, [isOpen, profile]);

  const loadMeters = async () => {
    const { data, error } = await supabase
      .from('pq_meters')
      .select('*')
      .order('meter_id', { ascending: true });

    if (error) {
      console.error('❌ Error loading meters:', error);
    } else {
      setMeters(data || []);
    }
  };

  const loadProfileMeters = async (profileId: string) => {
    const { data, error } = await supabase
      .from('sarfi_profile_weights')
      .select('meter_id')
      .eq('profile_id', profileId);

    if (error) {
      console.error('❌ Error loading profile meters:', error);
    } else {
      setSelectedMeterIds(data?.map(w => w.meter_id) || []);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Profile name is required';
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.dateRange = 'End date must be after start date';
    }

    if (selectedMeterIds.length === 0) {
      newErrors.meters = 'At least one meter must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (profile) {
        // Update existing profile
        const profileYear = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear();
        const { error: updateError } = await supabase
          .from('sarfi_profiles')
          .update({
            name,
            description: description || null,
            year: profileYear,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) throw updateError;

        // Delete old weights
        await supabase
          .from('sarfi_profile_weights')
          .delete()
          .eq('profile_id', profile.id);

        // Insert new weights
        const weights = selectedMeterIds.map(meterId => ({
          profile_id: profile.id,
          meter_id: meterId,
          weight_factor: 1.0, // Default weight
          notes: startDate && endDate ? `Date Range: ${startDate} to ${endDate}` : null
        }));

        const { error: weightsError } = await supabase
          .from('sarfi_profile_weights')
          .insert(weights);

        if (weightsError) throw weightsError;

        console.log('✅ Profile updated successfully');
      } else {
        // Create new profile
        const profileYear = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear();
        const { data: newProfile, error: createError } = await supabase
          .from('sarfi_profiles')
          .insert({
            name,
            description: description || null,
            year: profileYear,
            is_active: false,
            created_by: user.id
          })
          .select()
          .single();

        if (createError) throw createError;

        // Insert weights
        const weights = selectedMeterIds.map(meterId => ({
          profile_id: newProfile.id,
          meter_id: meterId,
          weight_factor: 1.0,
          notes: startDate && endDate ? `Date Range: ${startDate} to ${endDate}` : null
        }));

        const { error: weightsError } = await supabase
          .from('sarfi_profile_weights')
          .insert(weights);

        if (weightsError) throw weightsError;

        console.log('✅ Profile created successfully');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMeter = (meterId: string) => {
    setSelectedMeterIds(prev => 
      prev.includes(meterId)
        ? prev.filter(id => id !== meterId)
        : [...prev, meterId]
    );
  };

  // Date quick filters
  const handleDateQuickFilter = (filter: 'today' | 'last7days' | 'lastMonth' | 'thisYear') => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (filter) {
      case 'today':
        setStartDate(formatDate(today));
        setEndDate(formatDate(today));
        break;
      case 'last7days':
        const last7 = new Date(today);
        last7.setDate(today.getDate() - 7);
        setStartDate(formatDate(last7));
        setEndDate(formatDate(today));
        break;
      case 'lastMonth':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(formatDate(lastMonthStart));
        setEndDate(formatDate(lastMonthEnd));
        break;
      case 'thisYear':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear(), 11, 31);
        setStartDate(formatDate(yearStart));
        setEndDate(formatDate(yearEnd));
        break;
    }
  };

  // Meter quick select by voltage level
  const handleQuickSelectVoltage = (voltageLevel: string) => {
    const filtered = meters.filter(m => 
      m.voltage_level === voltageLevel &&
      (!showActiveOnly || m.active)
    );
    setSelectedMeterIds(filtered.map(m => m.id));
  };

  const handleSelectAllMeters = () => {
    const filtered = getFilteredMeters();
    setSelectedMeterIds(filtered.map(m => m.id));
  };

  const handleClearAllMeters = () => {
    setSelectedMeterIds([]);
  };

  const getFilteredMeters = () => {
    let filtered = meters;

    // Filter by active status
    if (showActiveOnly) {
      filtered = filtered.filter(m => m.active);
    }

    // Filter by voltage level
    if (voltageFilter !== 'All') {
      filtered = filtered.filter(m => m.voltage_level === voltageFilter);
    }

    // Filter by search query
    if (meterSearchQuery) {
      const query = meterSearchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.meter_id.toLowerCase().includes(query) ||
        m.location?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredMeters = getFilteredMeters();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Edit2 className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold text-white">
              {profile ? 'Edit Profile' : 'Create New Profile'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Profile Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Profile Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="e.g., 2025 Annual Profile"
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Optional description"
              rows={2}
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Date Range
            </label>
            {/* Quick Date Filters */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleDateQuickFilter('today')}
                className="flex-1 px-2 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-medium transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleDateQuickFilter('last7days')}
                className="flex-1 px-2 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-medium transition-colors"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => handleDateQuickFilter('lastMonth')}
                className="flex-1 px-2 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-medium transition-colors"
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => handleDateQuickFilter('thisYear')}
                className="flex-1 px-2 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-medium transition-colors"
              >
                This Year
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>
            {errors.dateRange && (
              <p className="text-xs text-red-600 mt-1">{errors.dateRange}</p>
            )}
          </div>

          {/* PQ Meters Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select PQ Meters * ({selectedMeterIds.length} selected)
            </label>
            
            {/* Quick Select by Voltage Level */}
            <div className="mb-3 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleQuickSelectVoltage('400kV')}
                  className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium transition-colors"
                >
                  ⚡ 400kV
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelectVoltage('132kV')}
                  className="px-2 py-1 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded text-xs font-medium transition-colors"
                >
                  ⚡ 132kV
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelectVoltage('33kV')}
                  className="px-2 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded text-xs font-medium transition-colors"
                >
                  ⚡ 33kV
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelectVoltage('11kV')}
                  className="px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-medium transition-colors"
                >
                  ⚡ 11kV
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelectVoltage('380V')}
                  className="px-2 py-1 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded text-xs font-medium transition-colors"
                >
                  ⚡ 380V
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Click to auto-select all meters of that voltage level
              </p>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowMeterDropdown(!showMeterDropdown)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-left flex items-center justify-between hover:border-blue-500 transition-colors"
              >
                <span className="text-slate-700">
                  {selectedMeterIds.length === 0 
                    ? 'Select meters...' 
                    : `${selectedMeterIds.length} meter(s) selected`}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {showMeterDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-96 overflow-hidden flex flex-col">
                  {/* Filters & Search */}
                  <div className="p-2 border-b border-slate-200 space-y-2 flex-shrink-0">
                    {/* Voltage Level Filter */}
                    <select
                      value={voltageFilter}
                      onChange={(e) => setVoltageFilter(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="All">All Voltage Levels</option>
                      <option value="400kV">400kV</option>
                      <option value="132kV">132kV</option>
                      <option value="33kV">33kV</option>
                      <option value="11kV">11kV</option>
                      <option value="380V">380V</option>
                    </select>
                    
                    {/* Active Filter */}
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showActiveOnly}
                        onChange={(e) => setShowActiveOnly(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      Show active meters only
                    </label>

                    {/* Search */}
                    <input
                      type="text"
                      value={meterSearchQuery}
                      onChange={(e) => setMeterSearchQuery(e.target.value)}
                      placeholder="Search meters..."
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    {/* Select All / Clear All */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAllMeters}
                        className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        onClick={handleClearAllMeters}
                        className="flex-1 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded text-xs font-medium transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Meter List */}
                  <div className="overflow-y-auto flex-1">
                    {filteredMeters.length === 0 ? (
                      <div className="p-3 text-sm text-slate-500 text-center">
                        No meters found
                      </div>
                    ) : (
                      filteredMeters.map((meter) => (
                        <label
                          key={meter.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMeterIds.includes(meter.id)}
                            onChange={() => handleToggleMeter(meter.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-900">
                              {meter.meter_id}
                            </div>
                            {meter.location && (
                              <div className="text-xs text-slate-500">
                                {meter.location}
                              </div>
                            )}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {errors.meters && (
              <p className="text-xs text-red-600 mt-1">{errors.meters}</p>
            )}
          </div>

          <p className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg">
            ℹ️ Selected meters will be included in SARFI calculations with default weight factor of 1.0. 
            You can adjust individual weights later in the profile management section.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex gap-3 justify-end flex-shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
