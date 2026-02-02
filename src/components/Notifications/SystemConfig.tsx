import { useState, useEffect } from 'react';
import { Save, AlertTriangle, Clock, Mail, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface SystemConfig {
  id: string;
  typhoon_mode: boolean;
  typhoon_mode_until: string | null;
  notification_cooldown_minutes: number;
  max_notifications_per_event: number;
  enable_batch_notifications: boolean;
  batch_interval_minutes: number;
  updated_at: string;
  updated_by: string | null;
}

interface SystemConfigProps {
  onSaved?: () => void;
}

export default function SystemConfig({ onSaved }: SystemConfigProps) {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [typhoonMode, setTyphoonMode] = useState(false);
  const [typhoonExpiry, setTyphoonExpiry] = useState('');
  const [cooldownMinutes, setCooldownMinutes] = useState(5);
  const [maxPerEvent, setMaxPerEvent] = useState(10);
  const [batchEnabled, setBatchEnabled] = useState(false);
  const [batchInterval, setBatchInterval] = useState(15);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('notification_system_config')
      .select('*')
      .single();

    if (error) {
      toast.error('Failed to load system configuration');
      console.error('Error loading config:', error);
    } else if (data) {
      setConfig(data);
      setTyphoonMode(data.typhoon_mode);
      setTyphoonExpiry(data.typhoon_mode_until || '');
      setCooldownMinutes(data.notification_cooldown_minutes);
      setMaxPerEvent(data.max_notifications_per_event);
      setBatchEnabled(data.enable_batch_notifications);
      setBatchInterval(data.batch_interval_minutes);
    }
    
    setLoading(false);
  };

  const handleSave = async () => {
    if (typhoonMode && !typhoonExpiry) {
      toast.error('Please set an expiry date for typhoon mode');
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    const updates = {
      typhoon_mode: typhoonMode,
      typhoon_mode_until: typhoonMode ? typhoonExpiry : null,
      notification_cooldown_minutes: cooldownMinutes,
      max_notifications_per_event: maxPerEvent,
      enable_batch_notifications: batchEnabled,
      batch_interval_minutes: batchInterval,
      updated_at: new Date().toISOString(),
      updated_by: user?.id
    };

    const { error } = await supabase
      .from('notification_system_config')
      .update(updates)
      .eq('id', config?.id);

    if (error) {
      toast.error('Failed to save configuration');
      console.error('Error saving config:', error);
    } else {
      toast.success('System configuration updated successfully!');
      loadConfig();
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('typhoonModeChanged'));
      // Close modal after successful save
      if (onSaved) {
        onSaved();
      }
    }

    setSaving(false);
  };

  const handleToggleTyphoonMode = () => {
    setTyphoonMode(!typhoonMode);
    if (!typhoonMode) {
      // Set default expiry to 24 hours from now
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 24);
      setTyphoonExpiry(tomorrow.toISOString().slice(0, 16));
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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">System Configuration</h2>
        <p className="text-slate-600 mt-1">Manage global notification system settings</p>
      </div>

      {/* Typhoon Mode */}
      <div className={`rounded-xl p-6 border-2 transition-all ${
        typhoonMode 
          ? 'bg-amber-50 border-amber-300' 
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${typhoonMode ? 'bg-amber-500' : 'bg-slate-100'}`}>
            <AlertTriangle className={`w-6 h-6 ${typhoonMode ? 'text-white' : 'text-slate-600'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Typhoon Mode</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Suppress non-critical notifications during severe weather events
                </p>
              </div>
              <button
                onClick={handleToggleTyphoonMode}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  typhoonMode ? 'bg-amber-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    typhoonMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {typhoonMode && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-amber-200">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Expiry Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={typhoonExpiry}
                  onChange={(e) => setTyphoonExpiry(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <p className="text-xs text-slate-600 mt-2">
                  Typhoon mode will automatically deactivate after this time
                </p>
              </div>
            )}

            {typhoonMode && (
              <div className="mt-4 p-4 bg-amber-100 rounded-lg border border-amber-300">
                <p className="text-sm text-amber-900 font-medium">
                  ⚠️ Typhoon Mode Active - Only critical notifications will be sent
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Rules with "Typhoon Mode Enabled" setting will be suppressed
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Limits */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-3 rounded-xl">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Notification Limits</h3>
            <p className="text-sm text-slate-600">Control notification frequency and volume</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Cooldown Period */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Cooldown Period (minutes)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="60"
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 min-w-[100px]">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-blue-600">{cooldownMinutes} min</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Minimum time between notifications to the same recipient for similar events
            </p>
          </div>

          {/* Max Notifications per Event */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Max Notifications per Event
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="50"
                value={maxPerEvent}
                onChange={(e) => setMaxPerEvent(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 min-w-[100px]">
                <Mail className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-blue-600">{maxPerEvent}</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Maximum number of notifications that can be sent for a single PQ event
            </p>
          </div>
        </div>
      </div>

      {/* Batch Notifications */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <div className="flex items-start gap-4">
          <div className="bg-green-100 p-3 rounded-xl">
            <Mail className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Batch Notifications</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Group multiple notifications into periodic digests
                </p>
              </div>
              <button
                onClick={() => setBatchEnabled(!batchEnabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  batchEnabled ? 'bg-green-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    batchEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {batchEnabled && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Batch Interval (minutes)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={batchInterval}
                    onChange={(e) => setBatchInterval(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-green-300 min-w-[100px]">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span className="font-bold text-green-600">{batchInterval} min</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Notifications will be grouped and sent every {batchInterval} minutes
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Last Updated */}
      {config && (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-sm text-slate-600">
            Last updated: {new Date(config.updated_at).toLocaleString()}
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
