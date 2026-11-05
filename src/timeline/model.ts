export type TimelineEvent = {
  id: string;
  title: string;
  era: string;
  kind: "point" | "range";
  start: number | null;
  end?: number | null;
  lane: 0 | 1 | 2;
  summary: string;
  detail: string;
  image?: string;
  imageAlt?: string;
  accent: "gold" | "violet" | "teal";
  precision: "approximate" | "exact" | "unknown";
  loreStatus: "confirmed" | "inferred" | "theory";
  characterIds: string[];
  eraIds: string[];
  regionIds: string[];
  sourceIds: string[];
  sortOrder: number;
};

export type TimelineBreak = {
  start: number;
  end: number;
  label: string;
  width: number;
};

export type TimelineData = {
  start: number;
  end: number;
  breaks: TimelineBreak[];
  events: TimelineEvent[];
};
