import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import './CollaborativeEditor.css';

const USER_COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a78bfa', '#f97316', '#34d399'];
const randomColor = () => USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

export default function CollaborativeEditor({ roomId, language = 'javascript', onCodeChange }) {
  const [userName, setUserName]     = useState('');      // typed name
  const [joined, setJoined]         = useState(false);   // has user entered their name
  const [users, setUsers]           = useState([]);
  const [connected, setConnected]   = useState(false);

  const docRef      = useRef(null);
  const providerRef = useRef(null);
  const bindingRef  = useRef(null);
  const colorRef    = useRef(randomColor());

  // Only connect AFTER the user has entered their name and clicked Join.
  // This avoids the window.prompt() Chrome suppression issue entirely.
  useEffect(() => {
    if (!joined) return; // don't connect until name is entered

    const ydoc     = new Y.Doc();
    const provider = new WebsocketProvider('ws://localhost:3000', `collab/${roomId}`, ydoc);

    docRef.current      = ydoc;
    providerRef.current = provider;

    provider.awareness.setLocalStateField('user', {
      name:  userName,
      color: colorRef.current,
    });

    const updatePresence = () => {
      const states = Array.from(provider.awareness.getStates().values());
      setUsers(states.map((s) => s.user).filter(Boolean));
    };
    provider.awareness.on('change', updatePresence);
    provider.on('status', ({ status }) => setConnected(status === 'connected'));

    return () => {
      provider.awareness.off('change', updatePresence);
      if (bindingRef.current) { bindingRef.current.destroy(); bindingRef.current = null; }
      provider.destroy();
      ydoc.destroy();
    };
  }, [joined, roomId]);

  function handleEditorMount(editor) {
    const ydoc     = docRef.current;
    const provider = providerRef.current;
    const ytext    = ydoc.getText('monaco');

    const binding = new MonacoBinding(
      ytext,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );
    bindingRef.current = binding;

    if (onCodeChange) {
      editor.onDidChangeModelContent(() => onCodeChange(editor.getValue()));
    }
  }

  // ── Name entry screen ────────────────────────────────────────────────────
  if (!joined) {
    return (
      <div className="join-screen">
        <div className="join-box">
          <h2>CodeNexus</h2>
          <p>Room: <code>{roomId}</code></p>
          <input
            className="join-input"
            type="text"
            placeholder="Enter your name..."
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && userName.trim()) setJoined(true);
            }}
            autoFocus
          />
          <button
            className="join-btn"
            onClick={() => { if (userName.trim()) setJoined(true); }}
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  // ── Editor screen ────────────────────────────────────────────────────────
  return (
    <div className="collab-editor">
      <div className="presence-bar">
        <span className={`conn-status ${connected ? 'online' : 'offline'}`}>
          {connected ? '● Connected' : '○ Connecting...'}
        </span>
        {users.map((u, i) => (
          <span key={i} className="presence-pill" style={{ borderColor: u.color }}>
            <span className="dot" style={{ background: u.color }} />
            {u.name}
          </span>
        ))}
      </div>

      <Editor
        height="65vh"
        language={language}
        theme="vs-dark"
        onMount={handleEditorMount}
        options={{ minimap: { enabled: false } }}
      />
    </div>
  );
}
