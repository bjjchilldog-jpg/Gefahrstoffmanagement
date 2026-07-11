import { useState, useRef, MouseEvent } from 'react';
import { Target, Check, Trash2, X, Maximize, Minimize } from 'lucide-react';

export interface HotspotZone {
  id: string;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  isCorrect: boolean;
  feedbackText: string;
}

interface HotspotEditorProps {
  imageUrl: string;
  zones: HotspotZone[];
  onChange: (zones: HotspotZone[]) => void;
}

export const HotspotEditor = ({ imageUrl, zones, onChange }: HotspotEditorProps) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentZone, setCurrentZone] = useState<Partial<HotspotZone> | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getCoordinates = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== containerRef.current && !(e.target as HTMLElement).tagName.toLowerCase().includes('img')) return;
    
    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentZone({ x, y, width: 0, height: 0, isCorrect: true, feedbackText: '' });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !currentZone) return;
    const { x, y } = getCoordinates(e);
    
    setCurrentZone({
      ...currentZone,
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y)
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentZone && currentZone.width && currentZone.width > 2 && currentZone.height && currentZone.height > 2) {
      const newZone: HotspotZone = {
        id: Math.random().toString(36).substr(2, 9),
        x: currentZone.x!,
        y: currentZone.y!,
        width: currentZone.width!,
        height: currentZone.height!,
        isCorrect: true,
        feedbackText: 'Hier liegt ein Fehler vor.'
      };
      onChange([...zones, newZone]);
      setSelectedZoneId(newZone.id);
    }
    setIsDrawing(false);
    setCurrentZone(null);
  };

  const updateSelectedZone = (updates: Partial<HotspotZone>) => {
    if (!selectedZoneId) return;
    onChange(zones.map(z => z.id === selectedZoneId ? { ...z, ...updates } : z));
  };

  const deleteSelectedZone = () => {
    if (!selectedZoneId) return;
    onChange(zones.filter(z => z.id !== selectedZoneId));
    setSelectedZoneId(null);
  };

  const selectedZone = zones.find(z => z.id === selectedZoneId);

  return (
    <div className={`flex gap-6 ${isFullscreen ? 'fixed inset-0 z-[100] bg-slate-50 p-6' : 'h-[600px]'}`}>
      <div className="flex-1 bg-slate-200 rounded-xl overflow-hidden relative shadow-inner flex items-center justify-center border-2 border-dashed border-slate-400">
        <button 
          onClick={() => setIsFullscreen(!isFullscreen)} 
          className="absolute top-4 right-4 z-20 bg-white p-2 rounded-lg shadow-md hover:bg-slate-50 text-slate-700 transition-colors"
          title={isFullscreen ? "Vollbild beenden" : "Vollbildmodus"}
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
        <div 
          ref={containerRef}
          className="relative inline-block cursor-crosshair max-h-full max-w-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img src={`${imageUrl}`} alt="Hotspot Base" className={`${isFullscreen ? 'max-h-[90vh]' : 'max-h-[600px]'} object-contain select-none pointer-events-none shadow-xl`} />
          
          {/* Render saved zones */}
          {zones.map(zone => (
            <div
              key={zone.id}
              onClick={(e) => { e.stopPropagation(); setSelectedZoneId(zone.id); }}
              className={`absolute border-2 transition-all cursor-pointer ${selectedZoneId === zone.id ? 'border-blue-500 bg-blue-500/20 z-10' : 'border-emerald-500 bg-emerald-500/20 hover:bg-emerald-500/40'}`}
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`
              }}
            >
              {selectedZoneId === zone.id && (
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">
                  <Target className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Render currently drawing zone */}
          {isDrawing && currentZone && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
              style={{
                left: `${currentZone.x}%`,
                top: `${currentZone.y}%`,
                width: `${currentZone.width}%`,
                height: `${currentZone.height}%`
              }}
            />
          )}
        </div>
      </div>

      <div className="w-80 bg-white border border-slate-200 rounded-xl p-4 overflow-y-auto shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-600" />
          Zonen-Editor
        </h3>
        <p className="text-sm text-slate-500 mb-6">Ziehen Sie auf dem Bild Rechtecke auf, um interaktive Bereiche ("Fehler") zu markieren.</p>
        
        {selectedZone ? (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <label className="block text-xs font-bold text-blue-800 mb-1">Feedback-Text (wenn angeklickt)</label>
              <textarea
                value={selectedZone.feedbackText}
                onChange={(e) => updateSelectedZone({ feedbackText: e.target.value })}
                className="w-full text-sm p-2 border border-blue-200 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                rows={3}
                placeholder="Erklären Sie, warum das ein Fehler ist..."
              />
            </div>
            
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input 
                type="checkbox" 
                checked={selectedZone.isCorrect} 
                onChange={(e) => updateSelectedZone({ isCorrect: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Dieser Bereich ist die "richtige" Lösung
            </label>

            <button 
              onClick={deleteSelectedZone}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" /> Zone löschen
            </button>
          </div>
        ) : (
          <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-lg">
            <p className="text-sm text-slate-400">Keine Zone ausgewählt. Klicken Sie auf eine Zone oder zeichnen Sie eine neue.</p>
          </div>
        )}
      </div>
    </div>
  );
};
