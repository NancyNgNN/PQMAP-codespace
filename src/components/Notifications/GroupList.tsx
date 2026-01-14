import { useEffect, useState } from 'react';
import { Users, Plus, Edit2, Trash2, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { NotificationGroup } from '../../types/database';

interface GroupListProps {
  onEdit: (group: NotificationGroup) => void;
  onNew: () => void;
}

export default function GroupList({ onEdit, onNew }: GroupListProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    
    // Get groups with member count
    const { data: groupsData } = await supabase
      .from('notification_groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (groupsData) {
      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        groupsData.map(async (group) => {
          const { count } = await supabase
            .from('notification_group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return { ...group, member_count: count || 0 };
        })
      );

      setGroups(groupsWithCounts);
    }

    setLoading(false);
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    // Delete group members first
    await supabase
      .from('notification_group_members')
      .delete()
      .eq('group_id', groupId);

    // Delete group
    await supabase
      .from('notification_groups')
      .delete()
      .eq('id', groupId);

    loadGroups();
  };

  const toggleStatus = async (groupId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await supabase
      .from('notification_groups')
      .update({ status: newStatus })
      .eq('id', groupId);

    loadGroups();
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
          <h2 className="text-2xl font-bold text-slate-900">Notification Groups</h2>
          <p className="text-slate-600 mt-1">Manage recipient groups for targeted notifications</p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">New Group</span>
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-600 mb-2">No Groups Yet</h3>
          <p className="text-slate-500 mb-4">Create your first notification group to get started</p>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-xl ${
                    group.status === 'active' ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    <Users className={`w-6 h-6 ${
                      group.status === 'active' ? 'text-green-600' : 'text-slate-400'
                    }`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-slate-900">{group.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        group.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {group.status}
                      </span>
                    </div>

                    <p className="text-slate-600 mb-4">{group.description}</p>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <span className="text-slate-600">
                          <span className="font-semibold text-slate-900">{group.member_count}</span> members
                        </span>
                      </div>
                      <div className="text-slate-500">
                        Created {new Date(group.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleStatus(group.id, group.status)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      group.status === 'active'
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {group.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => onEdit(group)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <Edit2 className="w-5 h-5 text-slate-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="bg-purple-500 p-2 rounded-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-2">Independent Groups</h3>
            <p className="text-sm text-slate-700">
              Notification groups are independent from UAM roles. You can create specialized groups
              like "Emergency Response Team" or "Night Shift Operators" and assign any users to them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
