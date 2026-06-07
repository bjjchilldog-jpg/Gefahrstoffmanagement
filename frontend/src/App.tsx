import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { TreeView } from './components/TreeView';
import { SubstanceList } from './components/SubstanceList';
import { Dashboard } from './components/Dashboard';
import { FireDepartmentView } from './pages/FireDepartmentView';
import { Login } from './components/login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Building2, Flame, Settings, FileText, Users, BookOpen, Award, Plus, Smartphone } from 'lucide-react';
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
import { MobileAppView } from './pages/MobileAppView';

function App() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [cdSettings, setCdSettings] = useState({ primaryColor: '#0f172a', logoBase64: '' });

  const handleAddTenant = async (name: string) => {
    if (!name) return;
    try {
      const res = await fetch('http://localhost:3000/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      alert('Fehler beim Erstellen.');
    }
  };

  useEffect(() => {
    fetch('http://localhost:3000/api/tenants')
      .then(res => res.json())
      .then(data => setTenants(data))
      .catch(err => console.error("Fehler beim Laden der Mandanten:", err));

    fetch('http://localhost:3000/api/settings/default-tenant-id')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setCdSettings(data);
          if (data.primaryColor) {
            document.documentElement.style.setProperty('--color-primary', data.primaryColor);
          }
        }
      })
      .catch(console.error);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/fire-department" element={
          <ProtectedRoute>
            <FireDepartmentView />
          </ProtectedRoute>
        } />
        
        <Route path="/mobile" element={
          <ProtectedRoute>
            <MobileAppView />
          </ProtectedRoute>
        } />

        <Route path="/*" element={
          <ProtectedRoute>
            <div className="flex h-screen bg-slate-50">
              <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
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
                      <Link to="/employees" className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded font-medium transition-colors" title="Personal">
                        <Users className="w-4 h-4" />
                      </Link>
                      <Link to="/documents" className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded font-medium transition-colors" title="Dokumenten-Center">
                        <FileText className="w-4 h-4" />
                      </Link>
                      <Link to="/lms-admin" className="flex-1 flex items-center justify-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2 rounded font-medium transition-colors" title="LMS Verwaltung">
                        <BookOpen className="w-4 h-4" />
                      </Link>
                      <Link to="/lms-training" className="flex-1 flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-2 rounded font-medium transition-colors" title="Lernportal">
                        <Award className="w-4 h-4" />
                      </Link>
                      <Link to="/settings" className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded font-medium transition-colors" title="Einstellungen">
                        <Settings className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
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
                    <button onClick={() => setIsPromptOpen(true)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors" title="Neuen Mandant anlegen">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {tenants.map(tenant => <TreeView key={tenant.id} tenant={tenant} />)}
                </div>
              </aside>

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
                    <Route path="/work-area/:workAreaId/asbestos/:inventoryId/document/:docType" element={<AsbestosDocumentView />} />
                    <Route path="/impressum" element={<ImpressumView />} />
                    <Route path="/datenschutz" element={<DatenschutzView />} />
                    <Route path="/settings" element={<AdminSettings />} />
                    <Route path="/lms-admin" element={<LmsAdminView />} />
                    <Route path="/lms-training" element={<LmsEmployeeView />} />
                    <Route path="/work-area/:id" element={
                      <SubstanceList 
                        selectedIds={selectedIds}
                        onSelectIds={setSelectedIds}
                      />
                    } />
                    <Route path="/gefahrstoffe" element={<SubstanceList selectedIds={selectedIds} onSelectIds={setSelectedIds} />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </div>
                
                {/* Modul 13: Systemweiter Footer */}
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
    </Router>
  );
}
export default App;