import React, { useState, useEffect } from 'react';
import { Database, Plus, Edit2, Trash2, Download, Upload, X, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getCircuitsForSubstation,
  createCustomerTransformerMapping,
  updateCustomerTransformerMapping,
  deleteCustomerTransformerMapping,
  getMappingStatistics,
  type MappingFilters
} from '../services/customerTransformerService';
import type { CustomerTransformerMatching, Substation, Customer } from '../types/database';

export default function CustomerTransformerMatching() {
  const { user } = useAuth();
  
  // Data state
  const [mappings, setMappings] = useState<CustomerTransformerMatching[]>([]);
  const [substations, setSubstations] = useState<Substation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [circuits, setCircuits] = useState<string[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  
  // Filter state
  const [filters, setFilters] = useState<MappingFilters>({
    activeOnly: true
  });
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<CustomerTransformerMatching | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    customer_id: '',
    substation_id: '',
    circuit_id: ''
  });

  // Load initial data
  useEffect(() => {
    loadData();
  }, [filters]);

  async function fetchMappings() {
    let query = supabase
      .from('customer_transformer_matching')
      .select(`
        *,
        customer:customers(*),
        substation:substations(*),
        updated_by_profile:profiles(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.substationId) {
      query = query.eq('substation_id', filters.substationId);
    }
    if (filters?.circuitId) {
      query = query.eq('circuit_id', filters.circuitId);
    }
    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }
    if (filters?.activeOnly !== false) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function loadData() {
    try {
      setLoading(true);
      const [mappingsData, substationsData, customersData, statsData] = await Promise.all([
        fetchMappings(),
        supabase.from('substations').select('*').then(res => res.data || []),
        supabase.from('customers').select('*').then(res => res.data || []),
        getMappingStatistics()
      ]);
      
      setMappings(mappingsData);
      setSubstations(substationsData);
      setCustomers(customersData);
      setStatistics(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Load circuits when substation is selected
  useEffect(() => {
    if (formData.substation_id) {
      loadCircuits(formData.substation_id);
    } else {
      setCircuits([]);
    }
  }, [formData.substation_id]);

  async function loadCircuits(substationId: string) {
    try {
      const circuitList = await getCircuitsForSubstation(substationId);
      setCircuits(circuitList);
    } catch (error) {
      console.error('Error loading circuits:', error);
    }
  }

  function handleOpenModal(mapping?: CustomerTransformerMatching) {
    if (mapping) {
      setEditingMapping(mapping);
      setFormData({
        customer_id: mapping.customer_id,
        substation_id: mapping.substation_id,
        circuit_id: mapping.circuit_id
      });
    } else {
      setEditingMapping(null);
      setFormData({
        customer_id: '',
        substation_id: '',
        circuit_id: ''
      });
    }
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setEditingMapping(null);
    setFormData({
      customer_id: '',
      substation_id: '',
      circuit_id: ''
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingMapping) {
        await updateCustomerTransformerMapping(
          {
            id: editingMapping.id,
            substation_id: formData.substation_id,
            circuit_id: formData.circuit_id
          },
          user.id
        );
      } else {
        await createCustomerTransformerMapping(formData, user.id);
      }
      
      handleCloseModal();
      loadData();
    } catch (error) {
      console.error('Error saving mapping:', error);
      alert('Failed to save mapping. Please check console for details.');
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    
    try {
      await deleteCustomerTransformerMapping(id, user.id);
      setShowDeleteConfirm(null);
      loadData();
    } catch (error) {
      console.error('Error deleting mapping:', error);
      alert('Failed to delete mapping. Please check console for details.');
    }
  }

  function handleExportToExcel() {
    // Convert mappings to CSV format
    const headers = ['Customer Account', 'Customer Name', 'Substation Code', 'Circuit ID', 'Active', 'Updated At', 'Updated By'];
    const rows = mappings.map(m => [
      m.customer?.account_number || '',
      m.customer?.name || '',
      m.substation?.code || '',
      m.circuit_id,
      m.active ? 'Yes' : 'No',
      new Date(m.updated_at).toLocaleString(),
      m.updated_by_profile?.full_name || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_transformer_mappings_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading mappings...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Transformer Matching</h1>
              <p className="text-sm text-gray-600">
                Configure relationships between customers, substations, and circuits
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
            <button
              onClick={() => alert('Bulk import functionality coming soon')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Upload className="w-4 h-4" />
              Bulk Import
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Mapping
            </button>
          </div>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="flex gap-4 mt-4">
            <div className="bg-blue-50 px-4 py-2 rounded-lg">
              <div className="text-sm text-gray-600">Total Active Mappings</div>
              <div className="text-2xl font-bold text-blue-600">{statistics.totalActive}</div>
            </div>
            <div className="bg-green-50 px-4 py-2 rounded-lg">
              <div className="text-sm text-gray-600">Unique Circuits</div>
              <div className="text-2xl font-bold text-green-600">{statistics.uniqueCircuits}</div>
            </div>
            <div className="bg-purple-50 px-4 py-2 rounded-lg">
              <div className="text-sm text-gray-600">Substations Covered</div>
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(statistics.bySubstation).length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Substation
            </label>
            <select
              value={filters.substationId || ''}
              onChange={(e) => setFilters({ ...filters, substationId: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Substations</option>
              {substations.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Circuit ID
            </label>
            <input
              type="text"
              value={filters.circuitId || ''}
              onChange={(e) => setFilters({ ...filters, circuitId: e.target.value || undefined })}
              placeholder="Enter circuit ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.activeOnly ? 'active' : 'all'}
              onChange={(e) => setFilters({ ...filters, activeOnly: e.target.value === 'active' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active Only</option>
              <option value="all">All (Including Inactive)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ activeOnly: true })}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Mappings Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Substation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Circuit ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated By
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated At
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No mappings found. Click "Add Mapping" to create one.
                  </td>
                </tr>
              ) : (
                mappings.map((mapping) => (
                  <tr key={mapping.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {mapping.customer?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {mapping.customer?.account_number || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {mapping.substation?.code || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {mapping.substation?.name || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {mapping.circuit_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {mapping.updated_by_profile?.full_name || 'System'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(mapping.updated_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {mapping.active ? (
                        <Check className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-red-600 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(mapping)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(mapping.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingMapping ? 'Edit Mapping' : 'Add New Mapping'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer *
                </label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  required
                  disabled={!!editingMapping}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select a customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.account_number})
                    </option>
                  ))}
                </select>
                {editingMapping && (
                  <p className="mt-1 text-xs text-gray-500">
                    Customer cannot be changed. Delete and recreate to change customer.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Substation *
                </label>
                <select
                  value={formData.substation_id}
                  onChange={(e) => setFormData({ ...formData, substation_id: e.target.value, circuit_id: '' })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a substation</option>
                  {substations.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Circuit ID *
                </label>
                {circuits.length > 0 ? (
                  <select
                    value={formData.circuit_id}
                    onChange={(e) => setFormData({ ...formData, circuit_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a circuit</option>
                    {circuits.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.circuit_id}
                    onChange={(e) => setFormData({ ...formData, circuit_id: e.target.value })}
                    placeholder={formData.substation_id ? "No circuits found. Enter manually." : "Select substation first"}
                    required
                    disabled={!formData.substation_id}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                )}
                {formData.substation_id && (
                  <p className="mt-1 text-xs text-gray-500">
                    Circuits loaded from existing events. Enter manually if new circuit.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingMapping ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this mapping? This will set it as inactive.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
