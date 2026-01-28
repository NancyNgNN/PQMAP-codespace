import { useEffect, useState } from 'react';
import { FileText, Plus, Edit2, Archive, CheckCircle, Clock, XCircle } from 'lucide-react';
import { getTemplates, archiveTemplate } from '../../services/notificationService';
import type { NotificationTemplate } from '../../types/database';
import TemplateApprovalModal from './TemplateApprovalModal';

type StatusFilter = 'all' | 'draft' | 'approved' | 'archived';

interface TemplateListProps {
  onEdit: (template: NotificationTemplate) => void;
  onNew: () => void;
}

export default function TemplateList({ onEdit, onNew }: TemplateListProps) {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, statusFilter, searchQuery]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await getTemplates();
    if (data && !error) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.code.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleArchive = async (template: NotificationTemplate) => {
    if (window.confirm(`Are you sure you want to archive "${template.name}"?`)) {
      const { error } = await archiveTemplate(template.id);
      if (!error) {
        loadTemplates();
      }
    }
  };

  const handleApproveClick = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setApprovalModalOpen(true);
  };

  const handleApprovalComplete = () => {
    setApprovalModalOpen(false);
    setSelectedTemplate(null);
    loadTemplates();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'draft':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
            <Clock className="w-3 h-3" />
            Draft
          </span>
        );
      case 'archived':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
            <XCircle className="w-3 h-3" />
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  const getChannelBadges = (channels: string[]) => {
    const channelIcons: Record<string, string> = {
      email: '📧',
      teams: '👥'
    };

    return channels.map(channel => (
      <span key={channel} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
        {channelIcons[channel] || ''} {channel.charAt(0).toUpperCase() + channel.slice(1)}
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-slate-700" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notification Templates</h1>
            <p className="text-slate-600 mt-1">Manage multi-channel notification templates</p>
          </div>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">New Template</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Total Templates</p>
              <p className="text-3xl font-bold text-slate-900">{templates.length}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Approved</p>
              <p className="text-3xl font-bold text-green-600">
                {templates.filter(t => t.status === 'approved').length}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Drafts</p>
              <p className="text-3xl font-bold text-amber-600">
                {templates.filter(t => t.status === 'draft').length}
              </p>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Archived</p>
              <p className="text-3xl font-bold text-slate-600">
                {templates.filter(t => t.status === 'archived').length}
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <Archive className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search templates by name, code, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'draft', 'approved', 'archived'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Template
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Channels
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-medium">No templates found</p>
                    <p className="text-sm mt-1">Create your first template to get started</p>
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{template.name}</p>
                        {template.description && (
                          <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm font-mono">
                        {template.code}
                      </code>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(template.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {getChannelBadges(template.applicable_channels)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600">v{template.version}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {new Date(template.updated_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {template.status === 'draft' && (
                          <button
                            onClick={() => handleApproveClick(template)}
                            className="p-2 hover:bg-green-50 rounded-lg transition-all group"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4 text-green-600 group-hover:text-green-700" />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(template)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-all group"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                        </button>
                        {template.status !== 'archived' && (
                          <button
                            onClick={() => handleArchive(template)}
                            className="p-2 hover:bg-amber-50 rounded-lg transition-all group"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4 text-amber-600 group-hover:text-amber-700" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Modal */}
      {approvalModalOpen && selectedTemplate && (
        <TemplateApprovalModal
          template={selectedTemplate}
          onClose={() => setApprovalModalOpen(false)}
          onApproved={handleApprovalComplete}
        />
      )}
    </div>
  );
}
