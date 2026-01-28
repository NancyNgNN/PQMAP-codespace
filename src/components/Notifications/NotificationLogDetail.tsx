import { X, Mail, MessageSquare, Radio, CheckCircle, XCircle, Clock, AlertCircle, Calendar, User, FileText, AlertTriangle } from 'lucide-react';

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

interface NotificationLogDetailProps {
  log: NotificationLog;
  onClose: () => void;
}

export default function NotificationLogDetail({ log, onClose }: NotificationLogDetailProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'sent':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bg: 'bg-green-50',
          label: 'Successfully Sent'
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          label: 'Failed to Send'
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          label: 'Pending Delivery'
        };
      case 'suppressed':
        return {
          icon: AlertCircle,
          color: 'text-slate-600',
          bg: 'bg-slate-50',
          label: 'Suppressed (Typhoon Mode)'
        };
      default:
        return {
          icon: AlertTriangle,
          color: 'text-slate-600',
          bg: 'bg-slate-50',
          label: status
        };
    }
  };

  const getChannelInfo = (channel: string) => {
    switch (channel) {
      case 'email':
        return {
          icon: Mail,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          label: 'Email'
        };
      case 'teams':
        return {
          icon: Radio,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          label: 'Microsoft Teams'
        };
      default:
        return {
          icon: Mail,
          color: 'text-slate-600',
          bg: 'bg-slate-50',
          label: channel
        };
    }
  };

  const statusInfo = getStatusInfo(log.status);
  const channelInfo = getChannelInfo(log.channel);
  const StatusIcon = statusInfo.icon;
  const ChannelIcon = channelInfo.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Notification Details</h2>
            <p className="text-slate-600 mt-1">View complete notification information</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status and Channel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status */}
            <div className={`${statusInfo.bg} rounded-xl p-6 border-2 ${statusInfo.color.replace('text-', 'border-')}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`${statusInfo.bg} p-2 rounded-lg`}>
                  <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Delivery Status</p>
                  <p className={`text-lg font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
                </div>
              </div>
              {log.sent_at && (
                <p className="text-sm text-slate-600">
                  Sent at: {new Date(log.sent_at).toLocaleString()}
                </p>
              )}
            </div>

            {/* Channel */}
            <div className={`${channelInfo.bg} rounded-xl p-6 border-2 ${channelInfo.color.replace('text-', 'border-')}`}>
              <div className="flex items-center gap-3">
                <div className={`${channelInfo.bg} p-2 rounded-lg`}>
                  <ChannelIcon className={`w-6 h-6 ${channelInfo.color}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Notification Channel</p>
                  <p className={`text-lg font-bold ${channelInfo.color}`}>{channelInfo.label}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message (if failed) */}
          {log.status === 'failed' && log.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 mb-2">Error Details</p>
                  <p className="text-sm text-red-700">{log.error_message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Recipient Information */}
          <div className="bg-slate-50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-slate-600" />
              <h3 className="font-bold text-slate-900">Recipient Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Name</p>
                <p className="font-semibold text-slate-900">
                  {log.recipient?.full_name || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Email</p>
                <p className="font-semibold text-slate-900">{log.recipient_email}</p>
              </div>
            </div>
          </div>

          {/* Template and Rule */}
          <div className="bg-slate-50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-slate-600" />
              <h3 className="font-bold text-slate-900">Template & Rule</h3>
            </div>
            <div className="space-y-4">
              {log.template && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Template</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{log.template.name}</p>
                    <code className="text-xs text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">
                      {log.template.code}
                    </code>
                  </div>
                </div>
              )}
              {log.rule && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Rule</p>
                  <p className="font-semibold text-slate-900">{log.rule.name}</p>
                </div>
              )}
              {log.event_id && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Related Event</p>
                  <code className="text-xs font-mono text-blue-600 bg-white px-2 py-1 rounded border border-blue-200">
                    {log.event_id}
                  </code>
                </div>
              )}
            </div>
          </div>

          {/* Message Content */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-slate-600" />
              <h3 className="font-bold text-slate-900">Message Content</h3>
            </div>
            <div className="space-y-4">
              {/* Subject (for email) */}
              {log.subject && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Subject:</p>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-slate-900">{log.subject}</p>
                  </div>
                </div>
              )}

              {/* Message Body */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Message:</p>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-slate-900 whitespace-pre-wrap font-sans">
                    {log.message_body}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div className="bg-slate-50 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-slate-900">Additional Metadata</h3>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <pre className="text-xs text-slate-700 whitespace-pre-wrap">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-slate-50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-slate-600" />
              <h3 className="font-bold text-slate-900">Timeline</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Created:</span>
                <span className="font-medium text-slate-900">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              {log.sent_at && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Sent:</span>
                  <span className="font-medium text-slate-900">
                    {new Date(log.sent_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
