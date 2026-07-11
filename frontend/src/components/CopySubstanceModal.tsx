import { useState, useEffect } from 'react';
import Draggable from 'react-draggable';
const DraggableComponent = Draggable as any;

export const CopySubstanceModal = ({
  isOpen,
  onClose,
  onConfirm,
  substanceName
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetWorkAreaId: string) => void;
  substanceName: string;
}) => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedWorkArea, setSelectedWorkArea] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetch('http://localhost:3000/api/tenants')
        .then(res => res.json())
        .then(data => setTenants(data))
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderWorkAreaOptions = (areas: any[], level = 0) => {
    let options: React.ReactNode[] = [];
    const indent = String.fromCharCode(160).repeat(level * 4); // non-breaking spaces for indentation
    
    areas.forEach(wa => {
      options.push(
        <option key={wa.id} value={wa.id}>
          {indent}{level === 0 ? '📁 ' : '↳ '}{wa.name}
        </option>
      );
      if (wa.children && wa.children.length > 0) {
        options = options.concat(renderWorkAreaOptions(wa.children, level + 1));
      }
    });
    return options;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      {/* Background overlay (not pointer-events-none, to block background clicks) */}
      <div className="fixed inset-0 bg-black/50 pointer-events-auto" onClick={onClose}></div>
      
      <DraggableComponent handle=".drag-handle">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full flex flex-col pointer-events-auto relative overflow-hidden" style={{ minHeight: '400px' }}>
          
          {/* Header / Drag Handle */}
          <div className="drag-handle bg-slate-100 border-b border-slate-200 p-4 cursor-move flex justify-between items-center select-none">
            <h3 className="text-lg font-bold text-slate-800 m-0">Stoff in anderen Bereich kopieren</h3>
            <div className="text-slate-400 text-sm flex items-center gap-2">
              <span className="text-xl leading-none">&times;</span>
            </div>
          </div>
          
          <div className="p-6 flex-1 flex flex-col">
            <p className="text-sm text-slate-600 mb-6">Wohin soll <strong>{substanceName}</strong> kopiert werden?</p>
            
            <select 
              className="w-full p-3 border border-slate-300 rounded mb-6 focus:ring-2 focus:ring-blue-500 bg-white"
              value={selectedWorkArea}
              onChange={(e) => setSelectedWorkArea(e.target.value)}
              size={12} // Make it a listbox so it's larger
            >
              <option value="" disabled>-- Zielbereich auswählen --</option>
              {tenants.map(t => (
                t.locations?.map((loc: any) => (
                  <optgroup label={`🏢 Firma: ${t.name} | 📍 ${loc.name}`} key={loc.id}>
                    {loc.workAreas && renderWorkAreaOptions(loc.workAreas)}
                  </optgroup>
                ))
              ))}
            </select>

            <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-slate-100">
              <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded transition-colors">Abbrechen</button>
              <button 
                onClick={() => onConfirm(selectedWorkArea)} 
                disabled={!selectedWorkArea}
                className="px-5 py-2.5 bg-blue-600 font-medium text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Kopieren
              </button>
            </div>
          </div>
        </div>
      </DraggableComponent>
    </div>
  );
};
