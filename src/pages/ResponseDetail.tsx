// pages/ResponseDetail.tsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface QuestionWithAnswer {
  question_id: number;
  question_text: string;
  question_type: string;
  answer_text?: string;
  answer_numeric?: number;
  answer_json?: any;
  options?: Array<{ id: number; label: string; value: string; order_index: number }>;
}

export const ResponseDetail = () => {
  const { id: surveyId, responseId } = useParams<{ id: string; responseId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [surveyTitle, setSurveyTitle] = useState('');
  const [responseData, setResponseData] = useState<any>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [answers, setAnswers] = useState<QuestionWithAnswer[]>([]);

  useEffect(() => {
    loadResponseData();
  }, [surveyId, responseId]);

  const loadResponseData = async () => {
    try {
      // Cargar datos de la respuesta
      const { data: response, error: responseError } = await supabase
        .from('responses')
        .select('*')
        .eq('id', responseId)
        .single();

      if (responseError) throw responseError;
      setResponseData(response);

      // Cargar nombre del usuario si no es anónimo
      if (response.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', response.user_id)
          .single();
        
        setUserName(profile?.display_name || 'Usuario sin nombre');
      }

      // Cargar título de la encuesta
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select('title')
        .eq('id', surveyId)
        .single();

      if (surveyError) throw surveyError;
      setSurveyTitle(survey.title);

      // Cargar items de respuesta con detalles de preguntas
      const { data: items, error: itemsError } = await supabase
        .from('response_items')
        .select('*')
        .eq('response_id', responseId);

      if (itemsError) throw itemsError;

      // Cargar preguntas
      const { data: questions, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index');

      if (questionsError) throw questionsError;

      // Cargar opciones de todas las preguntas
      const questionsWithOptions = await Promise.all(
        questions.map(async (q) => {
          const { data: options } = await supabase
            .from('survey_options')
            .select('*')
            .eq('question_id', q.id)
            .order('order_index');
          return { ...q, options: options || [] };
        })
      );

      // Combinar preguntas con respuestas
      const combined: QuestionWithAnswer[] = questionsWithOptions.map((q) => {
        const item = items.find((i) => i.question_id === q.id);
        return {
          question_id: q.id,
          question_text: q.question_text,
          question_type: q.type,
          answer_text: item?.value_text || undefined,
          answer_numeric: item?.value_numeric || undefined,
          answer_json: item?.value_json || undefined,
          options: q.options,
        };
      });

      setAnswers(combined);
      console.log('Respuestas cargadas:', combined);
    } catch (error) {
      console.error('Error cargando respuesta:', error);
      alert('Error al cargar los detalles de la respuesta');
      navigate(`/surveys/${surveyId}`);
    } finally {
      setLoading(false);
    }
  };

  const renderAnswer = (answer: QuestionWithAnswer) => {
    console.log('Renderizando respuesta:', answer);
    // Respuesta de texto libre
    if (answer.question_type === 'text') {
      return (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
          <p className="text-gray-900">{answer.answer_text || 'Sin respuesta'}</p>
        </div>
      );
    }
    
    // Respuesta Likert (escala 1-5)
    if (answer.question_type === 'likert' && answer.options) {
      return (
        <div className="space-y-2">
          {answer.options.map((option) => {
            const isSelected = answer.answer_numeric?.toString() === option.value;
            return (
              <div
                key={option.id}
                className={`p-3 rounded-lg border-2 transition ${
                  isSelected
                    ? 'bg-blue-100 border-blue-500 font-semibold'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={isSelected ? 'text-blue-900' : 'text-gray-700'}>
                    {option.label}
                  </span>
                  {isSelected && (
                    <span className="text-blue-600 text-sm font-bold">✓ Seleccionada</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    
    // Respuesta de opción única
    if (answer.question_type === 'single' && answer.options) {
      return (
        <div className="space-y-2">
          {answer.options.map((option) => {
            const isSelected = answer.answer_text === option.value;
            return (
              <div
                key={option.id}
                className={`p-3 rounded-lg border-2 transition ${
                  isSelected
                    ? 'bg-green-100 border-green-500 font-semibold'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={isSelected ? 'text-green-900' : 'text-gray-700'}>
                    {option.label}
                  </span>
                  {isSelected && (
                    <span className="text-green-600 text-sm font-bold">✓ Seleccionada</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    
    // Respuesta de opción múltiple
    if (answer.question_type === 'multiple' && answer.options) {
      const selectedValues = answer.answer_json?.values || [];
      return (
        <div className="space-y-2">
          {answer.options.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <div
                key={option.id}
                className={`p-3 rounded-lg border-2 transition ${
                  isSelected
                    ? 'bg-purple-100 border-purple-500 font-semibold'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={isSelected ? 'text-purple-900' : 'text-gray-700'}>
                    {option.label}
                  </span>
                  {isSelected && (
                    <span className="text-purple-600 text-sm font-bold">✓ Seleccionada</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return <p className="text-gray-500 italic">Sin respuesta</p>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-4 text-gray-600">Cargando respuesta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={`/surveys/${surveyId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Detalle de Respuesta</h1>
          <p className="text-gray-600 mt-1">{surveyTitle}</p>
        </div>
      </div>

      {/* Información de la respuesta */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Información</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <User className="w-4 h-4" />
            <span>ID Respuesta: #{responseData.id}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(responseData.submitted_at), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                locale: es,
              })}
            </span>
          </div>
          {responseData.user_id && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Usuario: {userName || 'Cargando...'}</span>
            </div>
          )}
          {!responseData.user_id && (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="italic">Respuesta anónima</span>
            </div>
          )}
        </div>
      </div>

      {/* Respuestas */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Respuestas</h2>
        <div className="space-y-6">
          {answers.map((answer, index) => (
            <div key={answer.question_id} className="border-b border-gray-200 pb-6 last:border-0">
              <p className="font-medium text-gray-900 mb-3">
                {index + 1}. {answer.question_text}
              </p>
              <div className="pl-4">
                {renderAnswer(answer)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
