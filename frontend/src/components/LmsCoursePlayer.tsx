import { useState } from 'react';
import { ChevronRight, ChevronLeft, Target, CheckCircle, XCircle } from 'lucide-react';
import { LmsSlide } from './LmsSlideEditor';

interface LmsCoursePlayerProps {
  moduleTitle: string;
  slides: LmsSlide[];
  onComplete: (passed: boolean) => void;
  onCancel: () => void;
}

export const LmsCoursePlayer = ({ moduleTitle, slides, onComplete, onCancel }: LmsCoursePlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hotspotFeedback, setHotspotFeedback] = useState<{ x: number, y: number, text: string, isCorrect: boolean } | null>(null);
  
  if (!slides || slides.length === 0) {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col items-center justify-center">
        <p className="text-slate-500 mb-4">Dieses Modul enthält noch keine Inhalte.</p>
        <button onClick={onCancel} className="text-indigo-600 underline">Zurück</button>
      </div>
    );
  }

  const slide = slides[currentIndex];
  const isLast = currentIndex === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setHotspotFeedback(null);
    }
  };

  const handleHotspotClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (slide.type !== 'HOTSPOT' || !slide.hotspots) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if clicked inside any zone
    const clickedZone = slide.hotspots.find(z => 
      x >= z.x && x <= z.x + z.width &&
      y >= z.y && y <= z.y + z.height
    );

    if (clickedZone) {
      setHotspotFeedback({
        x, y,
        text: clickedZone.feedbackText,
        isCorrect: clickedZone.isCorrect
      });
    } else {
      setHotspotFeedback({
        x, y,
        text: 'Leider daneben! Versuchen Sie es noch einmal.',
        isCorrect: false
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950 text-white shrink-0">
        <h2 className="font-bold">{moduleTitle}</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">
            Folie {currentIndex + 1} von {slides.length}
          </span>
          <button onClick={onCancel} className="text-sm text-slate-400 hover:text-white transition-colors">Abbrechen</button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto flex justify-center items-center p-8">
        <div className="w-full max-w-5xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-full">
          
          <div className="flex-1 overflow-y-auto p-8 relative">
            {slide.type === 'TEXT' && (
              <div className="prose prose-slate max-w-none">
                <p className="text-lg whitespace-pre-wrap">{slide.text}</p>
              </div>
            )}

            {slide.type === 'IMAGE' && (
              <div className="flex flex-col items-center">
                {slide.mediaUrl && <img src={`http://localhost:3000${slide.mediaUrl}`} alt="Slide" className="max-h-[60vh] object-contain mb-6 rounded-lg" />}
                {slide.text && <p className="text-lg text-slate-700 text-center max-w-3xl">{slide.text}</p>}
              </div>
            )}

            {slide.type === 'VIDEO' && (
              <div className="flex flex-col items-center">
                {slide.mediaUrl && <video src={`http://localhost:3000${slide.mediaUrl}`} controls controlsList="nodownload" className="max-h-[60vh] rounded-lg mb-6 shadow-lg bg-black" />}
                {slide.text && <p className="text-lg text-slate-700 text-center max-w-3xl">{slide.text}</p>}
              </div>
            )}

            {slide.type === 'PDF' && (
              <div className="flex flex-col h-[70vh]">
                {slide.mediaUrl && <iframe src={`http://localhost:3000${slide.mediaUrl}${slide.pdfPage ? `#page=${slide.pdfPage}` : ''}`} className="w-full h-full border-0 rounded-lg shadow-sm" />}
                {slide.text && <p className="mt-4 text-slate-700 font-medium">{slide.text}</p>}
              </div>
            )}

            {slide.type === 'HOTSPOT' && (
              <div className="flex flex-col items-center">
                {slide.text && <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">{slide.text}</h3>}
                
                <div className="relative inline-block cursor-crosshair rounded-xl overflow-hidden shadow-lg border border-slate-200" onClick={handleHotspotClick}>
                  {slide.mediaUrl ? (
                    <img src={`http://localhost:3000${slide.mediaUrl}`} alt="Suchbild" className="max-h-[60vh] object-contain" />
                  ) : (
                    <div className="w-[800px] h-[500px] bg-slate-100 flex items-center justify-center text-slate-400">Kein Bild hochgeladen</div>
                  )}

                  {hotspotFeedback && (
                    <div 
                      className={`absolute z-20 flex flex-col items-center -translate-x-1/2 -translate-y-full pb-4`}
                      style={{ left: `${hotspotFeedback.x}%`, top: `${hotspotFeedback.y}%` }}
                    >
                      <div className={`p-3 rounded-lg shadow-xl text-white font-medium text-sm flex items-center gap-2 max-w-xs text-center ${hotspotFeedback.isCorrect ? 'bg-emerald-600' : 'bg-red-600'}`}>
                        {hotspotFeedback.isCorrect ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
                        {hotspotFeedback.text}
                      </div>
                      {/* Triangle Pointer */}
                      <div className={`w-4 h-4 rotate-45 -mt-2 ${hotspotFeedback.isCorrect ? 'bg-emerald-600' : 'bg-red-600'}`} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Footer Navigation */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
            <button 
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5 inline mr-1" /> Zurück
            </button>
            
            <button 
              onClick={handleNext}
              disabled={slide.type === 'HOTSPOT' && (!hotspotFeedback || !hotspotFeedback.isCorrect)}
              className={`px-8 py-3 rounded-lg font-bold text-white transition-all shadow-lg flex items-center gap-2
                ${(slide.type === 'HOTSPOT' && (!hotspotFeedback || !hotspotFeedback.isCorrect)) 
                  ? 'bg-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 hover:-translate-y-0.5'}
              `}
            >
              {isLast ? 'Unterweisung abschließen' : 'Weiter'}
              {!isLast && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
