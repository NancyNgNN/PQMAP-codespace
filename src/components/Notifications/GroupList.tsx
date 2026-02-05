import { useEffect, useState } from 'react';
import { Users, Trash2, UserCheck, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import sampleGroups from '../../data/sampleNotificationGroups.json';

// Dummy user data for display
const dummyUsers = [
  { id: '1', name: 'John Smith', email: 'john.smith@clp.com' },
  { id: '2', name: 'Sarah Johnson', email: 'sarah.johnson@clp.com' },
  { id: '3', name: 'Michael Chen', email: 'michael.chen@clp.com' },
  { id: '4', name: 'Emma Williams', email: 'emma.williams@clp.com' },
  { id: '5', name: 'David Brown', email: 'david.brown@clp.com' },
  { id: '6', name: 'Lisa Garcia', email: 'lisa.garcia@clp.com' },
  { id: '7', name: 'Robert Martinez', email: 'robert.martinez@clp.com' },
  { id: '8', name: 'Jennifer Lee', email: 'jennifer.lee@clp.com' },
];

interface GroupListProps {
  refreshKey?: number;
}

export default function GroupList({ refreshKey }: GroupListProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

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
      const groupsWithCounts = parsedGroups.map((group: any) => {
        const members = getGroupMembers(group.id);
        return {
          ...group,
          member_count: members.length,
          members: members
        };
      });
      setGroups(groupsWithCounts);
    } else {
      // Initialize with sample groups if localStorage is empty
      const groupsWithCounts = sampleGroups.map((group: any) => {
        const members = getGroupMembers(group.id);
        return {
          ...group,
          member_count: members.length,
          members: members
        };
      });
      localStorage.setItem('notificationGroups', JSON.stringify(sampleGroups));
      setGroups(groupsWithCounts);
    }

    setLoading(false);
  };

  // Function to assign dummy members to groups
  const getGroupMembers = (groupId: string) => {
    // Consistent assignment: each group gets 2-6 unique members based on group ID hash
    const seedValue = groupId.charCodeAt(0) + groupId.charCodeAt(groupId.length - 1);
    const memberCount = (seedValue % 4) + 2; // 2-6 members
    const startIndex = (seedValue * 7) % dummyUsers.length;
    
    const members = [];
    for (let i = 0; i < memberCount; i++) {
      const index = (startIndex + i) % dummyUsers.length;
      members.push(dummyUsers[index]);
    }
    return members;
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
          <p className="text-slate-600 mt-1">View recipient groups and their members</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-600 mb-2">No Groups Available</h3>
          <p className="text-slate-500">No notification groups have been created yet.</p>
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

                    {/* Members List Section */}
                    {expandedGroup === group.id && group.members && group.members.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="space-y-1">
                          {group.members.map((member: any) => (
                            <div key={member.id} className="py-1.5 px-2 flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900">{member.name}</p>
                              <p className="text-xs text-slate-500">{member.email}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {group.members && group.members.length > 0 && (
                    <button
                      onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                      title={expandedGroup === group.id ? 'Hide members' : 'Show members'}
                    >
                      <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform ${
                        expandedGroup === group.id ? 'rotate-180' : ''
                      }`} />
                    </button>
                  )}
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
