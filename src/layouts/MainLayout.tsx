// layouts/MainLayout.tsx
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, FileText, LogOut, Settings, User, ClipboardList, CheckSquare, Menu, X } from 'lucide-react';
import { useState } from 'react';

export const MainLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded transition"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Link to="/dashboard" className="text-lg sm:text-xl font-bold text-primary-700 tracking-tight">
                ENCUESTAS <span className="text-accent-600">QR</span>
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline truncate max-w-[150px]">
                {user?.profile.display_name || user?.email}
              </span>
              {user?.isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 transition border border-amber-300 font-medium"
                >
                  <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">ADMIN</span>
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 rounded-md transition border border-gray-300 font-medium"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">SALIR</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-white border-r border-gray-200 shadow-lg lg:shadow-none
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]
        `}>
          <nav className="p-3 sm:p-4 space-y-1">
            <Link
              to="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-700 rounded-md transition border-l-4 border-transparent hover:border-primary-600 font-medium"
            >
              <Home className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-sm sm:text-base uppercase tracking-wide">Dashboard</span>
            </Link>
            
            {/* Enlaces para creadores y admins */}
            {(user?.isAdmin || user?.isCreator) && (
              <Link
                to="/surveys"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-700 rounded-md transition border-l-4 border-transparent hover:border-primary-600 font-medium"
              >
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="text-sm sm:text-base uppercase tracking-wide">Mis Encuestas</span>
              </Link>
            )}
            
            {/* Enlaces para todos los usuarios */}
            <Link
              to="/available-surveys"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-700 rounded-md transition border-l-4 border-transparent hover:border-primary-600 font-medium"
            >
              <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-sm sm:text-base uppercase tracking-wide">Disponibles</span>
            </Link>
            <Link
              to="/my-responses"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-700 rounded-md transition border-l-4 border-transparent hover:border-primary-600 font-medium"
            >
              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-sm sm:text-base uppercase tracking-wide">Mis Respuestas</span>
            </Link>
            
            <Link
              to="/profile"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-700 rounded-md transition border-l-4 border-transparent hover:border-primary-600 font-medium"
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-sm sm:text-base uppercase tracking-wide">Mi Perfil</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
