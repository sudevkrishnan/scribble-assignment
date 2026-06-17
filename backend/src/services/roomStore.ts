import { randomUUID } from "node:crypto";
import type { GuessEntry, Participant, Point, Room, RoomSnapshot } from "../models/game.js";
import { STARTER_ROLES, STARTER_WORDS } from "../seed/starterData.js";

const CORRECT_GUESS_SCORE = 100;

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
    joinedAt: now(),
    score: 0
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
    strokes: [],
    guesses: [],
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

export type DrawingActionFailureReason = "not_found" | "not_drawer" | "not_active";

export type DrawingActionResult =
  | { ok: true; room: Room }
  | { ok: false; reason: DrawingActionFailureReason };

function checkDrawerAction(code: string, participantId: string): DrawingActionResult | { ok: true; room: Room } {
  const room = rooms.get(code);

  if (!room) {
    return { ok: false, reason: "not_found" };
  }

  if (room.status !== "active") {
    return { ok: false, reason: "not_active" };
  }

  if (room.drawerParticipantId !== participantId) {
    return { ok: false, reason: "not_drawer" };
  }

  return { ok: true, room };
}

export function addStroke(code: string, participantId: string, points: Point[]): DrawingActionResult {
  const check = checkDrawerAction(code, participantId);

  if (!check.ok) {
    return check;
  }

  const room = check.room;
  room.strokes.push({ points });
  room.updatedAt = now();
  rooms.set(room.code, room);

  return { ok: true, room: cloneRoom(room) };
}

export function clearCanvas(code: string, participantId: string): DrawingActionResult {
  const check = checkDrawerAction(code, participantId);

  if (!check.ok) {
    return check;
  }

  const room = check.room;
  room.strokes = [];
  room.updatedAt = now();
  rooms.set(room.code, room);

  return { ok: true, room: cloneRoom(room) };
}

export type GuessActionFailureReason = "not_found" | "not_guesser" | "not_active" | "not_participant";

export type GuessActionResult =
  | { ok: true; room: Room; guess: GuessEntry }
  | { ok: false; reason: GuessActionFailureReason };

export function submitGuess(code: string, participantId: string, text: string): GuessActionResult {
  const room = rooms.get(code);

  if (!room) {
    return { ok: false, reason: "not_found" };
  }

  if (room.status !== "active") {
    return { ok: false, reason: "not_active" };
  }

  if (room.drawerParticipantId === participantId) {
    return { ok: false, reason: "not_guesser" };
  }

  if (!room.participants.some((participant) => participant.id === participantId)) {
    return { ok: false, reason: "not_participant" };
  }

  const trimmed = text.trim();
  const correct = Boolean(room.secretWord) && trimmed.toLowerCase() === room.secretWord!.toLowerCase();

  const guess: GuessEntry = {
    id: randomUUID(),
    participantId,
    text: trimmed,
    correct,
    submittedAt: now()
  };

  room.guesses.push(guess);

  if (correct) {
    const participant = room.participants.find((candidate) => candidate.id === participantId);

    if (participant) {
      participant.score += CORRECT_GUESS_SCORE;
    }
  }

  room.updatedAt = now();
  rooms.set(room.code, room);

  return { ok: true, room: cloneRoom(room), guess };
}

export type EndRoundFailureReason = "not_found" | "not_host" | "not_active";

export type EndRoundResult =
  | { ok: true; room: Room }
  | { ok: false; reason: EndRoundFailureReason };

export function endRound(code: string, participantId: string): EndRoundResult {
  const room = rooms.get(code);

  if (!room) {
    return { ok: false, reason: "not_found" };
  }

  if (room.hostParticipantId !== participantId) {
    return { ok: false, reason: "not_host" };
  }

  if (room.status !== "active") {
    return { ok: false, reason: "not_active" };
  }

  room.status = "result";
  room.updatedAt = now();
  rooms.set(room.code, room);

  return { ok: true, room: cloneRoom(room) };
}

export type RestartFailureReason = "not_found" | "not_host" | "not_result";

export type RestartResult =
  | { ok: true; room: Room }
  | { ok: false; reason: RestartFailureReason };

export function restartRoom(code: string, participantId: string): RestartResult {
  const room = rooms.get(code);

  if (!room) {
    return { ok: false, reason: "not_found" };
  }

  if (room.hostParticipantId !== participantId) {
    return { ok: false, reason: "not_host" };
  }

  if (room.status !== "result") {
    return { ok: false, reason: "not_result" };
  }

  room.status = "lobby";
  room.drawerParticipantId = undefined;
  room.secretWord = undefined;
  room.strokes = [];
  room.guesses = [];
  room.participants.forEach((participant) => {
    participant.score = 0;
  });
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
  const isResult = room.status === "result";

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
    secretWord: viewerIsDrawer || isResult ? room.secretWord : undefined,
    strokes: room.strokes,
    guesses: room.guesses.map((guess) => {
      const canSeeText = isResult || viewerIsDrawer || guess.participantId === viewerParticipantId || guess.correct;

      return canSeeText
        ? { id: guess.id, participantId: guess.participantId, correct: guess.correct, text: guess.text }
        : { id: guess.id, participantId: guess.participantId, correct: guess.correct };
    })
  };
}
