import { useState } from 'react';
import { Type, Image as ImageIcon, FileText, Target, Trash2, Plus, MoveUp, MoveDown, Video, BookOpen } from 'lucide-react';
import { HotspotEditor, HotspotZone } from './HotspotEditor';

export interface LmsSlide {
  id: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'PDF' | 'HOTSPOT';
  text?: string;
  mediaUrl?: string;
  hotspots?: HotspotZone[];
  pdfPage?: number;
}

interface LmsSlideEditorProps {
  slides: LmsSlide[];
  onChange: (slides: LmsSlide[]) => void;
}

export const LmsSlideEditor = ({ slides, onChange }: LmsSlideEditorProps) => {
  const [activeSlideId, setActiveSlideId] = useState<string | null>(slides.length > 0 ? slides[0].id : null);
  const [isUploading, setIsUploading] = useState(false);

  const addSlide = (type: LmsSlide['type']) => {
    const newSlide: LmsSlide = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      text: type === 'TEXT' ? 'Neuer Text...' : '',
      mediaUrl: '',
      hotspots: type === 'HOTSPOT' ? [] : undefined
    };
    const newSlides = [...slides, newSlide];
    onChange(newSlides);
    setActiveSlideId(newSlide.id);
  };

  const updateSlide = (id: string, updates: Partial<LmsSlide>) => {
    onChange(slides.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSlide = (id: string) => {
    const newSlides = slides.filter(s => s.id !== id);
    onChange(newSlides);
    if (activeSlideId === id) {
      setActiveSlideId(newSlides.length > 0 ? newSlides[0].id : null);
    }
  };

  const moveSlide = (index: number, direction: 'UP' | 'DOWN') => {
    if ((direction === 'UP' && index === 0) || (direction === 'DOWN' && index === slides.length - 1)) return;
    const newIndex = direction === 'UP' ? index - 1 : index + 1;
    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[newIndex];
    newSlides[newIndex] = temp;
    onChange(newSlides);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, slideId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    setIsUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        updateSlide(slideId, { mediaUrl: data.url });
      }
    } catch (error) {
      alert('Upload fehlgeschlagen');
    } finally {
      setIsUploading(false);
    }
  };

  const activeSlide = slides.find(s => s.id === activeSlideId);
  const activeType = activeSlide ? activeSlide.type.toUpperCase() : null;

  return (
    <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white min-h-[800px]">
      {/* Sidebar: Slide List */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800 text-sm mb-3">Folien ({slides.length})</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => addSlide('TEXT')} className="flex flex-col items-center gap-1 p-2 bg-white border border-slate-200 rounded hover:bg-slate-50 text-xs font-medium text-slate-600 transition-colors"><Type className="w-4 h-4" /> Text</button>
            <button onClick={() => addSlide('IMAGE')} className="flex flex-col items-center gap-1 p-2 bg-white border border-slate-200 rounded hover:bg-slate-50 text-xs font-medium text-slate-600 transition-colors"><ImageIcon className="w-4 h-4" /> Bild</button>
            <button onClick={() => addSlide('VIDEO')} className="flex flex-col items-center gap-1 p-2 bg-white border border-slate-200 rounded hover:bg-slate-50 text-xs font-medium text-slate-600 transition-colors"><Video className="w-4 h-4" /> Video</button>
            <button onClick={() => addSlide('PDF')} className="flex flex-col items-center gap-1 p-2 bg-white border border-slate-200 rounded hover:bg-slate-50 text-xs font-medium text-slate-600 transition-colors"><FileText className="w-4 h-4" /> PDF</button>
            <button onClick={() => addSlide('HOTSPOT')} className="col-span-2 flex justify-center items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 rounded hover:bg-indigo-100 text-xs font-medium text-indigo-700 transition-colors"><Target className="w-4 h-4" /> Suchbild (Hotspots)</button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {slides.map((slide, index) => (
            <div 
              key={slide.id} 
              onClick={() => setActiveSlideId(slide.id)}
              className={`p-3 rounded-lg border cursor-pointer group flex items-center justify-between ${activeSlideId === slide.id ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex items-center gap-3 truncate">
                <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${activeSlideId === slide.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {index + 1}
                </div>
                <div className="truncate">
                  <p className="text-sm font-bold text-slate-700">{slide.type}</p>
                  <p className="text-xs text-slate-400 truncate w-24">{slide.text || slide.mediaUrl || 'Leer'}</p>
                </div>
              </div>
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); moveSlide(index, 'UP'); }} className="p-1 hover:bg-slate-200 rounded text-slate-500"><MoveUp className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); moveSlide(index, 'DOWN'); }} className="p-1 hover:bg-slate-200 rounded text-slate-500"><MoveDown className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area: Editor */}
      <div className="flex-1 bg-white flex flex-col relative">
        {activeSlide ? (
          <div className="p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {activeType === 'TEXT' && <Type className="w-5 h-5 text-indigo-600" />}
                {activeType === 'IMAGE' && <ImageIcon className="w-5 h-5 text-indigo-600" />}
                {activeType === 'VIDEO' && <Video className="w-5 h-5 text-indigo-600" />}
                {activeType === 'PDF' && <FileText className="w-5 h-5 text-indigo-600" />}
                {activeType === 'HOTSPOT' && <Target className="w-5 h-5 text-indigo-600" />}
                Folie bearbeiten
              </h2>
              <button onClick={() => deleteSlide(activeSlide.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
                <Trash2 className="w-4 h-4" /> Löschen
              </button>
            </div>

            {/* Editor Types */}
            {activeType === 'TEXT' && (
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Inhalt (Markdown unterstützt)</label>
                <textarea
                  value={activeSlide.text}
                  onChange={(e) => updateSlide(activeSlide.id, { text: e.target.value })}
                  className="w-full h-[600px] p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                />
              </div>
            )}

            {(activeType === 'IMAGE' || activeType === 'VIDEO' || activeType === 'PDF') && (
              <div className="space-y-6">
                <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center">
                  <input type="file" id="mediaUpload" className="hidden" accept={activeType === 'IMAGE' ? 'image/*' : activeType === 'VIDEO' ? 'video/*' : '.pdf'} onChange={(e) => handleFileUpload(e, activeSlide.id)} />
                  <label htmlFor="mediaUpload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> Datei hochladen
                  </label>
                  {isUploading && <p className="text-sm text-indigo-600 mt-2 font-medium">Lädt hoch...</p>}
                </div>

                {activeSlide.mediaUrl && (
                  <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
                    <div className="p-3 text-sm font-medium text-slate-600 bg-white border-b border-slate-200 flex justify-between items-center">
                      <span>Vorschau ({activeSlide.mediaUrl})</span>
                      {activeType === 'PDF' && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs">Seite (optional):</label>
                          <input 
                            type="number" 
                            min="1" 
                            className="w-16 p-1 border rounded text-xs text-slate-800" 
                            value={activeSlide.pdfPage || ''}
                            onChange={(e) => updateSlide(activeSlide.id, { pdfPage: e.target.value ? parseInt(e.target.value) : undefined })}
                            placeholder="Alle"
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex justify-center">
                      {activeType === 'IMAGE' && <img src={`${activeSlide.mediaUrl}`} alt="Preview" className="max-h-[600px] object-contain" />}
                      {activeType === 'VIDEO' && <video src={`${activeSlide.mediaUrl}`} controls className="max-h-[600px]" />}
                      {activeType === 'PDF' && <iframe src={`${activeSlide.mediaUrl}${activeSlide.pdfPage ? `#page=${activeSlide.pdfPage}` : ''}`} className="w-full h-[600px] border-0" />}
                    </div>
                  </div>
                )}
                
                <div className="pt-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Optionaler Begleittext</label>
                  <textarea
                    value={activeSlide.text || ''}
                    onChange={(e) => updateSlide(activeSlide.id, { text: e.target.value })}
                    className="w-full h-32 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Wird unter dem Medium angezeigt..."
                  />
                </div>
              </div>
            )}

            {activeType === 'HOTSPOT' && (
              <div className="space-y-6">
                {!activeSlide.mediaUrl ? (
                   <div className="p-10 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center">
                    <h3 className="font-bold text-slate-700 mb-2">Hintergrundbild für das Suchbild wählen</h3>
                    <input type="file" id="hotspotUpload" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, activeSlide.id)} />
                    <label htmlFor="hotspotUpload" className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm">
                      <ImageIcon className="w-5 h-5" /> Bild hochladen
                    </label>
                   </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Aufgabenstellung</label>
                        <input 
                          type="text" 
                          value={activeSlide.text || ''} 
                          onChange={(e) => updateSlide(activeSlide.id, { text: e.target.value })}
                          className="w-96 p-2 border border-slate-300 rounded-lg text-sm"
                          placeholder="z.B. Finden Sie die 3 Sicherheitsmängel im Bild!"
                        />
                      </div>
                      <button onClick={() => updateSlide(activeSlide.id, { mediaUrl: '' })} className="text-xs text-slate-500 hover:text-slate-700 underline">Neues Bild hochladen</button>
                    </div>
                    
                    <HotspotEditor 
                      imageUrl={activeSlide.mediaUrl}
                      zones={activeSlide.hotspots || []}
                      onChange={(hotspots) => updateSlide(activeSlide.id, { hotspots })}
                    />
                  </div>
                )}
              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <BookOpen className="w-16 h-16 mb-4 text-slate-200" />
            <p>Wählen Sie eine Folie aus oder erstellen Sie eine neue.</p>
          </div>
        )}
      </div>
    </div>
  );
};
