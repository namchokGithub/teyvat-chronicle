import MiniSearch from "minisearch";
import { compareEvents } from "../../timeline/layout";
import type { TimelineEvent } from "../../timeline/model";
import type { PublicArchive } from "./archive";

export type ViewMode = "world" | "character" | "place";
export type LoreFilter = "all" | TimelineEvent["loreStatus"];
export type ExplorerFilters = {
  view: ViewMode;
  search: string;
  characterId: string;
  eraId: string;
  regionId: string;
  lore: LoreFilter;
  spoilerLevel: number;
  completedQuestIds: string[];
};

export const defaultFilters: ExplorerFilters = {
  view: "world",
  search: "",
  characterId: "",
  eraId: "",
  regionId: "",
  lore: "all",
  spoilerLevel: 0,
  completedQuestIds: [],
};

type SearchDocument = {
  id: string;
  title: string;
  description: string;
  names: string;
};

export function createEventIndex(
  archive: PublicArchive,
): MiniSearch<SearchDocument> {
  const index = new MiniSearch<SearchDocument>({
    fields: ["title", "description", "names"],
    storeFields: ["id"],
    searchOptions: { prefix: true, fuzzy: 0.2, boost: { title: 3, names: 2 } },
  });
  const names = new Map([
    ...archive.characters.map((item) => [item.id, item.name] as const),
    ...archive.eras.map((item) => [item.id, item.name] as const),
    ...archive.regions.map((item) => [item.id, item.name] as const),
  ]);
  index.addAll(
    archive.timeline.events.map((event) => ({
      id: event.id,
      title: event.title,
      description: `${event.summary} ${event.detail}`,
      names: [...event.characterIds, ...event.eraIds, ...event.regionIds]
        .map((id) => names.get(id) ?? "")
        .join(" "),
    })),
  );
  return index;
}

export function selectEvents(
  archive: PublicArchive,
  filters: ExplorerFilters,
  index: MiniSearch<SearchDocument>,
): TimelineEvent[] {
  const query = filters.search.trim().toLocaleLowerCase();
  const searchIds = query
    ? new Set(index.search(query).map((result) => String(result.id)))
    : null;
  const textFallback = (event: TimelineEvent) => {
    const related = [
      ...archive.characters.filter((item) =>
        event.characterIds.includes(item.id),
      ),
      ...archive.eras.filter((item) => event.eraIds.includes(item.id)),
      ...archive.regions.filter((item) => event.regionIds.includes(item.id)),
    ]
      .map((item) => item.name)
      .join(" ");
    return `${event.title} ${event.summary} ${event.detail} ${related}`
      .toLocaleLowerCase()
      .includes(query);
  };

  return archive.timeline.events
    .filter((event) => {
      if (
        filters.view === "character" &&
        (!filters.characterId ||
          !event.characterIds.includes(filters.characterId))
      )
        return false;
      if (filters.view === "place" && !filters.eraId && !filters.regionId)
        return false;
      if (
        filters.view === "place" &&
        filters.eraId &&
        !event.eraIds.includes(filters.eraId)
      )
        return false;
      if (
        filters.view === "place" &&
        filters.regionId &&
        !event.regionIds.includes(filters.regionId)
      )
        return false;
      if (filters.lore !== "all" && event.loreStatus !== filters.lore)
        return false;
      if ((event.spoilerLevel ?? 0) > filters.spoilerLevel) return false;
      if (
        event.requiredQuestIds?.some(
          (id) => !filters.completedQuestIds.includes(id),
        )
      )
        return false;
      if (searchIds && !searchIds.has(event.id) && !textFallback(event))
        return false;
      return true;
    })
    .sort(compareEvents);
}
