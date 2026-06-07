import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Building, FlaskConical, Copy, Info, Trash2, Edit2, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { PromptDialog } from './PromptDialog';

export const TreeView = ({ tenant }: any) => {
  const [isOpen, setIsOpen] = useState(true);
  const [promptConfig, setPromptConfig] = useState<{isOpen: boolean, type: string, title: string, initialValue: string}>({isOpen: false, type: '', title: '', initialValue: ''});

  const handleDelete = async (e: any) => {
    e.stopPropagation();
    if (!confirm(`Soll der Mandant '${tenant.name}' wirklich gelöscht werden?`)) return;
    try {
      await fetch(`http://localhost:3000/api/tenants/${tenant.id}`, { method: 'DELETE' });
      window.location.reload();
    } catch (err) {
      alert('Fehler beim Löschen des Mandanten.');
    }
  };

  const handleEdit = async (e: any) => {
    e.stopPropagation();
    setPromptConfig({isOpen: true, type: 'edit_tenant', title: 'Neuer Name für den Mandanten:', initialValue: tenant.name});
  };

  const handleAddLocation = async (e: any) => {
    e.stopPropagation();
    setPromptConfig({isOpen: true, type: 'add_location', title: `Neuer Standort für '${tenant.name}':`, initialValue: ''});
  };

  const handleConfirmPrompt = async (val: string) => {
    setPromptConfig({ ...promptConfig, isOpen: false });
    if (!val) return;
    try {
      if (promptConfig.type === 'edit_tenant') {
        if (val === tenant.name) return;
        await fetch(`http://localhost:3000/api/tenants/${tenant.id}`, { 
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: val })
        });
      } else if (promptConfig.type === 'add_location') {
        await fetch(`http://localhost:3000/api/tenants/${tenant.id}/locations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: val })
        });
      }
      window.location.reload();
    } catch (err) {
      alert('Fehler bei der Aktion.');
    }
  };

  return (
    <div className="mb-2">
      <div 
        className="flex items-center justify-between p-2 hover:bg-slate-100 rounded-lg cursor-pointer text-slate-800 group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          <Building className="h-4 w-4 text-accent" />
          <span className="font-medium text-sm">{tenant.name}</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={handleAddLocation}
            className="text-slate-300 hover:text-emerald-500 p-1"
            title="Neuen Standort hinzufügen"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button 
            onClick={handleEdit}
            className="text-slate-300 hover:text-blue-500 p-1"
            title="Mandant umbenennen"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button 
            onClick={handleDelete}
            className="text-slate-300 hover:text-red-500 p-1"
            title="Mandant löschen"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      {isOpen && (
        <div className="ml-4 border-l border-slate-200 pl-2 mt-1 flex flex-col gap-1">
          {tenant.locations.map((location: any) => (
            <LocationNode key={location.id} location={location} />
          ))}
        </div>
      )}

      <PromptDialog 
        isOpen={promptConfig.isOpen}
        title={promptConfig.title}
        initialValue={promptConfig.initialValue}
        onConfirm={handleConfirmPrompt}
        onCancel={() => setPromptConfig({ ...promptConfig, isOpen: false })}
      />
    </div>
  );
};

const LocationNode = ({ location }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{isOpen: boolean, type: string, title: string, initialValue: string}>({isOpen: false, type: '', title: '', initialValue: ''});

  const handleCloneLocation = async (e: any) => {
    e.stopPropagation();
    if (!confirm(`Gesamten Standort '${location.name}' mit allen Bereichen und Stoffen klonen?`)) return;
    setIsCloning(true);
    try {
      await fetch(`http://localhost:3000/api/tenants/locations/${location.id}/clone`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      window.location.reload();
    } catch (err) {
      alert('Fehler beim Klonen des Standorts');
    } finally {
      setIsCloning(false);
    }
  };

  const handleAddWorkArea = async (e: any) => {
    e.stopPropagation();
    setPromptConfig({isOpen: true, type: 'add_workarea', title: `Neuer Arbeitsbereich für '${location.name}':`, initialValue: ''});
  };

  const handleEditLocation = async (e: any) => {
    e.stopPropagation();
    setPromptConfig({isOpen: true, type: 'edit_location', title: 'Neuer Name für den Standort:', initialValue: location.name});
  };

  const handleDeleteLocation = async (e: any) => {
    e.stopPropagation();
    if (!confirm(`Soll der Standort '${location.name}' wirklich gelöscht werden?`)) return;
    try {
      await fetch(`http://localhost:3000/api/tenants/locations/${location.id}`, { method: 'DELETE' });
      window.location.reload();
    } catch (err) {
      alert('Fehler beim Löschen des Standorts.');
    }
  };

  const handleConfirmPrompt = async (val: string) => {
    setPromptConfig({ ...promptConfig, isOpen: false });
    if (!val) return;
    try {
      if (promptConfig.type === 'edit_location') {
        if (val === location.name) return;
        await fetch(`http://localhost:3000/api/tenants/locations/${location.id}`, { 
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: val })
        });
      } else if (promptConfig.type === 'add_workarea') {
        await fetch(`http://localhost:3000/api/tenants/locations/${location.id}/work-areas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: val })
        });
      }
      window.location.reload();
    } catch (err) {
      alert('Fehler bei der Aktion.');
    }
  };

  const navigate = useNavigate();

  return (
    <div>
      <div 
        className="flex items-center justify-between p-2 hover:bg-slate-100 rounded-lg cursor-pointer text-slate-700 group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          {isOpen ? <FolderOpen className="h-4 w-4 text-yellow-500" /> : <Folder className="h-4 w-4 text-yellow-500" />}
          <span className="text-sm">{location.name}</span>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Info-Icon für Asbest-Kataster & Location Details */}
          <button 
            onClick={handleAddWorkArea}
            className="text-slate-300 hover:text-emerald-500 p-1"
            title="Neuen Arbeitsbereich hinzufügen"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button 
            onClick={handleEditLocation}
            className="text-slate-300 hover:text-blue-500 p-1"
            title="Standort umbenennen"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); navigate(`/location/${location.id}`); }}
            className="text-slate-300 hover:text-indigo-600 p-1"
            title="Standort-Details & Asbest-Kataster"
          >
            <Info className="h-3 w-3" />
          </button>
          <button 
            onClick={handleCloneLocation} 
            disabled={isCloning}
            className="text-slate-300 hover:text-indigo-600 p-1 disabled:opacity-50"
            title="Gesamten Standort klonen"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button 
            onClick={handleDeleteLocation}
            className="text-slate-300 hover:text-red-500 p-1"
            title="Standort löschen"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="ml-4 border-l border-slate-200 pl-2 mt-1 flex flex-col gap-1">
          {location.workAreas.map((area: any) => (
            <WorkAreaNode key={area.id} area={area} />
          ))}
        </div>
      )}

      <PromptDialog 
        isOpen={promptConfig.isOpen}
        title={promptConfig.title}
        initialValue={promptConfig.initialValue}
        onConfirm={handleConfirmPrompt}
        onCancel={() => setPromptConfig({ ...promptConfig, isOpen: false })}
      />
    </div>
  );
};

const WorkAreaNode = ({ area, level = 0 }: { area: any, level?: number }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{isOpen: boolean, type: string, initialValue: string}>({isOpen: false, type: '', initialValue: ''});

  const handleEditWorkArea = async (e: any) => {
    e.stopPropagation();
    setPromptConfig({isOpen: true, type: 'edit', initialValue: area.name});
  };

  const handleAddSubArea = async (e: any) => {
    e.stopPropagation();
    setPromptConfig({isOpen: true, type: 'add_sub', initialValue: ''});
  };

  const handleDeleteWorkArea = async (e: any) => {
    e.stopPropagation();
    if (!confirm(`Soll der Bereich '${area.name}' wirklich gelöscht werden?`)) return;
    try {
      await fetch(`http://localhost:3000/api/tenants/work-areas/${area.id}`, { method: 'DELETE' });
      window.location.reload();
    } catch (err) {
      alert('Fehler beim Löschen.');
    }
  };

  const handleConfirmPrompt = async (val: string) => {
    setPromptConfig({ isOpen: false, type: '', initialValue: '' });
    if (!val) return;
    try {
      if (promptConfig.type === 'edit') {
        if (val === area.name) return;
        await fetch(`http://localhost:3000/api/tenants/work-areas/${area.id}`, { 
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: val })
        });
      } else if (promptConfig.type === 'add_sub') {
        await fetch(`http://localhost:3000/api/tenants/locations/${area.locationId}/work-areas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: val, parentId: area.id })
        });
      }
      window.location.reload();
    } catch (err) {
      alert('Fehler bei der Aktion.');
    }
  };

  const hasChildren = area.children && area.children.length > 0;

  return (
    <div>
      <div 
        className={`flex items-center justify-between p-2 hover:bg-slate-100 rounded-lg cursor-pointer text-slate-700 group ${level > 0 ? 'ml-4 border-l border-slate-200 pl-2' : ''}`}
        onClick={() => navigate(`/work-area/${area.id}`)}
      >
        <div className="flex items-center gap-2">
          {hasChildren && (
            <div onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-0.5 hover:bg-slate-200 rounded">
              {isOpen ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
            </div>
          )}
          {!hasChildren && <div className="w-4" />}
          <FlaskConical className={`h-4 w-4 ${level > 0 ? 'text-blue-400' : 'text-emerald-500'}`} />
          <span className={`text-sm ${level > 0 ? 'text-slate-600' : ''}`}>{area.name}</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={handleAddSubArea}
            className="text-slate-300 hover:text-emerald-500 p-1"
            title="Tätigkeitsfeld (Unterbereich) hinzufügen"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button 
            onClick={handleEditWorkArea}
            className="text-slate-300 hover:text-blue-500 p-1"
            title="Bereich umbenennen"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button 
            onClick={handleDeleteWorkArea}
            className="text-slate-300 hover:text-red-500 p-1"
            title="Bereich löschen"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      {hasChildren && isOpen && (
        <div className="flex flex-col gap-1 mt-1">
          {area.children.map((child: any) => (
            <WorkAreaNode key={child.id} area={child} level={level + 1} />
          ))}
        </div>
      )}
      
      <PromptDialog 
        isOpen={promptConfig.isOpen}
        title={promptConfig.type === 'edit' ? "Neuer Name:" : "Neues Tätigkeitsfeld:"}
        initialValue={promptConfig.initialValue}
        onConfirm={handleConfirmPrompt}
        onCancel={() => setPromptConfig({ isOpen: false, type: '', initialValue: '' })}
      />
    </div>
  );
};
