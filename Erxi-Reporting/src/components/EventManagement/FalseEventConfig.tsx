import React, { useState, useEffect } from 'react';
import { Settings, Shield, Brain, TrendingUp, AlertTriangle, CheckCircle, XCircle, Plus, Edit2, Trash2 } from 'lucide-react';

interface FalseEventRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  conditions: {
    // Duration-based rules
    minDuration?: number;
    maxDuration?: number;
    
    // Magnitude-based rules  
    minMagnitude?: number;
    maxMagnitude?: number;
    
    // Frequency-based rules
    maxEventsPerHour?: number;
    maxEventsPerDay?: number;
    
    // Pattern-based rules
    requiresWaveformAnomaly?: boolean;
    requiresMultiplePhases?: boolean;
    
    // Validation rules
    requiresADMSValidation?: boolean;
    allowedEventTypes?: string[];
    excludedEventTypes?: string[];
    
    // Time-based rules
    excludeMaintenanceHours?: boolean;
    excludeWeekends?: boolean;
    
    // Location-based rules
    excludedSubstations?: string[];
    excludedVoltageLevel?: string[];
  };
  actions: {
    autoMark?: boolean;
    autoHide?: boolean;
    requireReview?: boolean;
    notifyOperator?: boolean;
  };
  statistics: {
    totalProcessed: number;
    falsePositivesCaught: number;
    accuracyRate: number;
    lastTriggered?: string;
  };
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

interface FalseEventConfigProps {
  events: any[];
  onRulesChange: (rules: FalseEventRule[]) => void;
  onApplyRules: (rules: FalseEventRule[]) => void;
}

