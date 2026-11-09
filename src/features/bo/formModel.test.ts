import { describe, expect, it } from "vitest";
import { draftTemplate } from "../../content/templates";
import { LocalContentStore } from "../../content/store";
import {
  eventSchema,
  sourceSchema,
  timelineSchema,
} from "../../content/schema";
import { buildPublishedArchive } from "../explorer/archive";
import {
  applyAutoId,
  normalizeFormRecord,
  setField,
  type DraftRecord,
} from "./formModel";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("back office form save flow", () => {
  it("persists a timeline break and an undated sourced event from form input values", async () => {
    const storage = new MemoryStorage();
    const store = new LocalContentStore(storage);
    let timeline = draftTemplate("timelines") as DraftRecord;
    timeline = setField(timeline, ["id"], "teyvat-history");
    timeline = setField(timeline, ["status"], "published");
    timeline = setField(timeline, ["start"], "-6000");
    timeline = setField(timeline, ["end"], "100");
    timeline = setField(
      timeline,
      ["breaks"],
      [{ start: "-4000", end: "-3000", width: "80", label: "Quiet interval" }],
    );
    await store.save("timelines", normalizeFormRecord("timelines", timeline));

    await store.save("sources", {
      ...draftTemplate("sources"),
      id: "quest-source",
      status: "published",
    });
    let event = draftTemplate("events") as DraftRecord;
    event = setField(event, ["id"], "undated-record");
    event = setField(event, ["status"], "published");
    event = setField(
      event,
      ["description", "en"],
      "A sourced record without a reliable year.",
    );
    event = setField(event, ["timelineIds"], ["teyvat-history"]);
    event = setField(event, ["sourceIds"], ["quest-source"]);
    event = setField(event, ["time", "type"], "unknown");
    event = setField(event, ["time", "start"], null);
    event = setField(event, ["display", "lane"], "2");
    event = setField(event, ["display", "image"], "");
    await store.save("events", normalizeFormRecord("events", event));

    const reloaded = new LocalContentStore(storage);
    expect((await reloaded.list("timelines"))[0]).toMatchObject({
      start: -6000,
      end: 100,
      breaks: [{ start: -4000, end: -3000, width: 80 }],
    });
    expect((await reloaded.list("events"))[0]).toMatchObject({
      status: "published",
      time: { type: "unknown", start: null, end: null },
      display: { lane: 2, image: null },
    });
    const archive = buildPublishedArchive({
      timelines: [timelineSchema.parse((await reloaded.list("timelines"))[0])],
      events: [eventSchema.parse((await reloaded.list("events"))[0])],
      sources: [sourceSchema.parse((await reloaded.list("sources"))[0])],
      characters: [],
      eras: [],
      regions: [],
      relationships: [],
    });
    expect(archive?.timeline.events[0]).toMatchObject({
      id: "undated-record",
      start: null,
      sourceIds: ["quest-source"],
    });
  });

  it("generates a new record ID from the English title until the ID is edited", () => {
    const type = (
      record: DraftRecord,
      path: (string | number)[],
      value: string,
    ) => applyAutoId("events", record, setField(record, path, value));
    let record = draftTemplate("events") as DraftRecord;
    record = type(record, ["title", "en"], "Archon War");
    expect(record.id).toBe("archon-war");
    record = type(record, ["title", "en"], "The Archon War");
    expect(record.id).toBe("the-archon-war");
    record = type(record, ["title", "en"], "ดินแดน");
    expect(record.id).toBe("the-archon-war");
    record = type(record, ["id"], "archon-war-ancient");
    record = type(record, ["title", "en"], "Archon War Ends");
    expect(record.id).toBe("archon-war-ancient");
    expect(
      eventSchema.safeParse(normalizeFormRecord("events", record)).success,
    ).toBe(true);
  });
});
