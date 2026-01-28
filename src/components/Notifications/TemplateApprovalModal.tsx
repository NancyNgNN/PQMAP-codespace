import { useState } from 'react';
import { X, CheckCircle, XCircle, Eye } from 'lucide-react';
import { approveTemplate } from '../../services/notificationService';
import { substituteVariables } from '../../services/notificationService';
import type { NotificationTemplate } from '../../types/database';

interface TemplateApprovalModalProps {
  template: NotificationTemplate;
  onClose: () => void;
  onApproved: () => void;
}

type ViewTab = 'email' | 'teams';

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

export default function TemplateApprovalModal({ template, onClose, onApproved }: TemplateApprovalModalProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('email');
  const [approving, setApproving] = useState(false);
  const [comments, setComments] = useState('');

  const handleApprove = async () => {
    if (!window.confirm(`Approve template "${template.name}"? This will make it available for use in notification rules.`)) {
      return;
    }

    setApproving(true);
    const { error } = await approveTemplate(template.id);
    setApproving(false);

    if (!error) {
      onApproved();
    } else {
      alert('Error approving template: ' + error.message);
    }
  };

  const handleReject = () => {
    if (!comments.trim()) {
      alert('Please provide rejection comments');
      return;
    }

    if (window.confirm(`Reject template "${template.name}"? Comments will be sent to the creator.`)) {
      // In a real implementation, this would update the template status to rejected
      // and send notification to creator with comments
      alert('Rejection feature coming soon. For now, please contact the creator directly.');
      onClose();
    }
  };

  const getPreviewContent = (channel: ViewTab) => {
    switch (channel) {
      case 'email':
        return {
          subject: template.email_subject ? substituteVariables(template.email_subject, sampleVariables) : '',
          body: template.email_body ? substituteVariables(template.email_body, sampleVariables) : ''
        };
      case 'teams':
        return {
          body: template.teams_body ? substituteVariables(template.teams_body, sampleVariables) : ''
        };
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Approve Template</h2>
            <p className="text-slate-600 mt-1">Review and approve notification template</p>
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
          {/* Template Info */}
          <div className="bg-slate-50 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-slate-900 mb-4">Template Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-slate-600">Name:</span>
                    <p className="font-semibold text-slate-900">{template.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600">Code:</span>
                    <p className="font-mono text-slate-900">{template.code}</p>
                  </div>
                  {template.description && (
                    <div>
                      <span className="text-sm text-slate-600">Description:</span>
                      <p className="text-slate-900">{template.description}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-4">Configuration</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-slate-600">Version:</span>
                    <p className="font-semibold text-slate-900">v{template.version}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600">Channels:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {template.applicable_channels.map((channel) => (
                        <span
                          key={channel}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium capitalize"
                        >
                          {channel}
                        </span>
                      ))}
                    </div>
                  </div>
                  {template.tags && template.tags.length > 0 && (
                    <div>
                      <span className="text-sm text-slate-600">Tags:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {template.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Variables */}
            <div className="mt-6">
              <h3 className="font-bold text-slate-900 mb-3">Template Variables</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {template.variables.map((variable, index) => (
                  <div
                    key={index}
                    className="bg-white p-3 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono text-blue-600">
                        {'{{'}{variable.name}{'}}'}
                      </code>
                      {variable.required && (
                        <span className="text-xs text-red-600 font-semibold">*</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">{variable.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900">Preview with Sample Data</h3>
            </div>

            {/* Channel Tabs */}
            <div className="flex gap-2 mb-4">
              {template.applicable_channels.map((channel) => (
                <button
                  key={channel}
                  onClick={() => setActiveTab(channel as ViewTab)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all capitalize ${
                    activeTab === channel
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {channel}
                </button>
              ))}
            </div>

            {/* Preview Content */}
            <div className="bg-white rounded-lg p-6 border border-slate-200 min-h-64">
              {activeTab === 'email' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-2">Subject:</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {getPreviewContent('email').subject || (
                        <span className="text-slate-400">No email subject defined</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-2">Body:</p>
                    <div className="prose max-w-none whitespace-pre-wrap text-slate-900">
                      {getPreviewContent('email').body || (
                        <span className="text-slate-400">No email body defined</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'teams' && (
                <div>
                  <p className="text-sm font-semibold text-slate-600 mb-2">Teams Message:</p>
                  <div className="prose max-w-none whitespace-pre-wrap text-slate-900">
                    {getPreviewContent('teams').body || (
                      <span className="text-slate-400">No Teams body defined</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rejection Comments (Admin use) */}
          <div className="mt-6 bg-slate-50 rounded-xl p-6">
            <h3 className="font-bold text-slate-900 mb-3">Rejection Comments (optional)</h3>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
              placeholder="Provide feedback if rejecting this template..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600">
            Only admins can approve templates. Approved templates can be used in notification rules.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={approving}
              className="flex items-center gap-2 px-6 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-all font-semibold disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50"
            >
              {approving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Approve Template
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
