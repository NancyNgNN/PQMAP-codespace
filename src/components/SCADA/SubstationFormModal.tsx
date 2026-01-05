import { useState, useEffect } from 'react';
import { X, AlertCircle, MapPin } from 'lucide-react';
import { createSubstation, updateSubstation, getVoltageLevels, getRegions } from '../../services/scadaService';
import { supabase } from '../../lib/supabase';
import type { Substation, SubstationStatus } from '../../types/database';

interface Props {
  substation: Substation | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  code: string;
  name: string;
  voltage_level: string;
  latitude: number | '';
  longitude: number | '';
  region: string;
  status: SubstationStatus;
}

interface FormErrors {
  code?: string;
  name?: string;
  voltage_level?: string;
  latitude?: string;
  longitude?: string;
  region?: string;
  general?: string;
}

export default function SubstationFormModal({ substation, onClose, onSuccess }: Props) {
  const [voltageLevels, setVoltageLevels] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState<FormData>({
    code: '',
    name: '',
    voltage_level: '',
    latitude: '',
    longitude: '',
    region: '',
    status: 'operational'
  });

  useEffect(() => {
    loadOptions();
    
    if (substation) {
      setFormData({
        code: substation.code,
        name: substation.name,
        voltage_level: substation.voltage_level,
        latitude: substation.latitude,
        longitude: substation.longitude,
        region: substation.region,
        status: substation.status
      });
    }
  }, [substation]);

  const loadOptions = async () => {
    try {
      const [voltageLevelsData, regionsData] = await Promise.all([
        getVoltageLevels(),
        getRegions()
      ]);
      setVoltageLevels(voltageLevelsData);
      setRegions(regionsData);
    } catch (err) {
      console.error('Error loading options:', err);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.code.trim()) {
      newErrors.code = 'S/S Code is required';
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.code)) {
      newErrors.code = 'Code can only contain letters, numbers, hyphens, and underscores';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Substation Name is required';
    }

    if (!formData.voltage_level) {
      newErrors.voltage_level = 'Voltage Level is required';
    }

    // Coordinates validation
    if (formData.latitude === '') {
      newErrors.latitude = 'Latitude is required';
    } else {
      const lat = Number(formData.latitude);
      if (isNaN(lat)) {
        newErrors.latitude = 'Invalid latitude value';
      } else if (lat < 22.15 || lat > 22.58) {
        newErrors.latitude = 'Latitude must be within Hong Kong bounds (22.15 to 22.58)';
      }
    }

    if (formData.longitude === '') {
      newErrors.longitude = 'Longitude is required';
    } else {
      const lng = Number(formData.longitude);
      if (isNaN(lng)) {
        newErrors.longitude = 'Invalid longitude value';
      } else if (lng < 113.83 || lng > 114.41) {
        newErrors.longitude = 'Longitude must be within Hong Kong bounds (113.83 to 114.41)';
      }
    }

    if (!formData.region) {
      newErrors.region = 'Region is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const data = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        voltage_level: formData.voltage_level,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        region: formData.region,
        status: formData.status
      };

      if (substation) {
        // Get current user ID from Supabase auth
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || '00000000-0000-0000-0000-000000000000';
        await updateSubstation({ id: substation.id, ...data }, userId);
      } else {
        // Get current user ID from Supabase auth
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || '00000000-0000-0000-0000-000000000000';
        await createSubstation(data, userId);
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving substation:', err);
      setErrors({
        general: err.message || 'Failed to save substation. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (field in errors) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete (newErrors as any)[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">
              {substation ? 'Edit Substation' : 'Add New Substation'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* General Error */}
          {errors.general && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* S/S Code */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                S/S Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                disabled={!!substation}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.code ? 'border-red-300 bg-red-50' : 'border-slate-300'
                } ${substation ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                placeholder="e.g., SS001"
              />
              {errors.code && (
                <p className="mt-1 text-xs text-red-600">{errors.code}</p>
              )}
              {substation && (
                <p className="mt-1 text-xs text-slate-500">Code cannot be changed after creation</p>
              )}
            </div>

            {/* Substation Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Substation Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300 bg-red-50' : 'border-slate-300'
                }`}
                placeholder="e.g., Central Substation"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Voltage Level */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Voltage Level <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.voltage_level}
                onChange={(e) => handleChange('voltage_level', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.voltage_level ? 'border-red-300 bg-red-50' : 'border-slate-300'
                }`}
              >
                <option value="">Select voltage level</option>
                {voltageLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              {errors.voltage_level && (
                <p className="mt-1 text-xs text-red-600">{errors.voltage_level}</p>
              )}
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Region <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.region}
                onChange={(e) => handleChange('region', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.region ? 'border-red-300 bg-red-50' : 'border-slate-300'
                }`}
              >
                <option value="">Select region</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
              {errors.region && (
                <p className="mt-1 text-xs text-red-600">{errors.region}</p>
              )}
            </div>

            {/* Latitude */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Latitude <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.000001"
                value={formData.latitude}
                onChange={(e) => handleChange('latitude', e.target.value === '' ? '' : parseFloat(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.latitude ? 'border-red-300 bg-red-50' : 'border-slate-300'
                }`}
                placeholder="22.15 - 22.58"
              />
              {errors.latitude && (
                <p className="mt-1 text-xs text-red-600">{errors.latitude}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">Hong Kong bounds: 22.15° to 22.58°N</p>
            </div>

            {/* Longitude */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Longitude <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.000001"
                value={formData.longitude}
                onChange={(e) => handleChange('longitude', e.target.value === '' ? '' : parseFloat(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.longitude ? 'border-red-300 bg-red-50' : 'border-slate-300'
                }`}
                placeholder="113.83 - 114.41"
              />
              {errors.longitude && (
                <p className="mt-1 text-xs text-red-600">{errors.longitude}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">Hong Kong bounds: 113.83° to 114.41°E</p>
            </div>

            {/* Status */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <div className="flex gap-4">
                {(['operational', 'maintenance', 'offline'] as SubstationStatus[]).map(status => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={formData.status === status}
                      onChange={(e) => handleChange('status', e.target.value as SubstationStatus)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700 capitalize">{status}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Geographic Validation</p>
                <p>Coordinates must be within Hong Kong boundaries. The system will validate your input before saving.</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                substation ? 'Update Substation' : 'Create Substation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
