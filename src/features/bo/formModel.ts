import type { CollectionName } from "../../content/schema";

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
      ? [["start"], ["end"], ["laneCount"], ["sortOrder"]]
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
      (collection === "eras" && (path[0] === "start" || path[0] === "end"));
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
