import type { z } from "zod";
import {
  eventSchema,
  timelineSchema,
  characterSchema,
  eraSchema,
  regionSchema,
  sourceSchema,
  relationshipSchema,
} from "../../content/schema";
import { mockTimeline } from "../../timeline/mock-data";
import type { TimelineData, TimelineEvent } from "../../timeline/model";
import { createTimelineProjection } from "../../timeline/projection";

export const loreLabels = {
  confirmed: "Confirmed",
  inferred: "Inferred",
  theory: "Theory",
} as const;

export type NamedRecord = {
  id: string;
  name: string;
  description?: string;
  start?: number | null;
  end?: number | null;
};
export type PublicSource = {
  id: string;
  title: string;
  url: string;
  kind: string;
};
export type EventRelation = {
  id: string;
  fromId: string;
  toId: string;
  relation: string;
  importance: "major" | "supporting" | "minor";
};
export type PublicArchive = {
  timeline: TimelineData & { id: string; title: string };
  characters: NamedRecord[];
  eras: NamedRecord[];
  regions: NamedRecord[];
  sources: PublicSource[];
  eventRelations: EventRelation[];
  sample: boolean;
};

export const sampleArchive: PublicArchive = {
  timeline: { ...mockTimeline, id: "teyvat-history", title: "World timeline" },
  characters: [
    {
      id: "dainsleif",
      name: "Dainsleif",
      description:
        "Sample character entry. Add sourced biography in the Back Office.",
    },
    {
      id: "venti",
      name: "Venti",
      description:
        "Sample character entry. Add sourced biography in the Back Office.",
    },
    {
      id: "zhongli",
      name: "Zhongli",
      description:
        "Sample character entry. Add sourced biography in the Back Office.",
    },
  ],
  eras: [
    { id: "ancient", name: "Ancient Teyvat", start: -5600, end: -2850 },
    { id: "gods", name: "Age of gods", start: -2850, end: -1000 },
    { id: "recent", name: "Recent history", start: -1000, end: 100 },
  ],
  regions: [
    { id: "khaenriah", name: "Khaenri'ah" },
    { id: "mondstadt", name: "Mondstadt" },
    { id: "liyue", name: "Liyue" },
  ],
  sources: [],
  eventRelations: [
    {
      id: "war-to-nations",
      fromId: "archon-war",
      toId: "seven-nations",
      relation: "precedes",
      importance: "major",
    },
    {
      id: "ancient-to-lost",
      fromId: "early-civilizations",
      toId: "lost-kingdoms",
      relation: "related history",
      importance: "supporting",
    },
  ],
  sample: true,
};

export type PublishedRecords = {
  timelines: z.infer<typeof timelineSchema>[];
  events: z.infer<typeof eventSchema>[];
  characters: z.infer<typeof characterSchema>[];
  eras: z.infer<typeof eraSchema>[];
  regions: z.infer<typeof regionSchema>[];
  sources: z.infer<typeof sourceSchema>[];
  relationships: z.infer<typeof relationshipSchema>[];
};

function publicImage(value: string | null): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("/images/"))
    return `${import.meta.env.BASE_URL}${value.slice(1)}`;
  if (value.startsWith("https://")) return value;
  return undefined;
}

// Public callers get published records only. The Back Office preview passes
// includeDrafts to see unpublished work in the same timeline view.
export function buildPublishedArchive(
  records: PublishedRecords,
  { includeDrafts = false }: { includeDrafts?: boolean } = {},
): PublicArchive | null {
  const visible = (item: { status: "draft" | "published" }) =>
    includeDrafts || item.status === "published";
  const timelines = records.timelines
    .filter(visible)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const main =
    timelines.find((item) => item.id === "teyvat-history") ?? timelines[0];
  if (!main) return null;

  // Invalid break geometry should surface as a data error before rendering.
  createTimelineProjection(main.start, main.end, 1840, main.breaks);
  const eras = records.eras.filter(visible);
  const sources = records.sources.filter(visible);
  const characters = records.characters.filter(visible);
  const regions = records.regions.filter(visible);
  const relationships = records.relationships.filter(visible);
  const publicCharacterIds = new Set(characters.map((item) => item.id));
  const publicEraIds = new Set(eras.map((item) => item.id));
  const publicRegionIds = new Set(regions.map((item) => item.id));
  const publicSourceIds = new Set(sources.map((item) => item.id));

  const events: TimelineEvent[] = records.events
    .filter((item) => visible(item) && item.timelineIds.includes(main.id))
    .map((item) => {
      const linkedCharacters = relationships
        .filter(
          (link) =>
            (link.fromType === "character" &&
              link.toType === "event" &&
              link.toId === item.id) ||
            (link.toType === "character" &&
              link.fromType === "event" &&
              link.fromId === item.id),
        )
        .map((link) =>
          link.fromType === "character" ? link.fromId : link.toId,
        );
      const era = eras.find((entry) => item.eraIds.includes(entry.id));
      const image = publicImage(item.display.image);
      return {
        id: item.id,
        title: item.title.en,
        era: era?.name.en ?? "Unassigned era",
        kind: item.type,
        start: item.time.start,
        end: item.time.end,
        lane: Math.min(item.display.lane, 2) as 0 | 1 | 2,
        summary: item.description.en.slice(0, 105),
        detail: item.description.en,
        image,
        imageAlt: image ? `Illustration for ${item.title.en}` : undefined,
        accent:
          item.loreStatus === "confirmed"
            ? "gold"
            : item.loreStatus === "inferred"
              ? "teal"
              : "violet",
        precision: item.time.type,
        loreStatus: item.loreStatus,
        spoilerLevel: item.spoilerLevel ?? 0,
        requiredQuestIds: item.requiredQuestIds ?? [],
        characterIds: [
          ...new Set([...item.characterIds, ...linkedCharacters]),
        ].filter((id) => publicCharacterIds.has(id)),
        eraIds: item.eraIds.filter((id) => publicEraIds.has(id)),
        regionIds: item.regionIds.filter((id) => publicRegionIds.has(id)),
        sourceIds: item.sourceIds.filter((id) => publicSourceIds.has(id)),
        sortOrder: item.sortOrder,
        ...(item.status === "draft" ? { draft: true } : {}),
      };
    });
  const publicEventIds = new Set(events.map((item) => item.id));
  const eventRelations: EventRelation[] = relationships
    .filter(
      (item) =>
        item.fromType === "event" &&
        item.toType === "event" &&
        publicEventIds.has(item.fromId) &&
        publicEventIds.has(item.toId),
    )
    .map((item) => ({
      id: item.id,
      fromId: item.fromId,
      toId: item.toId,
      relation: item.relation,
      importance: item.importance,
    }));

  return {
    timeline: {
      id: main.id,
      title: main.title.en,
      start: main.start,
      end: main.end,
      breaks: main.breaks,
      events,
    },
    characters: characters.map((item) => ({
      id: item.id,
      name: item.name.en,
      description: item.biography.en,
    })),
    eras: eras.map((item) => ({
      id: item.id,
      name: item.name.en,
      start: item.start,
      end: item.end,
    })),
    regions: regions.map((item) => ({ id: item.id, name: item.name.en })),
    sources: sources.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url.startsWith("https://") ? item.url : "",
      kind: item.kind,
    })),
    eventRelations,
    sample: false,
  };
}
