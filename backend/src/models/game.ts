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
  drawerParticipantId?: string;
  secretWord?: string;
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
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
