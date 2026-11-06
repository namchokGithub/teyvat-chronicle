import { describe, expect, it } from "vitest";
import { draftTemplate } from "./templates";
import { LocalContentStore } from "./store";
import {
  exportSnapshot,
  importSnapshotAddOnly,
  parseSnapshot,
} from "./transfer";

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

describe("back office draft and publish flow", () => {
  it("keeps an unsourced event in draft, then persists and removes a sourced publication", async () => {
    const storage = new MemoryStorage();
    const store = new LocalContentStore(storage);
    const draft = { ...draftTemplate("events"), id: "cataclysm" };

    await store.save("events", draft);
    await expect(
      store.save("events", { ...draft, status: "published" }),
    ).rejects.toThrow();
    expect((await store.list("events"))[0]).toMatchObject({
      id: "cataclysm",
      status: "draft",
    });

    const published = {
      ...draft,
      status: "published",
      description: { en: "A sourced event.", th: "" },
      timelineIds: ["teyvat-history"],
      sourceIds: ["archon-quest"],
    };
    await store.save("events", published);
    const reloaded = new LocalContentStore(storage);
    expect((await reloaded.list("events"))[0]).toMatchObject({
      id: "cataclysm",
      status: "published",
    });

    await reloaded.remove("events", "cataclysm");
    expect(await store.list("events")).toEqual([]);
  });

  it("moves a validated backup into an empty sandbox and rejects conflicts before writing", async () => {
    const source = new LocalContentStore(new MemoryStorage());
    await source.save("timelines", {
      ...draftTemplate("timelines"),
      id: "world",
    });
    await source.save("events", {
      ...draftTemplate("events"),
      id: "sample-event",
    });
    const backup = JSON.stringify(await exportSnapshot(source));
    const target = new LocalContentStore(new MemoryStorage());
    expect(await importSnapshotAddOnly(target, parseSnapshot(backup))).toBe(2);
    expect((await target.list("events")).map((item) => item.id)).toEqual([
      "sample-event",
    ]);
    await expect(
      importSnapshotAddOnly(target, parseSnapshot(backup)),
    ).rejects.toThrow("Import did not start");
    expect((await target.list("events")).length).toBe(1);
    expect(() =>
      parseSnapshot(backup.replace('"spoilerLevel":0', '"spoilerLevel":9')),
    ).toThrow();
  });
});
