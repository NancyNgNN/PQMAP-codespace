import { useState, useEffect } from 'react';
import { Scale, Download, Upload, FileDown, Edit2, Trash2, Plus, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SARFIProfile, SARFIProfileWeight, PQMeter } from '../../types/database';
import { 
  fetchSARFIProfiles, 
  fetchProfileWeights, 
  updateCustomerCount,
  addMeterToProfile,
  deleteProfileWeight,
  importWeightFactorsCSV,
  recalculateWeightFactors
} from '../../services/sarfiService';
import * as XLSX from 'xlsx';

export default function WeightingFactors() {
  const [profiles, setProfiles] = useState<SARFIProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [weights, setWeights] = useState<SARFIProfileWeight[]>([]);
  const [allMeters, setAllMeters] = useState<Array<Pick<PQMeter, 'id' | 'meter_id' | 'location' | 'substation_id'>>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
  const [editingCustomerCount, setEditingCustomerCount] = useState<number>(0);
  
  // Import/Export states
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; meter_id: string; message: string }>;
  } | null>(null);

  // Add meter modal states
  const [showAddMeterModal, setShowAddMeterModal] = useState(false);
  const [selectedMeterId, setSelectedMeterId] = useState<string>('');
  const [newCustomerCount, setNewCustomerCount] = useState<number>(0);
  const [meterSearchQuery, setMeterSearchQuery] = useState<string>('');

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
    loadAllMeters();
  }, []);

  // Load weights when profile changes
  useEffect(() => {
    if (selectedProfileId) {
      loadWeights();
    } else {
      setWeights([]);
    }
  }, [selectedProfileId]);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showImportDropdown && !target.closest('.import-dropdown-container')) {
        setShowImportDropdown(false);
      }
      if (showExportDropdown && !target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showImportDropdown, showExportDropdown]);

  const loadProfiles = async () => {
    try {
      const data = await fetchSARFIProfiles();
      setProfiles(data);
      
      // Auto-select active profile if available
      if (data.length > 0 && !selectedProfileId) {
        const activeProfile = data.find(p => p.is_active) || data[0];
        setSelectedProfileId(activeProfile.id);
      }
    } catch (error) {
      console.error('❌ Error loading profiles:', error);
      alert('Failed to load profiles');
    }
  };

  const loadWeights = async () => {
    setIsLoading(true);
    try {
      const data = await fetchProfileWeights(selectedProfileId);
      setWeights(data);
    } catch (error) {
      console.error('❌ Error loading weights:', error);
      alert('Failed to load weight factors');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllMeters = async () => {
    try {
      const { data, error } = await supabase
        .from('pq_meters')
        .select('id, meter_id, location, substation_id, substations(name, code)')
        .order('meter_id');

      if (error) throw error;
      setAllMeters(data || []);
    } catch (error) {
      console.error('❌ Error loading meters:', error);
    }
  };

  const handleEditStart = (weight: SARFIProfileWeight) => {
    setEditingWeightId(weight.id);
    setEditingCustomerCount(weight.customer_count || 0);
  };

  const handleEditCancel = () => {
    setEditingWeightId(null);
    setEditingCustomerCount(0);
  };

  const handleEditSave = async (weightId: string) => {
    try {
      await updateCustomerCount(weightId, editingCustomerCount);
      await loadWeights();
      setEditingWeightId(null);
      setEditingCustomerCount(0);
    } catch (error) {
      console.error('❌ Error updating customer count:', error);
      alert('Failed to update customer count');
    }
  };

  const handleDeleteWeight = async (weightId: string) => {
    if (!confirm('Are you sure you want to remove this meter from the profile?')) {
      return;
    }

    try {
      await deleteProfileWeight(weightId);
      await recalculateWeightFactors(selectedProfileId);
      await loadWeights();
    } catch (error) {
      console.error('❌ Error deleting weight:', error);
      alert('Failed to delete weight factor');
    }
  };

  const handleAddMeter = async () => {
    if (!selectedMeterId || newCustomerCount < 0) {
      alert('Please select a meter and enter a valid customer count');
      return;
    }

    try {
      await addMeterToProfile(selectedProfileId, selectedMeterId, newCustomerCount);
      await loadWeights();
      setShowAddMeterModal(false);
      setSelectedMeterId('');
      setNewCustomerCount(0);
      setMeterSearchQuery('');
    } catch (error: any) {
      console.error('❌ Error adding meter:', error);
      alert(error.message || 'Failed to add meter to profile');
    }
  };

  // Export functions
  const handleDownloadTemplate = () => {
    const headers = ['meter_id', 'customer_count'];
    const exampleData = [
      ['# Weight Factor Import Template'],
      [`# Profile: ${profiles.find(p => p.id === selectedProfileId)?.name || 'N/A'}`],
      [`# Generated: ${new Date().toLocaleString()}`],
      ['# Instructions: Update customer_count values. Weight factors will auto-calculate.'],
      ['# Format: meter_id (e.g., PQM-APA-01), customer_count (integer >= 0)'],
      [],
      headers,
      ['PQM-APA-01', '5000'],
      ['PQM-BKK-02', '3200']
    ];

    const csv = exampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Weight_Factors_Template_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setShowImportDropdown(false);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setShowImportModal(true);
    setImportResults(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      if (lines.length < 2) {
        alert('CSV file is empty or invalid');
        setIsImporting(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      if (!headers.includes('meter_id') || !headers.includes('customer_count')) {
        alert('CSV must contain meter_id and customer_count columns');
        setIsImporting(false);
        return;
      }

      const meterIdIndex = headers.indexOf('meter_id');
      const customerCountIndex = headers.indexOf('customer_count');

      const csvData: Array<{ meter_id: string; customer_count: number }> = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const meterId = values[meterIdIndex];
        const customerCount = parseInt(values[customerCountIndex]);

        if (meterId && !isNaN(customerCount)) {
          csvData.push({ meter_id: meterId, customer_count: customerCount });
        }
      }

      const results = await importWeightFactorsCSV(selectedProfileId, csvData);
      setImportResults(results);
      
      if (results.success > 0) {
        await loadWeights();
      }
    } catch (error) {
      console.error('❌ Error importing CSV:', error);
      alert('Failed to import CSV file');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleExportExcel = async () => {
    setShowExportDropdown(false);

    try {
      const profile = profiles.find(p => p.id === selectedProfileId);
      const headerData = [
        ['Weight Factor Report'],
        ['Profile:', profile?.name || 'N/A'],
        ['Year:', profile?.year?.toString() || 'N/A'],
        ['Generated:', new Date().toLocaleString()],
        ['Total Meters:', weights.length.toString()],
        [],
        ['Meter No.', 'Location', 'Customer Count', 'Weight Factor (%)']
      ];

      const dataRows = weights.map(w => [
        w.meter?.meter_id || 'N/A',
        w.meter?.location || 'N/A',
        w.customer_count?.toString() || '0',
        (w.weight_factor * 100).toFixed(4) + '%'
      ]);

      // Add totals
      const totalCustomers = weights.reduce((sum, w) => sum + (w.customer_count || 0), 0);
      dataRows.push([]);
      dataRows.push(['Total', '', totalCustomers.toString(), '100.0000%']);

      const allData = [...headerData, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(allData);

      ws['!cols'] = [
        { wch: 20 },
        { wch: 35 },
        { wch: 18 },
        { wch: 20 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Weight Factors');
      XLSX.writeFile(wb, `Weight_Factors_${profile?.name || 'Export'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      alert('Failed to export to Excel');
    }
  };

  const handleExportCSV = () => {
    setShowExportDropdown(false);

    try {
      const profile = profiles.find(p => p.id === selectedProfileId);
      const headers = ['meter_id', 'location', 'customer_count', 'weight_factor'];
      const rows = weights.map(w => [
        w.meter?.meter_id || 'N/A',
        w.meter?.location || 'N/A',
        w.customer_count?.toString() || '0',
        (w.weight_factor * 100).toFixed(4) + '%'
      ]);

      const csvContent = [
        `# Weight Factor Report`,
        `# Profile: ${profile?.name || 'N/A'}`,
        `# Generated: ${new Date().toLocaleString()}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Weight_Factors_${profile?.name || 'Export'}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    } catch (error) {
      console.error('❌ Error exporting to CSV:', error);
      alert('Failed to export to CSV');
    }
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  const totalCustomers = weights.reduce((sum, w) => sum + (w.customer_count || 0), 0);

  // Filter available meters (exclude already added ones)
  const addedMeterIds = new Set(weights.map(w => w.meter_id));
  const availableMeters = allMeters.filter(m => !addedMeterIds.has(m.id));
  const filteredAvailableMeters = availableMeters.filter(m => 
    m.meter_id.toLowerCase().includes(meterSearchQuery.toLowerCase()) ||
    m.location.toLowerCase().includes(meterSearchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Scale className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">Weighting Factors</h1>
        </div>
        <p className="text-slate-600">
          Manage customer count and weight factors for SARFI profile calculations
        </p>
      </div>

      {/* Profile Selector & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              SARFI Profile
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a profile...</option>
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} ({profile.year})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Import Button */}
            <div className="relative import-dropdown-container">
              <button
                onClick={() => setShowImportDropdown(!showImportDropdown)}
                disabled={!selectedProfileId}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>

              {showImportDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-30">
                  <label className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-700">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Import CSV</span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleImportCSV}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <FileDown className="w-4 h-4 text-green-600" />
                    <span>Download Template</span>
                  </button>
                </div>
              )}
            </div>

            {/* Export Button */}
            <div className="relative export-dropdown-container">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={!selectedProfileId || weights.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                  <button
                    onClick={handleExportExcel}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Download className="w-4 h-4 text-green-600" />
                    <span>Export to Excel</span>
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>Export to CSV</span>
                  </button>
                </div>
              )}
            </div>

            {/* Add Meter Button */}
            <button
              onClick={() => setShowAddMeterModal(true)}
              disabled={!selectedProfileId}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Meter
            </button>
          </div>
        </div>

        {selectedProfile && (
          <div className="flex items-center gap-6 text-sm text-slate-600 pt-4 border-t border-slate-200">
            <div>
              <span className="font-medium">Profile:</span> {selectedProfile.name}
            </div>
            <div>
              <span className="font-medium">Year:</span> {selectedProfile.year}
            </div>
            <div>
              <span className="font-medium">Total Meters:</span> {weights.length}
            </div>
            <div>
              <span className="font-medium">Total Customers:</span> {totalCustomers.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      {!selectedProfileId ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Scale className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">Select a SARFI profile to view weight factors</p>
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Loading weight factors...</p>
        </div>
      ) : weights.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No meters in this profile</p>
          <p className="text-sm text-slate-400 mt-2">Click "Add Meter" to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Meter No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Customer Count
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Weight Factor (%)
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {weights.map((weight) => (
                  <tr key={weight.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {weight.meter?.meter_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {weight.meter?.location || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                      {editingWeightId === weight.id ? (
                        <input
                          type="number"
                          value={editingCustomerCount}
                          onChange={(e) => setEditingCustomerCount(parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-32 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 text-right"
                          autoFocus
                        />
                      ) : (
                        (weight.customer_count || 0).toLocaleString()
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900">
                      {(weight.weight_factor * 100).toFixed(4)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      {editingWeightId === weight.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditSave(weight.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Save"
                          >
                            <Save className="w-5 h-5" />
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                            title="Cancel"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditStart(weight)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit Customer Count"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteWeight(weight.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Remove from Profile"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-6 py-4 text-sm text-slate-900" colSpan={2}>
                    Total
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-slate-900">
                    {totalCustomers.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-slate-900">
                    100.0000%
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Meter Modal */}
      {showAddMeterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Add Meter to Profile</h3>
              <button
                onClick={() => {
                  setShowAddMeterModal(false);
                  setSelectedMeterId('');
                  setNewCustomerCount(0);
                  setMeterSearchQuery('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Meters
                </label>
                <input
                  type="text"
                  value={meterSearchQuery}
                  onChange={(e) => setMeterSearchQuery(e.target.value)}
                  placeholder="Search by meter ID or location..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Meter
                </label>
                <select
                  value={selectedMeterId}
                  onChange={(e) => setSelectedMeterId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={10}
                >
                  <option value="">-- Select a meter --</option>
                  {filteredAvailableMeters.map(meter => (
                    <option key={meter.id} value={meter.id}>
                      {meter.meter_id} - {meter.location}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-slate-500 mt-2">
                  {filteredAvailableMeters.length} available meters
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Customer Count
                </label>
                <input
                  type="number"
                  value={newCustomerCount}
                  onChange={(e) => setNewCustomerCount(parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter customer count"
                />
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setShowAddMeterModal(false);
                  setSelectedMeterId('');
                  setNewCustomerCount(0);
                  setMeterSearchQuery('');
                }}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMeter}
                disabled={!selectedMeterId || newCustomerCount < 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Add Meter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Results Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Import Results</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isImporting ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-slate-600 text-lg">Processing import...</p>
                </div>
              ) : importResults ? (
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-600 font-medium">Successful</p>
                      <p className="text-3xl font-bold text-green-700">{importResults.success}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-600 font-medium">Failed</p>
                      <p className="text-3xl font-bold text-red-700">{importResults.failed}</p>
                    </div>
                  </div>

                  {importResults.errors.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Error Details:</h4>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                        {importResults.errors.map((error, idx) => (
                          <div key={idx} className="text-sm text-red-700 mb-2">
                            <span className="font-medium">Row {error.row}:</span> {error.meter_id} - {error.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importResults.success > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        ✓ Weight factors have been automatically recalculated for all meters in the profile
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex-shrink-0 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowImportModal(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
