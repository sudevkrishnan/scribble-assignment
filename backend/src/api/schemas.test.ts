import { describe, expect, it } from "vitest";
import {
  clearCanvasSchema,
  createRoomSchema,
  guessSchema,
  joinRoomSchema,
  roomCodeParamsSchema,
  startGameSchema,
  strokeSchema
} from "./schemas.js";

describe("schemas", () => {
  it("createRoomSchema accepts a valid body with playerName", () => {
    const result = createRoomSchema.parse({ playerName: "Alice" });

    expect(result.playerName).toBe("Alice");
  });

  it("createRoomSchema rejects a blank playerName", () => {
    expect(() => createRoomSchema.parse({ playerName: "" })).toThrow("Player name is required");
  });

  it("createRoomSchema rejects a whitespace-only playerName", () => {
    expect(() => createRoomSchema.parse({ playerName: "   " })).toThrow("Player name is required");
  });

  it("createRoomSchema trims a padded playerName", () => {
    const result = createRoomSchema.parse({ playerName: "  Alice  " });

    expect(result.playerName).toBe("Alice");
  });

  it("joinRoomSchema rejects a blank playerName", () => {
    expect(() => joinRoomSchema.parse({ playerName: "" })).toThrow("Player name is required");
  });

  it("joinRoomSchema rejects a whitespace-only playerName", () => {
    expect(() => joinRoomSchema.parse({ playerName: "   " })).toThrow("Player name is required");
  });

  it("joinRoomSchema trims a padded playerName", () => {
    const result = joinRoomSchema.parse({ playerName: "  Bob  " });

    expect(result.playerName).toBe("Bob");
  });

  it("roomCodeParamsSchema rejects missing code", () => {
    expect(() => roomCodeParamsSchema.parse({})).toThrow();
  });

  it("startGameSchema rejects a missing participantId", () => {
    expect(() => startGameSchema.parse({})).toThrow();
  });

  it("startGameSchema rejects a blank participantId", () => {
    expect(() => startGameSchema.parse({ participantId: "   " })).toThrow();
  });

  it("startGameSchema accepts a valid participantId", () => {
    const result = startGameSchema.parse({ participantId: "p1" });

    expect(result.participantId).toBe("p1");
  });

  it("strokeSchema rejects empty points", () => {
    expect(() => strokeSchema.parse({ participantId: "p1", points: [] })).toThrow();
  });

  it("strokeSchema accepts a valid points array", () => {
    const result = strokeSchema.parse({ participantId: "p1", points: [{ x: 1, y: 2 }] });

    expect(result.points).toEqual([{ x: 1, y: 2 }]);
  });

  it("clearCanvasSchema rejects a missing participantId", () => {
    expect(() => clearCanvasSchema.parse({})).toThrow();
  });

  it("guessSchema rejects a blank or whitespace-only text", () => {
    expect(() => guessSchema.parse({ participantId: "p1", text: "" })).toThrow("Guess is required");
    expect(() => guessSchema.parse({ participantId: "p1", text: "   " })).toThrow("Guess is required");
  });

  it("guessSchema trims a padded text", () => {
    const result = guessSchema.parse({ participantId: "p1", text: "  pizza  " });

    expect(result.text).toBe("pizza");
  });
});
