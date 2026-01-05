import { X, Shield, Check, Minus } from 'lucide-react';
import { getRoleInfo, systemModules } from '../../services/userManagementService';
import type { SystemRole, RolePermission, PermissionAction } from '../../types/database';

interface PermissionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: SystemRole;
  permissions: RolePermission[];
}

export default function PermissionDetailsModal({
  isOpen,
  onClose,
  role,
  permissions
}: PermissionDetailsModalProps) {
  if (!isOpen) return null;

  const roleInfo = getRoleInfo(role);

  const getPermissionIcon = (hasPermission: boolean) => {
    return hasPermission ? (
      <Check className="w-4 h-4 text-green-600" />
    ) : (
      <Minus className="w-4 h-4 text-slate-300" />
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className={`px-6 py-5 border-b border-slate-200 ${roleInfo.color}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-current" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{roleInfo.name}</h3>
                  <p className="text-sm opacity-90 mt-0.5">{roleInfo.description}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Legend */}
              <div className="flex gap-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-slate-600">Allowed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Minus className="w-4 h-4 text-slate-300" />
                  <span className="text-sm text-slate-600">Not Allowed</span>
                </div>
              </div>

              {/* Permissions by Category */}
              {Array.from(new Set(systemModules.map(m => m.category))).map(category => {
                const categoryModules = systemModules.filter(m => m.category === category);
                
                return (
                  <div key={category} className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                      {category}
                    </h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                              Module
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-green-700 uppercase tracking-wider">
                              Create
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-blue-700 uppercase tracking-wider">
                              Read
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-amber-700 uppercase tracking-wider">
                              Update
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-red-700 uppercase tracking-wider">
                              Delete
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {categoryModules.map(module => {
                            const perm = permissions.find(p => p.module === module.id);
                            if (!perm) return null;

                            const actions: PermissionAction[] = ['create', 'read', 'update', 'delete'];

                            return (
                              <tr key={module.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  <div className="text-sm font-medium text-slate-900">{module.name}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{module.description}</div>
                                </td>
                                {actions.map(action => (
                                  <td key={action} className="px-4 py-3 text-center">
                                    {getPermissionIcon(perm.permissions.includes(action))}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
