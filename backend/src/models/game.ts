export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "active" | "result";

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
}

export interface GuessEntry {
  id: string;
  participantId: string;
  text: string;
  correct: boolean;
  submittedAt: string;
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
  score: number;
}

export interface Room {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  hostParticipantId: string;
  drawerParticipantId?: string;
  secretWord?: string;
  strokes: Stroke[];
  guesses: GuessEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomSnapshotParticipant extends Participant {
  isHost: boolean;
  isDrawer: boolean;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  participants: RoomSnapshotParticipant[];
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
