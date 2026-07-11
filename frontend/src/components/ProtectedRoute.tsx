import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, Ban, LogOut } from 'lucide-react';

interface ProtectedRouteProps {
  children: JSX.Element;
  requiredRoles?: string[];  // Falls leer: alle authentifizierten, aktiven User
}

export const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
  const { user, token, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-400 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          Authentifizierung wird geprüft...
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // PENDING_APPROVAL → Sperrbildschirm
  if (user?.status === 'PENDING_APPROVAL') {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-amber-50/30">
        <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-lg text-center border border-amber-200">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Account wird geprüft</h2>
          <p className="text-slate-600 mb-2">
            Ihr Account wurde registriert und wartet auf die Freigabe durch den Administrator.
          </p>
          <p className="text-sm text-slate-500 mb-8">
            Sie erhalten eine E-Mail, sobald Ihr Zugang freigeschaltet wurde. 
            Bitte versuchen Sie es später erneut.
          </p>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" /> Abmelden
          </button>
        </div>
      </div>
    );
  }

  // SUSPENDED → Gesperrt-Bildschirm
  if (user?.status === 'SUSPENDED') {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-red-50/30">
        <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-lg text-center border border-red-200">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Ban className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Zugang gesperrt</h2>
          <p className="text-slate-600 mb-8">
            Ihr Account wurde vom Administrator gesperrt. 
            Bitte wenden Sie sich an Ihren Vorgesetzten.
          </p>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" /> Abmelden
          </button>
        </div>
      </div>
    );
  }

  // Rollen-Check (wenn requiredRoles angegeben)
  if (requiredRoles && requiredRoles.length > 0 && user?.role) {
    if (!requiredRoles.includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};