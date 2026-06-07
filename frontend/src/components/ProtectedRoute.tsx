import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  // Wir prüfen, ob ein Token im LocalStorage vorhanden ist
  const token = localStorage.getItem('token');
  
  if (!token) {
    // Wenn kein Token, ab zum Login
    return <Navigate to="/login" replace />;
  }

  // Wenn Token da, zeige die geschützte Komponente
  return children;
};