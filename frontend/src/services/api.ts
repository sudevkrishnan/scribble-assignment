export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "active" | "result";

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
}

export interface GuessSnapshotEntry {
  id: string;
  participantId: string;
  correct: boolean;
  text?: string;
}

export interface Participant {
  id: string;
  name: string;
  joinedAt: string;
  isHost: boolean;
  isDrawer: boolean;
  score: number;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  availableWords: string[];
  roles: ParticipantRole[];
  canStart: boolean;
  secretWord?: string;
  strokes: Stroke[];
  guesses: GuessSnapshotEntry[];
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const errorBody = (await response
      .json()
      .catch(() => ({ message: "Request failed" }))) as {
      message?: string;
    };

    throw new ApiError(response.status, errorBody.message ?? "Request failed");
  }

  return (await response.json()) as T;
}

export const api = {
  createRoom(playerName: string) {
    return request<RoomSessionResponse>("/rooms", {
      method: "POST",
      body: JSON.stringify({ playerName }),
    });
  },
  joinRoom(code: string, playerName: string) {
    return request<RoomSessionResponse>(
      `/rooms/${encodeURIComponent(code)}/join`,
      {
        method: "POST",
        body: JSON.stringify({ playerName }),
      },
    );
  },
  fetchRoom(code: string, participantId?: string) {
    const query = participantId
      ? `?participantId=${encodeURIComponent(participantId)}`
      : "";
    return request<{ room: RoomSnapshot }>(
      `/rooms/${encodeURIComponent(code)}${query}`,
    );
  },
  startGame(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(
      `/rooms/${encodeURIComponent(code)}/start`,
      {
        method: "POST",
        body: JSON.stringify({ participantId }),
      },
    );
  },
  addStroke(code: string, participantId: string, points: Point[]) {
    return request<{ room: RoomSnapshot }>(
      `/rooms/${encodeURIComponent(code)}/strokes`,
      {
        method: "POST",
        body: JSON.stringify({ participantId, points }),
      },
    );
  },
  clearCanvas(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(
      `/rooms/${encodeURIComponent(code)}/clear`,
      {
        method: "POST",
        body: JSON.stringify({ participantId }),
      },
    );
  },
  submitGuess(code: string, participantId: string, text: string) {
    return request<{ room: RoomSnapshot }>(
      `/rooms/${encodeURIComponent(code)}/guesses`,
      {
        method: "POST",
        body: JSON.stringify({ participantId, text }),
      },
    );
  },
};
