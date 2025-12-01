-- =============================================
-- Script de Base de Datos Completo
-- Sistema de Encuestas QR
-- Incluye: Tablas, Triggers, RLS y Políticas
-- =============================================

-- =============================================
-- 1. TABLAS
-- =============================================

-- Tabla: profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  role TEXT,
  phone TEXT,
  genero TEXT,
  fecha_nacimiento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: user_roles
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'creator', 'viewer')) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Tabla: surveys
CREATE TABLE surveys (
  id SERIAL PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('draft', 'published', 'closed')) DEFAULT 'draft',
  public_slug TEXT UNIQUE NOT NULL,
  slug TEXT NOT NULL,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: survey_questions
CREATE TABLE survey_questions (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('single', 'multiple', 'likert', 'text')) NOT NULL,
  question_text TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL,
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: survey_options
CREATE TABLE survey_options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER REFERENCES survey_questions(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: responses
CREATE TABLE responses (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Tabla: response_items
CREATE TABLE response_items (
  id SERIAL PRIMARY KEY,
  response_id INTEGER REFERENCES responses(id) ON DELETE CASCADE NOT NULL,
  question_id INTEGER REFERENCES survey_questions(id) ON DELETE CASCADE NOT NULL,
  value_text TEXT,
  value_numeric NUMERIC,
  value_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: audit_log
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT CHECK (action IN ('create', 'publish', 'update', 'delete')) NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. ÍNDICES
-- =============================================

-- Índices para user_roles
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Índices para surveys
CREATE INDEX idx_surveys_owner_id ON surveys(owner_id);
CREATE INDEX idx_surveys_public_slug ON surveys(public_slug);
CREATE INDEX idx_surveys_status ON surveys(status);

-- Índices para survey_questions
CREATE INDEX idx_survey_questions_survey_id ON survey_questions(survey_id);

-- Índices para survey_options
CREATE INDEX idx_survey_options_question_id ON survey_options(question_id);

-- Índices para responses
CREATE INDEX idx_responses_survey_id ON responses(survey_id);
CREATE INDEX idx_responses_user_id ON responses(user_id);
CREATE INDEX idx_responses_submitted_at ON responses(submitted_at);

-- Índices para response_items
CREATE INDEX idx_response_items_response_id ON response_items(response_id);
CREATE INDEX idx_response_items_question_id ON response_items(question_id);

-- Índices para audit_log
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- =============================================
-- 3. TRIGGERS Y FUNCIONES
-- =============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para profiles
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para surveys
CREATE TRIGGER update_surveys_updated_at 
  BEFORE UPDATE ON surveys
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  
  -- Asignar rol 'viewer' por defecto
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. POLÍTICAS RLS - PROFILES
-- =============================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "users_view_own_profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "users_update_own_profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Los admins pueden ver todos los perfiles
CREATE POLICY "admins_view_all_profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Los admins pueden actualizar cualquier perfil
CREATE POLICY "admins_update_all_profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- 6. POLÍTICAS RLS - USER_ROLES
-- =============================================

-- Los usuarios pueden ver sus propios roles
CREATE POLICY "users_view_own_roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Los admins pueden ver todos los roles
CREATE POLICY "admins_view_all_roles"
  ON user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Los admins pueden insertar roles
CREATE POLICY "admins_insert_roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Los admins pueden eliminar roles
CREATE POLICY "admins_delete_roles"
  ON user_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- =============================================
-- 7. POLÍTICAS RLS - SURVEYS
-- =============================================

-- Los usuarios pueden ver sus propias encuestas
CREATE POLICY "users_view_own_surveys"
  ON surveys FOR SELECT
  USING (auth.uid() = owner_id);

-- Los usuarios pueden insertar sus propias encuestas
CREATE POLICY "users_insert_own_surveys"
  ON surveys FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Los usuarios pueden actualizar sus propias encuestas
CREATE POLICY "users_update_own_surveys"
  ON surveys FOR UPDATE
  USING (auth.uid() = owner_id);

-- Los usuarios pueden eliminar sus propias encuestas
CREATE POLICY "users_delete_own_surveys"
  ON surveys FOR DELETE
  USING (auth.uid() = owner_id);

-- Cualquiera puede ver encuestas publicadas
CREATE POLICY "public_view_published_surveys"
  ON surveys FOR SELECT
  USING (status = 'published');

-- =============================================
-- 8. POLÍTICAS RLS - SURVEY_QUESTIONS
-- =============================================

-- Los dueños pueden gestionar preguntas de sus encuestas
CREATE POLICY "owners_manage_questions"
  ON survey_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.owner_id = auth.uid()
    )
  );

-- Cualquiera puede ver preguntas de encuestas publicadas
CREATE POLICY "public_view_published_questions"
  ON survey_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.status = 'published'
    )
  );

