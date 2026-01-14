import { useEffect, useState } from 'react';
import { X, Save, UserPlus, Trash2, Mail, MessageSquare, Radio as RadioIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GroupEditorProps {
  groupId?: string;
  onClose: () => void;
  onSaved: () => void;
}

interface Member {
  id: string;
  user_id: string;
  channels: string[];
  profiles: {
    full_name: string;
    email: string;
  };
}

function GroupEditor({ groupId, onClose, onSaved }: GroupEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    setLoading(true);

    // Load group data if editing
    if (groupId) {
      const { data: groupData } = await supabase
        .from('notification_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupData) {
        setName(groupData.name);
        setDescription(groupData.description || '');
      }

      // Load existing members
      const { data: membersData } = await supabase
        .from('notification_group_members')
        .select(`
          id,
          user_id,
          channels,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('group_id', groupId);

      if (membersData) {
        setMembers(membersData as any);
      }
    }

    // Load available users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name', { ascending: true });

    if (usersData) {
      setAvailableUsers(usersData);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a group name');
      return;
    }

    setSaving(true);

    try {
      if (groupId) {
        // Update existing group
        await supabase
          .from('notification_groups')
          .update({
            name: name.trim(),
            description: description.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', groupId);
      } else {
        // Create new group
        const { data: newGroup, error } = await supabase
          .from('notification_groups')
          .insert({
            name: name.trim(),
            description: description.trim(),
            status: 'active'
          })
          .select()
          .single();

        if (error) throw error;

        // Add members to new group
        if (newGroup && members.length > 0) {
          const memberInserts = members.map(member => ({
            group_id: newGroup.id,
            user_id: member.user_id,
            channels: member.channels
          }));

          await supabase
            .from('notification_group_members')
            .insert(memberInserts);
        }

        onSaved();
        return;
      }

      // Handle member updates for existing group
      if (groupId) {
        // Get current member IDs in database
        const { data: currentMembers } = await supabase
          .from('notification_group_members')
          .select('id, user_id')
          .eq('group_id', groupId);

        const currentMemberIds = new Set(currentMembers?.map(m => m.user_id) || []);
        const newMemberIds = new Set(members.map(m => m.user_id));

        // Delete removed members
        const toDelete = currentMembers?.filter(m => !newMemberIds.has(m.user_id)) || [];
        for (const member of toDelete) {
          await supabase
            .from('notification_group_members')
            .delete()
            .eq('id', member.id);
        }

        // Add new members
        const toAdd = members.filter(m => !currentMemberIds.has(m.user_id));
        if (toAdd.length > 0) {
          const memberInserts = toAdd.map(member => ({
            group_id: groupId,
            user_id: member.user_id,
            channels: member.channels
          }));

          await supabase
            .from('notification_group_members')
            .insert(memberInserts);
        }

        // Update existing members' channels
        const toUpdate = members.filter(m => currentMemberIds.has(m.user_id));
        for (const member of toUpdate) {
          await supabase
            .from('notification_group_members')
            .update({ channels: member.channels })
            .eq('group_id', groupId)
            .eq('user_id', member.user_id);
        }
      }

      onSaved();
    } catch (error) {
      console.error('Error saving group:', error);
      alert('Failed to save group. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = () => {
    if (!selectedUserId) return;

    const user = availableUsers.find(u => u.id === selectedUserId);
    if (!user) return;

    // Check if already added
    if (members.some(m => m.user_id === selectedUserId)) {
      alert('This user is already a member of the group');
      return;
    }

    const newMember: Member = {
      id: crypto.randomUUID(),
      user_id: selectedUserId,
      channels: ['email'], // Default to email
      profiles: {
        full_name: user.full_name,
        email: user.email
      }
    };

    setMembers([...members, newMember]);
    setSelectedUserId('');
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers(members.filter(m => m.id !== memberId));
  };

  const toggleMemberChannel = (memberId: string, channel: string) => {
    setMembers(members.map(member => {
      if (member.id === memberId) {
        const channels = member.channels.includes(channel)
          ? member.channels.filter(c => c !== channel)
          : [...member.channels, channel];
        return { ...member, channels };
      }
      return member;
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {groupId ? 'Edit Group' : 'Create New Group'}
            </h2>
            <p className="text-slate-600 mt-1">Configure group settings and assign members</p>
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
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Emergency Response Team"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe the purpose of this group..."
              />
            </div>
          </div>

          {/* Members */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Members</h3>

            {/* Add Member */}
            <div className="flex gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a user to add...</option>
                {availableUsers
                  .filter(user => !members.some(m => m.user_id === user.id))
                  .map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email}) - {user.role}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!selectedUserId}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-5 h-5" />
                Add
              </button>
            </div>

            {/* Member List */}
            {members.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-slate-500">No members yet. Add users to this group.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{member.profiles.full_name}</p>
                      <p className="text-sm text-slate-600">{member.profiles.email}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">Channels:</span>
                        <button
                          onClick={() => toggleMemberChannel(member.id, 'email')}
                          className={`p-2 rounded-lg transition-all ${
                            member.channels.includes('email')
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                          title="Email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleMemberChannel(member.id, 'sms')}
                          className={`p-2 rounded-lg transition-all ${
                            member.channels.includes('sms')
                              ? 'bg-green-100 text-green-600'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                          title="SMS"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleMemberChannel(member.id, 'teams')}
                          className={`p-2 rounded-lg transition-all ${
                            member.channels.includes('teams')
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                          title="Microsoft Teams"
                        >
                          <RadioIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : groupId ? 'Update Group' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GroupEditor;
