// pages/MyResponses.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardList, Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ResponseWithSurvey {
  id: number;
  survey_id: number;
  submitted_at: string;
  survey: {
    title: string;
    description: string;
  };
}

export const MyResponses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [responses, setResponses] = useState<ResponseWithSurvey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMyResponses();
    }
  }, [user]);

  const loadMyResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('responses')
        .select(`
          id,
          survey_id,
          submitted_at,
          surveys (
            title,
            description
          )
        `)
        .eq('user_id', user!.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Transformar datos para manejar la estructura anidada
      const transformedData = data.map((item: any) => ({
        id: item.id,
        survey_id: item.survey_id,
        submitted_at: item.submitted_at,
        survey: {
          title: item.surveys?.title || 'Encuesta sin título',
          description: item.surveys?.description || '',
        },
      }));

      setResponses(transformedData);
    } catch (error) {
      console.error('Error cargando respuestas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Respuestas</h1>
        <p className="text-gray-600">
          Historial de encuestas que has respondido
        </p>
      </div>

      {responses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No has respondido encuestas aún
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Ve a "Encuestas Disponibles" para comenzar a participar
          </p>
          <button
            onClick={() => navigate('/available-surveys')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ver Encuestas Disponibles
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {responses.map((response) => (
            <div
              key={response.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {response.survey.title}
                  </h3>
                  {response.survey.description && (
                    <p className="text-gray-600 mb-3">
                      {response.survey.description}
                    </p>
                  )}
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>
                      Respondida el {format(new Date(response.submitted_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/surveys/${response.survey_id}/responses/${response.id}`)}
                  className="ml-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Eye className="h-5 w-5" />
                  Ver Detalles
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {responses.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Total de respuestas: {responses.length}
        </div>
      )}
    </div>
  );
};
