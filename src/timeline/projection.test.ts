import { describe, expect, it } from "vitest";
import { mockTimeline } from "./mock-data";
import { createTimelineProjection } from "./projection";

describe("sample timeline placement", () => {
  it("keeps events in chronological order while visibly compressing the quiet interval", () => {
    const projection = createTimelineProjection(
      mockTimeline.start,
      mockTimeline.end,
      1840,
      mockTimeline.breaks,
    );
    const positions = mockTimeline.events
      .filter((event) => event.start !== null)
      .map((event) => projection.x(event.start!));
    const gap = mockTimeline.breaks[0];

    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(projection.x(gap.end) - projection.x(gap.start)).toBeCloseTo(
      gap.width,
    );
    expect(
      projection.x(mockTimeline.events[2].end!) -
        projection.x(mockTimeline.events[2].start!),
    ).toBeGreaterThan(0);
    expect(projection.x(mockTimeline.end)).toBeCloseTo(projection.width);
  });
});
