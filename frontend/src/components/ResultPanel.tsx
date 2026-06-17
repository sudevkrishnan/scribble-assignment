import { Card } from "./Card";
import { useRoomState } from "../state/roomStore";

export function ResultPanel() {
  const { room } = useRoomState();
  const guesses = room?.guesses ?? [];

  function participantName(participantId: string) {
    return room?.participants.find((participant) => participant.id === participantId)?.name ?? "Unknown player";
  }

  if (guesses.length === 0) {
    return (
      <Card title="Activity">
        <div className="placeholder-block">
          <p className="player-list__meta">Game activity and guesses will appear here.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Activity">
      <ul className="player-list">
        {guesses.map((guess) => (
          <li key={guess.id}>
            <span>{participantName(guess.participantId)}</span>
            <span className="player-list__meta">
              {guess.correct ? `Correct: ${guess.text}` : guess.text ? `Guessed: ${guess.text}` : "Incorrect"}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
