# Encuestas QR - Sistema de Gestión de Formularios

Sistema completo de gestión de encuestas y formularios dinámicos con generación de códigos QR, construido con React, TypeScript, Supabase y Vercel.

## 🚀 Características Principales

### Para Usuarios (Creators)
- **Dashboard Completo**: KPIs, estadísticas y actividad reciente
- **Constructor de Formularios**: Crear encuestas con preguntas dinámicas
- **Tipos de Preguntas**: Text, Single Choice, Multiple Choice, Likert Scale
- **Generación de QR**: Cada encuesta genera un QR único para respuestas
- **Análisis de Resultados**: Visualización de respuestas en tiempo real

### Para Administradores
- **Panel de Administración**: Módulo exclusivo para gestión del sistema
- **Gestión de Usuarios**: CRUD completo de perfiles
- **Gestión de Roles**: Asignar/revocar roles de admin y creator
- **Logs de Auditoría**: Registro completo de acciones del sistema

### Sistema de Respuestas
- **Acceso Público**: Responder encuestas vía QR sin autenticación
- **Modo Híbrido**: Soporte para usuarios autenticados y anónimos
- **Seguimiento**: IP y User Agent para análisis

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Routing**: React Router v6
- **Backend/BaaS**: Supabase (PostgreSQL, Auth, RLS, Storage)
- **Estilos**: Tailwind CSS
- **Iconos**: Lucide React
- **QR**: qrcode.react
- **Hosting**: Vercel
- **Fechas**: date-fns

## 📦 Instalación

### 1. Clonar el repositorio
\`\`\`bash
git clone <url-del-repositorio>
cd encuestas-qr
\`\`\`

### 2. Instalar dependencias
\`\`\`bash
npm install
\`\`\`

### 3. Configurar Supabase

Necesitas crear un proyecto en [Supabase](https://supabase.com) y configurar las siguientes tablas:

#### Tablas de Base de Datos

**profiles**
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
\`\`\`

**user_roles**
\`\`\`sql
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'creator')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id)
);
\`\`\`

**surveys**
\`\`\`sql
CREATE TABLE surveys (
  id SERIAL PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('draft', 'published', 'closed')) DEFAULT 'draft',
  public_slug TEXT UNIQUE NOT NULL,
  slug TEXT NOT NULL,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
\`\`\`

**survey_questions**
\`\`\`sql
CREATE TABLE survey_questions (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('single', 'multiple', 'likert', 'text')),
  question_text TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  order_index INTEGER,
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
\`\`\`

**survey_options**
\`\`\`sql
CREATE TABLE survey_options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER REFERENCES survey_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
\`\`\`

**responses**
\`\`\`sql
CREATE TABLE responses (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- RLS: Permitir INSERT público para respuestas anónimas
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cualquiera puede enviar respuestas" ON responses FOR INSERT WITH CHECK (true);
\`\`\`

**response_items**
\`\`\`sql
CREATE TABLE response_items (
  id SERIAL PRIMARY KEY,
  response_id INTEGER REFERENCES responses(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES survey_questions(id) ON DELETE CASCADE,
  value_text TEXT,
  value_numeric NUMERIC,
  value_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Permitir INSERT público
ALTER TABLE response_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cualquiera puede crear items de respuesta" ON response_items FOR INSERT WITH CHECK (true);
\`\`\`

**audit_log**
\`\`\`sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT CHECK (action IN ('create', 'publish', 'update', 'delete')),
  table_name TEXT,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
\`\`\`

#### Storage Bucket

Crear un bucket público llamado `survey-media` para imágenes de portada.

### 4. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

\`\`\`env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
\`\`\`

### 5. Instalar Tailwind CSS

\`\`\`bash
npm install -D tailwindcss postcss autoprefixer
\`\`\`

## 🏃‍♂️ Desarrollo

\`\`\`bash
npm run dev
\`\`\`

El proyecto estará disponible en `http://localhost:5173`

## 📝 Build

\`\`\`bash
npm run build
\`\`\`

Los archivos optimizados se generarán en la carpeta `dist/`

## 🚀 Deploy en Vercel

### Opción 1: Desde el CLI
\`\`\`bash
npm install -g vercel
vercel
\`\`\`

### Opción 2: Desde GitHub
1. Push tu código a GitHub
2. Importa el repositorio en Vercel
3. Configura las variables de entorno en Vercel
4. Deploy automático

## 🔐 Roles y Permisos

### Creator (Creador)
- Acceso al dashboard
- Crear, editar y publicar encuestas
- Ver respuestas de sus propias encuestas

### Admin (Administrador)
- Todo lo del Creator
- Acceso al Panel de Administración
- Gestión de usuarios y perfiles
- Asignar/revocar roles
- Ver logs de auditoría del sistema

## 📱 Rutas del Sistema

### Públicas
- `/login` - Inicio de sesión
- `/register` - Registro de nuevos usuarios
- `/s/:slug` - Vista pública para responder encuestas (QR)

### Protegidas (Autenticadas)
- `/dashboard` - Dashboard principal
- `/surveys` - Lista de encuestas
- `/surveys/create` - Crear nueva encuesta
- `/surveys/:id` - Detalle de encuesta
- `/profile` - Perfil del usuario

### Admin (Solo Administradores)
- `/admin/users` - Gestión de usuarios
- `/admin/roles` - Gestión de roles
- `/admin/audit` - Logs de auditoría

## 🗂️ Estructura del Proyecto

\`\`\`
encuestas-qr/
├── src/
│   ├── components/        # Componentes reutilizables
│   │   └── ProtectedRoute.tsx
│   ├── contexts/          # Contextos de React
│   │   └── AuthContext.tsx
│   ├── layouts/           # Layouts de la aplicación
│   │   ├── MainLayout.tsx
│   │   └── AdminLayout.tsx
│   ├── lib/               # Utilidades y configuraciones
│   │   └── supabaseClient.ts
│   ├── pages/             # Páginas principales
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   └── admin/
│   │       ├── Users.tsx
│   │       ├── Roles.tsx
│   │       └── Audit.tsx
│   ├── types/             # Definiciones de TypeScript
│   │   └── database.types.ts
│   ├── App.tsx            # Componente raíz con rutas
│   ├── main.tsx           # Punto de entrada
│   └── index.css          # Estilos globales
├── .env                   # Variables de entorno
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
\`\`\`

## 🔄 Próximas Funcionalidades (Por Implementar)

- [ ] Constructor de formularios con drag-and-drop
- [ ] Vista pública de encuestas con QR funcional
- [ ] Gráficos y visualización de resultados
- [ ] Exportación de respuestas a CSV/Excel
- [ ] Notificaciones en tiempo real
- [ ] Temas personalizables
- [ ] Campos condicionales en formularios
- [ ] Integración con webhooks

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👨‍💻 Autor

Desarrollado con ❤️ para el curso de Hardware y Software - Lab 4

---

**Nota**: Este es un proyecto académico en desarrollo. Algunas funcionalidades están marcadas como "Por implementar" y serán desarrolladas en futuras iteraciones.
