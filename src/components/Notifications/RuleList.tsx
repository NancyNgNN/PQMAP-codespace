import { useEffect, useState } from 'react';
import { Bell, Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RuleListProps {
  onEdit: (ruleId: string) => void;
  onNew: () => void;
}

export default function RuleList({ onEdit, onNew }: RuleListProps) {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
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

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule? This action cannot be undone.')) {
      return;
    }

    await supabase
      .from('notification_rules')
      .delete()
      .eq('id', ruleId);

    loadRules();
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
          <h2 className="text-2xl font-bold text-slate-900">Notification Rules</h2>
          <p className="text-slate-600 mt-1">Configure when and how notifications are sent</p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">New Rule</span>
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-600 mb-2">No Rules Yet</h3>
          <p className="text-slate-500 mb-4">Create your first notification rule to get started</p>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      rule.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {rule.active ? 'Active' : 'Inactive'}
                    </span>
                    {rule.typhoon_mode_enabled && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-semibold">
                        Typhoon Mode
                      </span>
                    )}
                    {rule.mother_event_only && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-semibold">
                        Mother Event Only
                      </span>
                    )}
                  </div>

                  {rule.description && (
                    <p className="text-slate-600 text-sm mb-3">{rule.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Template:</span>
                      <p className="font-semibold text-slate-900">
                        {rule.template?.name || 'No template'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-600">Channels:</span>
                      <p className="font-semibold text-slate-900">{rule.channels?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Groups:</span>
                      <p className="font-semibold text-slate-900">{rule.notification_groups?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Priority:</span>
                      <p className="font-semibold text-slate-900">{rule.priority}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-slate-600 text-sm">Conditions:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {rule.conditions && rule.conditions.length > 0 ? (
                        rule.conditions.map((condition: any, index: number) => (
                          <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg">
                            {condition.field} {condition.operator} {JSON.stringify(condition.value)}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 text-xs">No conditions (matches all events)</span>
                      )}
                    </div>
                  </div>

                  {rule.channels && rule.channels.length > 0 && (
                    <div className="mt-3">
                      <span className="text-slate-600 text-sm">Delivery Channels:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {rule.channels.map((channel: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-lg capitalize">
                            {channel}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleRule(rule.id, rule.active)}
                    className={`p-2 rounded-lg transition-all ${
                      rule.active
                        ? 'hover:bg-slate-100'
                        : 'hover:bg-green-50'
                    }`}
                    title={rule.active ? 'Disable rule' : 'Enable rule'}
                  >
                    {rule.active ? (
                      <ToggleRight className="w-6 h-6 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                    )}
                  </button>
                  <button
                    onClick={() => onEdit(rule.id)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                    title="Edit rule"
                  >
                    <Edit2 className="w-5 h-5 text-slate-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete rule"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-2">Rule Evaluation</h3>
            <p className="text-sm text-slate-700">
              Active rules are evaluated when events are created. If all conditions match, notifications
              are sent to the specified groups via the selected channels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
