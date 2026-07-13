import React, { useEffect, useState } from 'react';
import { Shield, Check, X, AlertCircle, UserCheck, UserX, Loader2, MapPin, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Location {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  locations?: Location[];
}

interface Tenant {
  id: string;
  name: string;
  locations: Location[];
}

export const UserManagementView = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();
  
  // Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      // Load Users
      const usersRes = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!usersRes.ok) throw new Error('Fehler beim Laden der Benutzer');
      const usersData = await usersRes.json();
      setUsers(usersData);

      // Load Locations (via tenants)
      const tenantsRes = await fetch('/api/tenants', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tenantsRes.ok) {
        const tenantsData: Tenant[] = await tenantsRes.json();
        const locations = tenantsData.flatMap(t => t.locations);
        setAllLocations(locations);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler bei der Freigabe');
      fetchData();
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
      fetchData();
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
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openLocationModal = (user: User) => {
    setEditingUser(user);
    setSelectedLocationIds(user.locations?.map(l => l.id) || []);
  };

  const saveLocations = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/users/${editingUser.id}/locations`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ locationIds: selectedLocationIds })
      });
      if (!res.ok) throw new Error('Fehler beim Zuweisen der Standorte');
      setEditingUser(null);
      fetchData();
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
              <th className="p-4">Benutzer</th>
              <th className="p-4">Rolle</th>
              <th className="p-4">Standort-Zuständigkeit</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="font-medium text-slate-800">{user.email}</div>
                  <div className="text-xs text-slate-500">{new Date(user.createdAt).toLocaleDateString('de-DE')}</div>
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
                    <option value="SAFETY_OFFICER">Administrator (Unternehmen)</option>
                    <option value="ADMIN">Superadmin (Entwickler)</option>
                  </select>
                </td>
                <td className="p-4">
                  <div className="flex items-start justify-between gap-2 group">
                    <div className="flex flex-wrap gap-1">
                      {user.role === 'ADMIN' ? (
                        <span className="text-xs text-slate-500 italic">Alle (Global)</span>
                      ) : user.locations && user.locations.length > 0 ? (
                        user.locations.map(loc => (
                          <span key={loc.id} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs border border-slate-200">
                            <MapPin className="w-3 h-3" /> {loc.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Keine Standorte zugewiesen</span>
                      )}
                    </div>
                    {user.role !== 'ADMIN' && (
                      <button 
                        onClick={() => openLocationModal(user)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-all rounded hover:bg-indigo-50"
                        title="Standorte bearbeiten"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  {user.status === 'PENDING_APPROVAL' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Ausstehend</span>}
                  {user.status === 'ACTIVE' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Aktiv</span>}
                  {user.status === 'SUSPENDED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Gesperrt</span>}
                </td>
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

      {/* Location Assignment Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Standorte zuweisen</h2>
              <p className="text-sm text-slate-500 mt-1">Welche Standorte darf {editingUser.email} verwalten?</p>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {allLocations.length === 0 ? (
                <p className="text-sm text-slate-500 italic text-center p-4">Es sind noch keine Standorte im System angelegt.</p>
              ) : (
                <div className="space-y-3">
                  {allLocations.map(loc => {
                    const isSelected = selectedLocationIds.includes(loc.id);
                    return (
                      <label key={loc.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300'}`}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLocationIds([...selectedLocationIds, loc.id]);
                            } else {
                              setSelectedLocationIds(selectedLocationIds.filter(id => id !== loc.id));
                            }
                          }}
                        />
                        <span className="text-sm font-medium text-slate-700">{loc.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Abbrechen
              </button>
              <button 
                onClick={saveLocations}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
