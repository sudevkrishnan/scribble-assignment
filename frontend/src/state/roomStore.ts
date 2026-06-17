import {
  createElement,
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type PropsWithChildren
} from "react";
import { ApiError, api, type Point, type RoomSessionResponse, type RoomSnapshot } from "../services/api";
import { clearStoredIdentity, getActiveRoomCode, getStoredIdentity, setStoredIdentity } from "./roomIdentity";

export interface RoomState {
  room: RoomSnapshot | null;
  participantId: string | null;
  error: string | null;
  isLoading: boolean;
}

type Listener = () => void;

export class RoomStore {
  private state: RoomState = {
    room: null,
    participantId: null,
    error: null,
    isLoading: false
  };

  private listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.state;

  private setState(nextState: Partial<RoomState>) {
    this.state = {
      ...this.state,
      ...nextState
    };
    this.listeners.forEach((listener) => listener());
  }

  private async withLoading<T>(operation: () => Promise<T>) {
    this.setState({
      isLoading: true,
      error: null
    });

    try {
      return await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected request failure";
      this.setState({ error: message });
      throw error;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  setRoomSession(response: RoomSessionResponse) {
    this.setState({
      participantId: response.participantId,
      room: response.room,
      error: null
    });
  }

  setRoomSnapshot(room: RoomSnapshot) {
    this.setState({
      room,
      error: null
    });
  }

  async createRoom(playerName: string) {
    const response = await this.withLoading(() => api.createRoom(playerName));
    this.setRoomSession(response);
    setStoredIdentity(response.room.code, { participantId: response.participantId, isHost: true });
    return response;
  }

  async joinRoom(code: string, playerName: string) {
    const response = await this.withLoading(() => api.joinRoom(code, playerName));
    this.setRoomSession(response);
    setStoredIdentity(response.room.code, { participantId: response.participantId, isHost: false });
    return response;
  }

  async fetchRoom() {
    if (!this.state.room) {
      return null;
    }

    const response = await api.fetchRoom(this.state.room.code, this.state.participantId ?? undefined);
    this.setRoomSnapshot(response.room);
    return response.room;
  }

  async startGame() {
    if (!this.state.room || !this.state.participantId) {
      return null;
    }

    return this.withLoading(async () => {
      const response = await api.startGame(this.state.room!.code, this.state.participantId!);
      this.setRoomSnapshot(response.room);
      return response.room;
    });
  }

  async drawStroke(points: Point[]) {
    if (!this.state.room || !this.state.participantId) {
      return null;
    }

    const response = await api.addStroke(this.state.room.code, this.state.participantId, points);
    this.setRoomSnapshot(response.room);
    return response.room;
  }

  async clearCanvas() {
    if (!this.state.room || !this.state.participantId) {
      return null;
    }

    const response = await api.clearCanvas(this.state.room.code, this.state.participantId);
    this.setRoomSnapshot(response.room);
    return response.room;
  }

  async submitGuess(text: string) {
    if (!this.state.room || !this.state.participantId) {
      return null;
    }

    const response = await api.submitGuess(this.state.room.code, this.state.participantId, text);
    this.setRoomSnapshot(response.room);
    return response.room;
  }

  /** Reattaches this tab to its last known room/participant after a reload. No-op if nothing was stored. */
  async reattach() {
    const code = getActiveRoomCode();

    if (!code) {
      return null;
    }

    const identity = getStoredIdentity(code);

    if (!identity) {
      return null;
    }

    try {
      const response = await api.fetchRoom(code, identity.participantId);
      this.setState({ room: response.room, participantId: identity.participantId, error: null });
      return response.room;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        // The room genuinely no longer exists (e.g. the backend restarted) — the stored
        // identity is stale, so clear it rather than retrying it on a future reload.
        clearStoredIdentity(code);
        this.setState({
          room: null,
          participantId: null,
          error: "That room could not be found. Please create or join a room again."
        });
      } else {
        // Transient failure (network blip, server error) — keep the stored identity so a
        // later retry can still reattach, matching the polling behavior of not clearing
        // last-known state on a transient error.
        this.setState({
          error: "Could not reach the server. Please check your connection and try again."
        });
      }
      return null;
    }
  }

  private pollHandle: ReturnType<typeof setInterval> | null = null;

  startPolling(intervalMs = 2000) {
    if (this.pollHandle) {
      return;
    }

    this.pollHandle = setInterval(() => {
      this.fetchRoom().catch(() => undefined);
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }
}

const RoomStoreContext = createContext<RoomStore | null>(null);

export function RoomStoreProvider({ children }: PropsWithChildren) {
  const storeRef = useRef<RoomStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = new RoomStore();
  }

  useEffect(() => undefined, []);

  return createElement(RoomStoreContext.Provider, { value: storeRef.current }, children);
}

export function useRoomStore() {
  const store = useContext(RoomStoreContext);

  if (!store) {
    throw new Error("RoomStoreProvider is missing");
  }

  return store;
}

export function useRoomState() {
  const store = useRoomStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
