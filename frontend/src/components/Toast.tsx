import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextType {
  toast: (type: 'success' | 'error' | 'info', message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

let nextId = 0;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-in ${colors[t.type]}`}
            style={{ animation: 'slideIn 0.3s ease-out' }}
          >
            {icons[t.type]}
            <p className="text-sm font-medium flex-1">{t.message}</p>
            <button onClick={() => removeToast(t.id)} className="opacity-60 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
