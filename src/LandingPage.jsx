import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import './LandingPage.css';

export default function LandingPage() {
  const [joinId, setJoinId] = useState('');
  const navigate = useNavigate();

  // Generate a fresh 6-character room ID and navigate straight into it.
  const createRoom = () => {
    const roomId = nanoid(6);
    navigate(`/room/${roomId}`);
  };

  // Navigate to an existing room by ID the user typed in.
  const joinRoom = () => {
    const trimmed = joinId.trim();
    if (!trimmed) return;
    navigate(`/room/${trimmed}`);
  };

  return (
    <div className="landing">
      <div className="landing-box">
        <h1 className="landing-title">CodeNexus</h1>
        <p className="landing-subtitle">Real-time collaborative code editor</p>

        {/* Create a brand new room */}
        <button className="btn-create" onClick={createRoom}>
          + Create New Room
        </button>

        <div className="divider">or join an existing room</div>

        {/* Join by pasting a room ID or link */}
        <div className="join-row">
          <input
            className="join-input"
            type="text"
            placeholder="Enter room ID..."
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') joinRoom(); }}
          />
          <button className="btn-join" onClick={joinRoom}>
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
