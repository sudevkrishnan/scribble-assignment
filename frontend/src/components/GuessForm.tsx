import { useState } from "react";
import { ApiError } from "../services/api";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function GuessForm() {
  const store = useRoomStore();
  const { room, participantId } = useRoomState();
  const [guessText, setGuessText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const viewer = room?.participants.find((participant) => participant.id === participantId) ?? null;
  const disabled = Boolean(viewer?.isDrawer);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await store.submitGuess(guessText);
      setGuessText("");
    } catch (submitError) {
      const message = submitError instanceof ApiError ? submitError.message : "Could not submit guess";
      setError(message);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="form__field">
        <input
          className="form__input"
          value={guessText}
          onChange={(event) => setGuessText(event.target.value)}
          placeholder="Type your guess here..."
          disabled={disabled}
        />
      </label>
      {error ? <p className="form__error">{error}</p> : null}
      <div className="button-row button-row--compact">
        <button className="button button--primary" type="submit" disabled={disabled}>
          Submit Guess
        </button>
      </div>
    </form>
  );
}
