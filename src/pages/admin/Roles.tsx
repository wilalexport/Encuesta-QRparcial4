// pages/admin/Roles.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { UserRole } from '@/types/database.types';
import { Shield, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserWithRoles {
  user_id: string;
  email: string;
  display_name: string | null;
  roles: UserRole[];
}

export const AdminRoles = () => {
  const { user: currentUser } = useAuth();
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('creator');

  useEffect(() => {
    loadUsersWithRoles();
  }, []);

  const loadUsersWithRoles = async () => {
    try {
      // Cargar perfiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name');

      if (profilesError) throw profilesError;

      // Cargar roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combinar datos
      const combined: UserWithRoles[] = profiles?.map(profile => ({
        user_id: profile.id,
        email: '', // No tenemos acceso a auth.users desde el cliente
        display_name: profile.display_name,
        roles: roles?.filter(r => r.user_id === profile.id).map(r => r.role) || [],
      })) || [];

      setUsersWithRoles(combined);
    } catch (error) {
      console.error('Error cargando roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUserId || !selectedRole) {
      alert('Selecciona un usuario y un rol');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUserId,
          role: selectedRole,
          assigned_by: currentUser!.id,
        });

      if (error) throw error;

      alert('Rol asignado correctamente');
      setShowAddModal(false);
      loadUsersWithRoles();
    } catch (error: any) {
      alert('Error al asignar rol: ' + error.message);
    }
  };

  const handleRevokeRole = async (userId: string, role: UserRole) => {
    if (!confirm(`¿Estás seguro de revocar el rol "${role}" a este usuario?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      alert('Rol revocado correctamente');
      loadUsersWithRoles();
    } catch (error: any) {
      alert('Error al revocar rol: ' + error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando roles...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Roles y Permisos</h1>
          <p className="text-gray-600 mt-1">Asigna o revoca roles de admin y creator</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-5 h-5" />
          Asignar Rol
        </button>
      </div>

      {/* Tabla de Roles */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Roles Asignados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usersWithRoles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No hay usuarios en el sistema
                  </td>
                </tr>
              ) : (
                usersWithRoles.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.display_name || 'Sin nombre'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-500 font-mono">
                        {user.user_id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {user.roles.length === 0 ? (
                          <span className="text-sm text-gray-400">Sin roles asignados</span>
                        ) : (
                          user.roles.map((role) => (
                            <span
                              key={role}
                              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                role === 'admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {role === 'admin' ? 'Administrador' : 'Creador'}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {user.roles.map((role) => (
                          <button
                            key={role}
                            onClick={() => handleRevokeRole(user.user_id, role)}
                            className="text-red-600 hover:text-red-800"
                            title={`Revocar rol ${role}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Asignar Rol */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />
              Asignar Nuevo Rol
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seleccionar Usuario
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Seleccionar...</option>
                  {usersWithRoles.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.display_name || user.user_id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seleccionar Rol
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="creator">Creator (Creador)</option>
                  <option value="admin">Admin (Administrador)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAssignRole}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
              >
                Asignar Rol
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
