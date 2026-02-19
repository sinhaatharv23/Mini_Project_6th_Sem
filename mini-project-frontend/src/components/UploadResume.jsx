import React, { useState, useEffect } from 'react';
import { Upload, Save, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function UploadResume({ userId, onSave, existingData }) {
  const [structured, setStructured] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // New state for JSON editor
  const [jsonText, setJsonText] = useState('');
  const [isValidJson, setIsValidJson] = useState(true);

  useEffect(() => {
    if (existingData) {
      setStructured(existingData);
      setJsonText(JSON.stringify(existingData, null, 2));
      setIsSaved(true);
      setIsValidJson(true);
    }
  }, [existingData]);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setIsSaved(false);
    setMessage('');

    const fd = new FormData();
    fd.append('file', file);
    fd.append('user_id', userId);
    try {
      const resp = await fetch('http://localhost:5000/resume/upload', { method: 'POST', body: fd });
      const json = await resp.json();
      console.log('Upload response:', json);

      if (!resp.ok) {
        setMessage(json.error || 'Upload failed');
        return;
      }

      let data = {};
      if (json.resume && json.resume.structured) {
        data = json.resume.structured;
      } else if (json.structured) {
        data = json.structured;
      }

      console.log('Extracted structured data:', data);

      if (!data || Object.keys(data).length === 0) {
        setMessage('⚠️ Warning: Resume parsed but structured data is empty. Check server logs.');
      } else {
        setMessage('✅ Resume parsed successfully! Please review and save.');
      }

      setStructured(data);
      setJsonText(JSON.stringify(data, null, 2));
      setIsValidJson(true);
    } catch (err) {
      console.error('Upload error:', err);
      setMessage(`❌ Upload error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      const resp = await fetch('http://localhost:5000/resume/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, structured })
      });
      const json = await resp.json();
      if (resp.ok) {
        setMessage('Resume saved successfully.');
        setIsSaved(true);
        if (onSave) onSave();
      } else {
        setMessage(json.error || 'Save failed');
      }
    } catch (err) {
      console.error(err);
      setMessage('Save error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-8 text-center transition-colors group cursor-pointer relative">
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
          {loading ? <RefreshCw className="animate-spin text-blue-400" /> : <Upload className="text-slate-400 group-hover:text-blue-400" size={32} />}
        </div>
        <p className="text-slate-300 font-medium">Click to upload or drag and drop</p>
        <p className="text-slate-500 text-sm mt-1">PDF, DOCX, or TXT (Max 5MB)</p>
      </div>

      {/* Message Area */}
      {message && (
        <div className={`p-4 rounded-xl flex items-start gap-3 ${message.includes('error') || message.includes('failed') ? 'bg-red-500/10 text-red-300' : 'bg-green-500/10 text-green-300'
          }`}>
          {message.includes('error') || message.includes('failed') ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span className="text-sm">{message}</span>
        </div>
      )}

      {/* Editor & Actions */}
      {structured && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-slate-400 text-sm font-medium flex items-center gap-2">
                <FileText size={16} /> JSON Editor
              </h4>
              <span className="text-xs text-slate-600">Edit directly if needed</span>
            </div>
            <textarea
              className={`w-full bg-slate-900 text-slate-300 font-mono text-xs p-4 rounded-lg focus:outline-none focus:ring-1 border resize-y ${isValidJson ? 'border-slate-800 focus:ring-blue-500/50' : 'border-red-500 focus:ring-red-500/50'}`}
              style={{ minHeight: '300px', maxHeight: '500px' }}
              value={jsonText}
              onChange={(e) => {
                const text = e.target.value;
                setJsonText(text);
                setIsSaved(false);
                try {
                  const parsed = JSON.parse(text);
                  setStructured(parsed);
                  setIsValidJson(true);
                } catch {
                  setIsValidJson(false);
                }
              }}
            />
            {!isValidJson && <span className="text-xs text-red-500">Invalid JSON</span>}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={loading || !isValidJson}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all
                    ${isSaved
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20'}
                    ${loading || !isValidJson ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
              {isSaved ? <CheckCircle size={18} /> : <Save size={18} />}
              {isSaved ? 'Saved' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
