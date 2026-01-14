import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { NotificationRule } from '../types/database';
import { Bell, Plus, Edit2, Trash2, FileText, Radio, Users, ScrollText, LayoutDashboard } from 'lucide-react';
import TemplateManagement from './Notifications/TemplateManagement';
import ChannelManagement from './Notifications/ChannelManagement';
import GroupManagement from './Notifications/GroupManagement';
import RuleManagement from './Notifications/RuleManagement';

type TabType = 'dashboard' | 'rules' | 'templates' | 'channels' | 'groups' | 'logs';

export default function Notifications() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);

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
    { id: 'channels' as TabType, label: 'Channels', icon: Radio },
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
        {activeTab === 'rules' && (
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all">
            <Plus className="w-5 h-5" />
            <span className="font-semibold">New Rule</span>
          </button>
        )}
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
                    <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all font-semibold text-sm">
                      Configure Typhoon Mode
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rules' && <RuleManagement />}

          {activeTab === 'templates' && <TemplateManagement />}

          {activeTab === 'channels' && <ChannelManagement />}

          {activeTab === 'groups' && <GroupManagement />}

          {activeTab === 'logs' && (
            <div className="text-center py-12">
              <ScrollText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">Notification Logs</h3>
              <p className="text-slate-500">Coming soon - View notification history and delivery status</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
