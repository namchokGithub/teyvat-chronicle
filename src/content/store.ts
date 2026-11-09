import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  setDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { FirebaseApp } from "firebase/app";
import { parseRecord, type CollectionName, type ContentRecord } from "./schema";

export type StoreEntry = { collection: CollectionName; input: unknown };

export interface ContentStore {
  list(collectionName: CollectionName): Promise<ContentRecord[]>;
  save(collectionName: CollectionName, input: unknown): Promise<ContentRecord>;
  /** Validates every entry first, then writes all of them or none. */
  saveAll(entries: StoreEntry[]): Promise<number>;
  remove(collectionName: CollectionName, id: string): Promise<void>;
}

export const MAX_BATCH_WRITES = 500;

function parseEntries(entries: StoreEntry[]) {
  return entries.map((entry) => ({
    collection: entry.collection,
    value: parseRecord(entry.collection, entry.input),
  }));
}

export class LocalContentStore implements ContentStore {
  constructor(private readonly storage: Storage) {}

  private key(collectionName: CollectionName) {
    return `teyvat-bo-v1:${collectionName}`;
  }

  async list(collectionName: CollectionName): Promise<ContentRecord[]> {
    const raw = this.storage.getItem(this.key(collectionName));
    if (!raw) return [];
    const values: unknown = JSON.parse(raw);
    if (!Array.isArray(values))
      throw new Error(`Invalid local ${collectionName} data`);
    return values.map((value) => parseRecord(collectionName, value));
  }

  async save(
    collectionName: CollectionName,
    input: unknown,
  ): Promise<ContentRecord> {
    const value = parseRecord(collectionName, input);
    const values = await this.list(collectionName);
    const next = [...values.filter((item) => item.id !== value.id), value];
    this.storage.setItem(this.key(collectionName), JSON.stringify(next));
    return value;
  }

  async saveAll(entries: StoreEntry[]): Promise<number> {
    const parsed = parseEntries(entries);
    const next = new Map<CollectionName, ContentRecord[]>();
    for (const { collection, value } of parsed) {
      const values = next.get(collection) ?? (await this.list(collection));
      next.set(collection, [
        ...values.filter((item) => item.id !== value.id),
        value,
      ]);
    }
    for (const [collection, values] of next)
      this.storage.setItem(this.key(collection), JSON.stringify(values));
    return parsed.length;
  }

  async remove(collectionName: CollectionName, id: string): Promise<void> {
    const values = await this.list(collectionName);
    this.storage.setItem(
      this.key(collectionName),
      JSON.stringify(values.filter((item) => item.id !== id)),
    );
  }
}

export class FirestoreContentStore implements ContentStore {
  private readonly db: Firestore;

  constructor(app: FirebaseApp) {
    this.db = getFirestore(app);
  }

  async list(collectionName: CollectionName): Promise<ContentRecord[]> {
    const snapshot = await getDocs(collection(this.db, collectionName));
    return snapshot.docs.map((item) =>
      parseRecord(collectionName, { ...item.data(), id: item.id }),
    );
  }

  async save(
    collectionName: CollectionName,
    input: unknown,
  ): Promise<ContentRecord> {
    const value = parseRecord(collectionName, input);
    await setDoc(doc(this.db, collectionName, value.id), value);
    return value;
  }

  async saveAll(entries: StoreEntry[]): Promise<number> {
    if (entries.length > MAX_BATCH_WRITES)
      throw new Error(
        `Import has ${entries.length} records; Firestore accepts at most ${MAX_BATCH_WRITES} in one batch. Nothing was written.`,
      );
    const parsed = parseEntries(entries);
    const batch = writeBatch(this.db);
    for (const { collection, value } of parsed)
      batch.set(doc(this.db, collection, value.id), value);
    await batch.commit();
    return parsed.length;
  }

  async remove(collectionName: CollectionName, id: string): Promise<void> {
    await deleteDoc(doc(this.db, collectionName, id));
  }
}
