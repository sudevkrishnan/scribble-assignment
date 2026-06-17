import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { ResultPanel } from "../components/ResultPanel";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { Scoreboard } from "../components/Scoreboard";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function ResultPage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId } = useRoomState();

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
    if (room?.status === "lobby") {
      navigate("/lobby");
    }
  }, [navigate, room?.status]);

  if (!room) {
    return null;
  }

  const viewer = room.participants.find((participant) => participant.id === participantId) ?? null;
  const isHost = Boolean(viewer?.isHost);

  async function handleRestart() {
    try {
      await roomStore.restartRoom();
      // Navigation happens via the room.status effect above, for the host too.
    } catch {
      // surfaced via the shared `error` state on this page's parent flow
    }
  }

  return (
    <section className="panel game-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">Round Result</span>
          <h1 className="game-page__title">The word was: {room.secretWord ?? "Unknown"}</h1>
        </div>
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="game-page__layout">
        <aside className="game-page__sidebar game-page__sidebar--left">
          <Scoreboard />
          <ResultPanel />
        </aside>

        <div className="game-page__main">
          <Card title="Secret Word">
            <p className="status-line">{room.secretWord ?? "Unknown"}</p>
          </Card>
        </div>
      </div>

      {isHost ? (
        <div className="button-row">
          <button className="button button--primary" onClick={handleRestart}>
            Restart
          </button>
        </div>
      ) : null}
    </section>
  );
}
