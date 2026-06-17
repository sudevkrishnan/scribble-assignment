import { useEffect, useState, type PropsWithChildren } from "react";
import { AppRoutes } from "./routes";
import { RoomStoreProvider, useRoomStore } from "./state/roomStore";
import "./styles/app.css";

function ReattachGate({ children }: PropsWithChildren) {
  const roomStore = useRoomStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    roomStore.reattach().finally(() => setReady(true));
  }, [roomStore]);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <RoomStoreProvider>
      <ReattachGate>
        <AppRoutes />
      </ReattachGate>
    </RoomStoreProvider>
  );
}
