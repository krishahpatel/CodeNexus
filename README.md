# CodeNexus — Real-Time Collaborative Code Editor

A full-stack real-time collaborative code editor that lets multiple users edit the same codebase simultaneously, with live presence, multi-language execution, and persistent room state.

**Live:** https://code-nexus-flame.vercel.app  
**Backend:** https://codenexus-backend-aiui.onrender.com

---

## Features

- **Real-time collaboration** — Multiple users edit simultaneously with automatic conflict resolution via Yjs CRDT
- **Live presence** — Colored name pills show who is currently in the room
- **Room-based sessions** — Each room has a unique shareable URL; rooms are isolated from each other
- **Multi-language execution** — Run JavaScript, Python, C, and C++ directly in the browser
- **stdin support** — Provide program input upfront for interactive programs
- **Execution history** — Every run is saved per room and viewable in a history panel
- **Persistent rooms** — Room content is snapshotted to SQLite every 5 seconds and restored on rejoin
- **Spectator mode** — Share a `?view=1` URL for a read-only view of the editor
- **Language sync** — Language changes broadcast to all users in the room simultaneously

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, React Router |
| Editor | Monaco Editor (@monaco-editor/react) |
| Collaboration | Yjs (CRDT), y-protocols, y-websocket |
| Backend | Node.js, Express.js |
| WebSockets | ws |
| Database | SQLite (better-sqlite3) |
| Deployment | Vercel (frontend), Render (backend) |

---

## Architecture

```
Browser (Tab 1)          Browser (Tab 2)
     |                        |
  Y.Doc  <-- WebSocket -->  Y.Doc
  Monaco                    Monaco
     |                        |
     └──────── Render ─────────┘
               Node.js
               Express API (/api/run, /api/save, /api/history)
               Collaboration Server (y-protocols sync + awareness)
               SQLite (room_snapshots, execution_history)
```

### How real-time sync works

Each room has a shared `Y.Doc` (Yjs document) on the server. When a user types:
1. Monaco fires a change event
2. `MonacoBinding` writes it into the local `Y.Doc`
3. Yjs computes a minimal update (CRDT delta)
4. The update is sent over WebSocket to the server
5. The server broadcasts it to all other connected clients
6. Their `Y.Doc` merges the update automatically — no conflicts possible

Presence (who is in the room) is handled separately via the Yjs awareness protocol, which broadcasts lightweight state (name, color) to all connected clients.

---

## Project Structure

```
CodeNexus/
├── src/
│   ├── App.jsx                  # Router + RoomPage component
│   ├── CollaborativeEditor.jsx  # Yjs + Monaco binding + presence
│   ├── LandingPage.jsx          # Create/join room UI
│   ├── App.css
│   ├── CollaborativeEditor.css
│   └── LandingPage.css
├── server/
│   ├── index.js                 # Express server + HTTP entry point
│   ├── collab.js                # WebSocket collaboration server
│   └── db.js                    # SQLite setup + prepared statements
├── vercel.json                  # SPA rewrite rules for React Router
└── .env.development             # Local environment variables
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- Python 3 (for Python execution)
- GCC/G++ (for C/C++ execution)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/krishahpatel/CodeNexus.git
cd CodeNexus
```

**2. Install frontend dependencies**
```bash
npm install
```

**3. Install backend dependencies**
```bash
cd server
npm install
```

**4. Create environment file** in project root:
```
VITE_BACKEND_HTTP=http://localhost:3000
VITE_BACKEND_WS=ws://localhost:3000
```

### Running locally

**Terminal 1 — Backend:**
```bash
cd server
node index.js
```

**Terminal 2 — Frontend:**
```bash
npm run dev
```

Open `http://localhost:5173`, create a room, and share the URL with collaborators.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/run` | Execute code (body: `{ code, language, roomId, stdin }`) |
| POST | `/api/save` | Save code snapshot |
| GET | `/api/load` | Load last saved code |
| GET | `/api/history/:roomId` | Get last 20 executions for a room |

### WebSocket

Collaboration runs over WebSocket at `ws://<host>/collab/<roomId>` using the Yjs sync protocol (messageSync = 0, messageAwareness = 1).

---

## Known Limitations

- **Ephemeral storage on Render free tier** — SQLite snapshots are stored on Render's filesystem, which resets on server restarts. Fix: mount a persistent disk or migrate to hosted Postgres (Neon).
- **No interactive stdin** — Input must be provided upfront before running, similar to competitive programming judges. True interactive terminal support would require `node-pty` + `xterm.js`.
- **Free tier cold starts** — Render's free tier spins down after 15 minutes of inactivity; first request after sleep takes ~50 seconds.
- **No sandboxing** — Code runs directly on the server without containerization. Not suitable for untrusted code in production.

---

## Technical Decisions

**Why Yjs over Socket.io with diffs?**  
Yjs uses CRDTs (Conflict-free Replicated Data Types), which guarantee that any two clients will converge to the same state regardless of network conditions or edit order. Broadcasting diffs with Socket.io requires a central authority to resolve conflicts, which adds complexity and a single point of failure.

**Why y-protocols directly instead of y-websocket server?**  
The `@y/websocket-server` package (the official server-side companion) pulls in `@y/y` v14, which conflicts with the stable `yjs` v13 ecosystem used by `y-monaco` and `y-websocket` on the client. Building directly on `y-protocols` and `ws` uses the same building blocks without the version conflict.

**Why SQLite over Postgres?**  
SQLite requires zero external setup and is sufficient for single-instance persistence at this scale. The schema is simple enough that migrating to Postgres would take under an hour if needed.
