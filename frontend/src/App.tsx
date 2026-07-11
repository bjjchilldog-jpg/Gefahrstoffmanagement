import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { TreeView } from './components/TreeView';
import { SubstanceList } from './components/SubstanceList';
import { Dashboard } from './components/Dashboard';
import { FireDepartmentView } from './pages/FireDepartmentView';
import { Login } from './components/login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { Building2, Flame, Settings, FileText, Users, BookOpen, Award, Plus, Smartphone, LogOut, User } from 'lucide-react';
import { PromptDialog } from './components/PromptDialog';

import { ImpressumView } from './pages/ImpressumView';
import { DatenschutzView } from './pages/DatenschutzView';
import { AdminSettings } from './pages/AdminSettings';
import { MasterMatrixView } from './pages/MasterMatrixView';
import { LocationDetailView } from './pages/LocationDetailView';
import { GbuFormView } from './pages/GbuFormView';
import { DocumentCenterView } from './pages/DocumentCenterView';
import { AsbestosDocumentView } from './pages/AsbestosDocumentView';
import { EmployeeView } from './pages/EmployeeView';
import { LmsAdminView } from './pages/LmsAdminView';
import { LmsEmployeeView } from './pages/LmsEmployeeView';
import { EmployeeLoginView } from './pages/EmployeeLoginView';
import { MobileAppView } from './pages/MobileAppView';
import { MobileScannerApp } from './pages/MobileScannerApp';
import { RegisterView } from './pages/RegisterView';
import { ForgotPasswordView } from './pages/ForgotPasswordView';
import { ResetPasswordView } from './pages/ResetPasswordView';

/** SSO-Callback: Empfängt Token aus OIDC-Redirect und loggt den User ein */
const SsoCallbackHandler = () => {
  const { login } = useAuth();
  const navigate = Navigate;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const email = params.get('email');
    const role = params.get('role');
    if (token && email) {
      login(token, { email, role: role || 'VIEWER', id: '', firstName: '', lastName: '', status: 'ACTIVE' });
      window.location.href = '/';
    }
  }, []);
  return <div className="flex h-screen items-center justify-center bg-slate-50"><p className="text-slate-500 animate-pulse">SSO-Anmeldung wird verarbeitet...</p></div>;
};

/**
 * ErrorBoundary — fängt React-Rendering-Fehler ab.
 * Kein Whitescreen mehr.
 */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: '' }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error: error.message }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center border border-red-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Etwas ist schiefgelaufen</h2>
            <p className="text-sm text-slate-600 mb-4">{this.state.error}</p>
            <button onClick={() => window.location.reload()} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm">
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}



