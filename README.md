# Sistema de Encuestas QR

Sistema web profesional para la creación, gestión y recopilación de encuestas mediante códigos QR. Desarrollado con React, TypeScript, Vite y Supabase.

## 🚀 Características Principales

- ✅ **Autenticación y Roles**: Sistema de usuarios con roles (Admin, Creator, Viewer)
- 📝 **Gestión de Encuestas**: Crear, editar, publicar y cerrar encuestas
- 🔒 **Control de Acceso**: Permisos basados en roles (RLS - Row Level Security)
- 📊 **Panel Administrativo**: CRUD de usuarios, roles y auditoría
- 📱 **Códigos QR**: Generación y descarga de QR personalizados para cada encuesta
- 🎨 **Interfaz Profesional**: Diseño moderno con paleta teal/emerald
- 🌐 **Acceso Público**: Formularios accesibles vía QR o URL pública
- 📈 **Dashboard**: KPIs y estadísticas en tiempo real

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 18 + TypeScript + Vite
- **Estilos**: Tailwind CSS 3
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Routing**: React Router v6
- **Iconos**: Lucide React
- **QR**: qrcode.react
- **Fechas**: date-fns

## 📋 Requisitos Previos

- Node.js v18+ y npm
- Cuenta de Supabase (gratuita)
- Git

## 🔧 Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone https://github.com/wilalexport/Encuesta-QRparcial4.git
cd Encuesta-QRparcial4
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

**Obtener credenciales de Supabase:**
1. Ve a https://supabase.com y crea un proyecto
2. En Settings → API encontrarás:
   - Project URL (VITE_SUPABASE_URL)
   - anon/public key (VITE_SUPABASE_ANON_KEY)

### 4. Configurar Base de Datos en Supabase

Ve al **SQL Editor** en Supabase y ejecuta el siguiente script:

```sql
-- 1. Tabla de perfiles (extiende auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de roles de usuario
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'creator', 'viewer')),
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- 3. Tabla de encuestas
CREATE TABLE surveys (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  public_slug TEXT UNIQUE NOT NULL,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de preguntas
CREATE TABLE survey_questions (
  id SERIAL PRIMARY KEY,
  survey_id INT REFERENCES surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'single', 'multiple', 'likert')),
  required BOOLEAN DEFAULT false,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de opciones de respuesta
CREATE TABLE survey_options (
  id SERIAL PRIMARY KEY,
  question_id INT REFERENCES survey_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla de respuestas
CREATE TABLE responses (
  id SERIAL PRIMARY KEY,
  survey_id INT REFERENCES surveys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabla de ítems de respuesta
CREATE TABLE response_items (
  id SERIAL PRIMARY KEY,
  response_id INT REFERENCES responses(id) ON DELETE CASCADE,
  question_id INT REFERENCES survey_questions(id) ON DELETE CASCADE,
  value_text TEXT,
  value_numeric INT,
  value_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabla de auditoría
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Trigger para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  
  -- Asignar rol 'viewer' por defecto
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 11. Políticas RLS para profiles
CREATE POLICY "Usuarios pueden ver todos los perfiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 12. Políticas RLS para user_roles
CREATE POLICY "Usuarios pueden ver sus propios roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Solo admins pueden insertar roles" ON user_roles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Solo admins pueden actualizar roles" ON user_roles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Solo admins pueden eliminar roles" ON user_roles FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 13. Políticas RLS para surveys
CREATE POLICY "Todos pueden ver encuestas publicadas" ON surveys FOR SELECT USING (
  status = 'published' OR owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Creators y admins pueden crear encuestas" ON surveys FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'creator'))
);
CREATE POLICY "Owners y admins pueden actualizar encuestas" ON surveys FOR UPDATE USING (
  owner_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Owners y admins pueden eliminar encuestas" ON surveys FOR DELETE USING (
  owner_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 14. Políticas RLS para survey_questions
CREATE POLICY "Todos pueden ver preguntas de encuestas publicadas" ON survey_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM surveys WHERE id = survey_id AND (status = 'published' OR owner_id = auth.uid()))
);
CREATE POLICY "Owners pueden gestionar preguntas" ON survey_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM surveys WHERE id = survey_id AND owner_id = auth.uid())
);

-- 15. Políticas RLS para survey_options
CREATE POLICY "Todos pueden ver opciones de encuestas publicadas" ON survey_options FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM survey_questions sq
    JOIN surveys s ON sq.survey_id = s.id
    WHERE sq.id = question_id AND (s.status = 'published' OR s.owner_id = auth.uid())
  )
);
CREATE POLICY "Owners pueden gestionar opciones" ON survey_options FOR ALL USING (
  EXISTS (
    SELECT 1 FROM survey_questions sq
    JOIN surveys s ON sq.survey_id = s.id
    WHERE sq.id = question_id AND s.owner_id = auth.uid()
  )
);

-- 16. Políticas RLS para responses
CREATE POLICY "Todos pueden insertar respuestas" ON responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners y admins pueden ver respuestas" ON responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM surveys WHERE id = survey_id AND owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 17. Políticas RLS para response_items
CREATE POLICY "Todos pueden insertar items de respuesta" ON response_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners y admins pueden ver items" ON response_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM responses r
    JOIN surveys s ON r.survey_id = s.id
    WHERE r.id = response_id AND (s.owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  )
);

-- 18. Políticas RLS para audit_log
CREATE POLICY "Solo admins pueden ver logs" ON audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 19. Índices para mejor rendimiento
CREATE INDEX idx_surveys_owner ON surveys(owner_id);
CREATE INDEX idx_surveys_status ON surveys(status);
CREATE INDEX idx_surveys_slug ON surveys(public_slug);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_responses_survey ON responses(survey_id);
CREATE INDEX idx_questions_survey ON survey_questions(survey_id);
```

