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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-4 text-gray-600 font-medium">Cargando encuesta...</p>
        </div>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Encuesta no disponible</h1>
          <p className="text-gray-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-accent-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2 uppercase tracking-tight">¡Gracias por tu respuesta!</h1>
          <p className="text-gray-600 font-medium">Tu participación ha sido registrada exitosamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-accent-600 px-8 py-12">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/90 text-sm font-bold uppercase tracking-wider">Encuestas QR</p>
                  <p className="text-white/70 text-xs font-medium">Sistema de Recopilación de Datos</p>
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 uppercase tracking-tight">{survey?.title}</h1>
              {survey?.description && (
                <p className="text-white/90 font-medium text-lg leading-relaxed">{survey.description}</p>
              )}
              <div className="mt-6 flex items-center gap-2 text-white/80 text-sm">
              </div>
            </div>
          </div>
          
          <div className="p-8">
            <div className="mb-8">
              <p className="text-gray-600 font-medium text-center py-4 bg-gray-50 rounded-md border border-gray-200">
                Por favor, responde todas las preguntas marcadas con <span className="text-red-500 font-bold">*</span> para continuar
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 rounded-md text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {questions.map((question, index) => (
                <div key={question.id} className="space-y-3">
                  <label className="block text-lg font-bold text-gray-900 uppercase tracking-wide">
                    {index + 1}. {question.question_text}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {question.type === 'text' && (
                    <textarea
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all text-gray-900"
                      rows={4}
                      placeholder="Escribe tu respuesta aquí..."
                      required={question.required}
                    />
                  )}

                  {question.type === 'single' && (
                    <div className="space-y-2">
                      {question.options_list?.map((option) => (
                        <label key={option.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-md hover:bg-primary-50 hover:border-primary-300 cursor-pointer transition-all">
                          <input
                            type="radio"
                            name={`question_${question.id}`}
                            value={option.value}
                            checked={answers[question.id] === option.value}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
                            required={question.required}
                            className="w-4 h-4 text-primary-600"
                          />
                          <span className="text-gray-700 font-medium">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'multiple' && (
                    <div className="space-y-2">
                      {question.options_list?.map((option) => (
                        <label key={option.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-md hover:bg-primary-50 hover:border-primary-300 cursor-pointer transition-all">
                          <input
                            type="checkbox"
                            value={option.value}
                            checked={(answers[question.id] || []).includes(option.value)}
                            onChange={() => handleAnswerChange(question.id, option.value, question.type)}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          <span className="text-gray-700 font-medium">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'likert' && (
                    <div className="space-y-2">
                      {question.options_list?.map((option) => (
                        <label key={option.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-md hover:bg-primary-50 hover:border-primary-300 cursor-pointer transition-all">
                          <input
                            type="radio"
                            name={`question_${question.id}`}
                            value={option.value}
                            checked={answers[question.id] === option.value}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
                            required={question.required}
                            className="w-4 h-4 text-primary-600"
                          />
                          <span className="text-gray-700 font-medium">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition font-bold text-lg uppercase tracking-wide disabled:bg-primary-400 shadow-md hover:shadow-lg"
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
