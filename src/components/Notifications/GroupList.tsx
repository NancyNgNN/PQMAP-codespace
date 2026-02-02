import { useEffect, useState } from 'react';
import { Users, Plus, Edit2, Trash2, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import type { NotificationGroup } from '../../types/database';
import sampleGroups from '../../data/sampleNotificationGroups.json';

interface GroupListProps {
  onEdit: (group: NotificationGroup) => void;
  onNew: () => void;
  refreshKey?: number;
}

export default function GroupList({ onEdit, onNew, refreshKey }: GroupListProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  // Reload groups when refreshKey changes
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      loadGroups();
    }
  }, [refreshKey]);

  const loadGroups = async () => {
    setLoading(true);
    
    // Load from localStorage (JSON file simulation)
    const storedGroups = localStorage.getItem('notificationGroups');
    if (storedGroups) {
      const parsedGroups = JSON.parse(storedGroups);
      // Add member_count: 0 for display (since we don't track members in localStorage yet)
      const groupsWithCounts = parsedGroups.map((group: any) => ({
        ...group,
        member_count: 0
      }));
      setGroups(groupsWithCounts);
    } else {
      // Initialize with sample groups if localStorage is empty
      const groupsWithCounts = sampleGroups.map((group: any) => ({
        ...group,
        member_count: 0
      }));
      localStorage.setItem('notificationGroups', JSON.stringify(sampleGroups));
      setGroups(groupsWithCounts);
    }

    setLoading(false);
  };

  const handleDelete = async (groupId: string, groupName: string) => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    try {
      // Load from localStorage and delete
      const storedGroups = localStorage.getItem('notificationGroups');
      if (storedGroups) {
        const parsedGroups = JSON.parse(storedGroups);
        const updatedGroups = parsedGroups.filter((group: any) => group.id !== groupId);
        localStorage.setItem('notificationGroups', JSON.stringify(updatedGroups));
      }

      toast.success(`Group "${groupName}" deleted successfully!`);
      loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group. Please try again.');
    }
  };

  const toggleStatus = async (groupId: string, currentStatus: string, groupName: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      // Load from localStorage and update
      const storedGroups = localStorage.getItem('notificationGroups');
      if (storedGroups) {
        const parsedGroups = JSON.parse(storedGroups);
        const updatedGroups = parsedGroups.map((group: any) => 
          group.id === groupId ? { ...group, status: newStatus } : group
        );
        localStorage.setItem('notificationGroups', JSON.stringify(updatedGroups));
      }

      toast.success(`Group "${groupName}" ${newStatus === 'active' ? 'activated' : 'deactivated'}!`);
      loadGroups();
    } catch (error) {
      console.error('Error updating group status:', error);
      toast.error('Failed to update group status. Please try again.');
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
                    onClick={() => toggleStatus(group.id, group.status, group.name)}
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
                    onClick={() => handleDelete(group.id, group.name)}
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
