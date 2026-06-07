import { useState, useEffect } from 'react';

export const PromptDialog = ({ 
  isOpen, 
  title, 
  initialValue = '', 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean, 
  title: string, 
  initialValue?: string, 
  onConfirm: (val: string) => void, 
  onCancel: () => void 
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
        <input
          type="text"
          className="w-full p-2 border border-slate-300 rounded mb-4 focus:ring-2 focus:ring-blue-500"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm(value);
            if (e.key === 'Escape') onCancel();
          }}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded transition-colors">Abbrechen</button>
          <button onClick={() => onConfirm(value)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Speichern</button>
        </div>
      </div>
    </div>
  );
};
