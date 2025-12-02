// pages/Register.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus } from 'lucide-react';

export const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signUp(email, password, displayName);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-lg border border-gray-200 p-6 sm:p-8 rounded-lg">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-accent-100 border border-accent-300 mb-4 rounded-lg">
              <UserPlus className="w-7 h-7 sm:w-8 sm:h-8 text-accent-700" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">CREAR CUENTA</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base font-medium">Regístrate en el Sistema</p>
          </div>

          {error && (
            <div className="mb-4 p-3 sm:p-4 bg-red-50 border-l-4 border-red-600 text-red-700 text-xs sm:text-sm rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="displayName" className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                Nombre Completo
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-accent-600 focus:border-accent-600 text-sm sm:text-base text-gray-900 transition-all"
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-accent-600 focus:border-accent-600 text-sm sm:text-base text-gray-900 transition-all"
                placeholder="usuario@empresa.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-accent-600 focus:border-accent-600 text-sm sm:text-base text-gray-900 transition-all"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-600 text-white py-2.5 sm:py-3 rounded-md font-bold hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-sm sm:text-base uppercase tracking-wide"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>

          <div className="mt-5 sm:mt-6 text-center pt-5 border-t border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="text-accent-600 hover:text-accent-700 font-bold uppercase">
                Inicia Sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
