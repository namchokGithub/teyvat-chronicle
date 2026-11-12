import type { TimelineEvent } from "./model";

/**
 * Chronological order shared by the timeline, filters, and story mode.
 * Unknown-zone events come first: no-year ones, then dated ones by year;
 * ties use sortOrder. Events with no year outside the zone come last.
 */
export function compareEvents(a: TimelineEvent, b: TimelineEvent): number {
  const rank = (event: TimelineEvent) =>
    event.ancient ? 0 : event.start === null ? 2 : 1;
  const year = (event: TimelineEvent) =>
    event.start ??
    (event.ancient ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);
  return rank(a) - rank(b) || year(a) - year(b) || a.sortOrder - b.sortOrder;
}

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
    positions,
  }: {
    laneCount?: number;
    minZoom?: number;
    cardWidth?: number;
    gap?: number;
    /** Content x by event ID, overriding the year (Unknown-zone cards). */
    positions?: Map<string, number>;
  } = {},
): CardLayout {
  const lastRight: number[] = Array.from(
    { length: Math.max(1, laneCount) },
    () => Number.NEGATIVE_INFINITY,
  );
  const laneById = new Map<string, number>();
  const placeOf = (event: TimelineEvent) =>
    positions?.get(event.id) ?? (event.start === null ? null : x(event.start));
  const placed = events
    .flatMap((event) => {
      const position = placeOf(event);
      return position === null ? [] : [{ event, position }];
    })
    .sort(
      (a, b) =>
        a.position - b.position || a.event.sortOrder - b.event.sortOrder,
    );

  for (const { event, position } of placed) {
    const left = position * minZoom - 13;
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
