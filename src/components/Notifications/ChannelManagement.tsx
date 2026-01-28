import { useEffect, useState } from 'react';
import { Radio, Settings, CheckCircle, XCircle, AlertTriangle, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { NotificationChannel } from '../../types/database';

export default function ChannelManagement() {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [config, setConfig] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notification_channels')
      .select('*')
      .order('priority', { ascending: true });

    if (data) setChannels(data);
    setLoading(false);
  };

  const handleEdit = (channel: NotificationChannel) => {
    setEditingChannel(channel);
    setConfig(channel.config || {});
  };

  const handleCancel = () => {
    setEditingChannel(null);
    setConfig({});
  };

  const handleSave = async () => {
    if (!editingChannel) return;

    setSaving(true);
    const { error } = await supabase
      .from('notification_channels')
      .update({ 
        config,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingChannel.id);

    if (!error) {
      await loadChannels();
      setEditingChannel(null);
      setConfig({});
    }
    setSaving(false);
  };

  const toggleStatus = async (channel: NotificationChannel) => {
    const newStatus = channel.status === 'enabled' ? 'disabled' : 'enabled';
    await supabase
      .from('notification_channels')
      .update({ status: newStatus })
      .eq('id', channel.id);

    await loadChannels();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enabled':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'disabled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'maintenance':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enabled':
        return 'bg-green-100 text-green-700';
      case 'disabled':
        return 'bg-red-100 text-red-700';
      case 'maintenance':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notification Channels</h2>
          <p className="text-slate-600 mt-1">Configure delivery channels for notifications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className={`p-3 rounded-xl ${
                  channel.status === 'enabled' ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <Radio className={`w-6 h-6 ${
                    channel.status === 'enabled' ? 'text-blue-600' : 'text-slate-400'
                  }`} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-slate-900">{channel.name}</h3>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(channel.status)}
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(channel.status)}`}>
                        {channel.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-600 mb-4">Delivery channel for {channel.type} notifications</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Type:</span>
                      <p className="font-semibold text-slate-900 capitalize">{channel.type}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Priority:</span>
                      <p className="font-semibold text-slate-900">{channel.priority}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Success Rate:</span>
                      <p className="font-semibold text-green-600">
                        {channel.monitoring_metrics?.success_rate || 100}%
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Avg Latency:</span>
                      <p className="font-semibold text-slate-900">
                        {channel.monitoring_metrics?.avg_latency_ms || 0}ms
                      </p>
                    </div>
                  </div>

                  {editingChannel?.id === channel.id && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-4">
                      <h4 className="font-semibold text-slate-900">Configuration</h4>
                      
                      {channel.type === 'email' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              SMTP Server
                            </label>
                            <input
                              type="text"
                              value={config.smtp_server || ''}
                              onChange={(e) => setConfig({ ...config, smtp_server: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="smtp.example.com"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Port
                              </label>
                              <input
                                type="number"
                                value={config.port || ''}
                                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="587"
                              />
                            </div>
                            <div className="flex items-center">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={config.use_ssl || false}
                                  onChange={(e) => setConfig({ ...config, use_ssl: e.target.checked })}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-700">Use SSL</span>
                              </label>
                            </div>
                          </div>
                        </>
                      )}

                      {channel.type === 'teams' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Webhook URL
                          </label>
                          <input
                            type="url"
                            value={config.webhook_url || ''}
                            onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="https://outlook.office.com/webhook/..."
                          />
                        </div>
                      )}

                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.demo_mode || false}
                            onChange={(e) => setConfig({ ...config, demo_mode: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700">
                            Demo Mode (Log only, don't send)
                          </span>
                        </label>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => toggleStatus(channel)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    channel.status === 'enabled'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {channel.status === 'enabled' ? 'Disable' : 'Enable'}
                </button>
                {editingChannel?.id === channel.id ? (
                  <button
                    onClick={handleCancel}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <XCircle className="w-5 h-5 text-slate-600" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleEdit(channel)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <Settings className="w-5 h-5 text-slate-600" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-2">Demo Mode</h3>
            <p className="text-sm text-slate-700">
              All channels are currently in demo mode. Notifications will be logged but not actually sent.
              Configure channel settings and disable demo mode to enable real delivery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