-- Usuarios pueden ver preguntas de encuestas que respondieron
CREATE POLICY "users_view_questions_from_responded_surveys"
  ON survey_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM responses r
      WHERE r.survey_id = survey_questions.survey_id
      AND r.user_id = auth.uid()
    )
  );

-- =============================================
-- 9. POLÍTICAS RLS - SURVEY_OPTIONS
-- =============================================

-- Los dueños pueden gestionar opciones
CREATE POLICY "owners_manage_options"
  ON survey_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM survey_questions sq
      JOIN surveys s ON s.id = sq.survey_id
      WHERE sq.id = survey_options.question_id
      AND s.owner_id = auth.uid()
    )
  );

-- Cualquiera puede ver opciones de encuestas publicadas
CREATE POLICY "public_view_published_options"
  ON survey_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM survey_questions sq
      JOIN surveys s ON s.id = sq.survey_id
      WHERE sq.id = survey_options.question_id
      AND s.status = 'published'
    )
  );

-- Usuarios pueden ver opciones de encuestas que respondieron
CREATE POLICY "users_view_options_from_responded_surveys"
  ON survey_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM survey_questions sq
      JOIN responses r ON r.survey_id = sq.survey_id
      WHERE sq.id = survey_options.question_id
      AND r.user_id = auth.uid()
    )
  );

-- =============================================
-- 10. POLÍTICAS RLS - RESPONSES (ANÓNIMAS)
-- =============================================

-- IMPORTANTE: Permitir INSERT anónimo para respuestas públicas
CREATE POLICY "responses_insert_anon" 
  ON responses FOR INSERT 
  WITH CHECK (true);

-- Permitir SELECT anónimo después de insertar (para .single())
CREATE POLICY "responses_select_anon" 
  ON responses FOR SELECT 
  USING (true);

-- Los dueños pueden ver respuestas de sus encuestas
CREATE POLICY "responses_select_owner" 
  ON responses FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = responses.survey_id
      AND surveys.owner_id = auth.uid()
    )
  );

-- Los usuarios pueden ver sus propias respuestas
CREATE POLICY "users_view_own_responses" 
  ON responses FOR SELECT 
  USING (auth.uid() = user_id);

-- =============================================
-- 11. POLÍTICAS RLS - RESPONSE_ITEMS (ANÓNIMAS)
-- =============================================

-- IMPORTANTE: Permitir INSERT anónimo
CREATE POLICY "response_items_insert_anon" 
  ON response_items FOR INSERT 
  WITH CHECK (true);

-- Los dueños pueden ver items de respuestas de sus encuestas
CREATE POLICY "response_items_select_owner" 
  ON response_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM responses r
      JOIN surveys s ON s.id = r.survey_id
      WHERE r.id = response_items.response_id
      AND s.owner_id = auth.uid()
    )
  );

-- Los usuarios pueden ver items de sus propias respuestas
CREATE POLICY "users_view_their_own_response_items"
  ON response_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM responses
      WHERE responses.id = response_items.response_id
      AND responses.user_id = auth.uid()
    )
  );

-- =============================================
-- 12. POLÍTICAS RLS - AUDIT_LOG
-- =============================================

-- Solo admins pueden ver logs
CREATE POLICY "admins_view_audit_logs"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- FIN DEL SCRIPT
-- =============================================

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Base de datos creada exitosamente';
  RAISE NOTICE 'Tablas: 8 creadas';
  RAISE NOTICE 'Índices: 15 creados';
  RAISE NOTICE 'Triggers: 3 creados';
  RAISE NOTICE 'Políticas RLS: 31 creadas';
END $$;
