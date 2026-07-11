import { useState, useEffect } from 'react';
import { Users, Edit2, Save, X, CheckCircle, Ban, Clock, Shield, ShieldCheck, Eye, UserCog, AlertCircle } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  'ADMIN': 'Administrator',
  'SAFETY_OFFICER': 'Fachkraft für Arbeitssicherheit (SiFa)',
  'LOCATION_MANAGER': 'Standortleitung',
  'VIEWER': 'Lesezugriff'
};

const ROLE_COLORS: Record<string, string> = {
  'ADMIN': 'bg-purple-100 text-purple-800 border-purple-200',
  'SAFETY_OFFICER': 'bg-amber-100 text-amber-800 border-amber-200',
  'LOCATION_MANAGER': 'bg-blue-100 text-blue-800 border-blue-200',
  'VIEWER': 'bg-slate-100 text-slate-600 border-slate-200'
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  'ACTIVE': { label: 'Aktiv', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  'PENDING_APPROVAL': { label: 'Freigabe ausstehend', color: 'bg-amber-100 text-amber-800', icon: Clock },
  'SUSPENDED': { label: 'Gesperrt', color: 'bg-red-100 text-red-800', icon: Ban }
};

const ASSIGNABLE_ROLES = ['VIEWER', 'LOCATION_MANAGER', 'SAFETY_OFFICER'];

export const UserManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState('VIEWER');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');
  const headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, pendingRes, tenantsRes] = await Promise.all([
        fetch('http://localhost:3000/api/users', { headers }),
        fetch('http://localhost:3000/api/users/pending', { headers }),
        fetch('http://localhost:3000/api/tenants')
      ]);
      
      if (!usersRes.ok) throw new Error('Fehler beim Laden der Benutzer');
      
      const usersData = await usersRes.json();
      const pendingData = pendingRes.ok ? await pendingRes.json() : [];
      const tenantsData = await tenantsRes.json();

      setUsers(Array.isArray(usersData) ? usersData : []);
      setPendingUsers(Array.isArray(pendingData) ? pendingData : []);
      
      const allLocations: any[] = [];
      if (Array.isArray(tenantsData)) {
        tenantsData.forEach((t: any) => {
          if (t.locations) allLocations.push(...t.locations);
        });
      }
      setLocations(allLocations);
    } catch (err) {
      console.error('Fehler:', err);
      setError('Fehler beim Laden der Benutzerdaten.');
    } finally {
      setLoading(false);
    }
  };

  // === Approve ===
  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`http://localhost:3000/api/users/${userId}/approve`, {
        method: 'POST', headers,
        body: JSON.stringify({ role: selectedRole, locationIds: selectedLocations })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchData();
        setEditingUserId(null);
      } else {
        setError(data.error || 'Fehler bei der Freischaltung');
      }
    } catch { setError('Server nicht erreichbar'); }
    finally { setActionLoading(null); }
  };

  // === Suspend ===
  const handleSuspend = async (userId: string) => {
    if (!confirm('Benutzer wirklich sperren? Der Zugang wird sofort deaktiviert.')) return;
    setActionLoading(userId);
    try {
      const res = await fetch(`http://localhost:3000/api/users/${userId}/suspend`, {
        method: 'POST', headers
      });
      const data = await res.json();
      if (res.ok) { await fetchData(); } 
      else { setError(data.error || 'Fehler beim Sperren'); }
    } catch { setError('Server nicht erreichbar'); }
    finally { setActionLoading(null); }
  };

  // === Role Change ===
  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`http://localhost:3000/api/users/${userId}/role`, {
        method: 'PUT', headers,
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (res.ok) { await fetchData(); }
      else { setError(data.error || 'Fehler beim Ändern der Rolle'); }
    } catch { setError('Server nicht erreichbar'); }
    finally { setActionLoading(null); }
  };

  // === Location Edit ===
  const startEditing = (user: any) => {
    setEditingUserId(user.id);
    setSelectedLocations(user.locations?.map((l: any) => l.id) || []);
    setSelectedRole(user.role || 'VIEWER');
  };

  const handleToggleLocation = (locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId) ? prev.filter(id => id !== locationId) : [...prev, locationId]
    );
  };

  const saveUserLocations = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`http://localhost:3000/api/users/${userId}/locations`, {
        method: 'PUT', headers,
        body: JSON.stringify({ locationIds: selectedLocations })
      });
      if (res.ok) { setEditingUserId(null); await fetchData(); }
      else { setError('Fehler beim Speichern der Standorte'); }
    } catch { setError('Server nicht erreichbar'); }
    finally { setActionLoading(null); }
  };

  if (loading) return <div className="text-sm text-slate-500 py-4">Lade Benutzerdaten...</div>;

  const activeUsers = users.filter(u => u.status === 'ACTIVE');
  const suspendedUsers = users.filter(u => u.status === 'SUSPENDED');

  return (
    <div className="space-y-6 mt-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ===== PENDING APPROVAL ===== */}
      {pendingUsers.length > 0 && (
        <div className="border-2 border-amber-300 rounded-xl overflow-hidden bg-amber-50/50">
          <div className="bg-amber-100 px-5 py-3 border-b border-amber-200 flex justify-between items-center">
            <h3 className="font-bold text-amber-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Freigabe ausstehend ({pendingUsers.length})
            </h3>
          </div>
          <div className="divide-y divide-amber-200">
            {pendingUsers.map(user => (
              <div key={user.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold text-slate-800">
                      {user.firstName || ''} {user.lastName || ''}
                    </span>
                    <span className="text-slate-500 ml-2">{user.email}</span>
                    <span className="text-xs text-slate-400 ml-3">
                      Registriert: {new Date(user.createdAt).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                </div>
                
                {editingUserId === user.id ? (
                  <div className="bg-white border border-amber-200 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Rolle zuweisen</label>
                        <select
                          value={selectedRole}
                          onChange={e => setSelectedRole(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                        >
                          {ASSIGNABLE_ROLES.map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Standort(e)</label>
                        <div className="border border-slate-300 rounded-lg p-2 max-h-28 overflow-y-auto bg-white space-y-1">
                          {locations.length === 0 ? (
                            <p className="text-xs text-slate-400">Keine Standorte vorhanden</p>
                          ) : locations.map(loc => (
                            <label key={loc.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 px-1 rounded">
                              <input
                                type="checkbox"
                                checked={selectedLocations.includes(loc.id)}
                                onChange={() => handleToggleLocation(loc.id)}
                                className="rounded border-slate-300"
                              />
                              {loc.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(user.id)}
                        disabled={actionLoading === user.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {actionLoading === user.id ? 'Wird freigeschaltet...' : 'Freischalten'}
                      </button>
                      <button
                        onClick={() => setEditingUserId(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingUserId(user.id); setSelectedRole('VIEWER'); setSelectedLocations([]); }}
                      className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" /> Prüfen & Freischalten
                    </button>
                    <button
                      onClick={() => handleSuspend(user.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg text-sm flex items-center gap-1"
                    >
                      <Ban className="w-4 h-4" /> Ablehnen
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== ACTIVE USERS ===== */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" /> Aktive Benutzer ({activeUsers.length})
          </h3>
          <button onClick={fetchData} className="text-sm text-blue-600 hover:text-blue-800">Aktualisieren</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Benutzer</th>
                <th className="px-4 py-3 font-medium">Rolle</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Standorte</th>
                <th className="px-4 py-3 font-medium w-48">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeUsers.map(user => {
                const statusCfg = STATUS_CONFIG[user.status] || STATUS_CONFIG['ACTIVE'];
                const StatusIcon = statusCfg.icon;
                const isEditing = editingUserId === user.id;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {user.firstName || ''} {user.lastName || ''}
                      </div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing && user.role !== 'ADMIN' ? (
                        <select
                          value={selectedRole}
                          onChange={e => {
                            setSelectedRole(e.target.value);
                            handleRoleChange(user.id, e.target.value);
                          }}
                          className="p-1.5 border border-slate-300 rounded text-xs"
                        >
                          {ASSIGNABLE_ROLES.map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold ${ROLE_COLORS[user.role] || ROLE_COLORS['VIEWER']}`}>
                          {user.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                          {user.role === 'SAFETY_OFFICER' && <ShieldCheck className="w-3 h-3" />}
                          {user.role === 'LOCATION_MANAGER' && <UserCog className="w-3 h-3" />}
                          {user.role === 'VIEWER' && <Eye className="w-3 h-3" />}
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="space-y-1 max-h-32 overflow-y-auto border border-slate-200 p-2 rounded bg-white">
                          {locations.map(loc => (
                            <label key={loc.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-0.5 rounded">
                              <input
                                type="checkbox"
                                checked={selectedLocations.includes(loc.id)}
                                onChange={() => handleToggleLocation(loc.id)}
                                className="rounded border-slate-300 text-blue-600"
                              />
                              {loc.name}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.locations?.map((l: any) => (
                            <span key={l.id} className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs text-slate-700">{l.name}</span>
                          ))}
                          {(!user.locations || user.locations.length === 0) && <span className="text-slate-400 italic text-xs">Alle</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.role === 'ADMIN' ? (
                        <span className="text-xs text-slate-400 italic">Nur per CLI änderbar</span>
                      ) : isEditing ? (
                        <div className="flex gap-1">
                          <button onClick={() => saveUserLocations(user.id)} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 p-1.5 rounded" title="Speichern">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingUserId(null)} className="text-slate-500 hover:text-slate-700 bg-slate-100 p-1.5 rounded" title="Abbrechen">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => startEditing(user)} className="text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1.5 rounded text-xs flex items-center gap-1">
                            <Edit2 className="w-3 h-3" /> Bearbeiten
                          </button>
                          <button
                            onClick={() => handleSuspend(user.id)}
                            disabled={actionLoading === user.id}
                            className="text-red-600 hover:text-red-800 bg-red-50 px-2 py-1.5 rounded text-xs flex items-center gap-1 disabled:opacity-50"
                          >
                            <Ban className="w-3 h-3" /> Sperren
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {activeUsers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Keine aktiven Benutzer.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== SUSPENDED USERS ===== */}
      {suspendedUsers.length > 0 && (
        <div className="border border-red-200 rounded-xl overflow-hidden bg-red-50/30">
          <div className="bg-red-50 px-5 py-3 border-b border-red-200">
            <h3 className="font-bold text-red-800 flex items-center gap-2">
              <Ban className="w-5 h-5" /> Gesperrte Benutzer ({suspendedUsers.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-red-100">
                {suspendedUsers.map(user => (
                  <tr key={user.id} className="hover:bg-red-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{user.firstName || ''} {user.lastName || ''}</span>
                      <span className="text-slate-500 ml-2">{user.email}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-red-500 italic">Zugang gesperrt</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
