import { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface PSBGConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: string[]) => void;
  currentOptions: string[];
  usedOptions: string[]; // Options currently selected in events
}

export default function PSBGConfigModal({
  isOpen,
  onClose,
  onSave,
  currentOptions,
  usedOptions
}: PSBGConfigModalProps) {
  const [options, setOptions] = useState<string[]>(currentOptions);
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    if (isOpen) {
      setOptions(currentOptions);
      setNewOption('');
    }
  }, [isOpen, currentOptions]);

  const handleAddOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (optionToRemove: string) => {
    if (usedOptions.includes(optionToRemove)) {
      alert(`Cannot delete "${optionToRemove}" because it is currently used in events.`);
      return;
    }
    setOptions(options.filter(opt => opt !== optionToRemove));
  };

  const handleSave = () => {
    onSave(options);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Manage PSBG Causes</h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Add New Option */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Add New PSBG Cause
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
                placeholder="Enter new cause..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddOption}
                disabled={!newOption.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Current Options */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Current PSBG Causes ({options.length})
            </label>
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
              {options.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No PSBG causes configured
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {options.map((option, index) => {
                    const isUsed = usedOptions.includes(option);
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {option}
                          </span>
                          {isUsed && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              In Use
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveOption(option)}
                          disabled={isUsed}
                          className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title={isUsed ? 'Cannot delete - currently used in events' : 'Delete option'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Usage Warning */}
          {usedOptions.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Options in use cannot be deleted</p>
                  <p className="mt-1">
                    {usedOptions.length} option{usedOptions.length !== 1 ? 's' : ''} currently selected in events.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}