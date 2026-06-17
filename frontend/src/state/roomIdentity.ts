export interface StoredIdentity {
  participantId: string;
  isHost: boolean;
}

const ACTIVE_ROOM_CODE_KEY = "scribble:activeRoomCode";

function storageKey(code: string) {
  return `scribble:room:${code}`;
}

export function getStoredIdentity(code: string): StoredIdentity | null {
  const raw = window.sessionStorage.getItem(storageKey(code));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredIdentity;
  } catch {
    return null;
  }
}

export function setStoredIdentity(code: string, identity: StoredIdentity) {
  window.sessionStorage.setItem(storageKey(code), JSON.stringify(identity));
  window.sessionStorage.setItem(ACTIVE_ROOM_CODE_KEY, code);
}

export function clearStoredIdentity(code: string) {
  window.sessionStorage.removeItem(storageKey(code));
  if (window.sessionStorage.getItem(ACTIVE_ROOM_CODE_KEY) === code) {
    window.sessionStorage.removeItem(ACTIVE_ROOM_CODE_KEY);
  }
}

/** The code of the room this tab last created/joined, if any — used to reattach after a reload. */
export function getActiveRoomCode(): string | null {
  return window.sessionStorage.getItem(ACTIVE_ROOM_CODE_KEY);
}
