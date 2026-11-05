import type { FirebaseApp } from "firebase/app";
import {
  collection,
  getDocs,
  getFirestore,
  query,
  where,
} from "firebase/firestore";
import type { z } from "zod";
import {
  eventSchema,
  timelineSchema,
  characterSchema,
  eraSchema,
  regionSchema,
  sourceSchema,
  relationshipSchema,
} from "../../content/schema";
import {
  buildPublishedArchive,
  type PublicArchive,
  type PublishedRecords,
} from "./archive";

export async function loadPublishedArchive(
  app: FirebaseApp,
): Promise<PublicArchive | null> {
  const db = getFirestore(app);
  async function read<T>(
    name: keyof PublishedRecords,
    schema: z.ZodType<T>,
  ): Promise<T[]> {
    // The status predicate is required by firestore.rules; rules are not a client-side filter.
    const snapshot = await getDocs(
      query(collection(db, name), where("status", "==", "published")),
    );
    return snapshot.docs.map((item) =>
      schema.parse({ ...item.data(), id: item.id }),
    );
  }
  const [timelines, events, characters, eras, regions, sources, relationships] =
    await Promise.all([
      read("timelines", timelineSchema),
      read("events", eventSchema),
      read("characters", characterSchema),
      read("eras", eraSchema),
      read("regions", regionSchema),
      read("sources", sourceSchema),
      read("relationships", relationshipSchema),
    ]);
  return buildPublishedArchive({
    timelines,
    events,
    characters,
    eras,
    regions,
    sources,
    relationships,
  });
}
