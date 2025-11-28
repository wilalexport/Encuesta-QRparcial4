# Arquitectura del Proyecto - Encuestas QR

## 📐 Visión General

Este documento describe la arquitectura técnica, patrones de diseño y decisiones de desarrollo del sistema de gestión de encuestas.

## 🏗️ Arquitectura General

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Usuario    │  │    Creator   │  │    Admin     │ │
│  │   Anónimo    │  │  Autenticado │  │ Autenticado  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                  │                  │         │
│         └──────────────────┴──────────────────┘         │
│                            │                            │
│                    ┌───────▼────────┐                   │
│                    │  React Router  │                   │
│                    └───────┬────────┘                   │
│                            │                            │
│         ┌──────────────────┼──────────────────┐         │
│         │                  │                  │         │
│    ┌────▼─────┐    ┌──────▼──────┐    ┌──────▼────┐   │
│    │  Public  │    │    Main     │    │   Admin   │   │
│    │  Layout  │    │   Layout    │    │  Layout   │   │
│    └──────────┘    └─────────────┘    └───────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                            │ Supabase Client
                            │
┌─────────────────────────────────────────────────────────┐
│                   Backend (Supabase)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  PostgreSQL  │  │     Auth     │  │   Storage    │ │
│  │   Database   │  │    (JWT)     │  │    (S3)      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                  │                  │         │
│         └──────────────────┴──────────────────┘         │
│                            │                            │
│                    ┌───────▼────────┐                   │
│                    │  Row Level     │                   │
│                    │  Security      │                   │
│                    └────────────────┘                   │
└─────────────────────────────────────────────────────────┘
\`\`\`

## 🎯 Principios de Diseño

### 1. Separation of Concerns (Separación de Responsabilidades)

- **Presentación**: Componentes React puros enfocados en UI
- **Lógica de Negocio**: Hooks personalizados y contextos
- **Acceso a Datos**: Cliente Supabase centralizado
- **Enrutamiento**: React Router con rutas protegidas
- **Estilos**: Tailwind CSS para consistencia

### 2. Don't Repeat Yourself (DRY)

- Tipos TypeScript compartidos en `database.types.ts`
- Componentes reutilizables (`ProtectedRoute`)
- Layouts compartidos (`MainLayout`, `AdminLayout`)
- Hooks de autenticación centralizados (`AuthContext`)

### 3. Single Responsibility Principle

Cada módulo tiene una única responsabilidad:
- **AuthContext**: Solo manejo de autenticación
- **ProtectedRoute**: Solo protección de rutas
- **supabaseClient**: Solo configuración de Supabase

## 📂 Estructura de Carpetas

\`\`\`
src/
├── components/          # Componentes reutilizables
│   ├── ProtectedRoute.tsx
│   ├── QuestionCard.tsx (futuro)
│   └── ResultsChart.tsx (futuro)
│
├── contexts/            # Contextos de React (Estado Global)
│   └── AuthContext.tsx  # Gestión de autenticación y usuario
│
├── layouts/             # Layouts base de la aplicación
│   ├── MainLayout.tsx   # Layout para usuarios normales
│   └── AdminLayout.tsx  # Layout para administradores
│
├── lib/                 # Utilidades y configuraciones
│   └── supabaseClient.ts # Cliente de Supabase configurado
│
├── pages/               # Páginas de la aplicación
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── surveys/         # Módulo de encuestas (futuro)
│   │   ├── List.tsx
│   │   ├── Create.tsx
│   │   └── Detail.tsx
│   └── admin/           # Módulo de administración
│       ├── Users.tsx
│       ├── Roles.tsx
│       └── Audit.tsx
│
├── types/               # Definiciones TypeScript
│   └── database.types.ts # Tipos de la base de datos
│
├── App.tsx              # Componente raíz con rutas
├── main.tsx             # Punto de entrada
└── index.css            # Estilos globales
\`\`\`

## 🔐 Flujo de Autenticación

\`\`\`
┌──────────────┐
│    Usuario   │
└──────┬───────┘
       │
       │ 1. Login/Register
       ▼
┌──────────────────────┐
│  Supabase Auth       │
│  (Email + Password)  │
└──────┬───────────────┘
       │
       │ 2. JWT Token
       ▼
┌──────────────────────┐
│   AuthContext        │
│   - Guarda sesión    │
│   - Carga profile    │
│   - Carga roles      │
└──────┬───────────────┘
       │
       │ 3. AuthUser Object
       ▼
┌──────────────────────┐
│  ProtectedRoute      │
│  - Verifica sesión   │
│  - Verifica rol      │
└──────┬───────────────┘
       │
       │ 4. Render
       ▼
┌──────────────────────┐
│   Component          │
│   (Dashboard, etc)   │
└──────────────────────┘
\`\`\`

### Objeto AuthUser

\`\`\`typescript
interface AuthUser {
  id: string;              // UUID del usuario
  email: string;           // Email
  profile: Profile;        // Datos del perfil
  roles: UserRole[];       // ['admin', 'creator']
  isAdmin: boolean;        // Helpers booleanos
  isCreator: boolean;
}
\`\`\`

## 🗄️ Modelo de Datos

### Diagrama Entidad-Relación

\`\`\`
┌─────────────────┐
│   auth.users    │
│   (Supabase)    │
└────────┬────────┘
         │
         │ 1:1
         ▼
┌─────────────────┐         ┌─────────────────┐
│    profiles     │         │   user_roles    │
│  - display_name │◄───────►│  - user_id      │
│  - phone        │   1:N   │  - role         │
│  - genero       │         └─────────────────┘
└────────┬────────┘
         │
         │ 1:N (owner)
         ▼
┌─────────────────┐
│    surveys      │
│  - title        │
│  - status       │
│  - public_slug  │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────────┐         ┌─────────────────┐
│ survey_questions    │   1:N   │ survey_options  │
│  - type             │◄───────►│  - label        │
│  - question_text    │         │  - value        │
│  - required         │         └─────────────────┘
└────────┬────────────┘
         │
         │ 1:N (responses)
         ▼
┌─────────────────┐
│   responses     │
│  - user_id?     │ (nullable para anónimos)
│  - submitted_at │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│ response_items  │
│  - value_text   │
│  - value_json   │
└─────────────────┘
\`\`\`

## 🛣️ Sistema de Rutas

### Rutas Públicas (No autenticadas)
- `/login` → Login.tsx
- `/register` → Register.tsx
- `/s/:slug` → Public Survey View (futuro)

### Rutas Protegidas (Autenticadas)
- `/` → Redirect a `/dashboard`
- `/dashboard` → Dashboard.tsx (KPIs y actividad)
- `/surveys` → Lista de encuestas
- `/surveys/create` → Crear nueva encuesta
- `/surveys/:id` → Detalle de encuesta
- `/profile` → Perfil del usuario

### Rutas Admin (Solo administradores)
- `/admin` → Redirect a `/admin/users`
- `/admin/users` → Gestión de usuarios
- `/admin/roles` → Gestión de roles
- `/admin/audit` → Logs de auditoría

### Protección de Rutas

\`\`\`typescript
// Ruta normal protegida
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// Ruta solo para admins
<ProtectedRoute requireAdmin>
  <AdminUsers />
</ProtectedRoute>
\`\`\`

## 🔒 Row Level Security (RLS)

Supabase implementa seguridad a nivel de fila directamente en PostgreSQL.

### Políticas Principales

**Profiles**:
- Los usuarios pueden ver/editar su propio perfil
- Los admins pueden ver/editar cualquier perfil

**Surveys**:
- Los usuarios pueden CRUD sus propias encuestas
- Cualquiera puede ver encuestas publicadas (para QR)

**Responses** (CRÍTICO):
- **INSERT público** → Permite respuestas anónimas vía QR
- Los dueños pueden ver respuestas de sus encuestas
- Los usuarios pueden ver sus propias respuestas

**User Roles**:
- Los usuarios pueden ver sus propios roles
- Solo admins pueden asignar/revocar roles

## 📊 Patrones de Estado

### 1. Context API (Autenticación)

Usado para estado global de autenticación que se necesita en toda la app.

\`\`\`typescript
const AuthContext = createContext<AuthContextType>();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  // ...
};
\`\`\`

### 2. Local State (useState)

Usado para estado local de componentes:

\`\`\`typescript
const [loading, setLoading] = useState(true);
const [surveys, setSurveys] = useState<Survey[]>([]);
\`\`\`

### 3. Server State (Supabase)

La fuente de verdad está en Supabase. El frontend solo cachea temporalmente.

## 🚀 Optimizaciones de Performance

### 1. Code Splitting

React Router carga componentes bajo demanda:

\`\`\`typescript
const AdminUsers = lazy(() => import('./pages/admin/Users'));
\`\`\`

### 2. Memoización

Para componentes costosos:

\`\`\`typescript
const MemoizedChart = memo(ResultsChart);
\`\`\`

### 3. Índices en Base de Datos

Todos los campos frecuentemente consultados tienen índices:
- `surveys.owner_id`
- `surveys.public_slug`
- `responses.survey_id`

## 🧪 Testing (Futuro)

### Estructura Propuesta

\`\`\`
src/
├── __tests__/
│   ├── components/
│   ├── pages/
│   └── utils/
└── setupTests.ts
\`\`\`

### Stack de Testing

- **Unit Tests**: Vitest
- **Component Tests**: React Testing Library
- **E2E Tests**: Playwright
- **API Tests**: Supabase Test Helpers

## 📈 Monitoreo y Analytics

### Eventos a Trackear

1. **Autenticación**
   - Login exitoso/fallido
   - Registro exitoso/fallido
   - Logout

2. **Encuestas**
   - Encuesta creada
   - Encuesta publicada
   - QR generado
   - QR escaneado

3. **Respuestas**
   - Respuesta iniciada
   - Respuesta completada
   - Respuesta anónima vs autenticada

### Herramientas Recomendadas

- **Vercel Analytics**: Performance y Web Vitals
- **Supabase Logs**: Queries y errores
- **Sentry**: Error tracking (futuro)
- **PostHog**: Product analytics (futuro)

## 🔄 CI/CD Pipeline

### GitHub Actions (Propuesto)

\`\`\`yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run build
\`\`\`

### Vercel Deploy

- **Push a main** → Deploy a producción automático
- **Pull Request** → Preview deploy

## 🎨 Sistema de Diseño

### Colores Principales

\`\`\`css
/* Primary */
--blue-600: #2563eb;
--blue-700: #1d4ed8;

/* Secondary */
--purple-600: #9333ea;
--purple-700: #7e22ce;

/* Status */
--green: Publicado
--yellow: Borrador
--red: Cerrado/Error
--gray: Inactivo
\`\`\`

### Componentes Base

Todos los componentes usan clases de Tailwind con estas convenciones:

- **Botones**: `btn-primary`, `btn-secondary`, `btn-danger`
- **Cards**: `card`
- **Inputs**: `input-field`
- **Labels**: `label`

## 🔮 Roadmap Técnico

### Fase 1 - MVP (Actual)
- [x] Autenticación y roles
- [x] Dashboard básico
- [x] Panel de administración
- [ ] Constructor de formularios
- [ ] Vista pública con QR

### Fase 2 - Features
- [ ] Análisis y gráficos avanzados
- [ ] Exportación de datos
- [ ] Notificaciones en tiempo real
- [ ] Campos condicionales

### Fase 3 - Escalabilidad
- [ ] Testing completo
- [ ] Optimización de queries
- [ ] Caché con Redis
- [ ] Webhooks y API pública

## 📚 Referencias

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Router](https://reactrouter.com)

---

Este documento evoluciona con el proyecto. Última actualización: Noviembre 2025
