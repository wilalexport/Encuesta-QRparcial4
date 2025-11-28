# Guía de Deployment en Vercel

Esta guía te ayudará a desplegar tu aplicación de Encuestas QR en Vercel.

## 🚀 Opción 1: Deploy desde GitHub (Recomendado)

### Paso 1: Preparar el Repositorio

1. **Asegúrate de que todos los archivos estén commiteados**
   \`\`\`bash
   git add .
   git commit -m "Initial commit - Encuestas QR"
   git push origin main
   \`\`\`

2. **Verifica que el archivo `.gitignore` esté correcto** (ya incluido en el proyecto)

### Paso 2: Conectar con Vercel

1. Ve a [https://vercel.com](https://vercel.com)
2. Inicia sesión con tu cuenta de GitHub
3. Haz clic en **"Add New Project"**
4. Selecciona el repositorio `encuestas-qr`
5. Vercel detectará automáticamente que es un proyecto Vite

### Paso 3: Configurar Variables de Entorno

En la sección **"Environment Variables"** de Vercel, agrega:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Tu URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Tu Anon Key de Supabase |

**Importante**: Asegúrate de agregar estas variables antes de hacer el deploy.

### Paso 4: Deploy

1. Haz clic en **"Deploy"**
2. Espera a que termine el build (aproximadamente 2-3 minutos)
3. ¡Listo! Tu aplicación estará disponible en una URL como `https://encuestas-qr-xxx.vercel.app`

### Paso 5: Configurar Dominio Personalizado (Opcional)

1. Ve a **Settings > Domains**
2. Agrega tu dominio personalizado
3. Sigue las instrucciones para configurar los DNS

## 🖥️ Opción 2: Deploy desde CLI

### Instalar Vercel CLI

\`\`\`bash
npm install -g vercel
\`\`\`

### Login

\`\`\`bash
vercel login
\`\`\`

### Deploy

\`\`\`bash
cd "c:\\Users\\Wilson Portillo\\Documents\\Uni\\Hardware y software\\Tareas\\Unidad 4\\Proyecto Lab4 vercel\\encuestas-qr"
vercel
\`\`\`

Sigue las instrucciones en pantalla:

1. **Setup and deploy**: Yes
2. **Which scope**: Tu cuenta/organización
3. **Link to existing project**: No (primera vez)
4. **Project name**: encuestas-qr
5. **Directory**: ./ (raíz del proyecto)
6. **Override settings**: No

### Configurar Variables de Entorno vía CLI

\`\`\`bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
\`\`\`

Ingresa los valores cuando se te solicite.

### Deploy a Producción

\`\`\`bash
vercel --prod
\`\`\`

## 📝 Configuración de Build

Vercel detectará automáticamente estas configuraciones (ya incluidas en `package.json`):

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

Si necesitas modificarlas, crea un archivo `vercel.json`:

\`\`\`json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "devCommand": "npm run dev"
}
\`\`\`

## 🔄 Despliegues Automáticos

Una vez conectado con GitHub:

- **Push a `main`** → Deploy automático a producción
- **Push a otra rama** → Preview deploy automático
- **Pull Request** → Preview deploy para revisión

## 🌐 Configurar Supabase para Producción

### Actualizar URLs Permitidas

1. Ve a tu proyecto en Supabase
2. Ve a **Authentication > URL Configuration**
3. Agrega tu URL de Vercel a:
   - **Site URL**: `https://tu-app.vercel.app`
   - **Redirect URLs**: 
     - `https://tu-app.vercel.app/**`
     - `http://localhost:5173/**` (para desarrollo)

### Configurar CORS

Si tienes problemas de CORS, verifica en Supabase:

1. Ve a **Settings > API**
2. En **CORS Configuration**, agrega:
   - `https://tu-app.vercel.app`
   - `http://localhost:5173` (para desarrollo)

## 🔍 Monitoreo y Logs

### Ver Logs en Vercel

1. Ve a tu proyecto en Vercel
2. Haz clic en el deployment activo
3. Ve a la pestaña **"Logs"**

### Analytics

