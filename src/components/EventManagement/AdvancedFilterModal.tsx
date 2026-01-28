import { useState, useEffect } from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';
import type { EventFilter } from '../../types/eventTypes';
import type { Substation } from '../../types/database';

interface AdvancedFilterModalProps {
  filters: EventFilter;
  onApply: (filters: EventFilter) => void;
  onClose: () => void;
  substations: Substation[];
  transformerNumbers: string[];
}

export default function AdvancedFilterModal({
  filters: initialFilters,
  onApply,
  onClose,
  substations,
  transformerNumbers
}: AdvancedFilterModalProps) {
  const [filters, setFilters] = useState<EventFilter>(initialFilters);

  // Handle transformer selection
  const handleTransformerToggle = (txNumber: string) => {
    const current = filters.transformerNumbers || [];
    if (current.includes(txNumber)) {
      setFilters({
        ...filters,
        transformerNumbers: current.filter(t => t !== txNumber)
      });
    } else {
      setFilters({
        ...filters,
        transformerNumbers: [...current, txNumber]
      });
    }
  };

  // Handle substation selection (from existing filters)
  const handleSubstationToggle = (substationId: string) => {
    const currentSubstations = filters.meterIds || [];
    // This is simplified - in reality you'd filter meters by substation
    // For now, we'll add/remove from the existing meterIds array
    setFilters({
      ...filters,
      meterIds: currentSubstations.includes(substationId)
        ? currentSubstations.filter(id => id !== substationId)
        : [...currentSubstations, substationId]
    });
  };

  const handleClearAll = () => {
    setFilters({
      ...initialFilters,
      minV1: null,
      maxV1: null,
      minV2: null,
      maxV2: null,
      minV3: null,
      maxV3: null,
      transformerNumbers: [],
      ringNumber: '',
      idrNumber: '',
      startDate: '',
      endDate: ''
    });
  };

  const handleApply = () => {
    onApply(filters);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <Filter className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Advanced Filters</h2>
              <p className="text-blue-100 text-sm mt-0.5">
                Configure detailed event filtering criteria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Voltage Ranges - VL1, VL2, VL3 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Voltage Levels (% Remaining)
            </label>
            <div className="grid grid-cols-3 gap-4">
              {/* VL1 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  VL1 (Phase A)
                </label>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min %"
                    value={filters.minV1 ?? ''}
                    onChange={(e) => setFilters({ 
                      ...filters, 
                      minV1: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <input
                    type="number"
                    placeholder="Max %"
                    value={filters.maxV1 ?? ''}
                    onChange={(e) => setFilters({ 
                      ...filters, 
                      maxV1: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>

              {/* VL2 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  VL2 (Phase B)
                </label>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min %"
                    value={filters.minV2 ?? ''}
                    onChange={(e) => setFilters({ 
                      ...filters, 
                      minV2: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <input
                    type="number"
                    placeholder="Max %"
                    value={filters.maxV2 ?? ''}
                    onChange={(e) => setFilters({ 
                      ...filters, 
                      maxV2: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>

              {/* VL3 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  VL3 (Phase C)
                </label>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min %"
                    value={filters.minV3 ?? ''}
                    onChange={(e) => setFilters({ 
                      ...filters, 
                      minV3: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <input
                    type="number"
                    placeholder="Max %"
                    value={filters.maxV3 ?? ''}
                    onChange={(e) => setFilters({ 
                      ...filters, 
                      maxV3: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Substation Multi-Select */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Substation Selection
            </label>
            <div className="border border-slate-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-slate-50">
              {substations.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No substations available
                </p>
              ) : (
                substations.map(substation => (
                  <label
                    key={substation.id}
                    className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.meterIds?.includes(substation.id) || false}
                      onChange={() => handleSubstationToggle(substation.id)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {substation.code} - {substation.name}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Transformer Number Multi-Select */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Transformer Number (Tx. No)
            </label>
            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
              <div className="flex flex-wrap gap-2">
                {transformerNumbers.map(txNumber => (
                  <label
                    key={txNumber}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-blue-400 cursor-pointer transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={filters.transformerNumbers?.includes(txNumber) || false}
                      onChange={() => handleTransformerToggle(txNumber)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {txNumber}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* IDR Number */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              IDR No. (Incident Defect Report)
            </label>
            <input
              type="text"
              placeholder="Enter IDR number (partial match supported)"
              value={filters.idrNumber || ''}
              onChange={(e) => setFilters({ ...filters, idrNumber: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              Search will match any part of the IDR number
            </p>
          </div>

          {/* Ring Number */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Ring Number
            </label>
            <input
              type="text"
              placeholder="Enter ring circuit number"
              value={filters.ringNumber || ''}
              onChange={(e) => setFilters({ ...filters, ringNumber: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              Filter by ring circuit number from meter configuration
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Clear All
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
