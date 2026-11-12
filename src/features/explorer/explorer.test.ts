import { describe, expect, it } from "vitest";
import {
  characterSchema,
  eventSchema,
  relationshipSchema,
  sourceSchema,
  timelineSchema,
} from "../../content/schema";
import { draftTemplate } from "../../content/templates";
import { buildPublishedArchive } from "./archive";
import { createEventIndex, defaultFilters, selectEvents } from "./filter";
import { readExplorerUrl, writeExplorerUrl } from "./url";

describe("published explorer flow", () => {
  it("hides drafts, follows a character relationship, searches published events, and restores an event link", () => {
    const timeline = timelineSchema.parse({
      ...draftTemplate("timelines"),
      id: "teyvat-history",
      status: "published",
    });
    const source = sourceSchema.parse({
      ...draftTemplate("sources"),
      id: "archon-quest",
      status: "published",
      title: "Archon Quest",
    });
    const character = characterSchema.parse({
      ...draftTemplate("characters"),
      id: "dainsleif",
      status: "published",
      name: { en: "Dainsleif" },
    });
    const event = eventSchema.parse({
      ...draftTemplate("events"),
      id: "cataclysm",
      status: "published",
      title: { en: "The Cataclysm" },
      description: { en: "A turning point in Teyvat." },
      timelineIds: [timeline.id],
      sourceIds: [source.id],
    });
    const draft = eventSchema.parse({
      ...event,
      id: "hidden-draft",
      status: "draft",
    });
    const undated = eventSchema.parse({
      ...event,
      id: "undated-record",
      spoilerLevel: 2,
      requiredQuestIds: ["quest-one"],
      time: {
        type: "unknown",
        start: null,
        end: null,
        unit: "year",
        reference: "main_story",
        confidence: "low",
      },
    });
    const relationship = relationshipSchema.parse({
      ...draftTemplate("relationships"),
      id: "dainsleif-cataclysm",
      status: "published",
      fromId: character.id,
      toId: event.id,
    });
    const eventRelation = relationshipSchema.parse({
      ...draftTemplate("relationships"),
      id: "cataclysm-undated",
      status: "published",
      fromType: "event",
      fromId: event.id,
      toType: "event",
      toId: undated.id,
      relation: "connected history",
    });
    const archive = buildPublishedArchive({
      timelines: [timeline],
      events: [event, draft, undated],
      characters: [character],
      eras: [],
      regions: [],
      sources: [source],
      relationships: [relationship, eventRelation],
    });
    expect(archive).not.toBeNull();
    if (!archive) return;

    expect(archive.timeline.events.map((item) => item.id)).toEqual([
      "cataclysm",
      "undated-record",
    ]);
    expect(archive.timeline.events[0].characterIds).toContain("dainsleif");
    expect(archive.timeline.events[1].start).toBeNull();
    expect(
      selectEvents(archive, defaultFilters, createEventIndex(archive)).map(
        (item) => item.id,
      ),
    ).toEqual(["cataclysm"]);
    expect(
      selectEvents(
        archive,
        {
          ...defaultFilters,
          spoilerLevel: 2,
          completedQuestIds: ["quest-one"],
        },
        createEventIndex(archive),
      ).map((item) => item.id),
    ).toEqual(["cataclysm", "undated-record"]);
    expect(archive.eventRelations).toMatchObject([
      { fromId: "cataclysm", toId: "undated-record" },
    ]);
    const filters = {
      ...defaultFilters,
      view: "character" as const,
      characterId: "dainsleif",
      search: "cataclysm",
      spoilerLevel: 2,
      completedQuestIds: ["quest-one"],
    };
    expect(
      selectEvents(archive, filters, createEventIndex(archive)).map(
        (item) => item.id,
      ),
    ).toEqual(["cataclysm"]);

    const linked = writeExplorerUrl(
      new URL("https://example.test/chronicle/"),
      filters,
      event.id,
    );
    expect(readExplorerUrl(linked)).toEqual({
      filters: { ...filters, spoilerLevel: 0, completedQuestIds: [] },
      eventId: "cataclysm",
      timelineId: "",
    });
  });

  it("keeps drafts out of the public archive but shows them, marked, in the Back Office preview", () => {
    const timeline = timelineSchema.parse({
      ...draftTemplate("timelines"),
      id: "teyvat-history",
    });
    const event = eventSchema.parse({
      ...draftTemplate("events"),
      id: "unfinished",
      title: { en: "Unfinished entry" },
      timelineIds: [timeline.id],
    });
    const records = {
      timelines: [timeline],
      events: [event],
      characters: [],
      eras: [],
      regions: [],
      sources: [],
      relationships: [],
    };

    expect(buildPublishedArchive(records)).toBeNull();
    const preview = buildPublishedArchive(records, { includeDrafts: true });
    expect(preview?.timeline.events).toMatchObject([
      { id: "unfinished", draft: true },
    ]);
  });

  it("switches to a chosen published timeline and falls back for unknown or draft ones", () => {
    const world = timelineSchema.parse({
      ...draftTemplate("timelines"),
      id: "teyvat-history",
      status: "published",
    });
    const recent = timelineSchema.parse({
      ...world,
      id: "recent-past",
      title: { en: "Recent Past" },
      sortOrder: 1,
    });
    const hidden = timelineSchema.parse({
      ...world,
      id: "unreleased",
      status: "draft",
    });
    const source = sourceSchema.parse({
      ...draftTemplate("sources"),
      id: "archon-quest",
      status: "published",
      title: "Archon Quest",
    });
    const event = eventSchema.parse({
      ...draftTemplate("events"),
      id: "recent-event",
      status: "published",
      title: { en: "Recent event" },
      description: { en: "Only on the recent timeline." },
      timelineIds: [recent.id],
      sourceIds: [source.id],
    });
    const records = {
      timelines: [world, recent, hidden],
      events: [event],
      characters: [],
      eras: [],
      regions: [],
      sources: [source],
      relationships: [],
    };

    const fallback = buildPublishedArchive(records, { timelineId: "missing" });
    expect(fallback?.timeline.id).toBe("teyvat-history");
    expect(fallback?.timeline.events).toEqual([]);
    expect(fallback?.timelines.map((item) => item.id)).toEqual([
      "teyvat-history",
      "recent-past",
    ]);
    expect(
      buildPublishedArchive(records, { timelineId: "unreleased" })?.timeline.id,
    ).toBe("teyvat-history");

    const chosen = buildPublishedArchive(records, {
      timelineId: "recent-past",
    });
    expect(chosen?.timeline.title).toBe("Recent Past");
    expect(chosen?.timeline.events.map((item) => item.id)).toEqual([
      "recent-event",
    ]);
    expect(
      readExplorerUrl(new URL("https://example.test/?timeline=recent-past"))
        .timelineId,
    ).toBe("recent-past");
  });

  it("places ancient and pre-boundary events in the Unknown zone, oldest first", () => {
    const { unknownBefore, unknownWidth, ...legacy } = timelineSchema.parse({
      ...draftTemplate("timelines"),
      id: "teyvat-history",
      status: "published",
      start: -9000,
    });
    // Records saved before the zone existed get the -6000 default.
    const timeline = timelineSchema.parse(legacy);
    expect([unknownBefore, unknownWidth]).toEqual([-6000, 240]);
    expect(timeline.unknownBefore).toBe(-6000);
    const source = sourceSchema.parse({
      ...draftTemplate("sources"),
      id: "archon-quest",
      status: "published",
      title: "Archon Quest",
    });
    const base = eventSchema.parse({
      ...draftTemplate("events"),
      id: "recent",
      status: "published",
      title: { en: "Recent" },
      description: { en: "A dated event." },
      timelineIds: [timeline.id],
      sourceIds: [source.id],
      time: {
        type: "approximate",
        start: -500,
        end: null,
        unit: "year",
        reference: "main_story",
        confidence: "medium",
      },
    });
    const ancient = eventSchema.parse({
      ...base,
      id: "first-light",
      sortOrder: 1,
      time: { ...base.time, type: "ancient", start: null, end: null },
    });
    const old = eventSchema.parse({
      ...base,
      id: "old-war",
      time: { ...base.time, start: -8000 },
    });
    const records = {
      timelines: [timeline],
      events: [base, ancient, old],
      characters: [],
      eras: [],
      regions: [],
      sources: [source],
      relationships: [],
    };
    const archive = buildPublishedArchive(records);
    expect(archive?.timeline.unknownZone).toEqual({
      before: -6000,
      width: 240,
    });
    if (!archive) return;
    const events = selectEvents(
      archive,
      defaultFilters,
      createEventIndex(archive),
    );
    expect(events.map((item) => [item.id, !!item.ancient])).toEqual([
      ["first-light", true],
      ["old-war", true],
      ["recent", false],
    ]);

    // Without a zone (timeline starts after the boundary) the ancient event
    // has no place on the axis and is listed as time unknown.
    const late = buildPublishedArchive({
      ...records,
      timelines: [timelineSchema.parse({ ...timeline, start: -1000 })],
      events: [base, ancient],
    });
    expect(late?.timeline.unknownZone).toBeUndefined();
    expect(
      late?.timeline.events.find((item) => item.id === "first-light"),
    ).toMatchObject({ start: null });
    expect(
      late?.timeline.events.find((item) => item.id === "first-light")?.ancient,
    ).toBeUndefined();
  });
});
