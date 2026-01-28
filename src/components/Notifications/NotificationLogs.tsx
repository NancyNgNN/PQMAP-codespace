import { useEffect, useState } from 'react';
import { Search, Mail, MessageSquare, Radio, CheckCircle, XCircle, Clock, AlertCircle, Eye, AlertTriangle, Info as InfoIcon, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import NotificationLogDetail from './NotificationLogDetail';
import type { CriticalMessage, CriticalMessageInput } from '../../types/critical-message';
import mockMessages from '../../data/mockCriticalMessages.json';
import mockNotificationLogs from '../../data/mockNotificationLogs.json';

// 🎨 DEMO MODE: Using mock data instead of Supabase
const DEMO_MODE = true;
const STORAGE_KEY = 'pqmap_demo_critical_messages';

interface FormData {
  title: string;
  content: string;
  severity: 'critical' | 'warning' | 'info';
  is_active: boolean;
  start_time: string;
  end_time: string;
}

interface NotificationLog {
  id: string;
  event_id: string | null;
  rule_id: string | null;
  template_id: string | null;
  recipient_id: string;
  recipient_email: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed' | 'suppressed';
  subject: string | null;
  message_body: string;
  metadata: any;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  rule?: { name: string };
  template?: { name: string; code: string };
  recipient?: { full_name: string; email: string };
}

type StatusFilter = 'all' | 'pending' | 'sent' | 'failed' | 'suppressed';
type ChannelFilter = 'all' | 'email' | 'teams';
type TabView = 'logs' | 'critical-messages';

export default function NotificationLogs() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabView>('logs');
  
  // Notification Logs state
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Critical Messages state
  const [messages, setMessages] = useState<CriticalMessage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    severity: 'warning',
    is_active: true,
    start_time: new Date().toISOString().slice(0, 16),
    end_time: '',
  });

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    } else {
      loadCriticalMessages();
    }
  }, [activeTab]);

  useEffect(() => {
    filterLogs();
  }, [logs, statusFilter, channelFilter, searchQuery, startDate, endDate]);

  const loadCriticalMessages = async () => {
    try {
      setLoading(true);
      // Initialize localStorage with mock data if empty
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockMessages));
      }
      // Load from localStorage (Demo Mode)
      const data = stored ? JSON.parse(stored) : mockMessages;
      setMessages(data as CriticalMessage[]);
    } catch (error) {
      toast.error('Failed to load messages');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    
    try {
      if (DEMO_MODE) {
        // Use mock data from JSON file (Demo Mode)
        setLogs(mockNotificationLogs as any);
      } else {
        // Real Supabase mode (disabled for demo)
        const { data, error } = await supabase
          .from('notification_logs')
          .select(`
            *,
            rule:notification_rules(name),
            template:notification_templates(name, code),
            recipient:profiles!recipient_id(full_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) {
          toast.error('Failed to load notification logs');
          console.error('Error loading logs:', error);
        } else if (data) {
          setLogs(data as any);
        }
      }
    } catch (error) {
      console.error('Error loading notification logs:', error);
      toast.error('Failed to load notification logs');
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    // Filter by channel
    if (channelFilter !== 'all') {
      filtered = filtered.filter(log => log.channel === channelFilter);
    }

    // Filter by search query (recipient email or name)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.recipient_email.toLowerCase().includes(query) ||
        log.recipient?.full_name?.toLowerCase().includes(query) ||
        log.subject?.toLowerCase().includes(query)
      );
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(log => new Date(log.created_at) >= new Date(startDate));
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => new Date(log.created_at) <= endDateTime);
    }

    setFilteredLogs(filtered);
  };

  const handleViewDetails = (log: NotificationLog) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedLog(null);
  };

  // Critical Messages CRUD Functions
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.end_time && new Date(formData.end_time) <= new Date(formData.start_time)) {
      toast.error('End time must be after start time');
      return;
    }

    try {
      const input: CriticalMessageInput = {
        title: formData.title,
        content: formData.content,
        severity: formData.severity,
        is_active: formData.is_active,
        start_time: formData.start_time,
        end_time: formData.end_time || undefined,
      };

      // Load existing messages from localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      let allMessages: CriticalMessage[] = stored ? JSON.parse(stored) : [];

      if (editingId) {
        // Update existing message
        allMessages = allMessages.map(msg => 
          msg.id === editingId 
            ? { ...msg, ...input, updated_at: new Date().toISOString() }
            : msg
        );
        toast.success('Message updated successfully');
      } else {
        // Create new message
        const newMessage: CriticalMessage = {
          ...input,
          id: `mock-${Date.now()}`,
          end_time: input.end_time || null,
          created_by: user?.id || 'demo-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        allMessages.push(newMessage);
        toast.success('Message created successfully');
      }

      // Save back to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allMessages));

      resetForm();
      await loadCriticalMessages();
    } catch (error) {
      toast.error(editingId ? 'Failed to update message' : 'Failed to create message');
      console.error(error);
    }
  };

  const handleEdit = (message: CriticalMessage) => {
    setFormData({
      title: message.title,
      content: message.content,
      severity: message.severity,
      is_active: message.is_active,
      start_time: message.start_time.slice(0, 16),
      end_time: message.end_time ? message.end_time.slice(0, 16) : '',
    });
    setEditingId(message.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      // Delete from localStorage (Demo Mode)
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allMessages: CriticalMessage[] = JSON.parse(stored);
        const filtered = allMessages.filter(msg => msg.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
      toast.success('Message deleted successfully');
      await loadCriticalMessages();
    } catch (error) {
      toast.error('Failed to delete message');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      severity: 'warning',
      is_active: true,
      start_time: new Date().toISOString().slice(0, 16),
      end_time: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-4 border-l-red-500';
      case 'warning':
        return 'border-l-4 border-l-yellow-500';
      case 'info':
        return 'border-l-4 border-l-blue-500';
      default:
        return 'border-l-4 border-l-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            <CheckCircle className="w-3 h-3" />
            Sent
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'suppressed':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
            <AlertCircle className="w-3 h-3" />
            Suppressed
          </span>
        );
      default:
        return null;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'teams':
        return <Radio className="w-4 h-4 text-purple-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Notifications & Messages</h2>
        <p className="text-slate-600 mt-1">View notification history and manage critical messages</p>
        
        {/* Tabs */}
        <div className="mt-4 border-b border-slate-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'logs'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Notification Logs
              </div>
            </button>
            <button
              onClick={() => setActiveTab('critical-messages')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'critical-messages'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Critical Messages
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Logs Tab */}
      {activeTab === 'logs' && (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">{/* Rest of logs tab content */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Total Sent</p>
              <p className="text-3xl font-bold text-slate-900">{logs.length}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <Mail className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Successful</p>
              <p className="text-3xl font-bold text-green-600">
                {logs.filter(l => l.status === 'sent').length}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Failed</p>
              <p className="text-3xl font-bold text-red-600">
                {logs.filter(l => l.status === 'failed').length}
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-xl">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Success Rate</p>
              <p className="text-3xl font-bold text-blue-600">
                {logs.length > 0 
                  ? Math.round((logs.filter(l => l.status === 'sent').length / logs.length) * 100)
                  : 0}%
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by recipient name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="suppressed">Suppressed</option>
              </select>
            </div>

            {/* Channel Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Channel</label>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value as ChannelFilter)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Channels</option>
                <option value="email">Email</option>
                <option value="teams">Teams</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {(statusFilter !== 'all' || channelFilter !== 'all' || searchQuery || startDate || endDate) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setChannelFilter('all');
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Template
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-medium">No notifications found</p>
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-slate-900">
                          {new Date(log.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-slate-600">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {log.recipient?.full_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-slate-600">{log.recipient_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(log.channel)}
                        <span className="text-sm font-medium text-slate-700 capitalize">
                          {log.channel}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">
                          {log.template?.name || 'N/A'}
                        </p>
                        {log.template?.code && (
                          <code className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {log.template.code}
                          </code>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewDetails(log)}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-all group"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Info */}
        {filteredLogs.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Showing {filteredLogs.length} of {logs.length} notifications
              {logs.length >= 500 && ' (limited to most recent 500)'}
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <NotificationLogDetail log={selectedLog} onClose={handleCloseDetail} />
      )}
        </>
      )}

      {/* Critical Messages Tab */}
      {activeTab === 'critical-messages' && (
        <>
          {/* Header with Add Button */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Manage Critical Messages</h3>
              <p className="text-sm text-slate-600 mt-1">
                Create and manage system-wide critical messages displayed to all users
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              New Message
            </button>
          </div>

          {/* Message Form */}
          {showForm && (
            <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-slate-900">
                    {editingId ? 'Edit Message' : 'New Message'}
                  </h4>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="p-2 hover:bg-slate-100 rounded-lg"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., System Maintenance Scheduled"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter detailed message content..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Severity <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="info">ℹ️ Info</option>
                      <option value="warning">⚠️ Warning</option>
                      <option value="critical">🔴 Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mt-8">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Active (Show to users)</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      End Time (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingId ? 'Update Message' : 'Create Message'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Messages List */}
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 border border-slate-100 text-center">
                <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">No critical messages yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Click "New Message" to create your first critical message
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`bg-white rounded-xl shadow-md p-6 border ${getSeverityBorder(message.severity)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-slate-900">{message.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(message.severity)}`}>
                          {message.severity.toUpperCase()}
                        </span>
                        {message.is_active ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-300">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold border border-slate-300">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 mb-3">{message.content}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div>
                          <span className="font-medium">Start:</span>{' '}
                          {new Date(message.start_time).toLocaleString()}
                        </div>
                        {message.end_time && (
                          <div>
                            <span className="font-medium">End:</span>{' '}
                            {new Date(message.end_time).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(message)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all"
                        title="Edit Message"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(message.id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                        title="Delete Message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
