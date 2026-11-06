import { parseRecord, type CollectionName, type ContentRecord } from "./schema";
import type { ContentStore } from "./store";

export const transferCollections: CollectionName[] = [
  "timelines",
  "events",
  "characters",
  "eras",
  "regions",
  "sources",
  "relationships",
  "settings",
];

export type ContentSnapshot = {
  format: "teyvat-chronicle";
  version: 1;
  collections: Record<CollectionName, ContentRecord[]>;
};

export async function exportSnapshot(
  store: ContentStore,
): Promise<ContentSnapshot> {
  const entries = await Promise.all(
    transferCollections.map(
      async (name) => [name, await store.list(name)] as const,
    ),
  );
  return {
    format: "teyvat-chronicle",
    version: 1,
    collections: Object.fromEntries(entries) as ContentSnapshot["collections"],
  };
}

export function parseSnapshot(raw: string): ContentSnapshot {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Backup must be a JSON object.");
  const data = value as Record<string, unknown>;
  if (data.format !== "teyvat-chronicle" || data.version !== 1)
    throw new Error("Unsupported backup format or version.");
  if (
    !data.collections ||
    typeof data.collections !== "object" ||
    Array.isArray(data.collections)
  )
    throw new Error("Backup collections are missing.");
  const source = data.collections as Record<string, unknown>;
  const collections = {} as ContentSnapshot["collections"];
  for (const name of transferCollections) {
    if (!Array.isArray(source[name]))
      throw new Error(`Backup ${name} must be an array.`);
    const records = source[name].map((item: unknown) =>
      parseRecord(name, item),
    );
    if (new Set(records.map((item) => item.id)).size !== records.length)
      throw new Error(`Backup ${name} has duplicate IDs.`);
    collections[name] = records;
  }
  return { format: "teyvat-chronicle", version: 1, collections };
}

export async function importSnapshotAddOnly(
  store: ContentStore,
  snapshot: ContentSnapshot,
): Promise<number> {
  let count = 0;
  for (const name of transferCollections) {
    const existing = new Set((await store.list(name)).map((item) => item.id));
    const conflict = snapshot.collections[name].find((item) =>
      existing.has(item.id),
    );
    if (conflict)
      throw new Error(
        `${name}/${conflict.id} already exists. Import did not start.`,
      );
    count += snapshot.collections[name].length;
  }
  for (const name of transferCollections)
    for (const record of snapshot.collections[name])
      await store.save(name, record);
  return count;
}
