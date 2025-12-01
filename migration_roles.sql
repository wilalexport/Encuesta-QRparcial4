-- ============================================
-- MIGRACIÓN: Sistema de Roles Optimizado
-- ============================================
-- Este script optimiza el sistema de roles eliminando
-- la columna 'role' de profiles y usando solo user_roles
-- ============================================

-- 1. LIMPIAR columna role de profiles (no la eliminamos por seguridad)
UPDATE profiles SET role = NULL;

-- 2. MODIFICAR constraint de user_roles para incluir 'viewer'
ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('admin', 'creator', 'viewer'));

-- 3. AGREGAR constraint UNIQUE para evitar duplicados
ALTER TABLE user_roles
ADD CONSTRAINT unique_user_role 
UNIQUE (user_id, role);

-- 4. ASIGNAR rol 'viewer' a usuarios sin roles
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'viewer'
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. ACTUALIZAR trigger para asignar 'viewer' por defecto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear perfil
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  
  -- Asignar rol 'viewer' por defecto
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ASIGNAR ROLES A TU USUARIO
-- ⚠️ IMPORTANTE: Reemplaza 'TU-USER-ID-COMPLETO' con tu UUID real
-- Puedes obtenerlo ejecutando: SELECT id, display_name FROM profiles WHERE display_name = 'wilson';

-- Ejemplo: INSERT INTO user_roles (user_id, role) VALUES ('5edcc888-dc0c-40c8-b16f-350a8...', 'admin');

-- Asignar rol admin a tu usuario
INSERT INTO user_roles (user_id, role)
VALUES ('TU-USER-ID-COMPLETO', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Asignar rol creator a tu usuario
INSERT INTO user_roles (user_id, role)
VALUES ('TU-USER-ID-COMPLETO', 'creator')
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. VERIFICAR resultados
SELECT 
  p.display_name,
  p.id as user_id,
  ARRAY_AGG(ur.role ORDER BY ur.role) as roles
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.display_name
ORDER BY p.display_name;

-- ============================================
-- DESCRIPCIÓN DE ROLES:
-- ============================================
-- viewer (rol normal):
--   - Ver dashboard con encuestas asignadas
--   - Responder encuestas
--   - Ver historial de respuestas propias
--   - Editar su perfil
--
-- creator (creador):
--   - Todo lo de viewer +
--   - Crear encuestas
--   - Editar/eliminar sus encuestas
--   - Generar códigos QR
--   - Ver estadísticas de sus encuestas
--
-- admin (administrador):
--   - Todo lo de creator +
--   - Ver TODAS las encuestas del sistema
--   - Gestionar usuarios
--   - Asignar/quitar roles
--   - Ver logs de auditoría
-- ============================================

-- DESPUÉS DE EJECUTAR ESTE SCRIPT:
-- 1. Reemplaza 'TU-USER-ID-COMPLETO' con tu UUID real (línea 50 y 55)
-- 2. Ejecuta el script completo en Supabase SQL Editor
-- 3. Verifica los resultados con la query de verificación (línea 59)
-- 4. Cierra sesión en la aplicación
-- 5. Vuelve a iniciar sesión
-- 6. Deberías ver el badge "Admin" en el dashboard
