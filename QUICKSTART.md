# 🚀 Inicio Rápido - Encuestas QR

Esta guía te ayudará a poner en marcha el proyecto en menos de 10 minutos.

## ✅ Pre-requisitos

- Node.js 18+ instalado
- Cuenta en [Supabase](https://supabase.com) (gratis)
- Cuenta en [Vercel](https://vercel.com) (gratis) - solo para deploy

## 📦 Paso 1: Instalación (2 minutos)

\`\`\`bash
# Clonar o navegar al proyecto
cd encuestas-qr

# Instalar dependencias
npm install
\`\`\`

## 🗄️ Paso 2: Configurar Supabase (5 minutos)

### 2.1 Crear Proyecto

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Clic en "New Project"
3. Nombre: `encuestas-qr`
4. Contraseña de BD: (guárdala)
5. Región: (la más cercana)
6. Espera 2 minutos mientras se crea

### 2.2 Ejecutar SQL

1. Ve a **SQL Editor** en el sidebar
2. Copia y pega el siguiente SQL:

\`\`\`sql
-- IMPORTANTE: Ejecuta TODOS estos comandos en orden

-- 1. Tabla profiles
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

-- 2. Trigger para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Tabla user_roles
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'creator')) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id)
);

-- 4. Tabla surveys
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

-- 5. Tabla survey_questions
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

-- 6. Tabla survey_options
CREATE TABLE survey_options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER REFERENCES survey_questions(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabla responses (PERMITE INSERTS PÚBLICOS)
CREATE TABLE responses (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- 8. Tabla response_items
CREATE TABLE response_items (
  id SERIAL PRIMARY KEY,
  response_id INTEGER REFERENCES responses(id) ON DELETE CASCADE NOT NULL,
  question_id INTEGER REFERENCES survey_questions(id) ON DELETE CASCADE NOT NULL,
  value_text TEXT,
  value_numeric NUMERIC,
  value_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Tabla audit_log
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

-- 10. Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 11. Políticas básicas (para empezar)
-- Políticas para responses (CRÍTICO PARA QR)
CREATE POLICY "Cualquiera puede enviar respuestas"
  ON responses FOR INSERT WITH CHECK (true);

CREATE POLICY "Cualquiera puede crear items de respuesta"
  ON response_items FOR INSERT WITH CHECK (true);

-- Políticas para profiles
CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para user_roles
CREATE POLICY "Los usuarios pueden ver sus propios roles"
  ON user_roles FOR SELECT USING (auth.uid() = user_id);

-- Políticas para surveys
CREATE POLICY "Los usuarios pueden ver sus propias encuestas"
  ON surveys FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Los usuarios pueden insertar encuestas"
  ON surveys FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Cualquiera puede ver encuestas publicadas"
  ON surveys FOR SELECT USING (status = 'published');
\`\`\`

3. Haz clic en **Run** (o presiona Ctrl+Enter)

### 2.3 Obtener Credenciales

1. Ve a **Settings > API** en Supabase
2. Copia:
   - **Project URL**
   - **anon public key**

## 🔧 Paso 3: Configurar Variables de Entorno (1 minuto)

1. Crea un archivo `.env` en la raíz del proyecto:

\`\`\`bash
# Windows PowerShell
New-Item .env -ItemType File

# Mac/Linux
touch .env
\`\`\`

2. Pega esto en el archivo `.env` (reemplaza con tus valores):

\`\`\`env
VITE_SUPABASE_URL=https://tu-proyecto-id.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
\`\`\`

## ▶️ Paso 4: Iniciar la Aplicación (30 segundos)

\`\`\`bash
npm run dev
\`\`\`

Abre tu navegador en: **http://localhost:5173**

## 👤 Paso 5: Crear tu Usuario Admin (1 minuto)

### 5.1 Registrarse en la App

1. Ve a `http://localhost:5173/register`
2. Completa el formulario:
   - Nombre: Tu nombre
   - Email: tu@email.com
   - Contraseña: (mínimo 6 caracteres)
3. Haz clic en "Crear Cuenta"

### 5.2 Asignar Rol de Admin

1. Ve al **SQL Editor** de Supabase
2. Ve a **Table Editor > Profiles**
3. Copia el ID de tu usuario (columna `id`)
4. Ejecuta este SQL (reemplaza `TU-USER-ID` con tu ID copiado):

\`\`\`sql
-- Hacer tu usuario Admin y Creator
INSERT INTO user_roles (user_id, role)
VALUES 
  ('TU-USER-ID-AQUI', 'admin'),
  ('TU-USER-ID-AQUI', 'creator');
\`\`\`

### 5.3 Refrescar la App

1. Cierra sesión en la app
2. Vuelve a iniciar sesión
3. ¡Ahora deberías ver el botón "Admin" en el header!

## 🎉 ¡Listo!

Ahora puedes:

✅ **Ver el Dashboard**: Ve a `/dashboard`  
✅ **Acceder al Panel Admin**: Haz clic en "Admin" en el header  
✅ **Gestionar Usuarios**: Ve a "Usuarios" en el panel admin  
✅ **Gestionar Roles**: Ve a "Roles y Permisos"  
✅ **Ver Logs**: Ve a "Logs del Sistema"  

## 🔍 Verificación Rápida

### ¿Todo funcionó?

Verifica estas pantallas:

1. **Login** → ✅ Puedes iniciar sesión
2. **Dashboard** → ✅ Ves KPIs (aunque estén en 0)
3. **Admin** → ✅ Ves el panel de administración
4. **Usuarios** → ✅ Ves tu perfil en la tabla

## 🚨 Problemas Comunes

### "Cannot find module '@supabase/supabase-js'"

**Solución**:
\`\`\`bash
npm install
\`\`\`

### "Failed to fetch" en el navegador

**Causa**: Variables de entorno incorrectas

**Solución**:
1. Verifica que `.env` existe
2. Verifica que las URLs sean correctas
3. Reinicia el servidor (`Ctrl+C` y `npm run dev`)

### No veo el botón "Admin"

**Causa**: Rol no asignado correctamente

**Solución**:
1. Ve a Supabase > Table Editor > user_roles
2. Verifica que tu user_id tenga el rol 'admin'
3. Cierra sesión y vuelve a iniciar

### "Row Level Security" error

**Causa**: Políticas RLS no creadas

**Solución**:
1. Ve a SUPABASE_SETUP.md
2. Ejecuta TODAS las políticas RLS

## 📚 Siguientes Pasos

1. Lee [README.md](./README.md) para entender la arquitectura
2. Lee [ARCHITECTURE.md](./ARCHITECTURE.md) para detalles técnicos
3. Lee [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) para configuración avanzada
4. Lee [DEPLOYMENT.md](./DEPLOYMENT.md) cuando quieras publicar

## 💡 Tips

- **Ctrl+C** para detener el servidor
- `npm run build` para compilar para producción
- `npm run preview` para ver la versión de producción localmente

---

**¿Tienes problemas?** Revisa los logs en la consola del navegador (F12) y en la terminal.

¡Feliz coding! 🚀
