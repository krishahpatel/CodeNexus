import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import CollaborativeEditor from './CollaborativeEditor';
import LandingPage from './LandingPage';
import './App.css';

// ─── Room Page ───────────────────────────────────────────────────────────────
// Everything that was in App before, now scoped to a specific room.
function RoomPage() {
  const { roomId } = useParams(); // reads roomId from /room/:roomId in the URL
  const navigate   = useNavigate();

  const [code, setCode]         = useState('');
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput]     = useState('');
  const [isError, setIsError]   = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    const timeout = setTimeout(() => autoSave(), 1000);
    return () => clearTimeout(timeout);
  }, [code, language]);

  const autoSave = async () => {
    if (!code || !code.trim()) return;
    try {
      setIsSaving(true);
      await fetch('http://localhost:3000/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      setIsSaving(false);
    } catch { setIsSaving(false); }
  };

  const runCode = async () => {
    if (!code || !code.trim()) return;
    setOutput('Running...');
    setIsError(false);
    try {
      const res  = await fetch('http://localhost:3000/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();
      if (res.ok) {
        setOutput(data.output || 'No output');
      } else {
        setOutput(data.error || 'Execution error.');
        setIsError(true);
      }
    } catch {
      setOutput('Server connection failed.');
      setIsError(true);
    }
  };

  const saveCode = async () => {
    if (!code || !code.trim()) return;
    try {
      setIsSaving(true);
      await fetch('http://localhost:3000/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      setIsSaving(false);
    } catch { setIsSaving(false); }
  };

  // Copy the current room link to clipboard so the user can share it easily.
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="app-wrapper">
      <div className="toolbar">
        {/* Back button → landing page */}
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          ← Home
        </button>

        <div className="brand-title">CodeNexus</div>

        {/* Room ID + copy link */}
        <span className="room-id" title="Click to copy link" onClick={copyLink}>
          📋 {roomId}
        </span>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="language-select"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="c">C</option>
          <option value="cpp">C++</option>
        </select>

        {isSaving && <span className="saving-text">Saving...</span>}

        <button onClick={saveCode} className="btn btn-secondary">Save</button>
        <button onClick={runCode}  className="btn btn-run">▶ Run</button>
      </div>

      <div className="editor-container">
        <CollaborativeEditor
          roomId={roomId}
          language={language}
          onCodeChange={(value) => setCode(value)}
        />
      </div>

      <div className="terminal-wrapper">
        <div className="terminal-header">Terminal Output</div>
        <pre className={`terminal-output ${isError ? 'terminal-error' : ''}`}>
          {output || 'Waiting for output...'}
        </pre>
      </div>
    </div>
  );
}

// ─── App (router) ────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      <Route path="/"            element={<LandingPage />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
    </Routes>
  );
}
