import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

describe("api service", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("createRoom sends POST to /rooms with playerName in body", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          participantId: "p1",
          room: { code: "ABCD", status: "lobby", participants: [] },
        }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await api.createRoom("Alice");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/rooms"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ playerName: "Alice" }),
      })
    );
  });

  it("fetchRoom sends GET to /rooms/:code with participantId query param", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          room: { code: "XYZW", status: "lobby", participants: [] },
        }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await api.fetchRoom("XYZW", "p1");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/rooms/XYZW?participantId=p1"),
      expect.anything()
    );
  });

  it.each([
    ["Room code is required", 400],
    ["Room code is invalid", 400],
    ["Room not found", 404],
  ])("joinRoom surfaces the backend message %j for status %d", async (message, status) => {
    const mockResponse = {
      ok: false,
      status,
      json: () => Promise.resolve({ message }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await expect(api.joinRoom("zzzz", "Bob")).rejects.toThrow(message);
  });

  it("startGame sends POST to /rooms/:code/start with participantId in body", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          room: { code: "ABCD", status: "active", participants: [], availableWords: [], roles: [], canStart: true },
        }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await api.startGame("ABCD", "p1");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/rooms/ABCD/start"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ participantId: "p1" }),
      })
    );
  });

  it("fetchRoom returns isDrawer per participant and secretWord when present", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          room: {
            code: "ABCD",
            status: "active",
            participants: [
              { id: "p1", name: "Alice", joinedAt: "now", isHost: true, isDrawer: true },
              { id: "p2", name: "Bob", joinedAt: "now", isHost: false, isDrawer: false },
            ],
            availableWords: ["rocket"],
            roles: ["drawer", "guesser"],
            canStart: true,
            secretWord: "rocket",
          },
        }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await api.fetchRoom("ABCD", "p1");

    expect(result.room.participants[0].isDrawer).toBe(true);
    expect(result.room.participants[1].isDrawer).toBe(false);
    expect(result.room.secretWord).toBe("rocket");
  });

  it("fetchRoom returns strokes and a redacted guesses array", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          room: {
            code: "ABCD",
            status: "active",
            participants: [
              { id: "p1", name: "Alice", joinedAt: "now", isHost: true, isDrawer: false, score: 100 },
              { id: "p2", name: "Bob", joinedAt: "now", isHost: false, isDrawer: true, score: 0 },
            ],
            availableWords: [],
            roles: ["drawer", "guesser"],
            canStart: true,
            strokes: [{ points: [{ x: 1, y: 1 }] }],
            guesses: [
              { id: "g1", participantId: "p1", correct: true, text: "pizza" },
              { id: "g2", participantId: "p1", correct: false },
            ],
          },
        }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await api.fetchRoom("ABCD", "p2");

    expect(result.room.strokes).toEqual([{ points: [{ x: 1, y: 1 }] }]);
    expect(result.room.guesses[0].text).toBe("pizza");
    expect(result.room.guesses[1].text).toBeUndefined();
  });
});
