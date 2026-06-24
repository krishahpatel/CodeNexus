import { Routes, Route, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import CollaborativeEditor from './CollaborativeEditor';
import LandingPage from './LandingPage';
import './App.css';

function RoomPage() {
  const API = import.meta.env.VITE_BACKEND_HTTP;
  const { roomId } = useParams();
  const navigate   = useNavigate();
  const [searchParams] = useSearchParams();
  const isViewer = searchParams.get('view') === '1';

  const [code, setCode]         = useState('');
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput]     = useState('');
  const [isError, setIsError]   = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // History state
  const [history, setHistory]           = useState([]);
  const [showHistory, setShowHistory]   = useState(false);

  const [stdin, setStdin] = useState('');

  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    const timeout = setTimeout(() => autoSave(), 1000);
    return () => clearTimeout(timeout);
  }, [code, language]);

  // Fetch history whenever the panel is opened
  useEffect(() => {
    if (showHistory) fetchHistory();
  }, [showHistory]);

  const fetchHistory = async () => {
    try {
      const res  = await fetch(`${API}/api/history/${roomId}`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      setHistory([]);
    }
  };

  const autoSave = async () => {
    if (!code || !code.trim()) return;
    try {
      setIsSaving(true);
      await fetch('${API}/api/save', {
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
      const res  = await fetch('${API}/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, roomId, stdin }), // roomId added
      });
      const data = await res.json();
      if (res.ok) {
        setOutput(data.output || 'No output');
        // Refresh history panel if it's open
        if (showHistory) fetchHistory();
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
      await fetch('${API}/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      setIsSaving(false);
    } catch { setIsSaving(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const copyViewLink = () => {
    const base = window.location.href.split('?')[0]; // strip any existing query params first
    navigator.clipboard.writeText(base + '?view=1');
  };

  // Format unix timestamp to readable string
  const formatTime = (ts) => {
    return new Date(ts * 1000).toLocaleTimeString();
  };

  return (
    <div className="app-wrapper">
      <div className="toolbar">
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          ← Home
        </button>

        <div className="brand-title">CodeNexus</div>

        {/* Edit link — only for editors */}
        {!isViewer && (
          <span className="room-id" title="Click to copy edit link" onClick={copyLink}>
            📋 {roomId}
          </span>
        )}

        {/* View link — show for everyone, but label differs */}
        <span className="room-id" title="Click to copy view-only link" onClick={copyViewLink}>
          {isViewer ? '👁 Share view link' : '👁 View link'}
        </span>

        {!isViewer && (
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
        )}

        {isSaving && <span className="saving-text">Saving...</span>}

        {!isViewer && <button onClick={saveCode} className="btn btn-secondary">Save</button>}
        {!isViewer && <button onClick={runCode}  className="btn btn-run">▶ Run</button>}

        {/* Toggle history panel */}
        {!isViewer && (
          <button
            className={`btn btn-secondary ${showHistory ? 'btn-active' : ''}`}
            onClick={() => setShowHistory((prev) => !prev)}
          >
            📜 History
          </button>
        )}
      </div>

      <div className="editor-container">
        <CollaborativeEditor
          roomId={roomId}
          language={language}
          onCodeChange={(value) => setCode(value)}
          onLanguageChange={(lang) => setLanguage(lang)}
          readOnly={isViewer}
        />
      </div>

      {/* ── Terminal output & stdin ── */}
      {!isViewer && (
        <div className="bottom-section">
          <div className="terminal-wrapper">
            <div className="terminal-header">Terminal Output</div>
            <pre className={`terminal-output ${isError ? 'terminal-error' : ''}`}>
              {output || 'Waiting for output...'}
            </pre>
          </div>

          <div className="stdin-wrapper">
            <div className="terminal-header">Input (stdin)</div>
            <textarea
              className="stdin-input"
              placeholder="Provide input for your program here..."
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      )}

      {/* ── Execution history panel ── */}
      {showHistory && (
        <div className="history-panel">
          <div className="history-header">
            <span>Run History — {roomId}</span>
            <button className="history-close" onClick={() => setShowHistory(false)}>✕</button>
          </div>

          {history.length === 0 ? (
            <p className="history-empty">No runs yet for this room.</p>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="history-entry">
                <div className="history-meta">
                  <span className="history-lang">{entry.language}</span>
                  <span className="history-time">{formatTime(entry.created_at)}</span>
                </div>
                <pre className="history-code">{entry.code}</pre>
                <pre className="history-output">{entry.output}</pre>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// App (router) 
export default function App() {
  return (
    <Routes>
      <Route path="/"             element={<LandingPage />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
    </Routes>
  );
}
