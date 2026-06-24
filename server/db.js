// db.js — SQLite setup using better-sqlite3.
// Creates the database file at server/codenexus.db (auto-created if it doesn't exist).

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'codenexus.db'));

// Enable WAL mode — better performance for concurrent reads/writes.
db.pragma('journal_mode = WAL');

// Table: room_snapshots 
// Stores the latest text content of each room's Yjs document.
// Updated every few seconds while the room is active.
db.exec(`
  CREATE TABLE IF NOT EXISTS room_snapshots (
    room_id    TEXT PRIMARY KEY,
    content    TEXT NOT NULL DEFAULT '',
    language   TEXT NOT NULL DEFAULT 'javascript',
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  )
`);

// Table: execution_history 
// Stores every Run button press — useful for Day 12's history panel.
db.exec(`
  CREATE TABLE IF NOT EXISTS execution_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id    TEXT NOT NULL,
    code       TEXT NOT NULL,
    output     TEXT NOT NULL,
    language   TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  )
`);

// Preparing once at startup is faster than preparing on every call.

const saveSnapshot = db.prepare(`
  INSERT INTO room_snapshots (room_id, content, language, updated_at)
  VALUES (@roomId, @content, @language, strftime('%s', 'now'))
  ON CONFLICT(room_id) DO UPDATE SET
    content    = excluded.content,
    language   = excluded.language,
    updated_at = excluded.updated_at
`);

const loadSnapshot = db.prepare(`
  SELECT content, language FROM room_snapshots WHERE room_id = ?
`);

const saveExecution = db.prepare(`
  INSERT INTO execution_history (room_id, code, output, language)
  VALUES (@roomId, @code, @output, @language)
`);

const getExecutionHistory = db.prepare(`
  SELECT id, code, output, language, created_at
  FROM execution_history
  WHERE room_id = ?
  ORDER BY created_at DESC
  LIMIT 20
`);

const deleteOldRooms = db.prepare(`
  DELETE FROM room_snapshots
  WHERE updated_at < strftime('%s', 'now') - (7 * 24 * 60 * 60)
`);

module.exports = {
  saveSnapshot,
  loadSnapshot,
  saveExecution,
  getExecutionHistory,
  deleteOldRooms,
};
