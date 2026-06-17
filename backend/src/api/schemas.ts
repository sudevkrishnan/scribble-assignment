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

export const pointSchema = z.object({
  x: z.number(),
  y: z.number()
});

export const strokeSchema = z.object({
  participantId: z.string().trim().min(1, "participantId is required"),
  points: z.array(pointSchema).min(1, "Stroke must have at least one point")
});

export const clearCanvasSchema = z.object({
  participantId: z.string().trim().min(1, "participantId is required")
});

export const guessSchema = z.object({
  participantId: z.string().trim().min(1, "participantId is required"),
  text: z.string().trim().min(1, "Guess is required")
});

export const endRoundSchema = z.object({
  participantId: z.string().trim().min(1, "participantId is required")
});

export const restartSchema = z.object({
  participantId: z.string().trim().min(1, "participantId is required")
});

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
