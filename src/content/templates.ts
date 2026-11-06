import type { CollectionName, ContentRecord } from "./schema";

export const collectionLabels: Record<CollectionName, string> = {
  timelines: "Timelines",
  events: "Events",
  characters: "Characters",
  eras: "Eras",
  regions: "Regions",
  sources: "Sources",
  relationships: "Relationships",
  settings: "Settings",
};

export function draftTemplate(collection: CollectionName): ContentRecord {
  const common = { id: `new-${collection.slice(0, -1)}`, status: "draft" };
  const emptyText = { en: "New record", th: "" };
  const emptyDescription = { en: "", th: "" };

  switch (collection) {
    case "timelines":
      return {
        ...common,
        title: emptyText,
        description: emptyDescription,
        start: -6000,
        end: 0,
        laneCount: 3,
        breaks: [],
        sortOrder: 0,
      } as ContentRecord;
    case "events":
      return {
        ...common,
        timelineIds: [],
        title: emptyText,
        description: emptyDescription,
        time: {
          type: "approximate",
          start: -500,
          end: null,
          unit: "year",
          reference: "main_story",
          confidence: "low",
        },
        eraIds: [],
        regionIds: [],
        characterIds: [],
        type: "point",
        display: {
          variant: "standard",
          image: null,
          icon: null,
          color: "#B8A5DD",
          lineStyle: "solid",
          lane: 0,
        },
        loreStatus: "inferred",
        spoilerLevel: 0,
        requiredQuestIds: [],
        sourceIds: [],
        sortOrder: 0,
      } as ContentRecord;
    case "characters":
      return {
        ...common,
        name: emptyText,
        biography: emptyDescription,
        regionIds: [],
        sourceIds: [],
        image: null,
        sortOrder: 0,
      } as ContentRecord;
    case "eras":
      return {
        ...common,
        name: emptyText,
        description: emptyDescription,
        start: null,
        end: null,
        sortOrder: 0,
      } as ContentRecord;
    case "regions":
      return {
        ...common,
        name: emptyText,
        description: emptyDescription,
        image: null,
        sortOrder: 0,
      } as ContentRecord;
    case "sources":
      return {
        ...common,
        title: "New source",
        kind: "other",
        url: "",
        note: "",
        sortOrder: 0,
      } as ContentRecord;
    case "relationships":
      return {
        ...common,
        fromType: "character",
        fromId: "character-id",
        toType: "event",
        toId: "event-id",
        relation: "participant",
        importance: "major",
        sortOrder: 0,
      } as ContentRecord;
    case "settings":
      return {
        id: "viewer",
        theme: "dark",
        defaultTimelineId: null,
        accentColor: "#B8A5DD",
      };
  }
}

export function recordTitle(record: ContentRecord): string {
  if ("title" in record)
    return typeof record.title === "string" ? record.title : record.title.en;
  if ("name" in record) return record.name.en;
  if ("relation" in record) return `${record.fromId} → ${record.toId}`;
  return record.id;
}
