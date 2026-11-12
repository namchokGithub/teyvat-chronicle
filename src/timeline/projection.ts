import { scaleLinear } from "d3-scale";
import type { TimelineBreak } from "./model";

export type TimelineProjection = {
  x: (time: number) => number;
  width: number;
  /** Scale of the uncompressed parts of the axis, before zoom. */
  pixelsPerYear: number;
};

/** Compresses quiet periods without changing event order or event dates. */
export function createTimelineProjection(
  start: number,
  end: number,
  width: number,
  breaks: TimelineBreak[],
): TimelineProjection {
  if (end <= start || width <= 0) throw new Error("Invalid timeline extent");

  const sorted = [...breaks].sort((a, b) => a.start - b.start);
  let lastEnd = start;
  let compressedDuration = 0;
  let fixedWidth = 0;

  for (const item of sorted) {
    if (
      item.start < lastEnd ||
      item.end > end ||
      item.end <= item.start ||
      item.width < 0
    ) {
      throw new Error("Invalid or overlapping timeline break");
    }
    compressedDuration += item.end - item.start;
    fixedWidth += item.width;
    lastEnd = item.end;
  }

  const ordinaryDuration = end - start - compressedDuration;
  if (ordinaryDuration <= 0 || fixedWidth >= width)
    throw new Error("No space for timeline events");
  const ordinaryPixelsPerYear = (width - fixedWidth) / ordinaryDuration;

  const segments: {
    start: number;
    end: number;
    left: number;
    right: number;
  }[] = [];
  let timeCursor = start;
  let pixelCursor = 0;

  for (const item of sorted) {
    const ordinaryWidth = (item.start - timeCursor) * ordinaryPixelsPerYear;
    segments.push({
      start: timeCursor,
      end: item.start,
      left: pixelCursor,
      right: pixelCursor + ordinaryWidth,
    });
    pixelCursor += ordinaryWidth;
    segments.push({
      start: item.start,
      end: item.end,
      left: pixelCursor,
      right: pixelCursor + item.width,
    });
    pixelCursor += item.width;
    timeCursor = item.end;
  }
  segments.push({ start: timeCursor, end, left: pixelCursor, right: width });

  return {
    width,
    pixelsPerYear: ordinaryPixelsPerYear,
    x(time: number) {
      const clamped = Math.max(start, Math.min(end, time));
      const segment =
        segments.find((candidate) => clamped <= candidate.end) ??
        segments[segments.length - 1];
      return scaleLinear(
        [segment.start, segment.end],
        [segment.left, segment.right],
      )(clamped);
    },
  };
}

// Years are relative to the present: negative is the past, positive the future.
export function formatTimelineYear(year: number): string {
  if (year === 0) return "Present";
  const amount = Math.abs(year).toLocaleString("en-US");
  return year < 0 ? `${amount} years ago` : `${amount} years after present`;
}

/**
 * Breaks for the projection, with the Unknown zone as a leading break from
 * the timeline start to its boundary.
 */
export function axisBreaks(timeline: {
  start: number;
  breaks: TimelineBreak[];
  unknownZone?: { before: number; width: number };
}): TimelineBreak[] {
  const zone = timeline.unknownZone;
  if (!zone) return timeline.breaks;
  return [
    {
      start: timeline.start,
      end: zone.before,
      width: zone.width,
      label: "Unknown",
    },
    ...timeline.breaks,
  ];
}

export function formatUnknownZone(before: number): string {
  return `Unknown · over ${Math.abs(before).toLocaleString("en-US")} years ago`;
}

/** Evenly spaced positions for `count` cards across a zone. */
export function spreadAcross(count: number, left: number, width: number) {
  return Array.from(
    { length: count },
    (_, index) => left + ((index + 0.5) * width) / count,
  );
}

/** Short axis label: −5,000 · Present · 1,000 (only the past is signed). */
export function formatAxisYear(year: number): string {
  if (year === 0) return "Present";
  const amount = Math.abs(year).toLocaleString("en-US");
  return year < 0 ? `\u2212${amount}` : amount;
}

/**
 * Round-number axis ticks at least `minGap` pixels apart at the given scale.
 * Ticks inside a compressed break are skipped; its edges stay labelled.
 */
export function timelineTicks(
  start: number,
  end: number,
  breaks: TimelineBreak[],
  pixelsPerYear: number,
  minGap = 90,
): number[] {
  const minimum = Math.max(1, minGap / pixelsPerYear);
  const magnitude = 10 ** Math.floor(Math.log10(minimum));
  const step =
    [1, 2, 5, 10]
      .map((factor) => factor * magnitude)
      .find((value) => value >= minimum) ?? 10 * magnitude;
  const ticks: number[] = [];
  for (let year = Math.ceil(start / step) * step; year <= end; year += step) {
    if (!breaks.some((item) => year > item.start && year < item.end))
      ticks.push(year);
  }
  return ticks;
}
