import { useState, useEffect } from 'react';
import { X, Save, Eye, Plus, Trash2, Code } from 'lucide-react';
import { createTemplate, updateTemplate, getTemplate } from '../../services/notificationService';
import { substituteVariables } from '../../services/notificationService';

interface TemplateEditorProps {
  templateId?: string;
  onClose: () => void;
  onSaved: () => void;
}

type ChannelTab = 'email' | 'teams';

interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  default_value?: string;
}

const sampleVariables = {
  event_id: 'EVT-2026-0001',
  event_type: 'Voltage Dip',
  timestamp: '2026-01-14 15:30:00',
  duration: '2.5s',
  magnitude: '85%',
  severity: 'Critical',
  location: 'Substation A - Feeder 123',
  meter_id: 'MTR-001',
  substation: 'Substation A',
  customer_count: '150',
  description: 'Voltage dip detected on main feeder',
  root_cause: 'Lightning strike'
};

export default function TemplateEditor({ templateId, onClose, onSaved }: TemplateEditorProps) {
  const [loading, setLoading] = useState(!!templateId);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ChannelTab>('email');
  const [showPreview, setShowPreview] = useState(false);

  // Template fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [teamsBody, setTeamsBody] = useState('');
  const [variables, setVariables] = useState<TemplateVariable[]>([
    { name: 'event_type', description: 'Type of PQ event', required: true },
    { name: 'location', description: 'Event location', required: true },
    { name: 'magnitude', description: 'Event magnitude', required: false },
    { name: 'severity', description: 'Event severity level', required: false },
    { name: 'timestamp', description: 'Event timestamp', required: true },
    { name: 'duration', description: 'Event duration', required: false },
    { name: 'customer_count', description: 'Affected customers', required: false }
  ]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['email']);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    if (!templateId) return;
    
    setLoading(true);
    const { data } = await getTemplate(templateId);
    
    if (data) {
      setName(data.name);
      setCode(data.code);
      setDescription(data.description || '');
      setEmailSubject(data.email_subject || '');
      setEmailBody(data.email_body || '');
      setTeamsBody(data.teams_body || '');
      setVariables(data.variables || []);
      setSelectedChannels(data.applicable_channels || []);
      setTags(data.tags || []);
    }
    
    setLoading(false);
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      alert('Template name is required');
      return;
    }
    if (!code.trim()) {
      alert('Template code is required');
      return;
    }
    if (selectedChannels.length === 0) {
      alert('Select at least one channel');
      return;
    }

    // Check if channel content exists for selected channels
    if (selectedChannels.includes('email') && (!emailSubject.trim() || !emailBody.trim())) {
      alert('Email channel requires both subject and body');
      return;
    }

    if (selectedChannels.includes('teams') && !teamsBody.trim()) {
      alert('Teams channel requires message body');
      return;
    }

    setSaving(true);

    const templateData = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      email_subject: emailSubject.trim() || null,
      email_body: emailBody.trim() || null,
      teams_body: teamsBody.trim() || null,
      variables,
      applicable_channels: selectedChannels,
      tags,
      status: 'draft' as const,
      version: 1,
      created_by: null,
      approved_by: null,
      approved_at: null
    };

    let result;
    if (templateId) {
      result = await updateTemplate(templateId, templateData);
    } else {
      result = await createTemplate(templateData);
    }

    setSaving(false);

    if (!result.error) {
      onSaved();
    } else {
      alert('Error saving template: ' + result.error.message);
    }
  };

  const addVariable = () => {
    setVariables([...variables, { name: '', description: '', required: false }]);
  };

  const updateVariable = (index: number, field: keyof TemplateVariable, value: any) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    setVariables(updated);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const insertVariable = (varName: string) => {
    const placeholder = `{{${varName}}}`;
    
    switch (activeTab) {
      case 'email':
        setEmailBody(emailBody + placeholder);
        break;
      case 'teams':
        setTeamsBody(teamsBody + placeholder);
        break;
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const getPreviewContent = () => {
    switch (activeTab) {
      case 'email':
        return {
          subject: substituteVariables(emailSubject, sampleVariables),
          body: substituteVariables(emailBody, sampleVariables)
        };
      case 'teams':
        return {
          body: substituteVariables(teamsBody, sampleVariables)
        };
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600 text-center">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {templateId ? 'Edit Template' : 'New Template'}
            </h2>
            <p className="text-slate-600 mt-1">Create multi-channel notification template</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Basic Info & Variables */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                <h3 className="font-bold text-slate-900">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Critical Event Alert"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Template Code *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="CRITICAL_ALERT"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="Template description..."
                  />
                </div>

                {/* Channels */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Channels *
                  </label>
                  <div className="space-y-2">
                    {['email', 'teams'].map((channel) => (
                      <label key={channel} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedChannels.includes(channel)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChannels([...selectedChannels, channel]);
                            } else {
                              setSelectedChannels(selectedChannels.filter(c => c !== channel));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 capitalize">{channel}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add tag..."
                    />
                    <button
                      onClick={addTag}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm"
                      >
                        {tag}
                        <button onClick={() => removeTag(tag)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Variables */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900">Template Variables</h3>
                  <button
                    onClick={addVariable}
                    className="p-1 hover:bg-slate-200 rounded transition-all"
                  >
                    <Plus className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {variables.map((variable, index) => (
                    <div key={index} className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex items-start gap-2 mb-2">
                        <input
                          type="text"
                          value={variable.name}
                          onChange={(e) => updateVariable(index, 'name', e.target.value)}
                          className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm font-mono"
                          placeholder="variable_name"
                        />
                        <button
                          onClick={() => insertVariable(variable.name)}
                          className="p-1 hover:bg-blue-50 rounded transition-all"
                          title="Insert into template"
                        >
                          <Code className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => removeVariable(index)}
                          className="p-1 hover:bg-red-50 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={variable.description}
                        onChange={(e) => updateVariable(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm mb-2"
                        placeholder="Description"
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={variable.required}
                          onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                          className="w-3 h-3 text-blue-600 rounded"
                        />
                        <span className="text-slate-600">Required</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Channel Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Tab Navigation */}
              <div className="flex gap-2 border-b border-slate-200">
                {['email', 'teams'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as ChannelTab)}
                    className={`px-4 py-2 font-semibold transition-all capitalize ${
                      activeTab === tab
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                <div className="flex-1"></div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    showPreview
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
              </div>

              {/* Channel Content */}
              {!showPreview ? (
                <div className="space-y-4">
                  {activeTab === 'email' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Subject *
                        </label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Critical PQ Event: {{event_type}} at {{location}}"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Body (HTML supported) *
                        </label>
                        <textarea
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                          rows={20}
                          placeholder="Event detected at {{timestamp}}..."
                        />
                      </div>
                    </>
                  )}

                  {activeTab === 'teams' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Message (Markdown supported) *
                      </label>
                      <textarea
                        value={teamsBody}
                        onChange={(e) => setTeamsBody(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        rows={20}
                        placeholder="## PQ Event Alert\n\n**Type:** {{event_type}}\n**Location:** {{location}}"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-6 min-h-96">
                  <h3 className="font-bold text-slate-900 mb-4">Preview with Sample Data</h3>
                  {activeTab === 'email' && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-600 mb-2">Subject:</p>
                        <p className="text-lg font-semibold text-slate-900">{getPreviewContent().subject}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-600 mb-2">Body:</p>
                        <div className="bg-white p-4 rounded-lg border border-slate-200 whitespace-pre-wrap">
                          {getPreviewContent().body}
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'teams' && (
                    <div className="bg-white p-4 rounded-lg border border-slate-200 whitespace-pre-wrap">
                      {getPreviewContent().body}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600">
            Templates are saved as drafts and require admin approval
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Template
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
