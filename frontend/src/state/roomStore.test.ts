import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "../services/api";
import { getStoredIdentity, setStoredIdentity } from "./roomIdentity";
import { RoomStore } from "./roomStore";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ApiError: actual.ApiError,
    api: {
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      fetchRoom: vi.fn(),
      startGame: vi.fn(),
      endRound: vi.fn(),
      restartRoom: vi.fn()
    }
  };
});

describe("RoomStore", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("createRoom persists the creator's identity as host", async () => {
    vi.mocked(api.createRoom).mockResolvedValue({
      participantId: "p1",
      room: { code: "ABCD", status: "lobby", participants: [], availableWords: [], roles: [], canStart: false, strokes: [], guesses: [] }
    });

    const store = new RoomStore();
    await store.createRoom("Alice");

    expect(getStoredIdentity("ABCD")).toEqual({ participantId: "p1", isHost: true });
  });

  it("joinRoom persists the joiner's identity as non-host", async () => {
    vi.mocked(api.joinRoom).mockResolvedValue({
      participantId: "p2",
      room: { code: "WXYZ", status: "lobby", participants: [], availableWords: [], roles: [], canStart: false, strokes: [], guesses: [] }
    });

    const store = new RoomStore();
    await store.joinRoom("WXYZ", "Bob");

    expect(getStoredIdentity("WXYZ")).toEqual({ participantId: "p2", isHost: false });
  });

  describe("endRound", () => {
    it("calls the API and updates RoomState's room from the response", async () => {
      vi.mocked(api.createRoom).mockResolvedValue({
        participantId: "p1",
        room: { code: "ABCD", status: "active", participants: [], availableWords: [], roles: [], canStart: true, strokes: [], guesses: [] }
      });
      vi.mocked(api.endRound).mockResolvedValue({
        room: { code: "ABCD", status: "result", participants: [], availableWords: [], roles: [], canStart: true, strokes: [], guesses: [] }
      });

      const store = new RoomStore();
      await store.createRoom("Alice");

      const room = await store.endRound();

      expect(api.endRound).toHaveBeenCalledWith("ABCD", "p1");
      expect(room?.status).toBe("result");
      expect(store.getSnapshot().room?.status).toBe("result");
    });
  });

  describe("restartRoom", () => {
    it("calls the API and updates RoomState's room from the response", async () => {
      vi.mocked(api.createRoom).mockResolvedValue({
        participantId: "p1",
        room: { code: "ABCD", status: "result", participants: [], availableWords: [], roles: [], canStart: true, strokes: [], guesses: [] }
      });
      vi.mocked(api.restartRoom).mockResolvedValue({
        room: { code: "ABCD", status: "lobby", participants: [], availableWords: [], roles: [], canStart: true, strokes: [], guesses: [] }
      });

      const store = new RoomStore();
      await store.createRoom("Alice");

      const room = await store.restartRoom();

      expect(api.restartRoom).toHaveBeenCalledWith("ABCD", "p1");
      expect(room?.status).toBe("lobby");
      expect(store.getSnapshot().room?.status).toBe("lobby");
    });
  });

  describe("polling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("startPolling calls fetchRoom on each tick and stopPolling clears it", async () => {
      vi.mocked(api.createRoom).mockResolvedValue({
        participantId: "p1",
        room: { code: "ABCD", status: "lobby", participants: [], availableWords: [], roles: [], canStart: false, strokes: [], guesses: [] }
      });
      vi.mocked(api.fetchRoom).mockResolvedValue({
        room: { code: "ABCD", status: "lobby", participants: [], availableWords: [], roles: [], canStart: false, strokes: [], guesses: [] }
      });

      const store = new RoomStore();
      await store.createRoom("Alice");

      store.startPolling(2000);
      await vi.advanceTimersByTimeAsync(2000);
      expect(api.fetchRoom).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(2000);
      expect(api.fetchRoom).toHaveBeenCalledTimes(2);

      store.stopPolling();
      await vi.advanceTimersByTimeAsync(4000);
      expect(api.fetchRoom).toHaveBeenCalledTimes(2);
    });
  });

  describe("reattach", () => {
    it("restores room/participant state from a stored identity plus a successful fetch", async () => {
      setStoredIdentity("ABCD", { participantId: "p1", isHost: true });
      vi.mocked(api.fetchRoom).mockResolvedValue({
        room: { code: "ABCD", status: "lobby", participants: [], availableWords: [], roles: [], canStart: false, strokes: [], guesses: [] }
      });

      const store = new RoomStore();
      const room = await store.reattach();

      expect(room?.code).toBe("ABCD");
      expect(store.getSnapshot().participantId).toBe("p1");
    });

    it("clears the stored identity and surfaces an error on a real 404 (room no longer exists)", async () => {
      setStoredIdentity("ABCD", { participantId: "p1", isHost: true });
      vi.mocked(api.fetchRoom).mockRejectedValue(new ApiError(404, "Unable to load room"));

      const store = new RoomStore();
      await store.reattach();

      expect(getStoredIdentity("ABCD")).toBeNull();
      expect(store.getSnapshot().room).toBeNull();
      expect(store.getSnapshot().error).toMatch(/could not be found/i);
    });

    it("keeps the stored identity and surfaces a retry-style error on a transient failure", async () => {
      setStoredIdentity("ABCD", { participantId: "p1", isHost: true });
      vi.mocked(api.fetchRoom).mockRejectedValue(new TypeError("Failed to fetch"));

      const store = new RoomStore();
      await store.reattach();

      expect(getStoredIdentity("ABCD")).toEqual({ participantId: "p1", isHost: true });
      expect(store.getSnapshot().error).toMatch(/could not reach the server/i);
    });

    it("is a no-op when nothing was stored", async () => {
      const store = new RoomStore();
      const room = await store.reattach();

      expect(room).toBeNull();
      expect(api.fetchRoom).not.toHaveBeenCalled();
    });
  });
});
