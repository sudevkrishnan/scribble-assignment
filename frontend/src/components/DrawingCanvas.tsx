import { useEffect, useRef } from "react";
import type { Point, Stroke } from "../services/api";
import { useRoomState, useRoomStore } from "../state/roomStore";
import { createStrokeBuilder } from "./strokeBuilder";

function paintStrokes(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of strokes) {
    if (stroke.points.length === 0) {
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (const point of stroke.points.slice(1)) {
      ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
  }
}

function pointFromEvent(canvas: HTMLCanvasElement, event: React.PointerEvent<HTMLCanvasElement>): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

export function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokeBuilderRef = useRef(createStrokeBuilder());
  const store = useRoomStore();
  const { room, participantId } = useRoomState();

  const viewer = room?.participants.find((participant) => participant.id === participantId) ?? null;
  const isDrawer = Boolean(viewer?.isDrawer);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas && room) {
      paintStrokes(canvas, room.strokes);
    }
  }, [room]);

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const point = pointFromEvent(canvas, event);
    strokeBuilderRef.current.start(point);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer || !strokeBuilderRef.current.isActive()) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const point = pointFromEvent(canvas, event);
    strokeBuilderRef.current.addPoint(point);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  }

  function handlePointerUp() {
    if (!isDrawer || !strokeBuilderRef.current.isActive()) {
      return;
    }

    const points = strokeBuilderRef.current.end();

    if (points.length > 0) {
      store.drawStroke(points).catch(() => undefined);
    }
  }

  function handleClear() {
    store.clearCanvas().catch(() => undefined);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={900}
        height={500}
        className="canvas-placeholder"
        style={{ touchAction: "none", cursor: isDrawer ? "crosshair" : "default" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {isDrawer ? (
        <div className="button-row button-row--compact">
          <button type="button" className="button button--secondary" onClick={handleClear}>
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}
