import { describe, expect, it } from "vitest";
import { createStrokeBuilder } from "./strokeBuilder";

describe("strokeBuilder", () => {
  it("accumulates points between start and end", () => {
    const builder = createStrokeBuilder();

    builder.start({ x: 0, y: 0 });
    builder.addPoint({ x: 1, y: 1 });
    builder.addPoint({ x: 2, y: 2 });
    const points = builder.end();

    expect(points).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]);
  });

  it("starts a new, separate stroke after end is called", () => {
    const builder = createStrokeBuilder();

    builder.start({ x: 0, y: 0 });
    builder.addPoint({ x: 1, y: 1 });
    builder.end();

    builder.start({ x: 10, y: 10 });
    const points = builder.end();

    expect(points).toEqual([{ x: 10, y: 10 }]);
  });

  it("ignores addPoint calls before start or after end", () => {
    const builder = createStrokeBuilder();

    builder.addPoint({ x: 5, y: 5 });
    expect(builder.end()).toEqual([]);

    builder.start({ x: 0, y: 0 });
    builder.end();
    builder.addPoint({ x: 9, y: 9 });

    builder.start({ x: 1, y: 1 });
    expect(builder.end()).toEqual([{ x: 1, y: 1 }]);
  });

  it("isActive reflects whether a stroke is in progress", () => {
    const builder = createStrokeBuilder();

    expect(builder.isActive()).toBe(false);
    builder.start({ x: 0, y: 0 });
    expect(builder.isActive()).toBe(true);
    builder.end();
    expect(builder.isActive()).toBe(false);
  });
});