/** Die innere App die Zugriff auf useAuth hat */
function AppInner() {
  const { user, token, isAdmin, canManage, logout } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [cdSettings, setCdSettings] = useState({ primaryColor: '#0f172a', logoBase64: '' });

  const handleAddTenant = async (name: string) => {
    if (!name) return;
    try {
      const res = await fetch('http://localhost:3000/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name })
      });
      if (res.ok) window.location.reload();
    } catch {}
  };

  useEffect(() => {
    if (token) {
      fetch('http://localhost:3000/api/tenants', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : [])
        .then(data => Array.isArray(data) ? setTenants(data) : null)
        .catch(() => {});
    }

    fetch('http://localhost:3000/api/settings/default-tenant-id')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setCdSettings(data);
          if (data.primaryColor) {
            document.documentElement.style.setProperty('--color-primary', data.primaryColor);
          }
          // Dynamischer Browser-Titel (White-Labeling)
          if (data.companyName) {
            document.title = `${data.companyName} — Gefahrstoffmanagement`;
          }
          // Dynamisches Favicon aus Logo
          if (data.logoBase64) {
            const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
            link.rel = 'icon';
            link.href = data.logoBase64;
            if (!link.parentNode) document.head.appendChild(link);
          }
        }
      })
      .catch(() => {});
  }, [token]);

  return (
    <Routes>
      {/* Öffentliche Routen */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<RegisterView />} />
      <Route path="/forgot-password" element={<ForgotPasswordView />} />
      <Route path="/reset-password" element={<ResetPasswordView />} />
      <Route path="/sso-callback" element={<SsoCallbackHandler />} />
      
      <Route path="/fire-department" element={
        <ProtectedRoute><FireDepartmentView /></ProtectedRoute>
      } />
      
      <Route path="/mobile" element={
        <ProtectedRoute><MobileAppView /></ProtectedRoute>
      } />
      <Route path="/scanner" element={<MobileScannerApp />} />

      <Route path="/*" element={
        <ProtectedRoute>
          <div className="flex h-screen bg-slate-50">
            {/* === SIDEBAR === */}
            <aside className="w-[420px] min-w-[320px] max-w-[600px] resize-x overflow-x-auto bg-white border-r border-slate-200 flex flex-col shrink-0">
              {/* User-Info & Logout */}
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-800 text-xs">
                      {user?.firstName || ''} {user?.lastName || user?.email || ''}
                    </div>
                    <div className="text-xs text-slate-500">
                      {user?.role === 'ADMIN' && '👑 Administrator'}
                      {user?.role === 'SAFETY_OFFICER' && '🛡️ SiFa'}
                      {user?.role === 'LOCATION_MANAGER' && '📍 Standortleitung'}
                      {user?.role === 'VIEWER' && '👁️ Lesezugriff'}
                    </div>
                  </div>
                </div>
                <button onClick={logout} className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors" title="Abmelden">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation */}
              <div className="p-4 border-b border-slate-200 flex flex-col gap-3">
                <Link to="/documents" className="flex items-center gap-2 hover:bg-slate-100 p-2 rounded text-slate-700 transition-colors">
                  <FileText className="h-4 w-4" /> Dokumenten-Center
                </Link>
                <Link to="/mobile" className="flex items-center gap-2 hover:bg-slate-100 p-2 rounded text-slate-700 transition-colors">
                  <Smartphone className="h-4 w-4" /> Mobile App (PWA)
                </Link>
                <Link to="/fire-department" target="_blank" className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors w-full justify-center">
                  <Flame className="w-4 h-4" /> Feuerwehr-Ausgabe
                </Link>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Link to="/dashboard" className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded font-medium transition-colors">
                      Dashboard
                    </Link>
                    <Link to="/matrix" className="flex-1 flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded font-medium transition-colors" title="Zuweisungs-Matrix">
                      Matrix
                    </Link>
                  </div>
                  <div className="flex gap-2">
                    {/* Personal — nur für ADMIN/SAFETY_OFFICER/LOCATION_MANAGER */}
                    {(canManage || user?.role === 'LOCATION_MANAGER') && (
                      <Link to="/employees" className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded font-medium transition-colors" title="Personal">
                        <Users className="w-4 h-4" />
                      </Link>
                    )}
                    <Link to="/documents" className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded font-medium transition-colors" title="Dokumenten-Center">
                      <FileText className="w-4 h-4" />
                    </Link>
                    {/* LMS — nur für ADMIN/SAFETY_OFFICER */}
                    {canManage && (
                      <Link to="/lms/admin" className="flex-1 flex items-center justify-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2 rounded font-medium transition-colors" title="LMS Verwaltung">
                        <BookOpen className="w-4 h-4" />
                      </Link>
                    )}
                    <Link to="/lms/training" className="flex-1 flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-2 rounded font-medium transition-colors" title="Lernportal">
                      <Award className="w-4 h-4" />
                    </Link>
                    {/* Einstellungen — NUR für ADMIN */}
                    {isAdmin && (
                      <Link to="/settings" className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded font-medium transition-colors" title="Einstellungen">
                        <Settings className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Mandanten-Baum */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {cdSettings.logoBase64 ? (
                      <img src={cdSettings.logoBase64} alt="Firmenlogo" className="h-8 max-w-[200px] object-contain" />
                    ) : (
                      <>
                        <Building2 className="text-accent h-5 w-5" />
                        <h1 className="font-semibold text-primary">Mandanten</h1>
                      </>
                    )}
                  </div>
                  {isAdmin && (
                    <button onClick={() => setIsPromptOpen(true)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors" title="Neuen Mandant anlegen">
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {tenants.map(tenant => <TreeView key={tenant.id} tenant={tenant} />)}
              </div>
            </aside>

            {/* === MAIN CONTENT === */}
            <main className="flex-1 flex flex-col overflow-y-auto relative">
              <PromptDialog 
                isOpen={isPromptOpen}
                title="Name des neuen Mandanten:"
                onConfirm={(val) => { setIsPromptOpen(false); handleAddTenant(val); }}
                onCancel={() => setIsPromptOpen(false)}
              />
              <div className="flex-1 p-8">
                <Routes>
                  <Route path="/" element={<div className="p-8 text-center text-slate-500">Wählen Sie einen Arbeitsbereich links aus.</div>} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/matrix" element={<MasterMatrixView />} />
                  <Route path="/employees" element={<EmployeeView />} />
                  <Route path="/documents" element={<DocumentCenterView />} />
                  <Route path="/location/:id" element={<LocationDetailView />} />
                  <Route path="/work-area/:id/gbu/new" element={<GbuFormView />} />
                  <Route path="/work-area/:id/gbu/:inventoryId" element={<GbuFormView />} />
                  <Route path="/locations/:locationId/asbestos/:findingId/ba" element={<AsbestosDocumentView />} />
                  <Route path="/impressum" element={<ImpressumView />} />
                  <Route path="/datenschutz" element={<DatenschutzView />} />
                  
                  {/* ADMIN-only Routen */}
                  <Route path="/settings" element={
                    isAdmin ? <AdminSettings /> : <Navigate to="/dashboard" replace />
                  } />
                  
                  {/* LMS */}
                  <Route path="/lms/login" element={<EmployeeLoginView />} />
                  <Route path="/lms/training" element={<LmsEmployeeView />} />
                  <Route path="/lms/admin" element={
                    canManage ? <LmsAdminView /> : <Navigate to="/dashboard" replace />
                  } />
                  
                  <Route path="/work-area/:id" element={
                    <SubstanceList selectedIds={selectedIds} onSelectIds={setSelectedIds} />
                  } />
                  <Route path="/gefahrstoffe" element={<SubstanceList selectedIds={selectedIds} onSelectIds={setSelectedIds} />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
              
              <footer className="mt-auto py-4 px-8 border-t border-slate-200 bg-white flex justify-between items-center text-sm text-slate-500">
                <div className="flex gap-4">
                  <Link to="/impressum" className="hover:text-primary transition-colors">Impressum</Link>
                  <Link to="/datenschutz" className="hover:text-primary transition-colors">Datenschutz</Link>
                </div>
                <div>
                  &copy; {new Date().getFullYear()} Gefahrstoff-System
                </div>
              </footer>
            </main>
          </div>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <ToastProvider>
            <AppInner />
          </ToastProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;