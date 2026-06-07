import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem('token', token); 
        navigate('/');
      } else {
        // Hier siehst du im Alert, was der Fehler ist
        const errorData = await res.json();
        alert(`Login fehlgeschlagen: ${errorData.error || 'Unbekannter Fehler'}`);
      }
    } catch (error) {
      alert('Server nicht erreichbar');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-md w-96">
        <h2 className="text-xl font-bold mb-6">Login Gefahrstoff-Management</h2>
        <input 
          type="email" 
          placeholder="E-Mail" 
          onChange={(e) => setEmail(e.target.value)} 
          className="w-full p-2 mb-4 border rounded" 
          required 
        />
        <input 
          type="password" 
          placeholder="Passwort" 
          onChange={(e) => setPassword(e.target.value)} 
          className="w-full p-2 mb-4 border rounded" 
          required 
        />
        <button type="submit" className="w-full bg-slate-800 text-white p-2 rounded">Anmelden</button>
      </form>
    </div>
  );
};