export default function FalseEventConfig({ events, onRulesChange, onApplyRules }: FalseEventConfigProps) {
  const [rules, setRules] = useState<FalseEventRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<FalseEventRule | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'analytics' | 'settings'>('rules');
  const [formData, setFormData] = useState<Partial<FalseEventRule>>({});
  const [testMode, setTestMode] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  // Predefined rule templates
  const ruleTemplates: Partial<FalseEventRule>[] = [
    {
      name: 'Ultra-Short Duration Filter',
      description: 'Filter out events shorter than 50ms (likely measurement noise)',
      conditions: {
        maxDuration: 50,
        requiresADMSValidation: false
      },
      actions: {
        autoMark: true,
        autoHide: false,
        requireReview: true
      }
    },
    {
      name: 'Maintenance Window Filter',  
      description: 'Filter events during scheduled maintenance hours',
      conditions: {
        excludeMaintenanceHours: true,
        requiresADMSValidation: true
      },
      actions: {
        autoMark: true,
        autoHide: true,
        requireReview: false
      }
    },
    {
      name: 'High Frequency Noise Filter',
      description: 'Detect potential noise from too many events per hour',
      conditions: {
        maxEventsPerHour: 20,
        maxDuration: 500,
        excludedEventTypes: ['interruption']
      },
      actions: {
        autoMark: false,
        autoHide: false,
        requireReview: true,
        notifyOperator: true
      }
    },
    {
      name: 'Low Magnitude Sag Filter',
      description: 'Filter voltage sags with minimal impact (<10%)',
      conditions: {
        allowedEventTypes: ['voltage_dip'],
        maxMagnitude: 10,
        requiresADMSValidation: false
      },
      actions: {
        autoMark: true,
        autoHide: false,
        requireReview: false
      }
    }
  ];

  useEffect(() => {
    loadSavedRules();
  }, []);

  const loadSavedRules = () => {
    // Load rules from localStorage or backend
    const savedRules = localStorage.getItem('pqmap_false_event_rules');
    if (savedRules) {
      try {
        const parsed = JSON.parse(savedRules);
        setRules(parsed);
        onRulesChange(parsed);
      } catch (error) {
        console.error('Error loading saved rules:', error);
      }
    }
  };

  const saveRules = (updatedRules: FalseEventRule[]) => {
    setRules(updatedRules);
    localStorage.setItem('pqmap_false_event_rules', JSON.stringify(updatedRules));
    onRulesChange(updatedRules);
  };

  const createRule = (template?: Partial<FalseEventRule>) => {
    const newRule: FalseEventRule = {
      id: `rule_${Date.now()}`,
      name: template?.name || 'New Rule',
      description: template?.description || 'Custom false event detection rule',
      isActive: true,
      priority: rules.length + 1,
      conditions: template?.conditions || {},
      actions: template?.actions || {
        autoMark: false,
        autoHide: false,
        requireReview: true
      },
      statistics: {
        totalProcessed: 0,
        falsePositivesCaught: 0,
        accuracyRate: 0
      },
      createdAt: new Date().toISOString(),
      createdBy: 'current_user',
      updatedAt: new Date().toISOString()
    };

    setFormData(newRule);
    setSelectedRule(newRule);
    setShowEditor(true);
  };

  const editRule = (rule: FalseEventRule) => {
    setFormData(rule);
    setSelectedRule(rule);
    setShowEditor(true);
  };

  const saveRule = () => {
    if (!formData.id) return;

    const updatedRules = selectedRule && rules.find(r => r.id === selectedRule.id)
      ? rules.map(r => r.id === formData.id ? { ...formData as FalseEventRule, updatedAt: new Date().toISOString() } : r)
      : [...rules, { ...formData as FalseEventRule, updatedAt: new Date().toISOString() }];

    saveRules(updatedRules);
    setShowEditor(false);
    setSelectedRule(null);
    setFormData({});
  };

  const deleteRule = (ruleId: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      const updatedRules = rules.filter(r => r.id !== ruleId);
      saveRules(updatedRules);
    }
  };

  const toggleRuleActive = (ruleId: string) => {
    const updatedRules = rules.map(r => 
      r.id === ruleId ? { ...r, isActive: !r.isActive, updatedAt: new Date().toISOString() } : r
    );
    saveRules(updatedRules);
  };

  const testRules = () => {
    setTestMode(true);
    const results = events.map(event => {
      const applicableRules = rules.filter(rule => rule.isActive);
      const triggeredRules = applicableRules.filter(rule => evaluateRule(rule, event));
      
      return {
        eventId: event.id,
        event,
        triggeredRules,
        wouldBeMarkedFalse: triggeredRules.some(rule => rule.actions.autoMark),
        wouldBeHidden: triggeredRules.some(rule => rule.actions.autoHide),
        requiresReview: triggeredRules.some(rule => rule.actions.requireReview)
      };
    });
    
    setTestResults(results);
  };

  const evaluateRule = (rule: FalseEventRule, event: any): boolean => {
    const { conditions } = rule;
    
    // Duration checks
    if (conditions.minDuration && event.duration_ms < conditions.minDuration) return false;
    if (conditions.maxDuration && event.duration_ms > conditions.maxDuration) return false;
    
    // Magnitude checks
    if (conditions.minMagnitude && event.magnitude < conditions.minMagnitude) return false;
    if (conditions.maxMagnitude && event.magnitude > conditions.maxMagnitude) return false;
    
    // Event type checks
    if (conditions.allowedEventTypes && !conditions.allowedEventTypes.includes(event.event_type)) return false;
    if (conditions.excludedEventTypes && conditions.excludedEventTypes.includes(event.event_type)) return false;
    
    // Validation checks
    if (conditions.requiresADMSValidation && !event.validated_by_adms) return false;
    
    return true;
  };

  const applyRulesToEvents = () => {
    onApplyRules(rules.filter(r => r.isActive));
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateCondition = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      conditions: { ...prev.conditions, [field]: value }
    }));
  };

  const updateAction = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      actions: { ...prev.actions, [field]: value }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">False Event Filtering</h2>
            <p className="text-slate-600">Configure automated detection and filtering of false positive events</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={testRules}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Brain className="w-4 h-4" />
            Test Rules
          </button>
          <button
            onClick={() => createRule()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {[
            { id: 'rules', label: 'Detection Rules', icon: Settings },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'settings', label: 'Global Settings', icon: Shield }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Rule Templates */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Quick Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {ruleTemplates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => createRule(template)}
                  className="p-3 bg-white rounded border border-slate-200 hover:border-blue-300 text-left transition-colors"
                >
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{template.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Rules List */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Active Detection Rules ({rules.length})</h3>
              <button
                onClick={applyRulesToEvents}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Apply All Rules
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rule</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Performance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{rule.name}</p>
                          <p className="text-xs text-slate-500">{rule.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleRuleActive(rule.id)}
                            className={`w-8 h-4 rounded-full flex items-center ${
                              rule.isActive ? 'bg-green-500' : 'bg-slate-300'
                            }`}
                          >
                            <div
                              className={`w-3 h-3 bg-white rounded-full transition-transform ${
                                rule.isActive ? 'translate-x-4' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className={`text-xs ${rule.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-slate-900">{rule.statistics.falsePositivesCaught} caught</p>
                          <p className="text-xs text-slate-500">
                            {rule.statistics.accuracyRate.toFixed(1)}% accuracy
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => editRule(rule)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rules.length === 0 && (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Detection Rules</h3>
                <p className="text-slate-500 mb-4">Create your first false event detection rule to get started.</p>
                <button
                  onClick={() => createRule()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Create Rule
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Results */}
      {testMode && testResults.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Rule Test Results</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {testResults.slice(0, 10).map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {result.event.event_type.replace('_', ' ').toUpperCase()} - {result.event.circuit_id}
                  </p>
                  <p className="text-xs text-slate-500">
                    Duration: {result.event.duration_ms}ms, Magnitude: {result.event.magnitude}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {result.wouldBeMarkedFalse && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                      Would Mark False
                    </span>
                  )}
                  {result.wouldBeHidden && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                      Would Hide
                    </span>
                  )}
                  {result.requiresReview && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                      Needs Review
                    </span>
                  )}
                  {result.triggeredRules.length === 0 && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      Valid Event
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Showing {Math.min(testResults.length, 10)} of {testResults.length} events tested
            </p>
            <button
              onClick={() => setTestMode(false)}
              className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
            >
              Close Test
            </button>
          </div>
        </div>
      )}

      {/* Rule Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">
                  {selectedRule && rules.find(r => r.id === selectedRule.id) ? 'Edit Rule' : 'Create New Rule'}
                </h3>
                <button
                  onClick={() => setShowEditor(false)}
                  className="p-2 text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Rule Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter rule name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <input
                    type="number"
                    value={formData.priority || 1}
                    onChange={(e) => updateFormData('priority', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    max="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe what this rule detects"
                />
              </div>

              {/* Conditions */}
              <div>
                <h4 className="text-lg font-medium mb-3">Detection Conditions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Duration (ms)</label>
                    <input
                      type="number"
                      value={formData.conditions?.minDuration || ''}
                      onChange={(e) => updateCondition('minDuration', parseInt(e.target.value) || undefined)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Duration (ms)</label>
                    <input
                      type="number"
                      value={formData.conditions?.maxDuration || ''}
                      onChange={(e) => updateCondition('maxDuration', parseInt(e.target.value) || undefined)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Magnitude</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.conditions?.minMagnitude || ''}
                      onChange={(e) => updateCondition('minMagnitude', parseFloat(e.target.value) || undefined)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Magnitude</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.conditions?.maxMagnitude || ''}
                      onChange={(e) => updateCondition('maxMagnitude', parseFloat(e.target.value) || undefined)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.conditions?.requiresADMSValidation || false}
                      onChange={(e) => updateCondition('requiresADMSValidation', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Requires ADMS Validation</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.conditions?.excludeMaintenanceHours || false}
                      onChange={(e) => updateCondition('excludeMaintenanceHours', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Exclude Maintenance Hours</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.conditions?.excludeWeekends || false}
                      onChange={(e) => updateCondition('excludeWeekends', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Exclude Weekends</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div>
                <h4 className="text-lg font-medium mb-3">Actions</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.actions?.autoMark || false}
                      onChange={(e) => updateAction('autoMark', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Automatically mark as false positive</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.actions?.autoHide || false}
                      onChange={(e) => updateAction('autoHide', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Hide from main event list</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.actions?.requireReview || false}
                      onChange={(e) => updateAction('requireReview', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Require manual review</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.actions?.notifyOperator || false}
                      onChange={(e) => updateAction('notifyOperator', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Notify operator</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-slate-700 border border-slate-300 rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={saveRule}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}