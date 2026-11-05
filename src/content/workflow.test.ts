import { describe, expect, it } from "vitest";
import { draftTemplate } from "./templates";
import { LocalContentStore } from "./store";

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
});
