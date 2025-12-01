// pages/MySurveys.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { SurveyWithOwner } from '@/types/database.types';
import { Plus, Eye, Edit, QrCode, Trash2, BarChart3, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const MySurveys = () => {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<SurveyWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'closed'>('all');

  useEffect(() => {
    if (user) {
      loadSurveys();
    }
  }, [user, filter]);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('surveys')
        .select('*')
        .order('updated_at', { ascending: false });

      // Si es admin, puede ver todas las encuestas
      // Si es creator, solo ve las que ha creado
      if (!user!.isAdmin) {
        query = query.eq('owner_id', user!.id);
      }

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Cargar contadores de preguntas y respuestas
      const surveysWithCounts = await Promise.all(
        (data || []).map(async (survey) => {
          const [questionsCount, responsesCount] = await Promise.all([
            supabase
              .from('survey_questions')
              .select('id', { count: 'exact', head: true })
              .eq('survey_id', survey.id),
            supabase
              .from('responses')
              .select('id', { count: 'exact', head: true })
              .eq('survey_id', survey.id),
          ]);

          return {
            ...survey,
            questions_count: questionsCount.count || 0,
            responses_count: responsesCount.count || 0,
          };
        })
      );

      setSurveys(surveysWithCounts);
    } catch (error) {
      console.error('Error cargando encuestas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (surveyId: number, title: string) => {
    if (!confirm(`¿Estás seguro de eliminar la encuesta "${title}"?`)) return;

    try {
      const { error } = await supabase.from('surveys').delete().eq('id', surveyId);

      if (error) throw error;

      setSurveys(surveys.filter((s) => s.id !== surveyId));
    } catch (error) {
      console.error('Error eliminando encuesta:', error);
      alert('Error al eliminar la encuesta');
    }
  };

  const handleDuplicate = async (surveyId: number) => {
    try {
      // Obtener encuesta original
      const { data: originalSurvey, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single();

      if (surveyError) throw surveyError;

      // Crear copia
      const { data: newSurvey, error: createError } = await supabase
        .from('surveys')
        .insert({
          owner_id: user!.id,
          title: `${originalSurvey.title} (Copia)`,
          description: originalSurvey.description,
          status: 'draft',
        })
        .select()
        .single();

      if (createError) throw createError;

      // Copiar preguntas
      const { data: questions, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyId);

      if (questionsError) throw questionsError;

      if (questions && questions.length > 0) {
        const newQuestions = questions.map((q) => ({
          survey_id: newSurvey.id,
          type: q.type,
          question_text: q.question_text,
          required: q.required,
          order_index: q.order_index,
          options: q.options,
        }));

        await supabase.from('survey_questions').insert(newQuestions);
      }

      loadSurveys();
      alert('Encuesta duplicada exitosamente');
    } catch (error) {
      console.error('Error duplicando encuesta:', error);
      alert('Error al duplicar la encuesta');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-yellow-100 text-yellow-800',
      published: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      draft: 'Borrador',
      published: 'Publicado',
      closed: 'Cerrado',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-4 text-gray-600">Cargando encuestas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Encuestas</h1>
          <p className="text-gray-600 mt-1">Gestiona tus formularios y encuestas</p>
        </div>
        <Link
          to="/surveys/create"
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          <Plus className="w-5 h-5" />
          Crear Encuesta
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Todas ({surveys.length})
        </button>
        <button
          onClick={() => setFilter('draft')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'draft' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Borradores
        </button>
        <button
          onClick={() => setFilter('published')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'published' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Publicadas
        </button>
        <button
          onClick={() => setFilter('closed')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'closed' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Cerradas
        </button>
      </div>

      {/* Lista de Encuestas */}
      {surveys.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tienes encuestas aún</h3>
            <p className="text-gray-600 mb-6">Crea tu primera encuesta para comenzar a recopilar respuestas</p>
            <Link
              to="/surveys/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              <Plus className="w-5 h-5" />
              Crear Primera Encuesta
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map((survey) => (
            <div key={survey.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{survey.title}</h3>
                    {survey.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{survey.description}</p>
                    )}
                  </div>
                  {getStatusBadge(survey.status)}
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Preguntas:</span>
                    <span className="font-medium">{survey.questions_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Respuestas:</span>
                    <span className="font-medium">{survey.responses_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Actualizado:</span>
                    <span className="font-medium">
                      {format(new Date(survey.updated_at), 'd MMM yyyy', { locale: es })}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to={`/surveys/${survey.id}`}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    Ver
                  </Link>
                  <Link
                    to={`/surveys/${survey.id}/edit`}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </Link>
                  {survey.status === 'published' && (
                    <Link
                      to={`/surveys/${survey.id}/qr`}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition text-sm font-medium"
                    >
                      <QrCode className="w-4 h-4" />
                      QR
                    </Link>
                  )}
                  <Link
                    to={`/surveys/${survey.id}/stats`}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition text-sm font-medium"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Stats
                  </Link>
                  <button
                    onClick={() => handleDuplicate(survey.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition text-sm font-medium"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicar
                  </button>
                  <button
                    onClick={() => handleDelete(survey.id, survey.title)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
