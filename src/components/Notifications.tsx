import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { NotificationRule } from '../types/database';
import { Bell, Plus, Edit2, Trash2, FileText, Radio, Users, ScrollText, LayoutDashboard, Settings, X } from 'lucide-react';
import TemplateManagement from './Notifications/TemplateManagement';
import GroupManagement from './Notifications/GroupManagement';
import RuleManagement from './Notifications/RuleManagement';
import NotificationLogs from './Notifications/NotificationLogs';
import SystemConfig from './Notifications/SystemConfig';

type TabType = 'dashboard' | 'rules' | 'templates' | 'groups' | 'logs';

export default function Notifications() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSystemConfig, setShowSystemConfig] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    const { data } = await supabase
      .from('notification_rules')
      .select(`
        *,
        template:notification_templates(name, code)
      `)
      .order('created_at', { ascending: false });

    if (data) setRules(data);
    setLoading(false);
  };

  const toggleRule = async (ruleId: string, active: boolean) => {
    await supabase
      .from('notification_rules')
      .update({ active: !active })
      .eq('id', ruleId);

    loadRules();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'rules' as TabType, label: 'Rules', icon: Bell },
    { id: 'templates' as TabType, label: 'Templates', icon: FileText },
    { id: 'groups' as TabType, label: 'Groups', icon: Users },
    { id: 'logs' as TabType, label: 'Logs', icon: ScrollText },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-slate-700" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notification System</h1>
            <p className="text-slate-600 mt-1">Configure alerts and notification rules</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all relative ${
                  activeTab === tab.id
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-md p-6 border border-green-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-2">Active Rules</p>
                      <p className="text-4xl font-bold text-green-700">{rules.filter(r => r.active).length}</p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-xl">
                      <Bell className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl shadow-md p-6 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Inactive Rules</p>
                      <p className="text-4xl font-bold text-slate-700">{rules.filter(r => !r.active).length}</p>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-xl">
                      <Bell className="w-8 h-8 text-slate-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-md p-6 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-2">Total Groups</p>
                      <p className="text-4xl font-bold text-blue-700">
                        {new Set(rules.flatMap(r => r.notification_groups || [])).size}
                      </p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-xl">
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <div className="bg-amber-500 p-2 rounded-lg">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">Typhoon Mode</h3>
                    <p className="text-sm text-slate-700 mb-4">
                      During typhoons, non-critical alerts can be suppressed to reduce notification overload.
                      Rules with typhoon mode enabled will pause notifications during severe weather events.
                    </p>
                    <button 
                      onClick={() => setShowSystemConfig(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all font-semibold text-sm"
                    >
                      <Settings className="w-4 h-4" />
                      Configure System Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rules' && <RuleManagement />}

          {activeTab === 'templates' && <TemplateManagement />}

          {activeTab === 'groups' && <GroupManagement />}

          {activeTab === 'logs' && <NotificationLogs />}
        </div>
      </div>

      {/* System Config Modal */}
      {showSystemConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">System Configuration</h2>
                <p className="text-slate-600 mt-1">Manage notification system settings</p>
              </div>
              <button
                onClick={() => setShowSystemConfig(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <SystemConfig onSaved={() => setShowSystemConfig(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
