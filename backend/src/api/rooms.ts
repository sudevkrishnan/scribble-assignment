import { Router } from "express";
import {
  clearCanvasSchema,
  createRoomSchema,
  endRoundSchema,
  guessSchema,
  HttpError,
  joinRoomSchema,
  restartSchema,
  ROOM_CODE_PATTERN,
  roomCodeParamsSchema,
  roomViewerQuerySchema,
  startGameSchema,
  strokeSchema
} from "./schemas.js";
import {
  addStroke,
  clearCanvas,
  createRoom,
  endRound,
  getRoom,
  joinRoom,
  restartRoom,
  startGame,
  submitGuess,
  toRoomSnapshot
} from "../services/roomStore.js";

const START_GAME_ERROR_BY_REASON = {
  not_found: { statusCode: 404, message: "Room not found" },
  not_host: { statusCode: 403, message: "Only the host can start the game" },
  not_enough_players: { statusCode: 409, message: "At least 2 players are required to start" }
} as const;

const DRAWING_ACTION_ERROR_BY_REASON = {
  not_found: { statusCode: 404, message: "Room not found" },
  not_drawer: { statusCode: 403, message: "Only the drawer can draw" },
  not_active: { statusCode: 409, message: "Round is not active" }
} as const;

const GUESS_ACTION_ERROR_BY_REASON = {
  not_found: { statusCode: 404, message: "Room not found" },
  not_guesser: { statusCode: 403, message: "The drawer cannot submit guesses" },
  not_participant: { statusCode: 403, message: "participantId is not a member of this room" },
  not_active: { statusCode: 409, message: "Round is not active" }
} as const;

const END_ROUND_ERROR_BY_REASON = {
  not_found: { statusCode: 404, message: "Room not found" },
  not_host: { statusCode: 403, message: "Only the host can end the round" },
  not_active: { statusCode: 409, message: "Round is not active" }
} as const;

const RESTART_ERROR_BY_REASON = {
  not_found: { statusCode: 404, message: "Room not found" },
  not_host: { statusCode: 403, message: "Only the host can restart the room" },
  not_result: { statusCode: 409, message: "Room is not in the result state" }
} as const;

export function createRoomsRouter() {
  const router = Router();

  router.post("/", (request, response, next) => {
    try {
      const { playerName } = createRoomSchema.parse(request.body);
      const result = createRoom(playerName);

      response.status(201).json({
        participantId: result.participantId,
        room: toRoomSnapshot(result.room, result.participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/join", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { playerName } = joinRoomSchema.parse(request.body);
      const trimmedCode = code.trim();

      if (!trimmedCode) {
        throw new HttpError(400, "Room code is required");
      }

      if (!ROOM_CODE_PATTERN.test(trimmedCode)) {
        throw new HttpError(400, "Room code is invalid");
      }

      const result = joinRoom(trimmedCode.toUpperCase(), playerName);

      if (!result) {
        throw new HttpError(404, "Room not found");
      }

      response.json({
        participantId: result.participantId,
        room: toRoomSnapshot(result.room, result.participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/start", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = startGameSchema.parse(request.body);
      const result = startGame(code.toUpperCase(), participantId);

      if (!result.ok) {
        const { statusCode, message } = START_GAME_ERROR_BY_REASON[result.reason];
        throw new HttpError(statusCode, message);
      }

      response.json({
        room: toRoomSnapshot(result.room, participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/strokes", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId, points } = strokeSchema.parse(request.body);
      const result = addStroke(code.toUpperCase(), participantId, points);

      if (!result.ok) {
        const { statusCode, message } = DRAWING_ACTION_ERROR_BY_REASON[result.reason];
        throw new HttpError(statusCode, message);
      }

      response.json({
        room: toRoomSnapshot(result.room, participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/clear", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = clearCanvasSchema.parse(request.body);
      const result = clearCanvas(code.toUpperCase(), participantId);

      if (!result.ok) {
        const { statusCode, message } = DRAWING_ACTION_ERROR_BY_REASON[result.reason];
        throw new HttpError(statusCode, message);
      }

      response.json({
        room: toRoomSnapshot(result.room, participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/guesses", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId, text } = guessSchema.parse(request.body);
      const result = submitGuess(code.toUpperCase(), participantId, text);

      if (!result.ok) {
        const { statusCode, message } = GUESS_ACTION_ERROR_BY_REASON[result.reason];
        throw new HttpError(statusCode, message);
      }

      response.json({
        room: toRoomSnapshot(result.room, participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/end-round", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = endRoundSchema.parse(request.body);
      const result = endRound(code.toUpperCase(), participantId);

      if (!result.ok) {
        const { statusCode, message } = END_ROUND_ERROR_BY_REASON[result.reason];
        throw new HttpError(statusCode, message);
      }

      response.json({
        room: toRoomSnapshot(result.room, participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/restart", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = restartSchema.parse(request.body);
      const result = restartRoom(code.toUpperCase(), participantId);

      if (!result.ok) {
        const { statusCode, message } = RESTART_ERROR_BY_REASON[result.reason];
        throw new HttpError(statusCode, message);
      }

      response.json({
        room: toRoomSnapshot(result.room, participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:code", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = roomViewerQuerySchema.parse(request.query);
      const room = getRoom(code.toUpperCase());

      if (!room) {
        throw new HttpError(404, "Unable to load room");
      }

      response.json({
        room: toRoomSnapshot(room, participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