Vercel proporciona analytics automáticamente:
- Pageviews
- Visitantes únicos
- Top pages
- Performance

## 🐛 Solución de Problemas

### Error: "Failed to build"

**Causa**: Error de TypeScript o dependencias faltantes

**Solución**:
\`\`\`bash
# Limpia node_modules y reinstala
rm -rf node_modules package-lock.json
npm install

# Verifica que el build funcione localmente
npm run build
\`\`\`

### Error: "Module not found"

**Causa**: Rutas de importación incorrectas o dependencias faltantes

**Solución**:
- Verifica que todas las rutas usen `@/` correctamente
- Verifica que `tsconfig.json` tenga los paths configurados
- Asegúrate de que todas las dependencias estén en `package.json`

### Error: "Environment variables not found"

**Causa**: Variables de entorno no configuradas en Vercel

**Solución**:
1. Ve a **Settings > Environment Variables** en Vercel
2. Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
3. Redeploy el proyecto

### Páginas 404 al refrescar

**Causa**: React Router necesita configuración adicional

**Solución**: Crea `vercel.json`:
\`\`\`json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
\`\`\`

## 📊 Optimizaciones

### 1. Habilitar Edge Functions (Opcional)

Para mejorar la velocidad, puedes usar Vercel Edge:

\`\`\`json
{
  "functions": {
    "api/*.ts": {
      "runtime": "edge"
    }
  }
}
\`\`\`

### 2. Configurar Headers de Seguridad

Agrega en `vercel.json`:

\`\`\`json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
\`\`\`

### 3. Habilitar Compresión

Vercel habilita Brotli y Gzip automáticamente, pero puedes optimizar:

\`\`\`javascript
// vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Elimina console.logs en producción
      },
    },
  },
})
\`\`\`

## 🔐 Seguridad

### Secrets Management

**Nunca** expongas tus secrets en el código. Usa variables de entorno:

✅ **Correcto**:
\`\`\`typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
\`\`\`

❌ **Incorrecto**:
\`\`\`typescript
const supabaseUrl = "https://abc123.supabase.co";
\`\`\`

### Rate Limiting

Para proteger tu API, considera implementar rate limiting en Supabase.

## 📈 Performance

### Lighthouse Score

Verifica tu performance con Lighthouse:
1. Abre DevTools (F12)
2. Ve a la pestaña **Lighthouse**
3. Ejecuta el análisis

**Objetivos**:
- Performance: >90
- Accessibility: >90
- Best Practices: >90
- SEO: >90

## 🎯 Checklist Pre-Deploy

Antes de hacer deploy a producción, verifica:

- [ ] Variables de entorno configuradas en Vercel
- [ ] Base de datos Supabase configurada completamente
- [ ] RLS policies habilitadas
- [ ] Storage bucket creado
- [ ] Build local exitoso (`npm run build`)
- [ ] Sin errores de TypeScript
- [ ] URLs de Supabase actualizadas para incluir tu dominio
- [ ] `.env` no está en el repositorio (debe estar en `.gitignore`)
- [ ] README actualizado con información del proyecto

## 🔄 Actualizar Deployment

Para actualizar tu aplicación:

\`\`\`bash
git add .
git commit -m "Descripción de los cambios"
git push origin main
\`\`\`

Vercel automáticamente:
1. Detectará el push
2. Ejecutará el build
3. Desplegará la nueva versión
4. Mantendrá la versión anterior disponible por si necesitas rollback

## 🔙 Rollback

Si algo sale mal:

1. Ve a tu proyecto en Vercel
2. Ve a **Deployments**
3. Encuentra el deployment anterior que funcionaba
4. Haz clic en los tres puntos (...)
5. Selecciona **"Promote to Production"**

## 📞 Soporte

Si tienes problemas:

- [Documentación de Vercel](https://vercel.com/docs)
- [Foro de Vercel](https://github.com/vercel/vercel/discussions)
- [Discord de Vercel](https://vercel.com/discord)
- [Documentación de Supabase](https://supabase.com/docs)

---

¡Tu aplicación está lista para producción! 🎉
