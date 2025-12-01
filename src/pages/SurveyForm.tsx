// pages/SurveyForm.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { QuestionType, SurveyQuestion, SurveyOption } from '@/types/database.types';
import { Plus, Trash2, GripVertical, Save, Eye } from 'lucide-react';

interface QuestionFormData extends Omit<SurveyQuestion, 'id' | 'created_at' | 'survey_id'> {
  id?: number;
  options_list?: Omit<SurveyOption, 'id' | 'created_at' | 'question_id'>[];
}

// Función para generar slug único
const generateSlug = (title: string): string => {
  const baseSlug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
};

export const SurveyForm = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionFormData[]>([]);

  useEffect(() => {
    if (id) {
      loadSurvey();
    }
  }, [id]);

  const loadSurvey = async () => {
    try {
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .single();

      if (surveyError) throw surveyError;

      setTitle(survey.title);
      setDescription(survey.description || '');

      const { data: questionsData, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', id)
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
    } catch (error) {
      console.error('Error cargando encuesta:', error);
      alert('Error al cargar la encuesta');
      navigate('/surveys');
    }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        type: 'single',
        question_text: '',
        required: true,
        order_index: questions.length,
        options: null,
        options_list: [
          { label: 'Opción 1', value: 'option_1', order_index: 0 },
          { label: 'Opción 2', value: 'option_2', order_index: 1 },
        ],
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof QuestionFormData, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };

    // Si cambia el tipo de pregunta, ajustar opciones
    if (field === 'type') {
      if (value === 'text') {
        updated[index].options_list = [];
      } else if (value === 'likert') {
        updated[index].options_list = [
          { label: 'Muy en desacuerdo', value: '1', order_index: 0 },
          { label: 'En desacuerdo', value: '2', order_index: 1 },
          { label: 'Neutral', value: '3', order_index: 2 },
          { label: 'De acuerdo', value: '4', order_index: 3 },
          { label: 'Muy de acuerdo', value: '5', order_index: 4 },
        ];
      } else if (!updated[index].options_list || updated[index].options_list!.length === 0) {
        updated[index].options_list = [
          { label: 'Opción 1', value: 'option_1', order_index: 0 },
          { label: 'Opción 2', value: 'option_2', order_index: 1 },
        ];
      }
    }

    setQuestions(updated);
  };

  const handleAddOption = (questionIndex: number) => {
    const updated = [...questions];
    const currentOptions = updated[questionIndex].options_list || [];
    updated[questionIndex].options_list = [
      ...currentOptions,
      {
        label: `Opción ${currentOptions.length + 1}`,
        value: `option_${currentOptions.length + 1}`,
        order_index: currentOptions.length,
      },
    ];
    setQuestions(updated);
  };

  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options_list = updated[questionIndex].options_list!.filter(
      (_, i) => i !== optionIndex
    );
    setQuestions(updated);
  };

  const handleOptionChange = (
    questionIndex: number,
    optionIndex: number,
    field: 'label' | 'value',
    value: string
  ) => {
    const updated = [...questions];
    updated[questionIndex].options_list![optionIndex][field] = value;
    setQuestions(updated);
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (!title.trim()) {
      alert('El título es obligatorio');
      return;
    }

    if (questions.length === 0) {
      alert('Debes agregar al menos una pregunta');
      return;
    }

    setLoading(true);

    try {
      let surveyId = id ? parseInt(id) : null;

      if (surveyId) {
        // Actualizar encuesta existente
        const { error: updateError } = await supabase
          .from('surveys')
          .update({
            title,
            description,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', surveyId);

        if (updateError) throw updateError;

        // Eliminar preguntas existentes
        await supabase.from('survey_questions').delete().eq('survey_id', surveyId);
      } else {
        // Crear nueva encuesta
        const slug = generateSlug(title);
        const { data: newSurvey, error: createError } = await supabase
          .from('surveys')
          .insert({
            owner_id: user!.id,
            title,
            description,
            status,
            slug: slug,
            public_slug: slug,
          })
          .select()
          .single();

        if (createError) throw createError;
        surveyId = newSurvey.id;
      }

      // Insertar preguntas
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const { data: newQuestion, error: questionError } = await supabase
          .from('survey_questions')
          .insert({
            survey_id: surveyId!,
            type: question.type,
            question_text: question.question_text,
            required: question.required,
            order_index: i,
            options: question.options,
          })
          .select()
          .single();

        if (questionError) throw questionError;

        // Insertar opciones si existen
        if (question.options_list && question.options_list.length > 0 && question.type !== 'text') {
          const options = question.options_list.map((opt, idx) => ({
            question_id: newQuestion.id,
            label: opt.label,
            value: opt.value,
            order_index: idx,
          }));

          const { error: optionsError } = await supabase.from('survey_options').insert(options);

          if (optionsError) throw optionsError;
        }
      }

      alert(id ? 'Encuesta actualizada exitosamente' : 'Encuesta creada exitosamente');
      navigate('/surveys');
    } catch (error) {
      console.error('Error guardando encuesta:', error);
      alert('Error al guardar la encuesta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {id ? 'Editar Encuesta' : 'Crear Nueva Encuesta'}
        </h1>
        <p className="text-gray-600 mt-1">Diseña tu formulario agregando preguntas</p>
      </div>

      {/* Información básica */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Título de la Encuesta *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: Encuesta de Satisfacción"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Descripción opcional de la encuesta"
          />
        </div>
      </div>

      {/* Preguntas */}
      <div className="space-y-4">
        {questions.map((question, qIndex) => (
          <div key={qIndex} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start gap-4">
              <div className="mt-3 cursor-move text-gray-400">
                <GripVertical className="w-5 h-5" />
              </div>

              <div className="flex-1 space-y-4">
                {/* Pregunta */}
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={question.question_text}
                    onChange={(e) => handleQuestionChange(qIndex, 'question_text', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Escribe tu pregunta aquí"
                  />
                  <select
                    value={question.type}
                    onChange={(e) =>
                      handleQuestionChange(qIndex, 'type', e.target.value as QuestionType)
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="single">Opción única</option>
                    <option value="multiple">Opción múltiple</option>
                    <option value="likert">Escala Likert</option>
                    <option value="text">Texto libre</option>
                  </select>
                </div>

                {/* Opciones */}
                {question.type !== 'text' && (
                  <div className="pl-4 space-y-2">
                    {question.options_list?.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={option.label}
                          onChange={(e) =>
                            handleOptionChange(qIndex, oIndex, 'label', e.target.value)
                          }
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Texto de la opción"
                        />
                        {question.type !== 'likert' && question.options_list!.length > 2 && (
                          <button
                            onClick={() => handleRemoveOption(qIndex, oIndex)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}

                    {question.type !== 'likert' && (
                      <button
                        onClick={() => handleAddOption(qIndex)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Agregar opción
                      </button>
                    )}
                  </div>
                )}

                {/* Requerido */}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(e) => handleQuestionChange(qIndex, 'required', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Pregunta obligatoria</span>
                </label>
              </div>

              <button
                onClick={() => handleRemoveQuestion(qIndex)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={handleAddQuestion}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:border-blue-500 hover:text-blue-600 transition"
        >
          <Plus className="w-5 h-5" />
          Agregar Pregunta
        </button>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => navigate('/surveys')}
          className="px-6 py-3 text-gray-700 bg-white border rounded-lg hover:bg-gray-50 transition font-medium"
        >
          Cancelar
        </button>
        <button
          onClick={() => handleSave('draft')}
          disabled={loading}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium disabled:bg-gray-400"
        >
          <Save className="w-5 h-5 inline mr-2" />
          {loading ? 'Guardando...' : 'Guardar Borrador'}
        </button>
        <button
          onClick={() => handleSave('published')}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-blue-400"
        >
          <Eye className="w-5 h-5 inline mr-2" />
          {loading ? 'Publicando...' : 'Publicar Encuesta'}
        </button>
      </div>
    </div>
  );
};
