export type TimelineEvent = {
  id: string;
  title: string;
  era: string;
  kind: "point" | "range";
  start: number;
  end?: number;
  lane: 0 | 1 | 2;
  summary: string;
  detail: string;
  image?: string;
  imageAlt?: string;
  accent: "gold" | "violet" | "teal";
  precision: "approximate" | "exact";
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
