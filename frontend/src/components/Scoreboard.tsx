import { Card } from "./Card";
import { useRoomState } from "../state/roomStore";

export function Scoreboard() {
  const { room } = useRoomState();
  const participants = [...(room?.participants ?? [])].sort((a, b) => b.score - a.score);

  return (
    <Card title="Scoreboard">
      <div className="placeholder-block">
        {participants.map((participant) => (
          <div className="placeholder-row" key={participant.id}>
            <span>{participant.name}</span>
            <strong>{participant.score}</strong>
          </div>
        ))}
      </div>
    </Card>
  );
}
