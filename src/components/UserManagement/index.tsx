import { useState, useEffect } from 'react';
import { Users, Shield, ExternalLink, AlertCircle, Info } from 'lucide-react';
import {
  fetchUAMUsers,
  fetchAllRoles
} from '../../services/userManagementService';
import type { UAMUser, SystemRole, RolePermission } from '../../types/database';
import UserListTab from './UserListTab';
import RoleManagementTab from './RoleManagementTab';

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<UAMUser[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<SystemRole, RolePermission[]>>({} as Record<SystemRole, RolePermission[]>);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, rolesData] = await Promise.all([
        fetchUAMUsers(),
        fetchAllRoles()
      ]);
      setUsers(usersData);
      setRolePermissions(rolesData);
    } catch (err) {
      console.error('Error loading user management data:', err);
      setError('Failed to load user management data');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionsUpdate = async () => {
    // Reload permissions after update
    const rolesData = await fetchAllRoles();
    setRolePermissions(rolesData);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading user management...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Error Loading Data</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                User Management
              </h1>
              <p className="text-slate-600 mt-1">
                Manage users and role permissions for PQMAP system
              </p>
            </div>
          </div>

          {/* UAM Integration Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-blue-900">Integrated with UAM System</p>
                <ExternalLink className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-sm text-blue-700">
                User data is synchronized from the organization's User Access Management (UAM) system. 
                User accounts and role assignments are managed in UAM. 
                Permissions for each role are configured within PQMAP.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-slate-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                  activeTab === 'users'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Users
                  <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full">
                    {users.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('roles')}
                className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                  activeTab === 'roles'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Roles & Permissions
                  <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full">
                    4
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'users' ? (
              <UserListTab users={users} />
            ) : (
              <RoleManagementTab
                rolePermissions={rolePermissions}
                onPermissionsUpdate={handlePermissionsUpdate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
