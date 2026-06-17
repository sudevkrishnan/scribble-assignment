export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "active";

export interface Participant {
  id: string;
  name: string;
  joinedAt: string;
}

export interface Room {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  hostParticipantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomSnapshotParticipant extends Participant {
  isHost: boolean;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  participants: RoomSnapshotParticipant[];
  availableWords: string[];
  roles: ParticipantRole[];
  canStart: boolean;
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
