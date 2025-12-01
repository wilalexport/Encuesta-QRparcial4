-- Políticas para permitir que los usuarios vean sus propias respuestas
-- Ejecutar en el SQL Editor de Supabase

-- 1. Permitir que los usuarios vean sus propias respuestas (responses)
CREATE POLICY "Users can view own responses" 
  ON responses FOR SELECT 
  USING (auth.uid() = user_id);

-- 2. Permitir que los usuarios vean los items de sus propias respuestas
CREATE POLICY "Users can view their own response items"
  ON response_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM responses
      WHERE responses.id = response_items.response_id
      AND responses.user_id = auth.uid()
    )
  );

-- 3. Permitir que los usuarios vean las preguntas de las encuestas que han respondido
-- (Esto permite cargar las preguntas en ResponseDetail)
CREATE POLICY "Users can view questions from surveys they responded"
  ON survey_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM responses r
      WHERE r.survey_id = survey_questions.survey_id
      AND r.user_id = auth.uid()
    )
  );

-- 4. Permitir que los usuarios vean las opciones de preguntas de encuestas que respondieron
CREATE POLICY "Users can view options from surveys they responded"
  ON survey_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM survey_questions sq
      JOIN responses r ON r.survey_id = sq.survey_id
      WHERE sq.id = survey_options.question_id
      AND r.user_id = auth.uid()
    )
  );
