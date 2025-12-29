import { useState, useEffect } from 'react';
import { X, Share2, Mail } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface ShareReportModalProps {
  reportId: string;
  onClose: () => void;
  onShared: () => void;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  department: string | null;
}

export default function ShareReportModal({
  reportId,
  onClose,
  onShared,
}: ShareReportModalProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    loadUsers();
    loadCurrentShares();
  }, []);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, department')
      .neq('id', user?.id)
      .order('full_name');

    if (!error && data) {
      setUsers(data as UserProfile[]);
    }
  };

  const loadCurrentShares = async () => {
    const { data, error } = await supabase
      .from('saved_reports')
      .select('shared_with')
      .eq('id', reportId)
      .single();

    if (!error && data) {
      setSelectedUsers(data.shared_with || []);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);

    const { error } = await supabase
      .from('saved_reports')
      .update({ shared_with: selectedUsers })
      .eq('id', reportId);

    if (error) {
      console.error('Error sharing report:', error);
      alert('Failed to share report');
    } else {
      // Optionally send notification emails
      if (message) {
        // Implement email notification logic here
        console.log('Sending notifications to:', selectedUsers, 'Message:', message);
      }
      
      alert('Report shared successfully!');
      onShared();
    }

    setIsSharing(false);
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Share2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900">Share Report</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Search Users
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or department..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* User List */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Users to Share With ({selectedUsers.length} selected)
            </label>
            <div className="border border-slate-300 rounded-lg max-h-64 overflow-y-auto">
              {filteredUsers.map(u => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{u.full_name}</div>
                    <div className="text-sm text-slate-600">{u.email}</div>
                    {u.department && (
                      <div className="text-xs text-slate-500">{u.department}</div>
                    )}
                  </div>
                </label>
              ))}
              {filteredUsers.length === 0 && (
                <div className="p-4 text-center text-slate-500">
                  No users found
                </div>
              )}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Mail className="w-4 h-4 inline mr-1" />
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message to notify shared users..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-1">About Sharing</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Shared users can view and use this report</li>
              <li>They cannot edit or delete your report</li>
              <li>You can remove access at any time</li>
              <li>Shared users will see "(Shared)" indicator</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={isSharing || selectedUsers.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            {isSharing ? 'Sharing...' : `Share with ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
