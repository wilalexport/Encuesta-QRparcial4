// pages/PublicSurvey.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Survey, QuestionWithOptions, QuestionType } from '@/types/database.types';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const PublicSurvey = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSurvey();
  }, [slug]);

  const loadSurvey = async () => {
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('public_slug', slug)
        .single();

      if (surveyError) throw new Error('Encuesta no encontrada');
      
      // Validar que esté publicada y no cerrada
      if (surveyData.status !== 'published') {
        throw new Error(
          surveyData.status === 'closed' 
            ? 'Esta encuesta ha sido cerrada y ya no acepta respuestas'
            : 'Esta encuesta no está disponible aún'
        );
      }
      
      setSurvey(surveyData);

      const { data: questionsData, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyData.id)
        .order('order_index');

      if (questionsError) throw questionsError;

      const questionsWithOptions = await Promise.all(
        (questionsData || []).map(async (q) => {
          const { data: options } = await supabase
            .from('survey_options')
            .select('*')
            .eq('question_id', q.id)
            .order('order_index');

          return {
            ...q,
            options_list: options || [],
          };
        })
      );

      setQuestions(questionsWithOptions);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la encuesta');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, value: any, type: QuestionType) => {
    if (type === 'multiple') {
      const current = answers[questionId] || [];
      const updated = current.includes(value)
        ? current.filter((v: any) => v !== value)
        : [...current, value];
      setAnswers({ ...answers, [questionId]: updated });
    } else {
      setAnswers({ ...answers, [questionId]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar preguntas requeridas
    const unanswered = questions
      .filter((q) => q.required && !answers[q.id])
      .map((q) => q.question_text);

    if (unanswered.length > 0) {
      setError('Por favor responde todas las preguntas obligatorias');
      return;
    }

    setSubmitting(true);

    try {
      // Crear respuesta
      const { data: response, error: responseError } = await supabase
        .from('responses')
        .insert({
          survey_id: survey!.id,
          user_id: user?.id || null, // Usuario autenticado o anónimo
          ip_address: null,
          user_agent: navigator.userAgent,
        })
        .select()
        .single();

      if (responseError) throw responseError;

      // Crear items de respuesta
      const items = Object.entries(answers).map(([questionId, value]) => {
        const question = questions.find((q) => q.id === parseInt(questionId));
        
        let itemData: any = {
          response_id: response.id,
          question_id: parseInt(questionId),
        };

        if (question?.type === 'text') {
          itemData.value_text = value;
        } else if (question?.type === 'likert') {
          itemData.value_numeric = parseInt(value);
        } else if (question?.type === 'multiple') {
          itemData.value_json = { values: value };
        } else {
          itemData.value_text = value;
        }

        return itemData;
      });

      const { error: itemsError } = await supabase.from('response_items').insert(items);

      if (itemsError) throw itemsError;

      setSubmitted(true);
    } catch (err: any) {
      console.error('Error enviando respuesta:', err);
      console.error('Detalles del error:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
      setError(`Error al enviar la respuesta: ${err.message || 'Por favor intenta de nuevo.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-4 text-gray-600">Cargando encuesta...</p>
        </div>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Encuesta no disponible</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Gracias por tu respuesta!</h1>
          <p className="text-gray-600">Tu participación ha sido registrada exitosamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          {survey?.cover_image_url && (
            <div className="h-48 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          )}
          
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{survey?.title}</h1>
              {survey?.description && (
                <p className="text-gray-600">{survey.description}</p>
              )}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {questions.map((question, index) => (
                <div key={question.id} className="space-y-3">
                  <label className="block text-lg font-medium text-gray-900">
                    {index + 1}. {question.question_text}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {question.type === 'text' && (
                    <textarea
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                      placeholder="Escribe tu respuesta aquí..."
                      required={question.required}
                    />
                  )}

                  {question.type === 'single' && (
                    <div className="space-y-2">
                      {question.options_list?.map((option) => (
                        <label key={option.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name={`question_${question.id}`}
                            value={option.value}
                            checked={answers[question.id] === option.value}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
                            required={question.required}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'multiple' && (
                    <div className="space-y-2">
                      {question.options_list?.map((option) => (
                        <label key={option.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            value={option.value}
                            checked={(answers[question.id] || []).includes(option.value)}
                            onChange={() => handleAnswerChange(question.id, option.value, question.type)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'likert' && (
                    <div className="space-y-2">
                      {question.options_list?.map((option) => (
                        <label key={option.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name={`question_${question.id}`}
                            value={option.value}
                            checked={answers[question.id] === option.value}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
                            required={question.required}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-lg disabled:bg-blue-400"
              >
                {submitting ? 'Enviando...' : 'Enviar Respuestas'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
