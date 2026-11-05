import { scaleLinear } from "d3-scale";
import type { TimelineBreak } from "./model";

export type TimelineProjection = {
  x: (time: number) => number;
  width: number;
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

export function formatTimelineYear(year: number): string {
  if (year === 0) return "Present";
  return `${Math.abs(year).toLocaleString("en-US")} years ago`;
}
