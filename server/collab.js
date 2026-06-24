// collab.js — real-time collaboration server with SQLite persistence.
// Uses yjs + y-protocols + ws directly (stable v13 ecosystem).

const { WebSocketServer } = require('ws');
const Y = require('yjs');
const syncProtocol      = require('y-protocols/sync');
const awarenessProtocol = require('y-protocols/awareness');
const encoding          = require('lib0/encoding');
const decoding          = require('lib0/decoding');
const { saveSnapshot, loadSnapshot } = require('./db');

const messageSync      = 0;
const messageAwareness = 1;

// How often (ms) to snapshot each active room's content to SQLite.
const SNAPSHOT_INTERVAL = 5000;

const rooms = new Map(); // roomName -> Room

class Room {
  constructor(name) {
    this.name     = name;
    this.doc      = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.conns    = new Map(); // ws -> Set<awarenessClientID>
    this.language = 'javascript'; // shared language state

    // If this room was saved before (e.g. before a server restart), restore it.
    const snapshot = loadSnapshot.get(name);
    if (snapshot && snapshot.content) {
      const ytext = this.doc.getText('monaco');
      // Insert the saved content as the initial document state.
      this.doc.transact(() => {
        ytext.insert(0, snapshot.content);
      });
      this.language = snapshot.language || 'javascript';
      console.log(`Loaded snapshot for room: ${name} (${snapshot.content.length} chars)`);
    }

    this.doc.on('update', (update) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      this.broadcast(encoding.toUint8Array(encoder));
    });

    this.awareness.on('update', ({ added, updated, removed }, origin) => {
      const changedClients = added.concat(updated, removed);
      if (origin instanceof Object && this.conns.has(origin)) {
        const ids = this.conns.get(origin);
        added.forEach((id)   => ids.add(id));
        removed.forEach((id) => ids.delete(id));
      }
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      this.broadcast(encoding.toUint8Array(encoder));
    });

    // Every SNAPSHOT_INTERVAL ms, save the current text to the database.
    // This means at most 5 seconds of work is lost on a crash/restart.
    this.snapshotTimer = setInterval(() => {
      this.persist();
    }, SNAPSHOT_INTERVAL);
  }

  persist() {
    const content = this.doc.getText('monaco').toString();
    saveSnapshot.run({ roomId: this.name, content, language: this.language });
  }

  broadcast(message) {
    this.conns.forEach((_ids, ws) => {
      if (ws.readyState === ws.OPEN) ws.send(message);
    });
  }

  destroy() {
    // Final snapshot before cleaning up so nothing is lost.
    this.persist();
    clearInterval(this.snapshotTimer);
    this.awareness.destroy();
    this.doc.destroy();
  }
}

function getRoom(name) {
  let room = rooms.get(name);
  if (!room) {
    room = new Room(name);
    rooms.set(name, room);
  }
  return room;
}

function attachCollab(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    if (!request.url.startsWith('/collab')) return;
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws, req) => {
    const roomName = req.url.split('/').filter(Boolean)[1] || 'default-room';
    const room     = getRoom(roomName);
    room.conns.set(ws, new Set());
    ws.binaryType = 'arraybuffer';

    // Send new client the current document state.
    {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeSyncStep1(encoder, room.doc);
      ws.send(encoding.toUint8Array(encoder));
    }

    // Send new client the current awareness state.
    const states = room.awareness.getStates();
    if (states.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(states.keys()))
      );
      ws.send(encoding.toUint8Array(encoder));
    }

    ws.on('message', (data) => {
      const decoder     = decoding.createDecoder(new Uint8Array(data));
      const messageType = decoding.readVarUint(decoder);

      if (messageType === messageSync) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, room.doc, ws);
        if (encoding.length(encoder) > 1) ws.send(encoding.toUint8Array(encoder));
      } else if (messageType === messageAwareness) {
        awarenessProtocol.applyAwarenessUpdate(
          room.awareness,
          decoding.readVarUint8Array(decoder),
          ws
        );
      }
    });

    ws.on('close', () => {
      const ids = room.conns.get(ws);
      room.conns.delete(ws);
      if (ids && ids.size > 0) {
        awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(ids), null);
      }

      // If the room is now empty, do a final snapshot and clean it up from memory — it'll be reloaded from SQLite if someone rejoins.
      if (room.conns.size === 0) {
        room.destroy();
        rooms.delete(roomName);
        console.log(`Room ${roomName} empty — persisted and removed from memory`);
      }
    });
  });

  console.log('Collaboration layer attached at ws://<host>/collab/<roomId>');
}

module.exports = { attachCollab };
