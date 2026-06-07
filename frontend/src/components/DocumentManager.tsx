import { useState } from 'react';
import { Upload, Edit2, FileText, FileVideo, Check, X } from 'lucide-react';

export const DocumentManager = ({ workAreaId }: { workAreaId: string }) => {
  const [documents, setDocuments] = useState<any[]>([
    { id: '1', originalName: 'SDB_Flusssäure_V2', type: 'PDF_SDB', date: '2023-10-01' },
    { id: '2', originalName: 'Unterweisung_Labor', type: 'VIDEO', date: '2023-11-15' },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // In a real app, send FormData to /api/documents/upload
    const file = e.target.files?.[0];
    if (file) {
      setDocuments([...documents, {
        id: Math.random().toString(),
        originalName: file.name.split('.')[0],
        type: file.type.startsWith('video/') ? 'VIDEO' : 'PDF_SDB',
        date: new Date().toISOString().split('T')[0]
      }]);
    }
  };

  const startEdit = (doc: any) => {
    setEditingId(doc.id);
    setEditName(doc.originalName);
  };

  const saveEdit = (id: string) => {
    // In a real app, send PUT to /api/documents/:id/rename
    setDocuments(docs => docs.map(d => d.id === id ? { ...d, originalName: editName } : d));
    setEditingId(null);
  };

  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-800">Dokumente & Medien</h3>
        <label className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors">
          <Upload className="h-4 w-4" />
          <span>Upload</span>
          <input type="file" className="hidden" onChange={handleUpload} accept="application/pdf,video/mp4,video/quicktime,image/*" />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map(doc => (
          <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              {doc.type === 'VIDEO' ? <FileVideo className="h-6 w-6 text-accent" /> : <FileText className="h-6 w-6 text-red-500" />}
              
              {editingId === doc.id ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="border border-accent rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-accent"
                    autoFocus
                  />
                  <button onClick={() => saveEdit(doc.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditingId(null)} className="text-red-600 hover:bg-red-50 p-1 rounded"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <div>
                  <div className="font-medium text-slate-800 text-sm flex items-center gap-2">
                    {doc.originalName}
                    <button onClick={() => startEdit(doc)} className="text-slate-400 hover:text-accent"><Edit2 className="h-3 w-3" /></button>
                  </div>
                  <div className="text-xs text-slate-500">{doc.date} • {doc.type}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
