// pages/Profile.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { User, Mail, Phone, Calendar, Save } from 'lucide-react';

export const Profile = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [genero, setGenero] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');

  useEffect(() => {
    if (user?.profile) {
      setDisplayName(user.profile.display_name || '');
      setPhone(user.profile.phone || '');
      setGenero(user.profile.genero || '');
      setFechaNacimiento(user.profile.fecha_nacimiento || '');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          phone,
          genero,
          fecha_nacimiento: fechaNacimiento,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id);

      if (error) throw error;

      await refreshUser();
      alert('Perfil actualizado exitosamente');
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      alert('Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-600 mt-1">Gestiona tu información personal</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Email (solo lectura) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Correo Electrónico
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">El correo no se puede modificar</p>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Nombre Completo
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tu nombre completo"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Teléfono
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tu número de teléfono"
            />
          </div>

          {/* Género */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Género</label>
            <select
              value={genero}
              onChange={(e) => setGenero(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar...</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
              <option value="prefiero_no_decir">Prefiero no decir</option>
            </select>
          </div>

          {/* Fecha de Nacimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Fecha de Nacimiento
            </label>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <div className="flex gap-2">
              {user?.roles.map((role) => (
                <span
                  key={role}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                >
                  {role === 'admin' ? 'Administrador' : 'Creador'}
                </span>
              ))}
            </div>
          </div>

          {/* Botón Guardar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-blue-400"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>

      {/* Información de cuenta */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de Cuenta</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">ID de Usuario:</span>
            <span className="font-mono text-gray-900">{user?.id.substring(0, 8)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Cuenta creada:</span>
            <span className="text-gray-900">
              {user?.profile.created_at
                ? new Date(user.profile.created_at).toLocaleDateString('es-ES')
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
