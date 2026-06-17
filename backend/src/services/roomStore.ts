import { randomUUID } from "node:crypto";
import type { Participant, Room, RoomSnapshot } from "../models/game.js";
import { STARTER_ROLES, STARTER_WORDS } from "../seed/starterData.js";

const rooms = new Map<string, Room>();

function now() {
  return new Date().toISOString();
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function generateUniqueCode() {
  let code = generateCode();

  while (rooms.has(code)) {
    code = generateCode();
  }

  return code;
}

function createParticipant(name: string): Participant {
  return {
    id: randomUUID(),
    name,
    joinedAt: now()
  };
}

function cloneRoom(room: Room) {
  return structuredClone(room);
}

export function listWords() {
  return [...STARTER_WORDS];
}

/** Pure, deterministic: same code always selects the same word. No RNG, no time input. */
export function selectSecretWord(code: string): string {
  let hash = 0;

  for (let index = 0; index < code.length; index += 1) {
    hash = (hash * 31 + code.charCodeAt(index)) | 0;
  }

  const words = listWords();
  return words[Math.abs(hash) % words.length];
}

export function createRoom(playerName: string) {
  const participant = createParticipant(playerName);
  const room: Room = {
    code: generateUniqueCode(),
    status: "lobby",
    participants: [participant],
    hostParticipantId: participant.id,
    createdAt: now(),
    updatedAt: now()
  };

  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function joinRoom(code: string, playerName: string) {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  const participant = createParticipant(playerName);
  room.participants.push(participant);
  room.updatedAt = now();
  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function getRoom(code: string) {
  const room = rooms.get(code);
  return room ? cloneRoom(room) : null;
}

export type StartGameFailureReason = "not_found" | "not_host" | "not_enough_players";

export type StartGameResult =
  | { ok: true; room: Room }
  | { ok: false; reason: StartGameFailureReason };

export function startGame(code: string, participantId: string): StartGameResult {
  const room = rooms.get(code);

  if (!room) {
    return { ok: false, reason: "not_found" };
  }

  if (room.hostParticipantId !== participantId) {
    return { ok: false, reason: "not_host" };
  }

  if (room.participants.length < 2) {
    return { ok: false, reason: "not_enough_players" };
  }

  if (!room.drawerParticipantId) {
    room.drawerParticipantId = room.hostParticipantId;
    room.secretWord = selectSecretWord(room.code);
  }

  room.status = "active";
  room.updatedAt = now();
  rooms.set(room.code, room);

  return { ok: true, room: cloneRoom(room) };
}

export function saveRoom(room: Room) {
  room.updatedAt = now();
  rooms.set(room.code, cloneRoom(room));
  return getRoom(room.code);
}

export function toRoomSnapshot(room: Room, viewerParticipantId?: string): RoomSnapshot {
  const viewerIsDrawer = Boolean(room.drawerParticipantId) && viewerParticipantId === room.drawerParticipantId;

  return {
    code: room.code,
    status: room.status,
    participants: room.participants.map((participant) => ({
      ...participant,
      isHost: participant.id === room.hostParticipantId,
      isDrawer: participant.id === room.drawerParticipantId
    })),
    availableWords: viewerIsDrawer ? listWords() : [],
    roles: [...STARTER_ROLES],
    canStart: room.participants.length >= 2,
    secretWord: viewerIsDrawer ? room.secretWord : undefined
  };
}
