import React, { useEffect, useState } from 'react';
import { Shield, Check, X, AlertCircle, UserCheck, UserX, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
}

export const UserManagementView = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler beim Laden der Benutzer');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler bei der Freigabe');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm('Benutzer wirklich sperren?')) return;
    try {
      const res = await fetch(`/api/users/${id}/suspend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler beim Sperren');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${id}/role`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error('Fehler beim Ändern der Rolle');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-slate-800">Benutzerverwaltung</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
            <tr>
              <th className="p-4">E-Mail</th>
              <th className="p-4">Status</th>
              <th className="p-4">Rolle</th>
              <th className="p-4">Registriert am</th>
              <th className="p-4 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-800">{user.email}</td>
                <td className="p-4">
                  {user.status === 'PENDING_APPROVAL' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Ausstehend</span>}
                  {user.status === 'ACTIVE' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Aktiv</span>}
                  {user.status === 'SUSPENDED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Gesperrt</span>}
                </td>
                <td className="p-4">
                  <select 
                    value={user.role} 
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="border border-slate-300 rounded p-1 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    disabled={user.status === 'SUSPENDED'}
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="LOCATION_MANAGER">Standortleiter</option>
                    <option value="SAFETY_OFFICER">Sicherheitsbeauftragter</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </td>
                <td className="p-4">{new Date(user.createdAt).toLocaleDateString('de-DE')}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    {user.status === 'PENDING_APPROVAL' && (
                      <button 
                        onClick={() => handleApprove(user.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Freigeben
                      </button>
                    )}
                    {user.status === 'ACTIVE' && (
                      <button 
                        onClick={() => handleSuspend(user.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-700 rounded text-xs font-medium hover:bg-rose-200 transition-colors"
                      >
                        <UserX className="w-3.5 h-3.5" /> Sperren
                      </button>
                    )}
                    {user.status === 'SUSPENDED' && (
                      <button 
                        onClick={() => handleApprove(user.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-medium hover:bg-slate-200 transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Entsperren
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">Keine Benutzer gefunden.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
