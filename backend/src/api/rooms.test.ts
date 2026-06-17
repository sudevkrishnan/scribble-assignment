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
});
