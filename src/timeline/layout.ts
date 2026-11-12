import type { TimelineEvent } from "./model";

export type CardLayout = {
  laneById: Map<string, number>;
  laneCount: number;
};

/** Assigns stable rows using the tightest supported zoom so cards never collide horizontally. */
export function layoutEventCards(
  events: TimelineEvent[],
  x: (year: number) => number,
  {
    laneCount = 3,
    minZoom = 0.72,
    cardWidth = 240,
    gap = 24,
  }: {
    laneCount?: number;
    minZoom?: number;
    cardWidth?: number;
    gap?: number;
  } = {},
): CardLayout {
  const lastRight: number[] = Array.from(
    { length: Math.max(1, laneCount) },
    () => Number.NEGATIVE_INFINITY,
  );
  const laneById = new Map<string, number>();
  const dated = events
    .filter(
      (event): event is TimelineEvent & { start: number } =>
        event.start !== null,
    )
    .sort((a, b) => x(a.start) - x(b.start) || a.sortOrder - b.sortOrder);

  for (const event of dated) {
    const left = x(event.start) * minZoom - 13;
    const preferred = Math.max(0, Math.min(event.lane, lastRight.length - 1));
    let lane =
      lastRight[preferred] + gap <= left
        ? preferred
        : lastRight.findIndex((right) => right + gap <= left);
    if (lane === -1) {
      lane = lastRight.length;
      lastRight.push(Number.NEGATIVE_INFINITY);
    }
    lastRight[lane] = left + cardWidth;
    laneById.set(event.id, lane);
  }

  return { laneById, laneCount: lastRight.length };
}
