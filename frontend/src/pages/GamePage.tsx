import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { DrawingCanvas } from "../components/DrawingCanvas";
import { GuessForm } from "../components/GuessForm";
import { ResultPanel } from "../components/ResultPanel";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { Scoreboard } from "../components/Scoreboard";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function GamePage() {
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
    if (room?.status === "result") {
      navigate("/result");
    }
  }, [navigate, room?.status]);

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

  async function handleEndRound() {
    try {
      await roomStore.endRound();
      // Navigation happens via the room.status effect above, for the host too.
    } catch {
      // surfaced via the shared `error` state on this page's parent flow
    }
  }

  return (
    <section className="panel game-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">Round 1</span>
          <h1 className="game-page__title">Guess the Word!</h1>
        </div>
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="game-page__layout">
        <aside className="game-page__sidebar game-page__sidebar--left">
          <Card title="Players">
            <ul className="player-list">
              {room.participants.map((participant) => (
                <li key={participant.id}>
                  <span>{participant.name}</span>
                  <span className="player-list__meta">
                    {participant.isDrawer ? "Drawer" : "Guesser"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          {room.secretWord ? (
            <Card title="Secret Word">
              <p className="status-line">{room.secretWord}</p>
            </Card>
          ) : null}
          <Scoreboard />
          <ResultPanel />
        </aside>

        <div className="game-page__main">
          <Card title="Canvas">
            <DrawingCanvas />
          </Card>
        </div>

        <aside className="game-page__sidebar game-page__sidebar--right">
          <Card title="Player Info">
            <dl className="detail-list">
              <div>
                <dt>Name</dt>
                <dd>{viewer?.name ?? "Unknown player"}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{viewer?.isDrawer ? "Drawer" : "Guesser"}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Your Guess">
            <GuessForm />
          </Card>
        </aside>
      </div>

      <div className="button-row">
        {isHost ? (
          <button className="button button--primary" onClick={handleEndRound}>
            End Round
          </button>
        ) : null}
        <button className="button button--secondary" onClick={() => navigate("/lobby")}>
          Exit Game
        </button>
      </div>
    </section>
  );
}
