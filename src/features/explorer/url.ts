import {
  defaultFilters,
  type ExplorerFilters,
  type LoreFilter,
  type ViewMode,
} from "./filter";

export function readExplorerUrl(url: URL): {
  filters: ExplorerFilters;
  eventId: string;
} {
  const view = url.searchParams.get("view");
  const lore = url.searchParams.get("lore");
  return {
    filters: {
      view:
        view === "character" || view === "place" ? view : defaultFilters.view,
      search: url.searchParams.get("q") ?? "",
      characterId: url.searchParams.get("character") ?? "",
      eraId: url.searchParams.get("era") ?? "",
      regionId: url.searchParams.get("region") ?? "",
      lore:
        lore === "confirmed" || lore === "inferred" || lore === "theory"
          ? lore
          : defaultFilters.lore,
      spoilerLevel: defaultFilters.spoilerLevel,
      completedQuestIds: [],
    },
    eventId: url.searchParams.get("event") ?? "",
  };
}

export function writeExplorerUrl(
  url: URL,
  filters: ExplorerFilters,
  eventId: string,
): URL {
  const next = new URL(url);
  for (const key of [
    "view",
    "q",
    "character",
    "era",
    "region",
    "lore",
    "spoilers",
    "quests",
    "event",
  ])
    next.searchParams.delete(key);
  if (filters.view !== "world")
    next.searchParams.set("view", filters.view as ViewMode);
  if (filters.search.trim()) next.searchParams.set("q", filters.search.trim());
  if (filters.view === "character" && filters.characterId)
    next.searchParams.set("character", filters.characterId);
  if (filters.view === "place" && filters.eraId)
    next.searchParams.set("era", filters.eraId);
  if (filters.view === "place" && filters.regionId)
    next.searchParams.set("region", filters.regionId);
  if (filters.lore !== "all")
    next.searchParams.set("lore", filters.lore as LoreFilter);
  if (eventId) {
    next.searchParams.set("event", eventId);
    next.hash = "timeline";
  }
  return next;
}
