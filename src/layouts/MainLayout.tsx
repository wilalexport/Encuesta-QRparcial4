// layouts/MainLayout.tsx
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, FileText, LogOut, Settings, User, ClipboardList, CheckSquare } from 'lucide-react';

export const MainLayout = () => {
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="text-xl font-bold text-blue-600">
                Encuestas QR
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.profile.display_name || user?.email}
              </span>
              {user?.isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div className="flex">
        <aside className="w-64 min-h-[calc(100vh-4rem)] bg-white border-r">
          <nav className="p-4 space-y-2">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition"
            >
              <Home className="w-5 h-5" />
              Dashboard
            </Link>
            
            {/* Enlaces para creadores y admins */}
            {(user?.isAdmin || user?.isCreator) && (
              <Link
                to="/surveys"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition"
              >
                <FileText className="w-5 h-5" />
                Mis Encuestas
              </Link>
            )}
            
            {/* Enlaces para todos los usuarios (responder encuestas) */}
            <Link
              to="/available-surveys"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition"
            >
              <ClipboardList className="w-5 h-5" />
              Encuestas Disponibles
            </Link>
            <Link
              to="/my-responses"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition"
            >
              <CheckSquare className="w-5 h-5" />
              Mis Respuestas
            </Link>
            
            <Link
              to="/profile"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition"
            >
              <User className="w-5 h-5" />
              Mi Perfil
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
