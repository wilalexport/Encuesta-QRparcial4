// pages/AvailableSurveys.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Survey } from '@/types/database.types';
import { ClipboardList, Calendar, ArrowRight, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const AvailableSurveys = () => {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPublishedSurveys();
  }, []);

  const loadPublishedSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSurveys(data || []);
    } catch (error) {
      console.error('Error cargando encuestas:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSurveys = surveys.filter((survey) =>
    survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    survey.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Encuestas Disponibles</h1>
        <p className="text-gray-600">
          Participa respondiendo las encuestas publicadas
        </p>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Buscar encuestas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Lista de encuestas */}
      {filteredSurveys.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm ? 'No se encontraron encuestas' : 'No hay encuestas disponibles'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Intenta con otro término de búsqueda' : 'Vuelve más tarde para ver nuevas encuestas'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSurveys.map((survey) => (
            <div
              key={survey.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
            >
              {survey.cover_image_url && (
                <img
                  src={survey.cover_image_url}
                  alt={survey.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {survey.title}
                </h3>
                {survey.description && (
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {survey.description}
                  </p>
                )}
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>
                    Publicada {format(new Date(survey.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/s/${survey.public_slug}`)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  Responder Encuesta
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
