// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { AuthUser, Profile, UserRole } from '@/types/database.types';

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar si la sesión es válida y del mismo dispositivo/navegador
  const isSessionValid = () => {
    const sessionFingerprint = localStorage.getItem('session_fingerprint');
    const currentFingerprint = generateFingerprint();
    
    // Si no hay fingerprint guardado, es la primera vez o sesión nueva
    if (!sessionFingerprint) {
      return true;
    }
    
    // Verificar si el fingerprint coincide
    return sessionFingerprint === currentFingerprint;
  };

  // Generar huella digital del navegador/dispositivo
  const generateFingerprint = () => {
    const userAgent = navigator.userAgent;
    const screenResolution = `${screen.width}x${screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    
    return btoa(`${userAgent}-${screenResolution}-${timezone}-${language}`);
  };

  // Guardar fingerprint de la sesión
  const saveSessionFingerprint = () => {
    const fingerprint = generateFingerprint();
    localStorage.setItem('session_fingerprint', fingerprint);
  };

  const loadUserData = async (authUser: User) => {
    try {
      // Cargar perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) throw profileError;

      // Cargar roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUser.id);

      if (rolesError) throw rolesError;

      const roles: UserRole[] = rolesData?.map(r => r.role) || [];
      
      const authUserData: AuthUser = {
        id: authUser.id,
        email: authUser.email!,
        profile: profile as Profile,
        roles,
        isAdmin: roles.includes('admin'),
        isCreator: roles.includes('creator'),
        isViewer: roles.includes('viewer'),
      };

      setUser(authUserData);
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      await loadUserData(currentSession.user);
    }
  };

  useEffect(() => {
    // Cargar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Verificar validez de la sesión
      if (session && !isSessionValid()) {
        // Sesión de otro dispositivo/navegador, cerrar sesión
        console.warn('Sesión detectada de otro dispositivo, cerrando por seguridad');
        supabase.auth.signOut();
        localStorage.removeItem('session_fingerprint');
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(session);
      if (session?.user) {
        saveSessionFingerprint();
        loadUserData(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        saveSessionFingerprint();
        loadUserData(session.user);
      } else {
        setUser(null);
        localStorage.removeItem('session_fingerprint');
      }
    });

    // Verificar sesión periódicamente (cada 5 minutos)
    const intervalId = setInterval(async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession && !isSessionValid()) {
        console.warn('Cambio de dispositivo detectado, cerrando sesión');
        await supabase.auth.signOut();
        localStorage.removeItem('session_fingerprint');
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    
    // Guardar fingerprint al iniciar sesión exitosamente
    saveSessionFingerprint();
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) throw error;

    // Crear perfil (si no se crea automáticamente con trigger)
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        display_name: displayName,
      });

      // Asignar rol viewer por defecto (usuarios normales)
      await supabase.from('user_roles').insert({
        user_id: data.user.id,
        role: 'viewer',
      });
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Limpiar fingerprint al cerrar sesión
    localStorage.removeItem('session_fingerprint');
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
