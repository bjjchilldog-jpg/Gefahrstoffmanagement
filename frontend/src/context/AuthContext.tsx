import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthUser {
  id: string;
  email: string;
  role: string;
  status: string;
  firstName?: string;
  lastName?: string;
  locations?: { id: string; name: string }[];
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAdmin: boolean;
  isSafetyOfficer: boolean;
  isLocationManager: boolean;
  isViewer: boolean;
  canManage: boolean; // ADMIN oder SAFETY_OFFICER
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
  isAdmin: false,
  isSafetyOfficer: false,
  isLocationManager: false,
  isViewer: false,
  canManage: false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    // Validate token and get user info
    fetch('http://localhost:3000/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) {
          // Token ungültig → Logout
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) setUser(data);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = (newToken: string, userData: AuthUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    setToken(null);
    setUser(null);
  };

  const role = user?.role || '';

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      isAdmin: role === 'ADMIN',
      isSafetyOfficer: role === 'SAFETY_OFFICER',
      isLocationManager: role === 'LOCATION_MANAGER',
      isViewer: role === 'VIEWER',
      canManage: role === 'ADMIN' || role === 'SAFETY_OFFICER'
    }}>
      {children}
    </AuthContext.Provider>
  );
};
