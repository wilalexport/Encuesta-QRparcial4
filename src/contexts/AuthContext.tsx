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
      setSession(session);
      if (session?.user) {
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
        loadUserData(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
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

      // Asignar rol creator por defecto
      await supabase.from('user_roles').insert({
        user_id: data.user.id,
        role: 'creator',
      });
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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
