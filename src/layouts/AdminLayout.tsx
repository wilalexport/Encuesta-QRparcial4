// layouts/AdminLayout.tsx
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Users, Key, FileText, ArrowLeft, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export const AdminLayout = () => {
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
      <header className="bg-gradient-to-r from-amber-600 to-orange-600 text-white border-b border-amber-700 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-white hover:bg-amber-700 rounded-md transition"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 text-amber-200" />
              <div>
                <h1 className="text-base sm:text-xl font-bold tracking-tight">PANEL DE ADMINISTRACIÓN</h1>
                <p className="text-xs text-amber-100 hidden sm:block">Gestión del Sistema</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm hidden md:inline truncate max-w-[150px]">
                {user?.profile.display_name || user?.email}
              </span>
              <Link
                to="/dashboard"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white text-amber-700 rounded-md hover:bg-amber-50 transition border border-amber-200 font-medium"
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">DASHBOARD</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-amber-700 hover:bg-amber-800 rounded-md transition border border-amber-800 font-medium"
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

      {/* Admin Sidebar */}
      <div className="flex">
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-white border-r border-gray-200 shadow-lg lg:shadow-none
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]
        `}>
          <nav className="p-3 sm:p-4 space-y-1">
            <div className="px-3 sm:px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 mb-2">
              Gestión de Usuarios
            </div>
            <Link
              to="/admin/users"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-md transition border-l-4 border-transparent hover:border-amber-600 font-medium"
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-sm sm:text-base uppercase tracking-wide">Usuarios</span>
            </Link>
            <Link
              to="/admin/roles"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-md transition border-l-4 border-transparent hover:border-amber-600 font-medium"
            >
              <Key className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-sm sm:text-base uppercase tracking-wide">Roles</span>
            </Link>

            <div className="px-3 sm:px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 mb-2 mt-6">
              Auditoría
            </div>
            <Link
              to="/admin/audit"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-md transition border-l-4 border-transparent hover:border-amber-600 font-medium"
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-sm sm:text-base uppercase tracking-wide">Logs</span>
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
