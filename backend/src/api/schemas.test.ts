import { describe, expect, it } from "vitest";
import { createRoomSchema, joinRoomSchema, roomCodeParamsSchema, startGameSchema } from "./schemas.js";

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
});
