// pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { DashboardStats, RecentActivity } from '@/types/database.types';
import { Plus, TrendingUp, FileText, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total_surveys: 0,
    total_responses: 0,
    active_surveys: 0,
    recent_responses: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Cargar estadísticas
      const { data: surveys, error: surveysError } = await supabase
        .from('surveys')
        .select('id, status')
        .eq('owner_id', user!.id);

      if (surveysError) throw surveysError;

      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select('id, survey_id, submitted_at')
        .in('survey_id', surveys?.map(s => s.id) || []);

      if (responsesError) throw responsesError;

      // Calcular estadísticas
      const activeSurveys = surveys?.filter(s => s.status === 'published').length || 0;
      const recentResponses = responses?.filter(r => {
        const submittedDate = new Date(r.submitted_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return submittedDate >= weekAgo;
      }).length || 0;

      setStats({
        total_surveys: surveys?.length || 0,
        total_responses: responses?.length || 0,
        active_surveys: activeSurveys,
        recent_responses: recentResponses,
      });

      // Cargar actividad reciente (últimas encuestas modificadas)
      const { data: recentSurveys, error: recentError } = await supabase
        .from('surveys')
        .select('id, title, updated_at, status')
        .eq('owner_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      const activity: RecentActivity[] = recentSurveys?.map(s => ({
        id: s.id,
        survey_id: s.id,
        survey_title: s.title,
        action: s.status === 'published' ? 'Publicado' : s.status === 'draft' ? 'Borrador' : 'Cerrado',
        timestamp: s.updated_at,
        user_name: user!.profile.display_name || user!.email,
      })) || [];

      setRecentActivity(activity);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Bienvenido, {user?.profile.display_name || user?.email}
          </p>
        </div>
        <Link
          to="/surveys/create"
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          <Plus className="w-5 h-5" />
          Crear Nueva Encuesta
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Formularios</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_surveys}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Respuestas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_responses}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Formularios Activos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.active_surveys}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Respuestas (7 días)</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.recent_responses}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Actividad Reciente</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Encuesta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Modificación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No hay actividad reciente. Crea tu primera encuesta.
                  </td>
                </tr>
              ) : (
                recentActivity.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{activity.survey_title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          activity.action === 'Publicado'
                            ? 'bg-green-100 text-green-800'
                            : activity.action === 'Borrador'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {activity.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(activity.timestamp), "d 'de' MMMM, yyyy", { locale: es })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        to={`/surveys/${activity.survey_id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Ver detalles →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
