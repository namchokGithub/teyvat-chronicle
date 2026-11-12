export type TimelineEvent = {
  id: string;
  title: string;
  era: string;
  kind: "point" | "range";
  start: number | null;
  end?: number | null;
  /** Preferred card row, from 0 to the timeline laneCount − 1. */
  lane: number;
  summary: string;
  detail: string;
  image?: string;
  imageAlt?: string;
  accent: "gold" | "violet" | "teal";
  precision: "approximate" | "exact" | "unknown";
  loreStatus: "confirmed" | "inferred" | "theory";
  spoilerLevel?: number;
  requiredQuestIds?: string[];
  characterIds: string[];
  eraIds: string[];
  regionIds: string[];
  sourceIds: string[];
  sortOrder: number;
  /** Set only in the Back Office preview, which can include drafts. */
  draft?: boolean;
};

export type TimelineBreak = {
  start: number;
  end: number;
  label: string;
  width: number;
};

/** Years are relative to the present: negative is the past, positive the future. */
export type TimelineData = {
  start: number;
  end: number;
  /** Card rows reserved before crowded dates add more. */
  laneCount: number;
  breaks: TimelineBreak[];
  events: TimelineEvent[];
};
