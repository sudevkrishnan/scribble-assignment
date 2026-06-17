import { describe, expect, it } from "vitest";
import { createRoom, joinRoom, startGame, toRoomSnapshot } from "./roomStore.js";

describe("roomStore", () => {
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
  });
});
