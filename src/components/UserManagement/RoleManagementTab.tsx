import { useState } from 'react';
import { Shield, Eye, CheckCircle, Save, RotateCcw } from 'lucide-react';
import {
  getRoleInfo,
  systemModules,
  updateRolePermission,
  resetRolePermissions
} from '../../services/userManagementService';
import type { SystemRole, RolePermission, PermissionAction } from '../../types/database';
import PermissionDetailsModal from './PermissionDetailsModal.tsx';

interface RoleManagementTabProps {
  rolePermissions: Record<SystemRole, RolePermission[]>;
  onPermissionsUpdate: () => void;
}

const roles: SystemRole[] = ['system_admin', 'system_owner', 'manual_implementator', 'watcher'];

export default function RoleManagementTab({ rolePermissions, onPermissionsUpdate }: RoleManagementTabProps) {
  const [selectedRole, setSelectedRole] = useState<SystemRole | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<SystemRole | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<RolePermission[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleViewPermissions = (role: SystemRole) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleEditPermissions = (role: SystemRole) => {
    setEditingRole(role);
    setEditedPermissions(JSON.parse(JSON.stringify(rolePermissions[role])));
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setEditedPermissions([]);
  };

  const handleTogglePermission = (moduleId: string, permission: PermissionAction) => {
    if (!editingRole) return;

    const updatedPermissions = editedPermissions.map(perm => {
      if (perm.module === moduleId) {
        const hasPermission = perm.permissions.includes(permission);
        const newPermissions = hasPermission
          ? perm.permissions.filter(p => p !== permission)
          : [...perm.permissions, permission];
        
        return { ...perm, permissions: newPermissions };
      }
      return perm;
    });

    setEditedPermissions(updatedPermissions);
  };

  const handleSavePermissions = async () => {
    if (!editingRole) return;

    try {
      setSaving(true);
      
      // Update all modified permissions
      for (const perm of editedPermissions) {
        await updateRolePermission(editingRole, perm.module, perm.permissions);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      await onPermissionsUpdate();
      setEditingRole(null);
      setEditedPermissions([]);
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Failed to save permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPermissions = async (role: SystemRole) => {
    if (!confirm(`Are you sure you want to reset permissions for ${getRoleInfo(role).name} to default values?`)) {
      return;
    }

    try {
      setSaving(true);
      await resetRolePermissions(role);
      await onPermissionsUpdate();
      
      if (editingRole === role) {
        setEditingRole(null);
        setEditedPermissions([]);
      }
    } catch (error) {
      console.error('Error resetting permissions:', error);
      alert('Failed to reset permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getPermissionSummary = (permissions: RolePermission[]): string => {
    const totalModules = permissions.length;
    const fullAccess = permissions.filter(p => p.permissions.length === 4).length;
    const readOnly = permissions.filter(p => p.permissions.length === 1 && p.permissions.includes('read')).length;
    const partial = totalModules - fullAccess - readOnly;

    const parts = [];
    if (fullAccess > 0) parts.push(`${fullAccess} Full`);
    if (partial > 0) parts.push(`${partial} Partial`);
    if (readOnly > 0) parts.push(`${readOnly} Read-only`);

    return parts.join(' • ');
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800 font-medium">Permissions saved successfully!</span>
        </div>
      )}

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => {
          const roleInfo = getRoleInfo(role);
          const permissions = rolePermissions[role] || [];
          const isEditing = editingRole === role;

          return (
            <div
              key={role}
              className={`border rounded-lg p-5 transition-all ${
                isEditing
                  ? 'border-blue-400 bg-blue-50 shadow-lg'
                  : 'border-slate-200 bg-white hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${roleInfo.color}`}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{roleInfo.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">{roleInfo.description}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-600 mb-3">
                  <span className="font-medium">Permission Summary:</span>
                  <div className="mt-1 text-slate-700">{getPermissionSummary(permissions)}</div>
                </div>

                <div className="flex gap-2">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={() => handleViewPermissions(role)}
                        className="flex-1 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      <button
                        onClick={() => handleEditPermissions(role)}
                        className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        Edit Permissions
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="flex-1 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSavePermissions}
                        disabled={saving}
                        className="flex-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  )}
                </div>

                {!isEditing && (
                  <button
                    onClick={() => handleResetPermissions(role)}
                    disabled={saving}
                    className="w-full mt-2 px-3 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Default
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Mode - Permission Details */}
      {editingRole && (
        <div className="border border-blue-200 rounded-lg bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Editing: {getRoleInfo(editingRole).name}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Toggle permissions for each module and action
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Group by category */}
            {Array.from(new Set(systemModules.map(m => m.category))).map(category => {
              const categoryModules = systemModules.filter(m => m.category === category);
              
              return (
                <div key={category} className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {categoryModules.map(module => {
                      const perm = editedPermissions.find(p => p.module === module.id);
                      if (!perm) return null;

                      const actions: PermissionAction[] = ['create', 'read', 'update', 'delete'];

                      return (
                        <div key={module.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-medium text-slate-900">{module.name}</div>
                              <div className="text-xs text-slate-600 mt-0.5">{module.description}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {actions.map(action => {
                              const hasPermission = perm.permissions.includes(action);
                              const actionColors = {
                                create: 'text-green-700 bg-green-100 border-green-300',
                                read: 'text-blue-700 bg-blue-100 border-blue-300',
                                update: 'text-amber-700 bg-amber-100 border-amber-300',
                                delete: 'text-red-700 bg-red-100 border-red-300'
                              };

                              return (
                                <label key={action} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={hasPermission}
                                    onChange={() => handleTogglePermission(module.id, action)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className={`text-xs px-2 py-1 rounded border font-medium uppercase ${
                                    hasPermission ? actionColors[action] : 'text-slate-500 bg-slate-100 border-slate-200'
                                  }`}>
                                    {action}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Permission Details Modal */}
      {selectedRole && (
        <PermissionDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRole(null);
          }}
          role={selectedRole}
          permissions={rolePermissions[selectedRole] || []}
        />
      )}
    </div>
  );
}
