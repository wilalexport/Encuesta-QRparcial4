# Guía de Configuración de Supabase

Esta guía te ayudará a configurar completamente la base de datos en Supabase para el proyecto Encuestas QR.

## 📋 Paso 1: Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Guarda las credenciales:
   - Project URL
   - Anon/Public Key

## 🗄️ Paso 2: Crear las Tablas

Ejecuta estos scripts SQL en el **SQL Editor** de Supabase en el siguiente orden:

### 1. Tabla: profiles

\`\`\`sql
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

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
\`\`\`

### 2. Tabla: user_roles

\`\`\`sql
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'creator')) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id)
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
\`\`\`

### 3. Tabla: surveys

\`\`\`sql
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

CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON surveys
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_surveys_owner_id ON surveys(owner_id);
CREATE INDEX idx_surveys_public_slug ON surveys(public_slug);
CREATE INDEX idx_surveys_status ON surveys(status);
\`\`\`

### 4. Tabla: survey_questions

\`\`\`sql
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

-- Índice
CREATE INDEX idx_survey_questions_survey_id ON survey_questions(survey_id);
\`\`\`

### 5. Tabla: survey_options

\`\`\`sql
CREATE TABLE survey_options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER REFERENCES survey_questions(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice
CREATE INDEX idx_survey_options_question_id ON survey_options(question_id);
\`\`\`

### 6. Tabla: responses

\`\`\`sql
CREATE TABLE responses (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Índices
CREATE INDEX idx_responses_survey_id ON responses(survey_id);
CREATE INDEX idx_responses_user_id ON responses(user_id);
CREATE INDEX idx_responses_submitted_at ON responses(submitted_at);
\`\`\`

### 7. Tabla: response_items

\`\`\`sql
CREATE TABLE response_items (
  id SERIAL PRIMARY KEY,
  response_id INTEGER REFERENCES responses(id) ON DELETE CASCADE NOT NULL,
  question_id INTEGER REFERENCES survey_questions(id) ON DELETE CASCADE NOT NULL,
  value_text TEXT,
  value_numeric NUMERIC,
  value_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_response_items_response_id ON response_items(response_id);
CREATE INDEX idx_response_items_question_id ON response_items(question_id);
\`\`\`

### 8. Tabla: audit_log

\`\`\`sql
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

-- Índices
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
\`\`\`

## 🔐 Paso 3: Configurar Row Level Security (RLS)

### Habilitar RLS en todas las tablas

\`\`\`sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
\`\`\`

### Políticas para profiles

\`\`\`sql
-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Los admins pueden ver todos los perfiles
CREATE POLICY "Los admins pueden ver todos los perfiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Los admins pueden actualizar cualquier perfil
CREATE POLICY "Los admins pueden actualizar cualquier perfil"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
\`\`\`

### Políticas para user_roles

\`\`\`sql
-- Los usuarios pueden ver sus propios roles
CREATE POLICY "Los usuarios pueden ver sus propios roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Los admins pueden ver todos los roles
CREATE POLICY "Los admins pueden ver todos los roles"
  ON user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Los admins pueden insertar roles
CREATE POLICY "Los admins pueden insertar roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Los admins pueden eliminar roles
CREATE POLICY "Los admins pueden eliminar roles"
  ON user_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );
\`\`\`

### Políticas para surveys

\`\`\`sql
-- Los usuarios pueden ver sus propias encuestas
CREATE POLICY "Los usuarios pueden ver sus propias encuestas"
  ON surveys FOR SELECT
  USING (auth.uid() = owner_id);

-- Los usuarios pueden insertar sus propias encuestas
CREATE POLICY "Los usuarios pueden insertar encuestas"
  ON surveys FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Los usuarios pueden actualizar sus propias encuestas
CREATE POLICY "Los usuarios pueden actualizar sus propias encuestas"
  ON surveys FOR UPDATE
  USING (auth.uid() = owner_id);

-- Los usuarios pueden eliminar sus propias encuestas
CREATE POLICY "Los usuarios pueden eliminar sus propias encuestas"
  ON surveys FOR DELETE
  USING (auth.uid() = owner_id);

-- Cualquiera puede ver encuestas publicadas (para vista pública)
CREATE POLICY "Cualquiera puede ver encuestas publicadas"
  ON surveys FOR SELECT
  USING (status = 'published');
\`\`\`

### Políticas para survey_questions

\`\`\`sql
-- Los dueños de la encuesta pueden gestionar las preguntas
CREATE POLICY "Los dueños pueden gestionar preguntas"
  ON survey_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.owner_id = auth.uid()
    )
  );

-- Cualquiera puede ver preguntas de encuestas publicadas
CREATE POLICY "Cualquiera puede ver preguntas de encuestas publicadas"
  ON survey_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.status = 'published'
    )
  );
\`\`\`

### Políticas para survey_options

\`\`\`sql
-- Los dueños pueden gestionar opciones
CREATE POLICY "Los dueños pueden gestionar opciones"
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
CREATE POLICY "Cualquiera puede ver opciones de encuestas publicadas"
  ON survey_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM survey_questions sq
      JOIN surveys s ON s.id = sq.survey_id
      WHERE sq.id = survey_options.question_id
      AND s.status = 'published'
    )
  );
\`\`\`

### Políticas para responses (PÚBLICO - Anónimo)

\`\`\`sql
-- IMPORTANTE: Permitir INSERT público para respuestas anónimas
CREATE POLICY "Cualquiera puede enviar respuestas"
  ON responses FOR INSERT
  WITH CHECK (true);

-- Los dueños de la encuesta pueden ver las respuestas
CREATE POLICY "Los dueños pueden ver respuestas de sus encuestas"
  ON responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = responses.survey_id
      AND surveys.owner_id = auth.uid()
    )
  );

-- Los usuarios pueden ver sus propias respuestas
CREATE POLICY "Los usuarios pueden ver sus propias respuestas"
  ON responses FOR SELECT
  USING (auth.uid() = user_id);
\`\`\`

### Políticas para response_items (PÚBLICO - Anónimo)

\`\`\`sql
-- IMPORTANTE: Permitir INSERT público
CREATE POLICY "Cualquiera puede crear items de respuesta"
  ON response_items FOR INSERT
  WITH CHECK (true);

-- Los dueños pueden ver items de respuestas de sus encuestas
CREATE POLICY "Los dueños pueden ver items de respuesta"
  ON response_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM responses r
      JOIN surveys s ON s.id = r.survey_id
      WHERE r.id = response_items.response_id
      AND s.owner_id = auth.uid()
    )
  );
\`\`\`

### Políticas para audit_log

\`\`\`sql
-- Solo admins pueden ver logs
CREATE POLICY "Solo admins pueden ver logs"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
\`\`\`

## 📦 Paso 4: Configurar Storage

### Crear Bucket para Imágenes

1. Ve a **Storage** en el panel de Supabase
2. Crea un nuevo bucket llamado: `survey-media`
3. Configúralo como **público**
4. Establece las políticas de acceso:

\`\`\`sql
-- Permitir lectura pública
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'survey-media');

-- Permitir que usuarios autenticados suban archivos
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'survey-media'
    AND auth.role() = 'authenticated'
  );

-- Permitir que los dueños eliminen sus archivos
CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'survey-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
\`\`\`

## 🧪 Paso 5: Datos de Prueba

### Crear un usuario admin de prueba

Después de registrar tu primer usuario en la aplicación, ejecuta:

\`\`\`sql
-- Reemplaza 'user-uuid-aqui' con el UUID de tu usuario
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid-aqui', 'admin');

INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid-aqui', 'creator');
\`\`\`

### Crear una encuesta de prueba

\`\`\`sql
-- Reemplaza 'user-uuid-aqui' con el UUID de tu usuario
INSERT INTO surveys (owner_id, title, description, status, public_slug, slug)
VALUES (
  'user-uuid-aqui',
  'Encuesta de Satisfacción',
  'Ayúdanos a mejorar nuestros servicios',
  'published',
  'satisfaccion-2024',
  'satisfaccion-2024'
);
\`\`\`

## ✅ Verificación

Para verificar que todo está configurado correctamente:

1. **Tablas**: Ve a **Table Editor** y verifica que las 8 tablas existan
2. **RLS**: Ve a **Authentication > Policies** y verifica las políticas
3. **Storage**: Ve a **Storage** y verifica que el bucket `survey-media` exista
4. **Funciones**: Ve a **Database > Functions** y verifica los triggers

## 🔑 Paso 6: Obtener las Credenciales

1. Ve a **Settings > API**
2. Copia:
   - Project URL → `VITE_SUPABASE_URL`
   - Anon/Public key → `VITE_SUPABASE_ANON_KEY`
3. Pégalas en tu archivo `.env`

## 🚨 Solución de Problemas

### Error: "relation does not exist"
- Verifica que hayas ejecutado todos los scripts SQL en orden
- Asegúrate de estar en el esquema `public`

### Error: "permission denied"
- Verifica que las políticas RLS estén configuradas correctamente
- Para pruebas, puedes deshabilitar RLS temporalmente (NO recomendado en producción)

### Error al subir imágenes
- Verifica que el bucket exista y sea público
- Verifica las políticas de storage

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Guía de Storage](https://supabase.com/docs/guides/storage)

---

¡Configuración completada! Ahora puedes usar tu aplicación con Supabase.
