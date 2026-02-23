import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { settingsAPI } from '@/lib/apiClient';

interface ModulePermission {
  module: string;
  actions: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
}

interface PermissionContextType {
  permissions: ModulePermission[];
  loading: boolean;
  /** Check if user can view a module (sidebar visibility) */
  canView: (module: string) => boolean;
  /** Check if user can create in a module */
  canCreate: (module: string) => boolean;
  /** Check if user can edit in a module */
  canEdit: (module: string) => boolean;
  /** Check if user can delete in a module */
  canDelete: (module: string) => boolean;
  /** Check any action on a module */
  hasPermission: (module: string, action: 'view' | 'create' | 'edit' | 'delete') => boolean;
  /** Refetch permissions (e.g., after admin updates roles) */
  refetchPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, userRole } = useAuth();
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated || !userRole) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      // For all roles (including admin), fetch from API
      // The backend will return full access for admin, and role-based for others
      const res = await settingsAPI.getMyPermissions();
      if (res.data?.success && res.data.data?.permissions && res.data.data.permissions.length > 0) {
        setPermissions(res.data.data.permissions);
      } else {
        // No permissions configured yet — fallback with defaults
        const defaultModules = [
          'dashboard', 'employees', 'attendance', 'leaves',
          'tasks', 'expenses', 'payroll', 'chat', 'announcements',
          'policies', 'companies', 'clients', 'settings', 'reports'
        ];
        setPermissions(defaultModules.map(m => ({
          module: m,
          actions: { view: true, create: true, edit: true, delete: true }
        })));
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      // On error, allow everything (legacy mode) so app doesn't break
      const defaultModules = [
        'dashboard', 'employees', 'attendance', 'leaves',
        'tasks', 'expenses', 'payroll', 'chat', 'announcements',
        'policies', 'companies', 'clients', 'settings', 'reports'
      ];
      setPermissions(defaultModules.map(m => ({
        module: m,
        actions: { view: true, create: true, edit: true, delete: true }
      })));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, userRole]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const findModule = useCallback((module: string) => {
    return permissions.find(p => p.module === module);
  }, [permissions]);

  const canView = useCallback((module: string) => {
    if (userRole === 'admin') return true;
    const perm = findModule(module);
    return perm?.actions?.view ?? false;
  }, [userRole, findModule]);

  const canCreate = useCallback((module: string) => {
    if (userRole === 'admin') return true;
    const perm = findModule(module);
    return perm?.actions?.create ?? false;
  }, [userRole, findModule]);

  const canEdit = useCallback((module: string) => {
    if (userRole === 'admin') return true;
    const perm = findModule(module);
    return perm?.actions?.edit ?? false;
  }, [userRole, findModule]);

  const canDelete = useCallback((module: string) => {
    if (userRole === 'admin') return true;
    const perm = findModule(module);
    return perm?.actions?.delete ?? false;
  }, [userRole, findModule]);

  const hasPermission = useCallback((module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    if (userRole === 'admin') return true;
    const perm = findModule(module);
    return perm?.actions?.[action] ?? false;
  }, [userRole, findModule]);

  return (
    <PermissionContext.Provider value={{
      permissions,
      loading,
      canView,
      canCreate,
      canEdit,
      canDelete,
      hasPermission,
      refetchPermissions: fetchPermissions,
    }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};
