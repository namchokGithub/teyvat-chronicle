import { describe, expect, it } from "vitest";
import { mockTimeline } from "./mock-data";
import {
  createTimelineProjection,
  formatAxisYear,
  formatTimelineYear,
  timelineTicks,
} from "./projection";

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

  it("labels past years as negative and future years as positive", () => {
    expect(formatTimelineYear(-500)).toBe("500 years ago");
    expect(formatTimelineYear(0)).toBe("Present");
    expect(formatTimelineYear(1000)).toBe("1,000 years after present");
    expect(formatAxisYear(-5000)).toBe("\u22125,000");
    expect(formatAxisYear(1000)).toBe("1,000");
  });

  it("spaces round-number ticks by zoom and skips compressed intervals", () => {
    const { start, end, breaks } = mockTimeline;
    const projection = createTimelineProjection(start, end, 1840, breaks);
    for (const zoom of [0.72, 1, 3]) {
      const ticks = timelineTicks(
        start,
        end,
        breaks,
        projection.pixelsPerYear * zoom,
      );
      for (let index = 1; index < ticks.length; index++) {
        const left = ticks[index - 1];
        const right = ticks[index];
        const across = breaks.some(
          (item) => left <= item.start && right >= item.end,
        );
        if (!across)
          expect(
            (projection.x(right) - projection.x(left)) * zoom,
          ).toBeGreaterThanOrEqual(90);
      }
      expect(
        ticks.some((year) =>
          breaks.some((item) => year > item.start && year < item.end),
        ),
      ).toBe(false);
    }
    expect(
      timelineTicks(-50000, 0, [], (1840 / 50000) * 0.72).length,
    ).toBeLessThanOrEqual(1840 / 90 + 1);
  });
});
