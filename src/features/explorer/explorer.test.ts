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
    });
  });
});
