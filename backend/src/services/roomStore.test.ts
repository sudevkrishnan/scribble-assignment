import { describe, expect, it } from "vitest";
import {
  addStroke,
  clearCanvas,
  createRoom,
  endRound,
  getRoom,
  joinRoom,
  restartRoom,
  selectSecretWord,
  startGame,
  submitGuess,
  toRoomSnapshot
} from "./roomStore.js";
import { STARTER_WORDS } from "../seed/starterData.js";

function startActiveRoom() {
  const { room, participantId: hostId } = createRoom("Alice");
  const joined = joinRoom(room.code, "Bob");
  const started = startGame(room.code, hostId);
  const startedRoom = (started as { room: typeof room }).room;

  return { room: startedRoom, hostId, guesserId: joined!.participantId };
}

describe("roomStore", () => {
  describe("selectSecretWord", () => {
    it("always returns one of the starter words", () => {
      expect(STARTER_WORDS).toContain(selectSecretWord("ABCD"));
      expect(STARTER_WORDS).toContain(selectSecretWord("ZZZZ"));
      expect(STARTER_WORDS).toContain(selectSecretWord("AB3D"));
    });

    it("returns the same word for the same code every time", () => {
      const first = selectSecretWord("AB3D");
      const second = selectSecretWord("AB3D");
      const third = selectSecretWord("AB3D");

      expect(first).toBe(second);
      expect(second).toBe(third);
    });
  });

  it("createRoom returns a room with a 4-character uppercase code", () => {
    const result = createRoom("Alice");

    expect(result.room.code).toMatch(/^[A-Z0-9]{4}$/);
    expect(result.room.participants).toHaveLength(1);
    expect(result.room.participants[0].name).toBe("Alice");
    expect(result.participantId).toBeDefined();
  });

  it("joinRoom returns null for an unknown room code", () => {
    const result = joinRoom("ZZZZ", "Bob");

    expect(result).toBeNull();
  });

  it("createRoom assigns the creator as host with canStart false at 1 participant", () => {
    const { room, participantId } = createRoom("Alice");
    const snapshot = toRoomSnapshot(room);

    expect(room.hostParticipantId).toBe(participantId);
    expect(snapshot.participants[0].isHost).toBe(true);
    expect(snapshot.canStart).toBe(false);
  });

  it("toRoomSnapshot reports canStart true once a second participant joins", () => {
    const { room } = createRoom("Alice");
    const joined = joinRoom(room.code, "Bob");

    expect(joined).not.toBeNull();
    const snapshot = toRoomSnapshot(joined!.room);

    expect(snapshot.canStart).toBe(true);
    expect(snapshot.participants.find((p) => p.name === "Bob")?.isHost).toBe(false);
  });

  it("two sequential createRoom calls produce distinct codes and each creator is host only of their own room", () => {
    const first = createRoom("Alice");
    const second = createRoom("Carol");

    expect(first.room.code).not.toBe(second.room.code);
    expect(first.room.hostParticipantId).toBe(first.participantId);
    expect(second.room.hostParticipantId).toBe(second.participantId);
    expect(first.room.hostParticipantId).not.toBe(second.room.hostParticipantId);
  });

  it("joining one room never mutates a second room's participants", () => {
    const roomA = createRoom("Alice");
    const roomB = createRoom("Carol");

    joinRoom(roomA.room.code, "Bob");

    const refetchedB = toRoomSnapshot(roomB.room);
    expect(refetchedB.participants).toHaveLength(1);
    expect(refetchedB.participants[0].name).toBe("Carol");
  });

  describe("startGame", () => {
    it("rejects a non-host participant", () => {
      const { room, participantId } = createRoom("Alice");
      const joined = joinRoom(room.code, "Bob");

      const result = startGame(room.code, joined!.participantId);

      expect(result.ok).toBe(false);
      expect((result as { reason: string }).reason).toBe("not_host");
      void participantId;
    });

    it("rejects the host when fewer than 2 participants are present", () => {
      const { room, participantId } = createRoom("Alice");

      const result = startGame(room.code, participantId);

      expect(result.ok).toBe(false);
      expect((result as { reason: string }).reason).toBe("not_enough_players");
    });

    it("succeeds for the host with 2+ participants and sets status to active", () => {
      const { room, participantId } = createRoom("Alice");
      joinRoom(room.code, "Bob");

      const result = startGame(room.code, participantId);

      expect(result.ok).toBe(true);
      expect((result as { room: { status: string } }).room.status).toBe("active");
    });

    it("returns not_found for an unknown room code", () => {
      const result = startGame("ZZZZ", "anyone");

      expect(result.ok).toBe(false);
      expect((result as { reason: string }).reason).toBe("not_found");
    });

    it("assigns the host as drawer and a starter word as secretWord on success", () => {
      const { room, participantId } = createRoom("Alice");
      joinRoom(room.code, "Bob");

      const result = startGame(room.code, participantId);

      expect(result.ok).toBe(true);
      const startedRoom = (result as { room: { drawerParticipantId?: string; secretWord?: string } }).room;
      expect(startedRoom.drawerParticipantId).toBe(participantId);
      expect(STARTER_WORDS).toContain(startedRoom.secretWord);
    });

    it("does not reassign drawer or secretWord on a repeated start", () => {
      const { room, participantId } = createRoom("Alice");
      joinRoom(room.code, "Bob");

      const first = startGame(room.code, participantId);
      const second = startGame(room.code, participantId);

      const firstRoom = (first as { room: { drawerParticipantId?: string; secretWord?: string } }).room;
      const secondRoom = (second as { room: { drawerParticipantId?: string; secretWord?: string } }).room;
      expect(secondRoom.drawerParticipantId).toBe(firstRoom.drawerParticipantId);
      expect(secondRoom.secretWord).toBe(firstRoom.secretWord);
    });
  });

  describe("toRoomSnapshot redaction", () => {
    it("includes secretWord and the full word list only for the drawer", () => {
      const { room, participantId: hostId } = createRoom("Alice");
      const joined = joinRoom(room.code, "Bob");
      const started = startGame(room.code, hostId);
      const startedRoom = (started as { room: typeof room }).room;

      const drawerSnapshot = toRoomSnapshot(startedRoom, hostId);
      expect(drawerSnapshot.secretWord).toBeDefined();
      expect(drawerSnapshot.availableWords).toEqual([...STARTER_WORDS]);

      const guesserSnapshot = toRoomSnapshot(startedRoom, joined!.participantId);
      expect(guesserSnapshot.secretWord).toBeUndefined();
      expect(guesserSnapshot.availableWords).toEqual([]);
    });

    it("includes isDrawer per participant, true only for the drawer", () => {
      const { room, participantId: hostId } = createRoom("Alice");
      const joined = joinRoom(room.code, "Bob");
      const started = startGame(room.code, hostId);
      const startedRoom = (started as { room: typeof room }).room;

      const snapshot = toRoomSnapshot(startedRoom, hostId);
      expect(snapshot.participants.find((p) => p.id === hostId)?.isDrawer).toBe(true);
      expect(snapshot.participants.find((p) => p.id === joined!.participantId)?.isDrawer).toBe(false);
    });

    it("has no secretWord and an empty word list for anyone before the round starts", () => {
      const { room, participantId: hostId } = createRoom("Alice");

      const snapshot = toRoomSnapshot(room, hostId);
      expect(snapshot.secretWord).toBeUndefined();
      expect(snapshot.availableWords).toEqual([]);
    });
  });

  describe("addStroke", () => {
    it("appends a stroke for the drawer", () => {
      const { room, hostId } = startActiveRoom();
      const points = [{ x: 1, y: 2 }, { x: 3, y: 4 }];

      const result = addStroke(room.code, hostId, points);

      expect(result.ok).toBe(true);
      expect((result as { room: typeof room }).room.strokes).toEqual([{ points }]);
    });

    it("rejects a non-drawer", () => {
      const { room, guesserId } = startActiveRoom();

      const result = addStroke(room.code, guesserId, [{ x: 0, y: 0 }]);

      expect(result.ok).toBe(false);
      expect((result as { reason: string }).reason).toBe("not_drawer");
    });

    it("rejects when the room isn't active", () => {
      const { room, participantId: hostId } = createRoom("Alice");
      joinRoom(room.code, "Bob");

      const result = addStroke(room.code, hostId, [{ x: 0, y: 0 }]);

      expect(result.ok).toBe(false);
      expect((result as { reason: string }).reason).toBe("not_active");
    });
  });

  describe("clearCanvas", () => {
    it("empties strokes and leaves guesses/scores untouched", () => {
      const { room, hostId } = startActiveRoom();
      addStroke(room.code, hostId, [{ x: 1, y: 1 }]);

      const result = clearCanvas(room.code, hostId);

      expect(result.ok).toBe(true);
      const clearedRoom = (result as { room: typeof room }).room;
      expect(clearedRoom.strokes).toEqual([]);
      expect(clearedRoom.guesses).toEqual([]);
      expect(clearedRoom.participants.every((p) => p.score === 0)).toBe(true);
    });

    it("rejects a non-drawer", () => {
      const { room, guesserId } = startActiveRoom();

      const result = clearCanvas(room.code, guesserId);

      expect(result.ok).toBe(false);
      expect((result as { reason: string }).reason).toBe("not_drawer");
    });
  });

  describe("submitGuess", () => {
    it("trims input before recording and comparing", () => {
      const { room, guesserId } = startActiveRoom();

      const result = submitGuess(room.code, guesserId, `  ${room.secretWord}  `);

      expect(result.ok).toBe(true);
      const guess = (result as { guess: { text: string; correct: boolean } }).guess;
      expect(guess.text).toBe(room.secretWord);
      expect(guess.correct).toBe(true);
    });

    it("matches the secret word case-insensitively", () => {
      const { room, guesserId } = startActiveRoom();

      const result = submitGuess(room.code, guesserId, room.secretWord!.toUpperCase());

      expect(result.ok).toBe(true);
      expect((result as { guess: { correct: boolean } }).guess.correct).toBe(true);
    });

    it("records a non-matching guess with correct: false", () => {
      const { room, guesserId } = startActiveRoom();
      const wrongWord = STARTER_WORDS.find((word) => word !== room.secretWord)!;

      const result = submitGuess(room.code, guesserId, wrongWord);

      expect(result.ok).toBe(true);
      expect((result as { guess: { correct: boolean } }).guess.correct).toBe(false);
    });

    it("rejects a submission from the drawer", () => {
      const { room, hostId } = startActiveRoom();

      const result = submitGuess(room.code, hostId, "anything");

      expect(result.ok).toBe(false);
      expect((result as { reason: string }).reason).toBe("not_guesser");
    });

    it("rejects when the room isn't active", () => {
      const { room, participantId: hostId } = createRoom("Alice");
      const joined = joinRoom(room.code, "Bob");

      const result = submitGuess(room.code, joined!.participantId, "anything");

      expect(result.ok).toBe(false);
      expect((result as { reason: string }).reason).toBe("not_active");
      void hostId;
    });

    it("rejects a participantId that does not belong to any current room participant", () => {
      const { room } = startActiveRoom();

      const result = submitGuess(room.code, "not-a-real-participant-id", "anything");

      expect(result.ok).toBe(false);
      expect((result as { reason: string }).reason).toBe("not_participant");
      expect(getRoom(room.code)?.guesses).toHaveLength(0);
    });

    it("increases the guesser's score by exactly 100 on a correct guess and leaves it unchanged on an incorrect one", () => {
      const { room, guesserId } = startActiveRoom();
      const wrongWord = STARTER_WORDS.find((word) => word !== room.secretWord)!;

      const incorrect = submitGuess(room.code, guesserId, wrongWord);
      const afterIncorrect = (incorrect as { room: typeof room }).room;
      expect(afterIncorrect.participants.find((p) => p.id === guesserId)?.score).toBe(0);

      const correct = submitGuess(room.code, guesserId, room.secretWord!);
      const afterCorrect = (correct as { room: typeof room }).room;
      expect(afterCorrect.participants.find((p) => p.id === guesserId)?.score).toBe(100);
    });

    it("adds another 100 for a second correct guess from the same participant", () => {
      const { room, guesserId } = startActiveRoom();

      submitGuess(room.code, guesserId, room.secretWord!);
      const second = submitGuess(room.code, guesserId, room.secretWord!);
      const afterSecond = (second as { room: typeof room }).room;

      expect(afterSecond.participants.find((p) => p.id === guesserId)?.score).toBe(200);
    });

    it("adds 0 for an incorrect guess submitted after an earlier correct guess from the same participant", () => {
      const { room, guesserId } = startActiveRoom();
      const wrongWord = STARTER_WORDS.find((word) => word !== room.secretWord)!;

      submitGuess(room.code, guesserId, room.secretWord!);
      const afterWrong = submitGuess(room.code, guesserId, wrongWord);
      const result = (afterWrong as { room: typeof room; guess: { correct: boolean } });

      expect(result.guess.correct).toBe(false);
      expect(result.room.participants.find((p) => p.id === guesserId)?.score).toBe(100);
      expect(result.room.guesses).toHaveLength(2);
    });

    it("every participant's score is 0 immediately after a round starts", () => {
      const { room } = startActiveRoom();

      expect(room.participants.every((p) => p.score === 0)).toBe(true);
    });

    it("replaying an identical guess sequence against the same secret word always produces identical final scores", () => {
      function playSequence() {
        const { room, guesserId } = startActiveRoom();
        const wrongWord = STARTER_WORDS.find((word) => word !== room.secretWord)!;

        submitGuess(room.code, guesserId, wrongWord);
        submitGuess(room.code, guesserId, room.secretWord!);
        submitGuess(room.code, guesserId, wrongWord);
        const final = submitGuess(room.code, guesserId, room.secretWord!);

        return (final as { room: typeof room }).room.participants.find((p) => p.id === guesserId)?.score;
      }

      const firstTrial = playSequence();
      const secondTrial = playSequence();

      expect(firstTrial).toBe(200);
      expect(secondTrial).toBe(200);
      expect(firstTrial).toBe(secondTrial);
    });
  });

  describe("toRoomSnapshot guess redaction", () => {
    it("includes literal text for the drawer on every entry", () => {
      const { room, hostId, guesserId } = startActiveRoom();
      const wrongWord = STARTER_WORDS.find((word) => word !== room.secretWord)!;
      submitGuess(room.code, guesserId, wrongWord);
      submitGuess(room.code, guesserId, room.secretWord!);
      const updated = (submitGuess(room.code, guesserId, room.secretWord!) as { room: typeof room }).room;

      const drawerSnapshot = toRoomSnapshot(updated, hostId);
      expect(drawerSnapshot.guesses.every((g) => typeof g.text === "string")).toBe(true);
    });

    it("includes text for the submitting guesser's own entries and any correct entry, omits text for other guessers' incorrect entries", () => {
      const { room, hostId, guesserId } = startActiveRoom();
      const thirdJoin = joinRoom(room.code, "Cara");
      const otherGuesserId = thirdJoin!.participantId;
      const wrongWord = STARTER_WORDS.find((word) => word !== room.secretWord)!;

      const incorrect = submitGuess(room.code, guesserId, wrongWord);
      const afterIncorrect = (incorrect as { room: typeof room }).room;
      const correct = submitGuess(room.code, guesserId, room.secretWord!);
      const afterCorrect = (correct as { room: typeof room }).room;
      void afterIncorrect;
      void hostId;

      const otherGuesserSnapshot = toRoomSnapshot(afterCorrect, otherGuesserId);
      const incorrectEntry = otherGuesserSnapshot.guesses.find((g) => g.correct === false);
      const correctEntry = otherGuesserSnapshot.guesses.find((g) => g.correct === true);
      expect(incorrectEntry?.text).toBeUndefined();
      expect(correctEntry?.text).toBe(room.secretWord);

      const ownerSnapshot = toRoomSnapshot(afterCorrect, guesserId);
      expect(ownerSnapshot.guesses.find((g) => g.correct === false)?.text).toBe(wrongWord);
    });
  });

  describe("endRound", () => {
    it("transitions an active room to result for the host", () => {
      const { room, hostId } = startActiveRoom();

      const result = endRound(room.code, hostId);

      expect(result.ok).toBe(true);
      expect((result as { room: typeof room }).room.status).toBe("result");
    });

    it("rejects a non-host", () => {
      const { room, guesserId } = startActiveRoom();

      const result = endRound(room.code, guesserId);

      expect(result).toEqual({ ok: false, reason: "not_host" });
    });

    it("rejects when the room is still lobby", () => {
      const { room, participantId: hostId } = createRoom("Alice");
      joinRoom(room.code, "Bob");

      const result = endRound(room.code, hostId);

      expect(result).toEqual({ ok: false, reason: "not_active" });
    });

    it("rejects when the room is already in result", () => {
      const { room, hostId } = startActiveRoom();
      endRound(room.code, hostId);

      const result = endRound(room.code, hostId);

      expect(result).toEqual({ ok: false, reason: "not_active" });
    });

    it("leaves strokes, guesses, and every score untouched", () => {
      const { room, hostId, guesserId } = startActiveRoom();
      addStroke(room.code, hostId, [{ x: 0, y: 0 }]);
      submitGuess(room.code, guesserId, room.secretWord!);

      const result = endRound(room.code, hostId);
      const updated = (result as { room: typeof room }).room;

      expect(updated.strokes).toHaveLength(1);
      expect(updated.guesses).toHaveLength(1);
      expect(updated.participants.find((participant) => participant.id === guesserId)?.score).toBe(100);
    });
  });

  describe("toRoomSnapshot in the result state", () => {
    it("reveals secretWord and every guess's text to a non-drawer, non-submitting guesser", () => {
      const { room, hostId, guesserId } = startActiveRoom();
      const thirdJoin = joinRoom(room.code, "Cara");
      const otherGuesserId = thirdJoin!.participantId;
      const wrongWord = STARTER_WORDS.find((word) => word !== room.secretWord)!;
      submitGuess(room.code, guesserId, wrongWord);

      const activeSnapshot = toRoomSnapshot(room, otherGuesserId);
      expect(activeSnapshot.secretWord).toBeUndefined();
      expect(activeSnapshot.guesses[0]?.text).toBeUndefined();

      const ended = endRound(room.code, hostId);
      const resultRoom = (ended as { room: typeof room }).room;

      const resultSnapshot = toRoomSnapshot(resultRoom, otherGuesserId);
      expect(resultSnapshot.secretWord).toBe(room.secretWord);
      expect(resultSnapshot.guesses[0]?.text).toBe(wrongWord);
    });

    it("shows every participant's score, identically, across viewers", () => {
      const { room, hostId, guesserId } = startActiveRoom();
      submitGuess(room.code, guesserId, room.secretWord!);
      const ended = endRound(room.code, hostId);
      const resultRoom = (ended as { room: typeof room }).room;

      const hostSnapshot = toRoomSnapshot(resultRoom, hostId);
      const guesserSnapshot = toRoomSnapshot(resultRoom, guesserId);

      expect(hostSnapshot.participants.find((p) => p.id === guesserId)?.score).toBe(100);
      expect(guesserSnapshot.participants.find((p) => p.id === guesserId)?.score).toBe(100);
    });
  });

  describe("restartRoom", () => {
    function endRoundFor(room: { code: string }, hostId: string) {
      const ended = endRound(room.code, hostId);
      return (ended as { room: { code: string } }).room;
    }

    it("transitions result back to lobby for the host, resetting round state and preserving participants", () => {
      const { room, hostId, guesserId } = startActiveRoom();
      addStroke(room.code, hostId, [{ x: 0, y: 0 }]);
      submitGuess(room.code, guesserId, room.secretWord!);
      endRoundFor(room, hostId);

      const result = restartRoom(room.code, hostId);
      const updated = (result as { room: typeof room }).room;

      expect(result.ok).toBe(true);
      expect(updated.status).toBe("lobby");
      expect(updated.drawerParticipantId).toBeUndefined();
      expect(updated.secretWord).toBeUndefined();
      expect(updated.strokes).toEqual([]);
      expect(updated.guesses).toEqual([]);
      expect(updated.participants.every((participant) => participant.score === 0)).toBe(true);
      expect(updated.participants.map((participant) => participant.id)).toEqual(
        room.participants.map((participant) => participant.id)
      );
      expect(updated.hostParticipantId).toBe(room.hostParticipantId);
    });

    it("rejects a non-host", () => {
      const { room, hostId, guesserId } = startActiveRoom();
      endRoundFor(room, hostId);

      const result = restartRoom(room.code, guesserId);

      expect(result).toEqual({ ok: false, reason: "not_host" });
    });

    it("rejects when the room is active (not yet ended)", () => {
      const { room, hostId } = startActiveRoom();

      const result = restartRoom(room.code, hostId);

      expect(result).toEqual({ ok: false, reason: "not_result" });
    });

    it("rejects idempotently when the room is already back in lobby", () => {
      const { room, hostId } = startActiveRoom();
      endRoundFor(room, hostId);
      restartRoom(room.code, hostId);

      const result = restartRoom(room.code, hostId);

      expect(result).toEqual({ ok: false, reason: "not_result" });
    });

    it("supports starting a fresh, independent round after restart with no residual data", () => {
      const { room, hostId, guesserId } = startActiveRoom();
      const firstWord = room.secretWord!;
      submitGuess(room.code, guesserId, firstWord);
      addStroke(room.code, hostId, [{ x: 1, y: 1 }]);
      endRoundFor(room, hostId);
      restartRoom(room.code, hostId);

      const restarted = startGame(room.code, hostId);
      const newRoom = (restarted as { room: typeof room }).room;

      expect(newRoom.status).toBe("active");
      expect(newRoom.drawerParticipantId).toBe(hostId);
      expect(STARTER_WORDS).toContain(newRoom.secretWord);
      expect(newRoom.strokes).toEqual([]);
      expect(newRoom.guesses).toEqual([]);
      expect(newRoom.participants.every((participant) => participant.score === 0)).toBe(true);
    });
  });
});
