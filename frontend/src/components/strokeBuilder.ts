import type { Point } from "../services/api";

export function createStrokeBuilder() {
  let points: Point[] = [];
  let active = false;

  return {
    start(point: Point) {
      points = [point];
      active = true;
    },
    addPoint(point: Point) {
      if (active) {
        points.push(point);
      }
    },
    end(): Point[] {
      const result = points;
      points = [];
      active = false;
      return result;
    },
    isActive() {
      return active;
    }
  };
}
