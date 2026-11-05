import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type { FirebaseApp } from "firebase/app";
import { parseRecord, type CollectionName, type ContentRecord } from "./schema";

export interface ContentStore {
  list(collectionName: CollectionName): Promise<ContentRecord[]>;
  save(collectionName: CollectionName, input: unknown): Promise<ContentRecord>;
  remove(collectionName: CollectionName, id: string): Promise<void>;
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

  async remove(collectionName: CollectionName, id: string): Promise<void> {
    await deleteDoc(doc(this.db, collectionName, id));
  }
}
