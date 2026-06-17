import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function LobbyPage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId, error, isLoading } = useRoomState();

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  useEffect(() => {
    if (!room) {
      return undefined;
    }

    roomStore.startPolling();
    return () => roomStore.stopPolling();
  }, [roomStore, room?.code]);

  useEffect(() => {
    if (room?.status === "active") {
      navigate("/game");
    }
  }, [navigate, room?.status]);

  if (!room) {
    return null;
  }

  const isHost = room.participants.some((participant) => participant.id === participantId && participant.isHost);

  async function handleStart() {
    try {
      await roomStore.startGame();
      // Navigation happens via the room.status effect above, for the host too.
    } catch {
      // surfaced via the shared `error` state below
    }
  }

  return (
    <section className="panel placeholder-page">
      <div className="lobby-header">
        <PageHeader
          kicker="Waiting for players"
          title="Lobby"
          description="Share the room code with friends so they can join your game."
        />
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="summary-grid">
        <Card title="Participants">
          {room.participants.length === 0 ? (
            <p>No participants are connected to this room yet.</p>
          ) : (
            <ul className="player-list">
              {room.participants.map((participant) => (
                <li key={participant.id}>
                  <span>{participant.name}</span>
                  <span className="player-list__meta">joined</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Status">
          <p className="status-line" style={{ backgroundColor: isLoading ? '#fef3c7' : '#e0e7ff', color: isLoading ? '#b45309' : '#3730a3' }}>
            {isLoading ? "Refreshing players..." : "Ready to play"}
          </p>
          <p style={{ marginTop: '8px' }}>{error ?? "Waiting for the host to start the game."}</p>
        </Card>
      </div>

      {isHost ? (
        <div className="button-row button-row--spread">
          <div>
            <button
              className="button button--primary"
              disabled={!room.canStart || isLoading}
              onClick={handleStart}
            >
              Start Game
            </button>
            {!room.canStart ? (
              <p className="form__error" style={{ marginTop: '8px' }}>
                At least 2 players are required to start.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
