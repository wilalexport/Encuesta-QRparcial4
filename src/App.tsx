// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { MySurveys } from './pages/MySurveys';
import { SurveyForm } from './pages/SurveyForm';
import { SurveyDetail } from './pages/SurveyDetail';
import { ResponseDetail } from './pages/ResponseDetail';
import { Profile } from './pages/Profile';
import { PublicSurvey } from './pages/PublicSurvey';
import { AvailableSurveys } from './pages/AvailableSurveys';
import { MyResponses } from './pages/MyResponses';
import { AdminUsers } from './pages/admin/Users';
import { AdminRoles } from './pages/admin/Roles';
import { AdminAudit } from './pages/admin/Audit';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Ruta pública para responder encuestas vía QR */}
          <Route path="/s/:slug" element={<PublicSurvey />} />

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
            <Route path="available-surveys" element={<AvailableSurveys />} />
            <Route path="my-responses" element={<MyResponses />} />
            <Route path="surveys" element={<MySurveys />} />
            <Route path="surveys/create" element={<SurveyForm />} />
            <Route path="surveys/:id" element={<SurveyDetail />} />
            <Route path="surveys/:id/responses/:responseId" element={<ResponseDetail />} />
            <Route path="surveys/:id/edit" element={<SurveyForm />} />
            <Route path="surveys/:id/qr" element={<SurveyDetail />} />
            <Route path="surveys/:id/stats" element={<SurveyDetail />} />
            <Route path="profile" element={<Profile />} />
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

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
