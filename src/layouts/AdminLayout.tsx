// layouts/AdminLayout.tsx
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Users, Key, FileText, ArrowLeft, LogOut } from 'lucide-react';

export const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold">Panel de Administración</h1>
                <p className="text-xs text-purple-200">Gestión del Sistema</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm">
                {user?.profile.display_name || user?.email}
              </span>
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-sm bg-white text-purple-700 rounded-lg hover:bg-purple-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-800 hover:bg-purple-900 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Sidebar */}
      <div className="flex">
        <aside className="w-64 min-h-[calc(100vh-4rem)] bg-white border-r">
          <nav className="p-4 space-y-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
              Gestión de Usuarios
            </div>
            <Link
              to="/admin/users"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition"
            >
              <Users className="w-5 h-5" />
              Usuarios (Profiles)
            </Link>
            <Link
              to="/admin/roles"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition"
            >
              <Key className="w-5 h-5" />
              Roles y Permisos
            </Link>

            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase mt-6">
              Auditoría
            </div>
            <Link
              to="/admin/audit"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition"
            >
              <FileText className="w-5 h-5" />
              Logs del Sistema
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
