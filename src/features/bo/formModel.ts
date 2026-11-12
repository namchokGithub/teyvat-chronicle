import type { CollectionName } from "../../content/schema";
import { draftTemplate } from "../../content/templates";
import type { ZodError } from "zod";

export type DraftRecord = Record<string, unknown>;
export type FieldPath = (string | number)[];

function isRecord(value: unknown): value is DraftRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function getField(record: unknown, path: FieldPath): unknown {
  return path.reduce<unknown>((current, key) => {
    if (Array.isArray(current)) return current[Number(key)];
    return isRecord(current) ? current[String(key)] : undefined;
  }, record);
}

export function setField(
  record: DraftRecord,
  path: FieldPath,
  value: unknown,
): DraftRecord {
  function replace(current: unknown, index: number): unknown {
    if (index === path.length) return value;
    const key = path[index];
    if (Array.isArray(current)) {
      const next = [...current];
      next[Number(key)] = replace(current[Number(key)], index + 1);
      return next;
    }
    const next = { ...(isRecord(current) ? current : {}) };
    next[String(key)] = replace(next[String(key)], index + 1);
    return next;
  }
  return replace(record, 0) as DraftRecord;
}

function numberValue(
  value: unknown,
  nullable: boolean,
): number | null | undefined {
  if (value === "" || value === null || value === undefined)
    return nullable ? null : undefined;
  return typeof value === "number" ? value : Number(value);
}

export function normalizeFormRecord(
  collection: CollectionName,
  draft: DraftRecord,
): DraftRecord {
  let result = draft;
  const numberFields: FieldPath[] =
    collection === "timelines"
      ? [
          ["start"],
          ["end"],
          ["laneCount"],
          ["unknownBefore"],
          ["unknownWidth"],
          ["sortOrder"],
        ]
      : collection === "events"
        ? [
            ["time", "start"],
            ["time", "end"],
            ["display", "lane"],
            ["spoilerLevel"],
            ["sortOrder"],
          ]
        : collection === "eras"
          ? [["start"], ["end"], ["sortOrder"]]
          : collection === "settings"
            ? []
            : [["sortOrder"]];
  for (const path of numberFields) {
    if (getField(result, path) === undefined && path[0] === "spoilerLevel")
      continue;
    const nullable =
      (collection === "events" && path[0] === "time") ||
      (collection === "eras" && (path[0] === "start" || path[0] === "end")) ||
      (collection === "timelines" && path[0] === "unknownBefore");
    result = setField(
      result,
      path,
      numberValue(getField(result, path), nullable),
    );
  }
  if (collection === "timelines") {
    const breaks = getField(result, ["breaks"]);
    if (Array.isArray(breaks))
      for (let index = 0; index < breaks.length; index++)
        for (const key of ["start", "end", "width"])
          result = setField(
            result,
            ["breaks", index, key],
            numberValue(getField(result, ["breaks", index, key]), false),
          );
  }
  if (collection === "events")
    for (const key of ["image", "icon"])
      if (getField(result, ["display", key]) === "")
        result = setField(result, ["display", key], null);
  if (collection === "characters" || collection === "regions")
    if (getField(result, ["image"]) === "")
      result = setField(result, ["image"], null);
  if (
    collection === "settings" &&
    getField(result, ["defaultTimelineId"]) === ""
  )
    result = setField(result, ["defaultTimelineId"], null);
  return result;
}

const autoIdSources: Partial<Record<CollectionName, FieldPath>> = {
  timelines: ["title", "en"],
  events: ["title", "en"],
  characters: ["name", "en"],
  eras: ["name", "en"],
  regions: ["name", "en"],
  sources: ["title"],
};

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * For an unsaved record, keeps `id` in step with the English title or name
 * while the ID is still generated (template ID, empty, or the previous slug).
 * A manually edited ID is left alone.
 */
export function applyAutoId(
  collection: CollectionName,
  before: DraftRecord,
  after: DraftRecord,
): DraftRecord {
  const source = autoIdSources[collection];
  if (!source) return after;
  const next = slugify(String(getField(after, source) ?? ""));
  const previous = slugify(String(getField(before, source) ?? ""));
  const id = String(before.id ?? "");
  const generated =
    id === "" || id === draftTemplate(collection).id || id === previous;
  if (!next || !generated || after.id !== before.id) return after;
  return { ...after, id: next };
}

/** Field error messages keyed by dotted form path (for example `time.end`). */
export type FieldErrors = Record<string, string>;

export function fieldErrors(error: ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "record";
    result[key] ??= issue.message;
  }
  return result;
}

/** Drops errors for fields whose value changed between two drafts. */
export function pruneFieldErrors(
  errors: FieldErrors,
  before: DraftRecord,
  after: DraftRecord,
): FieldErrors {
  const kept = Object.entries(errors).filter(([key]) => {
    const path = key.split(".");
    return (
      JSON.stringify(getField(before, path)) ===
      JSON.stringify(getField(after, path))
    );
  });
  return kept.length === Object.keys(errors).length
    ? errors
    : Object.fromEntries(kept);
}

/** The error for a field path, including errors on its items (`sourceIds.0`). */
export function errorFor(
  errors: FieldErrors,
  path: FieldPath,
): string | undefined {
  const key = path.join(".");
  if (errors[key]) return errors[key];
  const nested = Object.keys(errors).find((item) => item.startsWith(`${key}.`));
  return nested ? errors[nested] : undefined;
}
