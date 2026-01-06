import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { PQMeter } from '../../types/database';
import {
  createMeter,
  updateMeter,
  getVoltageLevels,
  getRegions,
  getAreas,
  validateTransformerCodes,
  validateNoCircularReference,
  autoPopulateFromMeterName,
  type CreateMeterInput,
  type UpdateMeterInput
} from '../../services/meterHierarchyService';
import { supabase } from '../../lib/supabase';

interface MeterFormModalProps {
  meter: PQMeter | null;
  onClose: () => void;
  onSuccess: () => void;
}

const MeterFormModal: React.FC<MeterFormModalProps> = ({ meter, onClose, onSuccess }) => {
  const isEditMode = !!meter;
  
  // Form state
  const [formData, setFormData] = useState<CreateMeterInput | UpdateMeterInput>({
    meter_id: meter?.meter_id || '',
    site_id: meter?.site_id || '',
    voltage_level: meter?.voltage_level || '',
    substation_id: meter?.substation_id || '',
    circuit_id: meter?.circuit_id || undefined,
    location: meter?.location || '',
    region: meter?.region || undefined,
    oc: meter?.oc || undefined,
    brand: meter?.brand || undefined,
    model: meter?.model || undefined,
    nominal_voltage: meter?.nominal_voltage || undefined,
    ct_type: meter?.ct_type || undefined,
    asset_number: meter?.asset_number || undefined,
    serial_number: meter?.serial_number || undefined,
    ip_address: meter?.ip_address || undefined,
    firmware_version: meter?.firmware_version || undefined,
    framework_version: meter?.framework_version || undefined,
    status: meter?.status || 'active',
    active: meter?.active !== false,
    area: meter?.area || '',
    ss400: meter?.ss400 || undefined,
    ss132: meter?.ss132 || undefined,
    ss011: meter?.ss011 || undefined,
    ss_misc: meter?.ss_misc || undefined,
    load_type: meter?.load_type || undefined,
  });

  // Dropdown options
  const [voltageLevels, setVoltageLevels] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [substations, setSubstations] = useState<Array<{ id: string; name: string }>>([]);
  const [loadTypes] = useState(['Residential', 'Commercial', 'Industrial', 'Mixed', 'Other']);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load dropdown options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [voltageLevelsData, regionsData, areasData] = await Promise.all([
          getVoltageLevels(),
          getRegions(),
          getAreas(),
        ]);
        
        setVoltageLevels(voltageLevelsData);
        setRegions(regionsData);
        setAreas(areasData);

        // Load substations
        const { data: substationsData } = await supabase
          .from('substations')
          .select('id, name')
          .eq('status', 'operational')
          .order('name');
        
        if (substationsData) {
          setSubstations(substationsData.map((s: any) => ({ id: s.id, name: s.name })));
        }
      } catch (error) {
        console.error('Error loading options:', error);
      }
    };

    loadOptions();
  }, []);

  // Auto-populate transformer codes when voltage level or meter name changes
  useEffect(() => {
    if (formData.meter_id && formData.voltage_level && !isEditMode) {
      const autoPopulated = autoPopulateFromMeterName(formData.meter_id, formData.voltage_level);
      if (autoPopulated.area || autoPopulated.ss400 || autoPopulated.ss132 || autoPopulated.ss011) {
        setFormData(prev => {
          const updated = { ...prev };
          if (autoPopulated.area) updated.area = autoPopulated.area;
          if (autoPopulated.ss400) updated.ss400 = autoPopulated.ss400;
          if (autoPopulated.ss132) updated.ss132 = autoPopulated.ss132;
          if (autoPopulated.ss011) updated.ss011 = autoPopulated.ss011;
          return updated;
        });
      }
    }
  }, [formData.meter_id, formData.voltage_level, isEditMode]);

  // Validate transformer codes in real-time
  useEffect(() => {
    if (formData.voltage_level) {
      const validationError = validateTransformerCodes(
        formData.voltage_level,
        formData.ss400 || undefined,
        formData.ss132 || undefined,
        formData.ss011 || undefined
      );
      
      if (!validationError.valid && validationError.message) {
        setErrors(prev => ({ ...prev, transformer_codes: validationError.message! }));
      } else {
        setErrors(prev => {
          const { transformer_codes, ...rest } = prev;
          return rest;
        });
      }

      // Validate circular reference
      if (formData.ss400 || formData.ss132 || formData.ss011) {
        const circularError = validateNoCircularReference(
          formData.ss400 || undefined,
          formData.ss132 || undefined,
          formData.ss011 || undefined
        );
        
        if (!circularError.valid && circularError.message) {
          setErrors(prev => ({ ...prev, circular_reference: circularError.message! }));
        } else {
          setErrors(prev => {
            const { circular_reference, ...rest } = prev;
            return rest;
          });
        }
      }
    }
  }, [formData.voltage_level, formData.ss400, formData.ss132, formData.ss011]);

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific error
    setErrors(prev => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.meter_id?.trim()) newErrors.meter_id = 'Meter ID is required';
    if (!formData.site_id?.trim()) newErrors.site_id = 'Site ID is required';
    if (!formData.voltage_level) newErrors.voltage_level = 'Voltage level is required';
    if (!formData.substation_id) newErrors.substation_id = 'Substation is required';
    if (!formData.location?.trim()) newErrors.location = 'Location is required';

    // Transformer code validation
    if (formData.voltage_level) {
      const transformerError = validateTransformerCodes(
        formData.voltage_level,
        formData.ss400 || undefined,
        formData.ss132 || undefined,
        formData.ss011 || undefined
      );
      if (!transformerError.valid && transformerError.message) {
        newErrors.transformer_codes = transformerError.message;
      }
    }

    // Circular reference validation
    const circularError = validateNoCircularReference(
      formData.ss400 || undefined,
      formData.ss132 || undefined,
      formData.ss011 || undefined
    );
    if (!circularError.valid && circularError.message) {
      newErrors.circular_reference = circularError.message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        await updateMeter({
          meter_id: meter.meter_id,
          ...formData,
        } as UpdateMeterInput);
      } else {
        await createMeter(formData as CreateMeterInput);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to save meter' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? 'Edit Meter' : 'Add New Meter'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            </div>

            {/* Meter ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meter ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.meter_id}
                onChange={(e) => handleInputChange('meter_id', e.target.value)}
                disabled={isEditMode}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''
                } ${errors.meter_id ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="e.g., SS400"
              />
              {errors.meter_id && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.meter_id}
                </p>
              )}
            </div>

            {/* Site ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.site_id}
                onChange={(e) => handleInputChange('site_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.site_id ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Site ID"
              />
              {errors.site_id && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.site_id}
                </p>
              )}
            </div>

            {/* Voltage Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voltage Level <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.voltage_level}
                onChange={(e) => handleInputChange('voltage_level', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.voltage_level ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select voltage level</option>
                {voltageLevels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              {errors.voltage_level && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.voltage_level}
                </p>
              )}
            </div>

            {/* Substation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Substation <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.substation_id}
                onChange={(e) => handleInputChange('substation_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.substation_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select substation</option>
                {substations.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
              {errors.substation_id && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.substation_id}
                </p>
              )}
            </div>

            {/* Circuit ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Circuit ID
              </label>
              <input
                type="text"
                value={formData.circuit_id || ''}
                onChange={(e) => handleInputChange('circuit_id', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Circuit ID"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.location ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Location"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.location}
                </p>
              )}
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region
              </label>
              <select
                value={formData.region || ''}
                onChange={(e) => handleInputChange('region', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select region</option>
                {regions.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            {/* Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area
              </label>
              <select
                value={formData.area || ''}
                onChange={(e) => handleInputChange('area', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select area</option>
                {areas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            {/* OC */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OC
              </label>
              <input
                type="text"
                value={formData.oc || ''}
                onChange={(e) => handleInputChange('oc', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="OC"
              />
            </div>

            {/* Transformer Codes */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Transformer Codes</h3>
              {(errors.transformer_codes || errors.circular_reference) && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errors.transformer_codes || errors.circular_reference}
                  </p>
                </div>
              )}
            </div>

            {/* SS400 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SS400
              </label>
              <input
                type="text"
                value={formData.ss400 || ''}
                onChange={(e) => handleInputChange('ss400', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="SS400 code"
              />
            </div>

            {/* SS132 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SS132
              </label>
              <input
                type="text"
                value={formData.ss132 || ''}
                onChange={(e) => handleInputChange('ss132', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="SS132 code"
              />
            </div>

            {/* SS011 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SS011
              </label>
              <input
                type="text"
                value={formData.ss011 || ''}
                onChange={(e) => handleInputChange('ss011', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="SS011 code"
              />
            </div>

            {/* SS Misc */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SS Misc
              </label>
              <input
                type="text"
                value={formData.ss_misc || ''}
                onChange={(e) => handleInputChange('ss_misc', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="SS Misc"
              />
            </div>

            {/* Equipment Details */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Equipment Details</h3>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand
              </label>
              <input
                type="text"
                value={formData.brand || ''}
                onChange={(e) => handleInputChange('brand', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brand"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <input
                type="text"
                value={formData.model || ''}
                onChange={(e) => handleInputChange('model', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Model"
              />
            </div>

            {/* Nominal Voltage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nominal Voltage
              </label>
              <input
                type="text"
                value={formData.nominal_voltage || ''}
                onChange={(e) => handleInputChange('nominal_voltage', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 400V"
              />
            </div>

            {/* CT Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CT Type
              </label>
              <input
                type="text"
                value={formData.ct_type || ''}
                onChange={(e) => handleInputChange('ct_type', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="CT Type"
              />
            </div>

            {/* Asset Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asset Number
              </label>
              <input
                type="text"
                value={formData.asset_number || ''}
                onChange={(e) => handleInputChange('asset_number', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Asset Number"
              />
            </div>

            {/* Serial Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                value={formData.serial_number || ''}
                onChange={(e) => handleInputChange('serial_number', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Serial Number"
              />
            </div>

            {/* IP Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP Address
              </label>
              <input
                type="text"
                value={formData.ip_address || ''}
                onChange={(e) => handleInputChange('ip_address', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="IP Address"
              />
            </div>

            {/* Firmware Version */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Firmware Version
              </label>
              <input
                type="text"
                value={formData.firmware_version || ''}
                onChange={(e) => handleInputChange('firmware_version', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Firmware Version"
              />
            </div>

            {/* Framework Version */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Framework Version
              </label>
              <input
                type="text"
                value={formData.framework_version || ''}
                onChange={(e) => handleInputChange('framework_version', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Framework Version"
              />
            </div>

            {/* Load Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Load Type
              </label>
              <select
                value={formData.load_type || ''}
                onChange={(e) => handleInputChange('load_type', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select load type</option>
                {loadTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
            </div>

            {/* Status Radio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meter Status
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="active"
                    checked={formData.status === 'active'}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="abnormal"
                    checked={formData.status === 'abnormal'}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Abnormal</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="inactive"
                    checked={formData.status === 'inactive'}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Inactive</span>
                </label>
              </div>
            </div>

            {/* Active Checkbox */}
            <div>
              <label className="flex items-center pt-7">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => handleInputChange('active', e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Active in System</span>
              </label>
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {errors.submit}
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(errors).length > 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Update Meter' : 'Create Meter'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeterFormModal;
