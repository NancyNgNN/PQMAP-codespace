import { useState } from 'react';
import { X, Plus, Save } from 'lucide-react';
import { CalculatedField } from '../../../types/report';

interface CalculatedFieldEditorProps {
  fields: CalculatedField[];
  onSave: (fields: CalculatedField[]) => void;
  onClose: () => void;
  availableFields: string[];
}

export default function CalculatedFieldEditor({
  fields,
  onSave,
  onClose,
  availableFields,
}: CalculatedFieldEditorProps) {
  const [editingFields, setEditingFields] = useState<CalculatedField[]>([...fields]);
  const [newField, setNewField] = useState<Partial<CalculatedField>>({
    name: '',
    expression: '',
    description: '',
    type: 'number',
  });

  const handleAddField = () => {
    if (!newField.name || !newField.expression) {
      alert('Please enter field name and expression');
      return;
    }

    const field: CalculatedField = {
      id: crypto.randomUUID(),
      name: newField.name!,
      expression: newField.expression!,
      description: newField.description,
      type: newField.type as 'number' | 'string' | 'boolean',
    };

    setEditingFields([...editingFields, field]);
    setNewField({ name: '', expression: '', description: '', type: 'number' });
  };

  const handleRemoveField = (id: string) => {
    setEditingFields(editingFields.filter(f => f.id !== id));
  };

  const handleSave = () => {
    onSave(editingFields);
  };

  const insertField = (fieldName: string) => {
    setNewField({
      ...newField,
      expression: (newField.expression || '') + `[${fieldName}]`,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Calculated Fields</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Existing Fields */}
          {editingFields.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Current Calculated Fields</h3>
              <div className="space-y-2">
                {editingFields.map(field => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{field.name}</div>
                      <div className="text-sm text-slate-600 font-mono">{field.expression}</div>
                      {field.description && (
                        <div className="text-xs text-slate-500 mt-1">{field.description}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveField(field.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Field Form */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Create New Calculated Field</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Field Name
                </label>
                <input
                  type="text"
                  value={newField.name}
                  onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  placeholder="e.g., Downtime Cost, Duration Minutes"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expression
                </label>
                <textarea
                  value={newField.expression}
                  onChange={(e) => setNewField({ ...newField, expression: e.target.value })}
                  placeholder="e.g., [Duration (ms)] / 1000 * 100"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use field names in brackets [Field Name]. Supports +, -, *, /, parentheses.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newField.description}
                  onChange={(e) => setNewField({ ...newField, description: e.target.value })}
                  placeholder="e.g., Calculates estimated cost based on duration"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Result Type
                </label>
                <select
                  value={newField.type}
                  onChange={(e) => setNewField({ ...newField, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="number">Number</option>
                  <option value="string">Text</option>
                  <option value="boolean">True/False</option>
                </select>
              </div>

              <button
                onClick={handleAddField}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Calculated Field
              </button>
            </div>
          </div>

          {/* Available Fields Reference */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Available Fields (Click to Insert)</h3>
            <div className="grid grid-cols-3 gap-2">
              {availableFields.map(field => (
                <button
                  key={field}
                  onClick={() => insertField(field)}
                  className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg text-left truncate"
                  title={field}
                >
                  {field}
                </button>
              ))}
            </div>
          </div>

          {/* Examples */}
          <div className="bg-amber-50 p-4 rounded-lg">
            <h4 className="font-semibold text-amber-900 mb-2">Examples:</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li><code className="bg-amber-100 px-1 rounded">[Duration (ms)] / 1000</code> - Convert milliseconds to seconds</li>
              <li><code className="bg-amber-100 px-1 rounded">[Affected Customers] * 100</code> - Estimated cost (e.g., $100 per customer)</li>
              <li><code className="bg-amber-100 px-1 rounded">[Voltage Dip (%)] &gt; 50 ? "Severe" : "Moderate"</code> - Conditional text</li>
              <li><code className="bg-amber-100 px-1 rounded">([Duration (ms)] * [Affected Customers]) / 1000</code> - Combined metric</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
