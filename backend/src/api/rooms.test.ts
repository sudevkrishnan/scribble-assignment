import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";

describe("rooms router", () => {
  let baseUrl: string;
  const server = createApp().listen(0);

  beforeAll(() => {
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(() => {
    server.close();
  });

  it("rejects an empty room code on join with 400", async () => {
    const createResponse = await fetch(`${baseUrl}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Alice" })
    });
    await createResponse.json();

    const response = await fetch(`${baseUrl}/rooms/${encodeURIComponent("   ")}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Bob" })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Room code is required");
  });

  it("rejects a malformed room code on join with 400", async () => {
    const response = await fetch(`${baseUrl}/rooms/12/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Bob" })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Room code is invalid");
  });

  it("rejects a well-formed but unknown room code on join with 404", async () => {
    const response = await fetch(`${baseUrl}/rooms/ZZZZ/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Bob" })
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe("Room not found");
  });

  it("allows a well-formed, existing room code to be joined", async () => {
    const createResponse = await fetch(`${baseUrl}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Alice" })
    });
    const created = await createResponse.json();

    const response = await fetch(`${baseUrl}/rooms/${created.room.code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Bob" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.room.participants).toHaveLength(2);
    expect(body.room.participants.find((p: { name: string }) => p.name === "Bob").isHost).toBe(false);
  });

  it("rejects a blank playerName on create with 400", async () => {
    const response = await fetch(`${baseUrl}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "   " })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Player name is required");
  });

  it("rejects a blank playerName on join with 400", async () => {
    const createResponse = await fetch(`${baseUrl}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Alice" })
    });
    const created = await createResponse.json();

    const response = await fetch(`${baseUrl}/rooms/${created.room.code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "   " })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Player name is required");
  });

  it("includes secretWord for the drawer but not for another participant fetching the same room", async () => {
    const createResponse = await fetch(`${baseUrl}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Alice" })
    });
    const created = await createResponse.json();
    const hostId = created.participantId;

    const joinResponse = await fetch(`${baseUrl}/rooms/${created.room.code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Bob" })
    });
    const joined = await joinResponse.json();
    const guesserId = joined.participantId;

    await fetch(`${baseUrl}/rooms/${created.room.code}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: hostId })
    });

    const drawerView = await fetch(`${baseUrl}/rooms/${created.room.code}?participantId=${hostId}`);
    const drawerBody = await drawerView.json();
    expect(drawerBody.room.secretWord).toBeDefined();

    const guesserView = await fetch(`${baseUrl}/rooms/${created.room.code}?participantId=${guesserId}`);
    const guesserBody = await guesserView.json();
    expect(guesserBody.room.secretWord).toBeUndefined();
    expect(guesserBody.room.availableWords).toEqual([]);
  });

  async function startActiveRoom() {
    const createResponse = await fetch(`${baseUrl}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Alice" })
    });
    const created = await createResponse.json();
    const hostId = created.participantId;

    const joinResponse = await fetch(`${baseUrl}/rooms/${created.room.code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Bob" })
    });
    const joined = await joinResponse.json();
    const guesserId = joined.participantId;

    await fetch(`${baseUrl}/rooms/${created.room.code}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: hostId })
    });

    const drawerView = await fetch(`${baseUrl}/rooms/${created.room.code}?participantId=${hostId}`);
    const drawerBody = await drawerView.json();

    return { code: created.room.code, hostId, guesserId, secretWord: drawerBody.room.secretWord as string };
  }

  describe("POST /:code/strokes", () => {
    it("returns 200 for the drawer", async () => {
      const { code, hostId } = await startActiveRoom();

      const response = await fetch(`${baseUrl}/rooms/${code}/strokes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: hostId, points: [{ x: 1, y: 1 }] })
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.room.strokes).toEqual([{ points: [{ x: 1, y: 1 }] }]);
    });

    it("returns 403 for a non-drawer", async () => {
      const { code, guesserId } = await startActiveRoom();

      const response = await fetch(`${baseUrl}/rooms/${code}/strokes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: guesserId, points: [{ x: 1, y: 1 }] })
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.message).toBe("Only the drawer can draw");
    });

    it("returns 404 for an unknown room", async () => {
      const response = await fetch(`${baseUrl}/rooms/ZZZZ/strokes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: "anyone", points: [{ x: 1, y: 1 }] })
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.message).toBe("Room not found");
    });

    it("returns 409 for a non-active room", async () => {
      const createResponse = await fetch(`${baseUrl}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: "Alice" })
      });
      const created = await createResponse.json();

      const response = await fetch(`${baseUrl}/rooms/${created.room.code}/strokes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: created.participantId, points: [{ x: 1, y: 1 }] })
      });
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.message).toBe("Round is not active");
    });
  });

  describe("POST /:code/clear", () => {
    it("returns 200 and empties strokes for the drawer", async () => {
      const { code, hostId } = await startActiveRoom();
      await fetch(`${baseUrl}/rooms/${code}/strokes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: hostId, points: [{ x: 1, y: 1 }] })
      });

      const response = await fetch(`${baseUrl}/rooms/${code}/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: hostId })
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.room.strokes).toEqual([]);
    });

    it("returns 403 for a non-drawer", async () => {
      const { code, guesserId } = await startActiveRoom();

      const response = await fetch(`${baseUrl}/rooms/${code}/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: guesserId })
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.message).toBe("Only the drawer can draw");
    });
  });

  describe("POST /:code/guesses", () => {
    it("returns 200 for a guesser and reflects the updated score on a correct guess", async () => {
      const { code, guesserId, secretWord } = await startActiveRoom();

      const response = await fetch(`${baseUrl}/rooms/${code}/guesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: guesserId, text: secretWord })
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.room.participants.find((p: { id: string }) => p.id === guesserId).score).toBe(100);
    });

    it("returns 400 for a blank guess", async () => {
      const { code, guesserId } = await startActiveRoom();

      const response = await fetch(`${baseUrl}/rooms/${code}/guesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: guesserId, text: "   " })
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.message).toBe("Guess is required");
    });

    it("returns 403 for the drawer", async () => {
      const { code, hostId } = await startActiveRoom();

      const response = await fetch(`${baseUrl}/rooms/${code}/guesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: hostId, text: "anything" })
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.message).toBe("The drawer cannot submit guesses");
    });

    it("returns 404 for an unknown room", async () => {
      const response = await fetch(`${baseUrl}/rooms/ZZZZ/guesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: "anyone", text: "anything" })
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.message).toBe("Room not found");
    });

    it("returns 403 for a participantId that isn't a member of the room", async () => {
      const { code } = await startActiveRoom();

      const response = await fetch(`${baseUrl}/rooms/${code}/guesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: "not-a-real-participant-id", text: "anything" })
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.message).toBe("participantId is not a member of this room");
    });

    it("returns differently-redacted guesses arrays for different viewers", async () => {
      const { code, hostId, guesserId, secretWord } = await startActiveRoom();
      const joinResponse = await fetch(`${baseUrl}/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: "Cara" })
      });
      const otherGuesser = await joinResponse.json();

      await fetch(`${baseUrl}/rooms/${code}/guesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: guesserId, text: "wrongword" })
      });
      await fetch(`${baseUrl}/rooms/${code}/guesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: guesserId, text: secretWord })
      });

      const otherGuesserView = await fetch(`${baseUrl}/rooms/${code}?participantId=${otherGuesser.participantId}`);
      const otherGuesserBody = await otherGuesserView.json();
      const incorrectEntry = otherGuesserBody.room.guesses.find((g: { correct: boolean }) => g.correct === false);
      const correctEntry = otherGuesserBody.room.guesses.find((g: { correct: boolean }) => g.correct === true);
      expect(incorrectEntry.text).toBeUndefined();
      expect(correctEntry.text).toBe(secretWord);

      const drawerView = await fetch(`${baseUrl}/rooms/${code}?participantId=${hostId}`);
      const drawerBody = await drawerView.json();
      expect(drawerBody.room.guesses.find((g: { correct: boolean }) => g.correct === false).text).toBe("wrongword");
    });
  });
});