### 5. Crear Usuario Administrador

1. Regístrate en la aplicación (primer usuario)
2. Ve al **SQL Editor** en Supabase y ejecuta:

```sql
-- Asignar rol de admin al primer usuario
INSERT INTO user_roles (user_id, role)
VALUES ('TU_USER_ID', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

**Para obtener tu USER_ID:**
```sql
SELECT id, email FROM auth.users;
```

## 🖥️ Ejecución en Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: http://localhost:5173

## 🏗️ Build para Producción

```bash
npm run build
```

Los archivos optimizados se generarán en la carpeta `dist/`

## 📱 Despliegue

### Opción 1: Vercel (Recomendado)

1. Conecta tu repositorio de GitHub a Vercel
2. Configura las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Vercel detectará automáticamente Vite y desplegará

### Opción 2: Netlify

1. Conecta tu repositorio
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Agrega las variables de entorno

## 👥 Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **Admin** | Gestión completa del sistema, usuarios, roles y auditoría |
| **Creator** | Crear, editar y gestionar sus propias encuestas |
| **Viewer** | Solo responder encuestas publicadas |

## 📁 Estructura del Proyecto

```
encuestas-qr/
├── src/
│   ├── components/        # Componentes reutilizables
│   ├── contexts/          # Context API (Auth, Notifications)
│   ├── layouts/           # Layouts (MainLayout, AdminLayout)
│   ├── lib/              # Configuración de Supabase
│   ├── pages/            # Páginas de la aplicación
│   │   ├── admin/        # Panel administrativo
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── MySurveys.tsx
│   │   ├── SurveyDetail.tsx
│   │   ├── PublicSurvey.tsx
│   │   └── AvailableSurveys.tsx
│   ├── types/            # Tipos TypeScript
│   ├── App.tsx
│   └── main.tsx
├── .env.example          # Plantilla de variables de entorno
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 🔐 Seguridad

- ✅ Row Level Security (RLS) habilitado en todas las tablas
- ✅ Autenticación JWT mediante Supabase Auth
- ✅ Validación de permisos en cada operación
- ✅ Protección de rutas según roles
- ✅ Sanitización de inputs
- ✅ HTTPS en producción

## 🐛 Solución de Problemas

### Error: "Invalid API key"
- Verifica que las variables de entorno estén correctamente configuradas
- Asegúrate de que el proyecto de Supabase esté activo

### Error: "Permission denied"
- Verifica que las políticas RLS estén correctamente aplicadas
- Confirma que el usuario tenga el rol adecuado

### No aparecen las encuestas
- Verifica que haya encuestas con status 'published'
- Confirma que el usuario tenga permisos para verlas

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👨‍💻 Autor

Wilson Portillo - [GitHub](https://github.com/wilalexport)

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

⭐ Si este proyecto te fue útil, considera darle una estrella en GitHub
