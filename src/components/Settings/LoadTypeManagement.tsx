import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Tag, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LoadType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export default function LoadTypeManagement() {
  const [loadTypes, setLoadTypes] = useState<LoadType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newLoadType, setNewLoadType] = useState({
    code: '',
    name: '',
    description: '',
    color: '#3B82F6',
  });

  const [editingLoadType, setEditingLoadType] = useState<LoadType | null>(null);

  useEffect(() => {
    loadLoadTypes();
  }, []);

  const loadLoadTypes = async () => {
    setLoading(true);
    try {
      const { data, error: loadError } = await supabase
        .from('load_types')
        .select('*')
        .order('code', { ascending: true });

      if (loadError) throw loadError;
      setLoadTypes(data || []);
    } catch (err) {
      console.error('Error loading load types:', err);
      setError('Failed to load load types');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newLoadType.code || !newLoadType.name || !newLoadType.color) {
      setError('Code, name, and color are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error: insertError } = await supabase
        .from('load_types')
        .insert({
          code: newLoadType.code.toUpperCase(),
          name: newLoadType.name,
          description: newLoadType.description || null,
          color: newLoadType.color,
          active: true,
        });

      if (insertError) throw insertError;

      setSuccess('Load type created successfully');
      setIsCreating(false);
      setNewLoadType({ code: '', name: '', description: '', color: '#3B82F6' });
      loadLoadTypes();
    } catch (err: any) {
      console.error('Error creating load type:', err);
      setError(err.message || 'Failed to create load type');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingLoadType) return;

    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('load_types')
        .update({
          name: editingLoadType.name,
          description: editingLoadType.description,
          color: editingLoadType.color,
          active: editingLoadType.active,
        })
        .eq('id', editingLoadType.id);

      if (updateError) throw updateError;

      setSuccess('Load type updated successfully');
      setEditingId(null);
      setEditingLoadType(null);
      loadLoadTypes();
    } catch (err: any) {
      console.error('Error updating load type:', err);
      setError(err.message || 'Failed to update load type');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete load type "${code}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('load_types')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSuccess('Load type deleted successfully');
      loadLoadTypes();
    } catch (err: any) {
      console.error('Error deleting load type:', err);
      setError(err.message || 'Failed to delete load type');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (loadType: LoadType) => {
    setEditingId(loadType.id);
    setEditingLoadType({ ...loadType });
    setIsCreating(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingLoadType(null);
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setNewLoadType({ code: '', name: '', description: '', color: '#3B82F6' });
  };

  // Auto-hide success/error messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (loading && loadTypes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag className="w-8 h-8 text-slate-700" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Load Type Management</h2>
            <p className="text-slate-600 mt-1">Manage meter load type categories</p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingId(null);
            setEditingLoadType(null);
          }}
          disabled={isCreating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          Add Load Type
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800">{success}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Create New Load Type Form */}
      {isCreating && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Load Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newLoadType.code}
                onChange={(e) => setNewLoadType({ ...newLoadType, code: e.target.value.toUpperCase() })}
                placeholder="e.g., DC, EV"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={20}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newLoadType.name}
                onChange={(e) => setNewLoadType({ ...newLoadType, name: e.target.value })}
                placeholder="e.g., Data Center"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Color <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={newLoadType.color}
                  onChange={(e) => setNewLoadType({ ...newLoadType, color: e.target.value })}
                  className="h-10 w-20 border border-slate-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={newLoadType.color}
                  onChange={(e) => setNewLoadType({ ...newLoadType, color: e.target.value })}
                  placeholder="#3B82F6"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={newLoadType.description}
                onChange={(e) => setNewLoadType({ ...newLoadType, description: e.target.value })}
                placeholder="Optional description"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Create
            </button>
            <button
              onClick={cancelCreate}
              disabled={loading}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Load Types List */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Color
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Code
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loadTypes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No load types found. Click "Add Load Type" to create one.
                  </td>
                </tr>
              ) : (
                loadTypes.map((loadType) => (
                  <tr key={loadType.id} className="hover:bg-slate-50">
                    {editingId === loadType.id && editingLoadType ? (
                      <>
                        <td className="py-3 px-4">
                          <input
                            type="color"
                            value={editingLoadType.color}
                            onChange={(e) => setEditingLoadType({ ...editingLoadType, color: e.target.value })}
                            className="h-8 w-16 border border-slate-300 rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-slate-600">{loadType.code}</span>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editingLoadType.name}
                            onChange={(e) => setEditingLoadType({ ...editingLoadType, name: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editingLoadType.description || ''}
                            onChange={(e) => setEditingLoadType({ ...editingLoadType, description: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editingLoadType.active}
                              onChange={(e) => setEditingLoadType({ ...editingLoadType, active: e.target.checked })}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700">Active</span>
                          </label>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={handleUpdate}
                              disabled={loading}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                              title="Save"
                            >
                              <Save className="w-5 h-5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={loading}
                              className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg disabled:opacity-50"
                              title="Cancel"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4">
                          <div
                            className="w-8 h-8 rounded border border-slate-300"
                            style={{ backgroundColor: loadType.color }}
                            title={loadType.color}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm font-semibold text-slate-900">{loadType.code}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-900">{loadType.name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-600">{loadType.description || '-'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              loadType.active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {loadType.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEdit(loadType)}
                              className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                              title="Edit"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(loadType.id, loadType.code)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Note:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Load type codes cannot be changed after creation</li>
              <li>Colors are used for visualization on the Meter Map</li>
              <li>Inactive load types will still appear in existing meter records</li>
              <li>Default load types: DC (Purple), EV (Cyan), RE-PV (Green), RES-HRB (Red), RES-NOC (Blue), RES (Amber), others (Yellow)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
