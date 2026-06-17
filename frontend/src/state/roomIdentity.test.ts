import { beforeEach, describe, expect, it } from "vitest";
import { clearStoredIdentity, getStoredIdentity, setStoredIdentity } from "./roomIdentity";

describe("roomIdentity", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("returns null when no identity is stored for a code", () => {
    expect(getStoredIdentity("ABCD")).toBeNull();
  });

  it("round-trips a stored identity for a code", () => {
    setStoredIdentity("ABCD", { participantId: "p1", isHost: true });

    expect(getStoredIdentity("ABCD")).toEqual({ participantId: "p1", isHost: true });
  });

  it("clears a stored identity for a code", () => {
    setStoredIdentity("ABCD", { participantId: "p1", isHost: true });
    clearStoredIdentity("ABCD");

    expect(getStoredIdentity("ABCD")).toBeNull();
  });

  it("does not collide between two different room codes", () => {
    setStoredIdentity("ABCD", { participantId: "p1", isHost: true });
    setStoredIdentity("WXYZ", { participantId: "p2", isHost: false });

    expect(getStoredIdentity("ABCD")).toEqual({ participantId: "p1", isHost: true });
    expect(getStoredIdentity("WXYZ")).toEqual({ participantId: "p2", isHost: false });
  });
});
