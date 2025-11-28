// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
    'Por favor, configura el archivo .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Helper para manejo de errores de Supabase
export const handleSupabaseError = (error: any, context: string) => {
  console.error(`Error en ${context}:`, error);
  
  if (error.code === 'PGRST301') {
    return 'No tienes permisos para realizar esta acción';
  }
  
  if (error.code === '23505') {
    return 'Este registro ya existe';
  }
  
  if (error.code === '23503') {
    return 'Referencia inválida a otro registro';
  }
  
  return error.message || 'Ha ocurrido un error inesperado';
};
