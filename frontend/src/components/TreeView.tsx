import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Building, Building2, MapPin, FlaskConical, Copy, Info, Trash2, Edit2, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { PromptDialog } from './PromptDialog';

export const TreeView = ({ tenant }: any) => {
  const [isOpen, setIsOpen] = useState(true);
  const [promptConfig, setPromptConfig] = useState<{isOpen: boolean, type: string, title: string, initialValue: string}>({isOpen: false, type: '', title: '', initialValue: ''});

  const handleDelete = async (e: any) => {
    e.stopPropagation();
    if (!confirm(`Soll die Firma '${tenant.name}' wirklich gelöscht werden?`)) return;
    try {
      await fetch(`http://localhost:3000/api/tenants/${tenant.id}`, { method: 'DELETE' });
      window.location.reload();
    } catch (err) {
      alert('Fehler beim Löschen der Firma.');
    }
  };

  const handleEdit = async (e: any) => {
    e.stopPropagation();
    setPromptConfig({isOpen: true, type: 'edit_tenant', title: 'Neuer Name für die Firma:', initialValue: tenant.name});
  };

  const handleAddLocation = async (e: any) => {
    e.stopPropagation();
    setPromptConfig({isOpen: true, type: 'add_location', title: `Neuer Standort (z.B. Hauptwerk, Filiale München) für '${tenant.name}':`, initialValue: ''});
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
        className="flex items-center justify-between p-2 hover:bg-slate-100 rounded-lg cursor-pointer text-slate-800 group border border-transparent hover:border-slate-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          <Building2 className="h-5 w-5 text-indigo-600" />
          <div className="flex flex-col min-w-0 flex-1 pr-2">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider leading-none mb-0.5 truncate">Firma / Mandant</span>
            <span className="font-bold text-sm leading-none truncate">{tenant.name}</span>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button 
            onClick={handleAddLocation}
            className="text-slate-400 hover:text-emerald-600 p-1 bg-white shadow-sm rounded border border-slate-200 flex items-center gap-1 text-xs font-medium px-2"
            title="Neuen Standort hinzufügen"
          >
            <Plus className="h-3 w-3" /> Standort
          </button>
          <button 
            onClick={handleEdit}
            className="text-slate-400 hover:text-blue-600 p-1.5 bg-white shadow-sm rounded border border-slate-200"
            title="Firma umbenennen"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button 
            onClick={handleDelete}
            className="text-slate-400 hover:text-red-600 p-1.5 bg-white shadow-sm rounded border border-slate-200"
            title="Firma löschen"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      {isOpen && (
        <div className="ml-5 border-l-2 border-indigo-100 pl-3 mt-2 flex flex-col gap-2">
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
    if (!confirm(`Gesamten Standort '${location.name}' mit allen Abteilungen und Stoffen klonen?`)) return;
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
    setPromptConfig({isOpen: true, type: 'add_workarea', title: `Neue Abteilung / Bereich für Standort '${location.name}':`, initialValue: ''});
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

  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const type = e.dataTransfer.getData('type');
    if (type === 'workArea') {
      const id = e.dataTransfer.getData('id');
      try {
        await fetch(`http://localhost:3000/api/tenants/work-areas/${id}/move`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetLocationId: location.id, targetParentId: null })
        });
        window.location.reload();
      } catch (err) {
        alert('Fehler beim Verschieben.');
      }
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
        className={`flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-slate-700 group border bg-white shadow-sm transition-colors ${isDragOver ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100' : 'border-slate-100'}`}
        onClick={() => setIsOpen(!isOpen)}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          <MapPin className="h-4 w-4 text-emerald-600" />
          <div className="flex flex-col min-w-0 flex-1 pr-2">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider leading-none mb-0.5 truncate">Standort</span>
            <span className="font-semibold text-sm leading-none truncate">{location.name}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button 
            onClick={handleAddWorkArea}
            className="text-slate-400 hover:text-blue-600 p-1 bg-slate-50 rounded border border-slate-200 flex items-center gap-1 text-xs font-medium px-2"
            title="Neue Abteilung hinzufügen"
          >
            <Plus className="h-3 w-3" /> Abteilung
          </button>
          <button 
            onClick={handleEditLocation}
            className="text-slate-400 hover:text-blue-600 p-1.5 bg-slate-50 rounded border border-slate-200"
            title="Standort umbenennen"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); navigate(`/location/${location.id}`); }}
            className="text-slate-400 hover:text-indigo-600 p-1.5 bg-slate-50 rounded border border-slate-200"
            title="Standort-Details & Asbest-Kataster"
          >
            <Info className="h-3 w-3" />
          </button>
          <button 
            onClick={handleCloneLocation} 
            disabled={isCloning}
            className="text-slate-400 hover:text-indigo-600 p-1.5 bg-slate-50 rounded border border-slate-200 disabled:opacity-50"
            title="Gesamten Standort klonen"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button 
            onClick={handleDeleteLocation}
            className="text-slate-400 hover:text-red-600 p-1.5 bg-slate-50 rounded border border-slate-200"
            title="Standort löschen"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="ml-5 border-l-2 border-emerald-100 pl-3 mt-2 flex flex-col gap-1.5">
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
  const [isOpen, setIsOpen] = useState(true);
  const [isCloning, setIsCloning] = useState(false);
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

  const handleCloneWorkArea = async (e: any) => {
    e.stopPropagation();
    if (!confirm(`Soll der Bereich '${area.name}' mit allen Untergruppen und Stoffen geklont werden?`)) return;
    setIsCloning(true);
    try {
      await fetch(`http://localhost:3000/api/tenants/work-areas/${area.id}/clone`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      window.location.reload();
    } catch (err) {
      alert('Fehler beim Klonen.');
    } finally {
      setIsCloning(false);
    }
  };

  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const type = e.dataTransfer.getData('type');
    if (type === 'workArea') {
      const id = e.dataTransfer.getData('id');
      if (id === area.id) return; // Cannot drop onto itself
      try {
        await fetch(`http://localhost:3000/api/tenants/work-areas/${id}/move`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetLocationId: area.locationId, targetParentId: area.id })
        });
        window.location.reload();
      } catch (err) {
        alert('Fehler beim Verschieben.');
      }
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('type', 'workArea');
    e.dataTransfer.setData('id', area.id);
    e.dataTransfer.setData('locationId', area.locationId);
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
  const isDepartment = level === 0;

  return (
    <div>
      <div 
        draggable
        onDragStart={handleDragStart}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg cursor-pointer text-slate-700 group transition-colors ${isDepartment ? 'bg-slate-50 border' : 'ml-4 border-l-2 pl-3'} ${isDragOver ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' : (isDepartment ? 'border-slate-100' : 'border-blue-100')}`}
        onClick={() => {
          setIsOpen(!isOpen);
          navigate(`/work-area/${area.id}`);
        }}
      >
        <div className="flex items-center gap-2">
          {hasChildren && (
            <div className="p-0.5 rounded">
              {isOpen ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
            </div>
          )}
          {!hasChildren && <div className="w-4" />}
          
          {isDepartment ? (
             <Folder className="h-4 w-4 text-blue-500" />
          ) : (
             <FlaskConical className="h-4 w-4 text-amber-500" />
          )}
          
          <div className="flex flex-col min-w-0 flex-1 pr-2">
            <span className={`text-[9px] font-bold uppercase tracking-wider leading-none mb-0.5 truncate ${isDepartment ? 'text-blue-500' : 'text-amber-500'}`}>
              {isDepartment ? 'Abteilung / Bereich' : 'Tätigkeit / Unterbereich'}
            </span>
            <span className={`text-sm leading-none truncate ${isDepartment ? 'font-medium' : ''}`}>{area.name}</span>
          </div>
        </div>
        
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button 
            onClick={handleAddSubArea}
            className="text-slate-400 hover:text-amber-500 p-1 bg-white rounded shadow-sm border border-slate-200 flex items-center gap-1 text-[10px] font-medium px-1.5"
            title="Tätigkeit / Unterbereich hinzufügen"
          >
            <Plus className="h-3 w-3" /> Tätigkeit
          </button>
          <button 
            onClick={handleCloneWorkArea}
            disabled={isCloning}
            className="text-slate-400 hover:text-indigo-600 p-1.5 bg-white rounded shadow-sm border border-slate-200 disabled:opacity-50"
            title="Diesen Bereich samt Inhalt klonen"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button 
            onClick={handleEditWorkArea}
            className="text-slate-400 hover:text-blue-500 p-1.5 bg-white rounded shadow-sm border border-slate-200"
            title="Umbenennen"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button 
            onClick={handleDeleteWorkArea}
            className="text-slate-400 hover:text-red-500 p-1.5 bg-white rounded shadow-sm border border-slate-200"
            title="Löschen"
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
        title={promptConfig.type === 'edit' ? "Neuer Name:" : "Neue Tätigkeit / Unterbereich:"}
        initialValue={promptConfig.initialValue}
        onConfirm={handleConfirmPrompt}
        onCancel={() => setPromptConfig({ isOpen: false, type: '', initialValue: '' })}
      />
    </div>
  );
};
