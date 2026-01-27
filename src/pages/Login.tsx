import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { strings } from '../locales/es';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const { user, login, loading } = useAuth();

  // Si ya está logueado, lo mandamos al Home
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
        
        {/* Logo Grande */}
        <div className="w-16 h-16 bg-lof-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-lof-500/30">
          <span className="text-white font-bold text-3xl">L</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {strings.auth.loginTitle}
        </h1>
        <p className="text-slate-500 mb-8">
          {strings.auth.loginSubtitle}
        </p>

        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="animate-spin text-lof-600" />
          </div>
        ) : (
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            {strings.auth.btnGoogle}
          </button>
        )}

        <p className="text-xs text-slate-400 mt-8">
          Solo para uso familiar del Lof.
        </p>
      </div>
    </div>
  );
};

export default Login;