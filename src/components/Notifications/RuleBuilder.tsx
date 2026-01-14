import { useEffect, useState } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RuleBuilderProps {
  ruleId?: string;
  onClose: () => void;
  onSaved: () => void;
}

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: any;
}

const CONDITION_FIELDS = [
  { value: 'event_type', label: 'Event Type', type: 'select', options: ['voltage_dip', 'swell', 'interruption', 'harmonic', 'transient'] },
  { value: 'severity', label: 'Severity', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
  { value: 'magnitude', label: 'Magnitude (%)', type: 'number' },
  { value: 'duration', label: 'Duration (ms)', type: 'number' },
  { value: 'customer_count', label: 'Customer Count', type: 'number' },
  { value: 'region', label: 'Region', type: 'select', options: ['Hong Kong', 'Kowloon', 'New Territories'] },
  { value: 'voltage_level', label: 'Voltage Level', type: 'select', options: ['11kV', '22kV', '33kV', '66kV', '132kV', '275kV', '400kV'] },
  { value: 'status', label: 'Status', type: 'select', options: ['new', 'under_investigation', 'resolved', 'closed'] },
];

const OPERATORS = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '≠' },
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
  { value: 'greater_or_equal', label: '≥' },
  { value: 'less_or_equal', label: '≤' },
  { value: 'in', label: 'In' },
  { value: 'not_in', label: 'Not In' },
  { value: 'contains', label: 'Contains' },
];

