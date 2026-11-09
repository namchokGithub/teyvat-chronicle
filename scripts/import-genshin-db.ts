// Builds a Back Office backup snapshot (format "teyvat-chronicle", version 1)
// with draft characters, regions, and one provenance source from genshin-db.
// Run from teyvat-chronicle/: node scripts/import-genshin-db.ts
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRecord, type CollectionName } from "../src/content/schema.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "..", "genshin-db", "src", "data");
const outFile = join(
  root,
  "data",
  "import",
  "genshin-db-characters-regions.json",
);

type SourceCharacter = {
  name: string;
  description?: string;
  region?: string | null;
};

const readJson = <T>(...path: string[]): T =>
  JSON.parse(readFileSync(join(dataDir, ...path), "utf8")) as T;

const slug = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const SOURCE_ID = "genshin-db";

const regionNames = [
  "Mondstadt",
  "Liyue",
  "Inazuma",
  "Sumeru",
  "Fontaine",
  "Natlan",
  "Nod-Krai",
  "Snezhnaya",
  "Khaenri'ah",
  "Celestia",
];

const regions = regionNames.map((name, index) => ({
  id: slug(name.replace("'", "")),
  status: "draft",
  name: { en: name },
  description: { en: "" },
  image: null,
  sortOrder: (index + 1) * 10,
}));
const regionIds = new Set(regions.map((region) => region.id));

const versions = readJson<Record<string, string>>("version", "characters.json");
const images = readJson<Record<string, { mihoyo_icon?: string }>>(
  "image",
  "characters.json",
);
const versionKey = (value: string | undefined) =>
  (value ?? "99")
    .split(".")
    .map((part) => part.padStart(3, "0"))
    .join(".");

const keys = readdirSync(join(dataDir, "English", "characters"))
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.slice(0, -5));

const characters = keys
  .map((key) => {
    const en = readJson<SourceCharacter>(
      "English",
      "characters",
      `${key}.json`,
    );
    const th = readJson<SourceCharacter>("Thai", "characters", `${key}.json`);
    return { key, en, th };
  })
  .sort(
    (a, b) =>
      versionKey(versions[a.key]).localeCompare(versionKey(versions[b.key])) ||
      a.en.name.localeCompare(b.en.name),
  )
  .map(({ key, en, th }, index) => {
    const region = en.region ? slug(en.region) : "";
    if (region && !regionIds.has(region))
      throw new Error(`${key}: unknown region "${en.region}"`);
    return {
      id: slug(en.name),
      status: "draft",
      name:
        th.name && th.name !== en.name
          ? { en: en.name, th: th.name }
          : { en: en.name },
      biography: th.description
        ? { en: en.description ?? "", th: th.description }
        : { en: en.description ?? "" },
      regionIds: region ? [region] : [],
      sourceIds: [SOURCE_ID],
      image: images[key]?.mihoyo_icon ?? null,
      sortOrder: (index + 1) * 10,
    };
  });

const sources = [
  {
    id: SOURCE_ID,
    status: "draft",
    title: "genshin-db",
    kind: "other",
    url: "https://github.com/theBowja/genshin-db",
    note: "Character profiles and descriptions imported from genshin-db data (English and Thai).",
    sortOrder: 10,
  },
];

const collections: Record<CollectionName, unknown[]> = {
  timelines: [],
  events: [],
  characters,
  eras: [],
  regions,
  sources,
  relationships: [],
  settings: [],
};

for (const [name, records] of Object.entries(collections)) {
  const parsed = records.map((record) =>
    parseRecord(name as CollectionName, record),
  );
  if (new Set(parsed.map((item) => item.id)).size !== parsed.length)
    throw new Error(`${name} has duplicate IDs`);
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(
  outFile,
  `${JSON.stringify({ format: "teyvat-chronicle", version: 1, collections }, null, 2)}\n`,
);
console.log(
  `Wrote ${characters.length} characters, ${regions.length} regions, ${sources.length} source to ${outFile}`,
);
