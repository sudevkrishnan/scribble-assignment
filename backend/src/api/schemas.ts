import { z } from "zod";

// Matches the alphabet generateCode() in roomStore.ts draws from
// (ABCDEFGHJKLMNPQRSTUVWXYZ23456789 — excludes ambiguous I, O, 0, 1).
export const ROOM_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/i;

export const createRoomSchema = z.object({
  playerName: z.string().trim().min(1, "Player name is required")
});

export const joinRoomSchema = z.object({
  playerName: z.string().trim().min(1, "Player name is required")
});

export const roomCodeParamsSchema = z.object({
  code: z.string()
});

export const roomViewerQuerySchema = z.object({
  participantId: z.string().optional()
});

export const startGameSchema = z.object({
  participantId: z.string().trim().min(1, "participantId is required")
});

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