function RuleBuilder({ ruleId, onClose, onSaved }: RuleBuilderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [channels, setChannels] = useState<string[]>(['email']);
  const [groups, setGroups] = useState<string[]>([]);
  const [adhocRecipients, setAdhocRecipients] = useState('');
  const [priority, setPriority] = useState(1);
  const [typhoonModeEnabled, setTyphoonModeEnabled] = useState(false);
  const [motherEventOnly, setMotherEventOnly] = useState(false);
  const [includeWaveform, setIncludeWaveform] = useState(false);
  const [active, setActive] = useState(true);
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [availableChannels, setAvailableChannels] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [ruleId]);

  const loadData = async () => {
    setLoading(true);

    // Load templates
    const { data: templatesData } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('status', 'approved')
      .order('name', { ascending: true });

    if (templatesData) setTemplates(templatesData);

    // Load channels
    const { data: channelsData } = await supabase
      .from('notification_channels')
      .select('*')
      .eq('status', 'enabled')
      .order('priority', { ascending: true });

    if (channelsData) setAvailableChannels(channelsData);

    // Load groups
    const { data: groupsData } = await supabase
      .from('notification_groups')
      .select('*')
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (groupsData) setAvailableGroups(groupsData);

    // Load rule data if editing
    if (ruleId) {
      const { data: ruleData } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      if (ruleData) {
        setName(ruleData.name);
        setDescription(ruleData.description || '');
        setConditions(ruleData.conditions?.map((c: any) => ({ ...c, id: crypto.randomUUID() })) || []);
        setTemplateId(ruleData.template_id || '');
        setChannels(ruleData.channels || ['email']);
        setGroups(ruleData.notification_groups || []);
        setAdhocRecipients(ruleData.adhoc_recipients?.join(', ') || '');
        setPriority(ruleData.priority || 1);
        setTyphoonModeEnabled(ruleData.typhoon_mode_enabled || false);
        setMotherEventOnly(ruleData.mother_event_only || false);
        setIncludeWaveform(ruleData.include_waveform || false);
        setActive(ruleData.active);
      }
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a rule name');
      return;
    }

    if (!templateId) {
      alert('Please select a template');
      return;
    }

    if (channels.length === 0) {
      alert('Please select at least one channel');
      return;
    }

    if (groups.length === 0 && !adhocRecipients.trim()) {
      alert('Please select at least one group or add ad-hoc recipients');
      return;
    }

    setSaving(true);

    try {
      const ruleData = {
        name: name.trim(),
        description: description.trim(),
        conditions: conditions.map(({ id, ...c }) => c),
        template_id: templateId,
        channels,
        notification_groups: groups,
        adhoc_recipients: adhocRecipients.trim() ? adhocRecipients.split(',').map(r => r.trim()) : null,
        priority,
        typhoon_mode_enabled: typhoonModeEnabled,
        mother_event_only: motherEventOnly,
        include_waveform: includeWaveform,
        active,
        updated_at: new Date().toISOString()
      };

      if (ruleId) {
        await supabase
          .from('notification_rules')
          .update(ruleData)
          .eq('id', ruleId);
      } else {
        await supabase
          .from('notification_rules')
          .insert(ruleData);
      }

      onSaved();
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('Failed to save rule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addCondition = () => {
    setConditions([...conditions, {
      id: crypto.randomUUID(),
      field: 'event_type',
      operator: 'equals',
      value: ''
    }]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const toggleChannel = (channelType: string) => {
    setChannels(prev => 
      prev.includes(channelType)
        ? prev.filter(c => c !== channelType)
        : [...prev, channelType]
    );
  };

  const toggleGroup = (groupId: string) => {
    setGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(g => g !== groupId)
        : [...prev, groupId]
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {ruleId ? 'Edit Rule' : 'Create New Rule'}
            </h2>
            <p className="text-slate-600 mt-1">Configure notification rule conditions and recipients</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 text-lg">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rule Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Critical Events with Customer Impact"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe when this rule should trigger..."
              />
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-lg">Conditions</h3>
              <button
                onClick={addCondition}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Condition
              </button>
            </div>

            {conditions.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-slate-500">No conditions. This rule will match all events.</p>
                <button
                  onClick={addCondition}
                  className="mt-2 text-blue-600 hover:text-blue-700 font-semibold text-sm"
                >
                  Add your first condition
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {conditions.map((condition, index) => {
                  const fieldConfig = CONDITION_FIELDS.find(f => f.value === condition.field);
                  
                  return (
                    <div key={condition.id} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      {index > 0 && (
                        <div className="pt-2 px-2 text-sm font-semibold text-blue-600">AND</div>
                      )}
                      
                      <select
                        value={condition.field}
                        onChange={(e) => updateCondition(condition.id, { field: e.target.value, value: '' })}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {CONDITION_FIELDS.map(field => (
                          <option key={field.value} value={field.value}>{field.label}</option>
                        ))}
                      </select>

                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(condition.id, { operator: e.target.value })}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {OPERATORS.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>

                      {fieldConfig?.type === 'select' ? (
                        <select
                          value={condition.value}
                          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select...</option>
                          {fieldConfig.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={fieldConfig?.type || 'text'}
                          value={condition.value}
                          onChange={(e) => updateCondition(condition.id, { 
                            value: fieldConfig?.type === 'number' ? parseFloat(e.target.value) : e.target.value 
                          })}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Value"
                        />
                      )}

                      <button
                        onClick={() => removeCondition(condition.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Template Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 text-lg">Message Template *</h3>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a template...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.code})
                </option>
              ))}
            </select>
          </div>

          {/* Channels */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 text-lg">Delivery Channels *</h3>
            <div className="flex flex-wrap gap-3">
              {availableChannels.map(channel => (
                <label
                  key={channel.id}
                  className="flex items-center gap-2 px-4 py-2 border-2 rounded-lg cursor-pointer transition-all"
                  style={{
                    borderColor: channels.includes(channel.type) ? '#3b82f6' : '#e2e8f0',
                    backgroundColor: channels.includes(channel.type) ? '#eff6ff' : 'white'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={channels.includes(channel.type)}
                    onChange={() => toggleChannel(channel.type)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="font-medium capitalize">{channel.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Groups */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 text-lg">Recipient Groups</h3>
            <div className="grid grid-cols-2 gap-3">
              {availableGroups.map(group => (
                <label
                  key={group.id}
                  className="flex items-center gap-2 px-4 py-3 border-2 rounded-lg cursor-pointer transition-all"
                  style={{
                    borderColor: groups.includes(group.id) ? '#3b82f6' : '#e2e8f0',
                    backgroundColor: groups.includes(group.id) ? '#eff6ff' : 'white'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={groups.includes(group.id)}
                    onChange={() => toggleGroup(group.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="font-medium block">{group.name}</span>
                    <span className="text-xs text-slate-500">{group.description}</span>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ad-hoc Recipients (comma-separated emails)
              </label>
              <input
                type="text"
                value={adhocRecipients}
                onChange={(e) => setAdhocRecipients(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="user1@example.com, user2@example.com"
              />
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 text-lg">Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Priority (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={typhoonModeEnabled}
                  onChange={(e) => setTyphoonModeEnabled(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-slate-900">Enable Typhoon Mode</span>
                  <p className="text-sm text-slate-600">Suppress notifications during typhoon</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={motherEventOnly}
                  onChange={(e) => setMotherEventOnly(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-slate-900">Mother Event Only</span>
                  <p className="text-sm text-slate-600">Only notify for mother events, not child events</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeWaveform}
                  onChange={(e) => setIncludeWaveform(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-slate-900">Include Waveform</span>
                  <p className="text-sm text-slate-600">Attach waveform image to notification</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-slate-900">Active</span>
                  <p className="text-sm text-slate-600">Enable this rule immediately after saving</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : ruleId ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RuleBuilder;
