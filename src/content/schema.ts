import { z } from "zod";

const id = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use a lowercase slug (for example, archon-war)",
  );
const localizedText = z.object({
  en: z.string().min(1),
  th: z.string().optional(),
});
const localizedDescription = z.object({
  en: z.string(),
  th: z.string().optional(),
});
const status = z.enum(["draft", "published"]);
const base = z.object({ id, status });
const ids = z.array(id);

export const timelineBreakSchema = z
  .object({
    start: z.number(),
    end: z.number(),
    width: z.number().positive(),
    label: z.string().min(1),
  })
  .refine((item) => item.end > item.start, {
    message: "Break end must follow its start",
  });

export const timelineSchema = base
  .extend({
    title: localizedText,
    description: localizedDescription,
    start: z.number(),
    end: z.number(),
    laneCount: z.number().int().min(1).max(12),
    breaks: z.array(timelineBreakSchema),
    // Years before this collapse into one "Unknown" zone of fixed width.
    // null turns the zone off; records saved before it existed get -6000.
    unknownBefore: z.number().nullable().default(-6000),
    unknownWidth: z.number().int().min(80).max(1200).default(240),
    sortOrder: z.number().int(),
  })
  .refine((item) => item.end > item.start, {
    message: "Timeline end must follow its start",
  })
  .refine(
    (item) =>
      item.unknownBefore === null ||
      item.unknownBefore <= item.start ||
      (item.unknownBefore < item.end &&
        item.breaks.every((entry) => entry.start >= item.unknownBefore!)),
    {
      message:
        "The unknown boundary must be before the timeline end, and breaks must start after it",
      path: ["unknownBefore"],
    },
  )
  .refine(
    (item) => {
      const sorted = [...item.breaks].sort((a, b) => a.start - b.start);
      return sorted.every(
        (entry, index) =>
          entry.start >= item.start &&
          entry.end <= item.end &&
          (index === 0 || entry.start >= sorted[index - 1].end),
      );
    },
    { message: "Breaks must be inside the timeline and must not overlap" },
  );

export const eventTimeSchema = z
  .object({
    // ancient: older than the timeline's unknown boundary, year not known.
    type: z.enum(["exact", "approximate", "unknown", "ancient"]),
    start: z.number().nullable(),
    end: z.number().nullable(),
    unit: z.literal("year"),
    reference: z.string().min(1),
    confidence: z.enum(["high", "medium", "low"]),
  })
  .refine(
    (time) =>
      time.type === "unknown" || time.type === "ancient"
        ? time.start === null && time.end === null
        : time.start !== null,
    {
      message:
        "Unknown or ancient time must have no dates; known time needs a start",
    },
  )
  .refine(
    (time) => time.start === null || time.end === null || time.end > time.start,
    {
      message: "End must follow start",
    },
  );

export const eventSchema = base
  .extend({
    timelineIds: ids,
    title: localizedText,
    description: localizedDescription,
    time: eventTimeSchema,
    eraIds: ids,
    regionIds: ids,
    characterIds: ids,
    type: z.enum(["point", "range"]),
    display: z.object({
      variant: z.enum(["standard", "image-card"]),
      image: z.string().nullable(),
      icon: z.string().nullable(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      lineStyle: z.enum(["solid", "dashed"]),
      lane: z.number().int().min(0),
    }),
    loreStatus: z.enum(["confirmed", "inferred", "theory"]),
    spoilerLevel: z.number().int().min(0).max(3).optional(),
    requiredQuestIds: ids.optional(),
    sourceIds: ids,
    sortOrder: z.number().int(),
  })
  .refine((event) => event.type === "point" || event.time.end !== null, {
    message: "Range events need an end date",
    path: ["time", "end"],
  })
  .refine(
    (event) =>
      event.status === "draft" ||
      (event.sourceIds.length > 0 && event.timelineIds.length > 0),
    {
      message: "Published events need a source and timeline",
      path: ["sourceIds"],
    },
  )
  .refine(
    (event) => event.display.variant !== "image-card" || !!event.display.image,
    {
      message: "Image cards need an image path or URL",
      path: ["display", "image"],
    },
  )
  .refine(
    (event) =>
      event.status === "draft" || event.description.en.trim().length > 0,
    {
      message: "Published events need a description",
      path: ["description", "en"],
    },
  );

export const characterSchema = base.extend({
  name: localizedText,
  biography: localizedDescription,
  regionIds: ids,
  sourceIds: ids,
  image: z.string().nullable(),
  sortOrder: z.number().int(),
});

export const eraSchema = base
  .extend({
    name: localizedText,
    description: localizedDescription,
    start: z.number().nullable(),
    end: z.number().nullable(),
    sortOrder: z.number().int(),
  })
  .refine(
    (era) => era.start === null || era.end === null || era.end > era.start,
    {
      message: "Era end must follow its start",
    },
  );

export const regionSchema = base.extend({
  name: localizedText,
  description: localizedDescription,
  image: z.string().nullable(),
  sortOrder: z.number().int(),
});

export const sourceSchema = base.extend({
  title: z.string().min(1),
  kind: z.enum(["quest", "book", "dialogue", "official", "other"]),
  url: z.union([z.url(), z.literal("")]),
  note: z.string(),
  sortOrder: z.number().int(),
});

export const relationshipSchema = base
  .extend({
    fromType: z.enum(["event", "character", "era", "region"]),
    fromId: id,
    toType: z.enum(["event", "character", "era", "region"]),
    toId: id,
    relation: z.string().min(1),
    importance: z.enum(["major", "supporting", "minor"]),
    sortOrder: z.number().int(),
  })
  .refine(
    (item) => item.fromType !== item.toType || item.fromId !== item.toId,
    {
      message: "A record cannot relate to itself",
    },
  );

export const settingsSchema = z.object({
  id,
  theme: z.enum(["dark", "light"]),
  defaultTimelineId: id.nullable(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const schemas = {
  timelines: timelineSchema,
  events: eventSchema,
  characters: characterSchema,
  eras: eraSchema,
  regions: regionSchema,
  sources: sourceSchema,
  relationships: relationshipSchema,
  settings: settingsSchema,
} as const;

export type CollectionName = keyof typeof schemas;
export type ContentRecord = z.infer<(typeof schemas)[CollectionName]>;

export function parseRecord(
  collection: CollectionName,
  input: unknown,
): ContentRecord {
  return schemas[collection].parse(input) as ContentRecord;
}
