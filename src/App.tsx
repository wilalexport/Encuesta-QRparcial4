// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { AdminUsers } from './pages/admin/Users';
import { AdminRoles } from './pages/admin/Roles';
import { AdminAudit } from './pages/admin/Audit';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rutas Protegidas - Usuario Normal */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="surveys" element={<div>Lista de Encuestas (Por implementar)</div>} />
            <Route path="surveys/create" element={<div>Crear Encuesta (Por implementar)</div>} />
            <Route path="surveys/:id" element={<div>Detalle de Encuesta (Por implementar)</div>} />
            <Route path="profile" element={<div>Mi Perfil (Por implementar)</div>} />
          </Route>

          {/* Rutas Protegidas - Administrador */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/users" replace />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="roles" element={<AdminRoles />} />
            <Route path="audit" element={<AdminAudit />} />
          </Route>

          {/* Ruta pública para responder encuestas vía QR */}
          <Route path="/s/:slug" element={<div>Vista Pública de Encuesta (Por implementar)</div>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
