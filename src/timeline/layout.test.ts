import { describe, expect, it } from "vitest";
import { mockTimeline } from "./mock-data";
import { layoutEventCards } from "./layout";
import { createTimelineProjection } from "./projection";

describe("timeline card placement", () => {
  it("keeps same-time records in separate rows and preserves spacing at minimum zoom", () => {
    const projection = createTimelineProjection(
      mockTimeline.start,
      mockTimeline.end,
      1840,
      mockTimeline.breaks,
    );
    const clustered = Array.from({ length: 6 }, (_, index) => ({
      ...mockTimeline.events[2],
      id: `cluster-${index}`,
      start: -2000,
      lane: 0 as const,
      sortOrder: index,
    }));
    const layout = layoutEventCards(
      [...mockTimeline.events, ...clustered],
      projection.x,
    );
    expect(
      new Set(clustered.map((event) => layout.laneById.get(event.id))).size,
    ).toBe(clustered.length);

    const dated = [...mockTimeline.events, ...clustered].filter(
      (event) => event.start !== null,
    );
    for (const lane of new Set(layout.laneById.values())) {
      const row = dated
        .filter((event) => layout.laneById.get(event.id) === lane)
        .sort((a, b) => a.start! - b.start!);
      for (let index = 1; index < row.length; index++) {
        expect(
          (projection.x(row[index].start!) -
            projection.x(row[index - 1].start!)) *
            0.72,
        ).toBeGreaterThanOrEqual(264);
      }
    }
  });
});
