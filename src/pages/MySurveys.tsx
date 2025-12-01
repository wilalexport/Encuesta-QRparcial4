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
      draft: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      published: 'bg-green-100 text-green-800 border-green-300',
      closed: 'bg-gray-100 text-gray-800 border-gray-300',
    };

    const labels = {
      draft: 'BORRADOR',
      published: 'PUBLICADO',
      closed: 'CERRADO',
    };

    return (
      <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide border ${styles[status as keyof typeof styles]}`}>
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
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight uppercase">Mis Encuestas</h1>
          <p className="text-gray-600 mt-1 font-medium">Gestiona tus formularios</p>
        </div>
        <Link
          to="/surveys/create"
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white hover:bg-primary-700 transition font-bold uppercase tracking-wide shadow-md hover:shadow-lg rounded-md"
        >
          <Plus className="w-5 h-5" />
          Crear Encuesta
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-bold uppercase tracking-wide transition text-sm border rounded-md ${
            filter === 'all' ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
          }`}
        >
          Todas ({surveys.length})
        </button>
        <button
          onClick={() => setFilter('draft')}
          className={`px-4 py-2 font-bold uppercase tracking-wide transition text-sm border rounded-md ${
            filter === 'draft' ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
          }`}
        >
          Borradores
        </button>
        <button
          onClick={() => setFilter('published')}
          className={`px-4 py-2 font-bold uppercase tracking-wide transition text-sm border rounded-md ${
            filter === 'published' ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
          }`}
        >
          Publicadas
        </button>
        <button
          onClick={() => setFilter('closed')}
          className={`px-4 py-2 font-bold uppercase tracking-wide transition text-sm border rounded-md ${
            filter === 'closed' ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
          }`}
        >
          Cerradas
        </button>
      </div>

      {/* Lista de Encuestas */}
      {surveys.length === 0 ? (
        <div className="bg-white shadow border border-gray-200 p-12 text-center rounded-lg">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-primary-100 border border-primary-300 flex items-center justify-center mx-auto mb-4 rounded-lg">
              <Plus className="w-8 h-8 text-primary-700" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-tight">No tienes encuestas</h3>
            <p className="text-gray-600 mb-6 font-medium">Crea tu primera encuesta para comenzar</p>
            <Link
              to="/surveys/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white hover:bg-primary-700 transition font-bold uppercase tracking-wide shadow-md hover:shadow-lg rounded-md"
            >
              <Plus className="w-5 h-5" />
              Crear Encuesta
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map((survey) => (
            <div key={survey.id} className="bg-white shadow border border-gray-200 hover:shadow-lg transition rounded-lg">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 pr-2">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-tight">{survey.title}</h3>
                    {survey.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{survey.description}</p>
                    )}
                  </div>
                  {getStatusBadge(survey.status)}
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600 border-t border-b border-gray-200 py-3">
                  <div className="flex justify-between">
                    <span className="font-bold uppercase text-xs tracking-wider">Preguntas:</span>
                    <span className="font-bold">{survey.questions_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold uppercase text-xs tracking-wider">Respuestas:</span>
                    <span className="font-bold">{survey.responses_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold uppercase text-xs tracking-wider">Actualizado:</span>
                    <span className="font-bold">
                      {format(new Date(survey.updated_at), 'd MMM yyyy', { locale: es })}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to={`/surveys/${survey.id}`}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white hover:bg-primary-700 transition text-xs font-bold uppercase tracking-wide rounded-md shadow-md"
                  >
                    <Eye className="w-4 h-4" />
                    Ver
                  </Link>
                  <Link
                    to={`/surveys/${survey.id}/edit`}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 hover:bg-gray-200 transition text-xs font-bold uppercase tracking-wide border border-gray-300 rounded-md"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </Link>
                  {survey.status === 'published' && (
                    <Link
                      to={`/surveys/${survey.id}/qr`}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-accent-600 text-white hover:bg-accent-700 transition text-xs font-bold uppercase tracking-wide rounded-md shadow-md"
                    >
                      <QrCode className="w-4 h-4" />
                      QR
                    </Link>
                  )}
                  <Link
                    to={`/surveys/${survey.id}/stats`}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition text-xs font-bold uppercase tracking-wide rounded-md shadow-md"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Stats
                  </Link>
                  <button
                    onClick={() => handleDuplicate(survey.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 hover:bg-gray-200 transition text-xs font-bold uppercase tracking-wide border border-gray-300 rounded-md"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicar
                  </button>
                  <button
                    onClick={() => handleDelete(survey.id, survey.title)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white hover:bg-red-700 transition text-xs font-bold uppercase tracking-wide rounded-md shadow-md"
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
