import * as Dialog from "@radix-ui/react-dialog";
import { AppSelect } from "@/components/AppSelect";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  Link2,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getFirebaseApp } from "../../lib/firebase";
import type { TimelineEvent } from "../../timeline/model";
import { formatTimelineYear } from "../../timeline/projection";
import { loreLabels, sampleArchive, type PublicArchive } from "./archive";
import { AdvancedExplorer } from "./AdvancedExplorer";
import {
  createEventIndex,
  defaultFilters,
  selectEvents,
  type ExplorerFilters,
  type ViewMode,
} from "./filter";
import { Timeline } from "./Timeline";
import { readExplorerUrl, writeExplorerUrl } from "./url";

function formatEventTime(event: TimelineEvent): string {
  if (event.start === null) return "Time unknown";
  const range =
    event.end !== null && event.end !== undefined
      ? ` — ${formatTimelineYear(event.end)}`
      : "";
  return `${formatTimelineYear(event.start)}${range}${event.precision === "approximate" ? " · approximate" : ""}`;
}

function EventDialog({
  event,
  archive,
  onClose,
  focusEvents,
  allowedEventIds,
  onSelect,
}: {
  event: TimelineEvent | null;
  archive: PublicArchive;
  onClose: () => void;
  focusEvents: TimelineEvent[];
  allowedEventIds: Set<string>;
  onSelect: (id: string) => void;
}) {
  const [copiedId, setCopiedId] = useState("");
  const sources = event
    ? archive.sources.filter((source) => event.sourceIds.includes(source.id))
    : [];
  const focusIndex = event
    ? focusEvents.findIndex((item) => item.id === event.id)
    : -1;
  const relatedEvents = event
    ? archive.eventRelations
        .filter(
          (relation) =>
            (relation.fromId === event.id &&
              allowedEventIds.has(relation.toId)) ||
            (relation.toId === event.id &&
              allowedEventIds.has(relation.fromId)),
        )
        .map((relation) => ({
          relation,
          target: archive.timeline.events.find(
            (item) =>
              item.id ===
              (relation.fromId === event.id ? relation.toId : relation.fromId),
          ),
        }))
        .filter(
          (
            item,
          ): item is {
            relation: typeof item.relation;
            target: TimelineEvent;
          } => !!item.target,
        )
    : [];
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedId(event?.id ?? "");
    } catch {
      setCopiedId("");
    }
  }
  return (
    <Dialog.Root
      open={event !== null}
      onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content"
          aria-describedby="event-description">
          {event && (
            <>
              <div className="dialog-topline">
                <span className="eyebrow">The chronicle / {event.era}</span>
                <Dialog.Close
                  className="icon-button dialog-close"
                  aria-label="Close event details">
                  <X size={18} />
                </Dialog.Close>
              </div>
              {event.image && (
                <img
                  className="dialog-image"
                  src={event.image}
                  alt={event.imageAlt ?? ""}
                />
              )}
              <span className={`detail-mark mark-${event.accent}`} />
              <Dialog.Title className="dialog-title">
                {event.title}
              </Dialog.Title>
              <p className="dialog-time">{formatEventTime(event)}</p>
              <div className="certainty-detail">
                <span
                  className={`certainty-badge certainty-${event.loreStatus}`}>
                  {loreLabels[event.loreStatus]}
                </span>
                <span>Lore certainty · separate from date precision</span>
              </div>
              <Dialog.Description
                id="event-description"
                className="dialog-description">
                {event.detail}
              </Dialog.Description>
              {event.characterIds.length > 0 && (
                <p className="dialog-related">
                  Characters:{" "}
                  {event.characterIds
                    .map(
                      (id) =>
                        archive.characters.find((item) => item.id === id)
                          ?.name ?? id,
                    )
                    .join(", ")}
                </p>
              )}
              {relatedEvents.length > 0 && (
                <div className="dialog-related-events">
                  <h3>Connected events</h3>
                  {relatedEvents.map(({ relation, target }) => (
                    <button
                      key={relation.id}
                      onClick={() => onSelect(target.id)}>
                      <span>{relation.relation}</span>
                      <strong>{target.title}</strong>
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
                </div>
              )}
              <div className="dialog-sources">
                <h3>Sources</h3>
                {sources.length > 0 ? (
                  <ul>
                    {sources.map((source) => (
                      <li key={source.id}>
                        {source.url ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer">
                            {source.title} ↗
                          </a>
                        ) : (
                          source.title
                        )}
                        <small>{source.kind}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    {archive.sample
                      ? "Sample record · sources will be added with verified lore."
                      : "No public source is available for this record."}
                  </p>
                )}
              </div>
              <button className="copy-link" onClick={copyLink}>
                <Link2 size={15} />{" "}
                {copiedId === event.id ? "Link copied" : "Copy event link"}
              </button>
              {focusIndex !== -1 && focusEvents.length > 1 && (
                <div className="dialog-step">
                  <button
                    disabled={focusIndex === 0}
                    onClick={() => onSelect(focusEvents[focusIndex - 1].id)}>
                    <ChevronLeft size={15} /> Previous
                  </button>
                  <span>
                    {focusIndex + 1} / {focusEvents.length}
                  </span>
                  <button
                    disabled={focusIndex === focusEvents.length - 1}
                    onClick={() => onSelect(focusEvents[focusIndex + 1].id)}>
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              )}
              {archive.sample && (
                <div className="dialog-note">
                  Sample chronology · dates and links are illustrative
                </div>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Filters({
  archive,
  filters,
  onChange,
  count,
  focusMode,
  onFocusChange,
  onStep,
}: {
  archive: PublicArchive;
  filters: ExplorerFilters;
  onChange: (next: ExplorerFilters) => void;
  count: number;
  focusMode: boolean;
  onFocusChange: (active: boolean) => void;
  onStep: (direction: -1 | 1) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const questIds = [
    ...new Set(
      archive.timeline.events
        .filter((event) => (event.spoilerLevel ?? 0) <= filters.spoilerLevel)
        .flatMap((event) => event.requiredQuestIds ?? []),
    ),
  ].sort();
  function setView(view: ViewMode) {
    onChange({ ...filters, view, characterId: "", eraId: "", regionId: "" });
  }
  return (
    <div className="explorer-controls" aria-label="Explore the archive">
      <div className="view-tabs" role="group" aria-label="Timeline view">
        <button
          className={filters.view === "world" ? "active" : ""}
          aria-pressed={filters.view === "world"}
          onClick={() => setView("world")}>
          World
        </button>
        <button
          className={filters.view === "character" ? "active" : ""}
          aria-pressed={filters.view === "character"}
          onClick={() => setView("character")}>
          Character
        </button>
        <button
          className={filters.view === "place" ? "active" : ""}
          aria-pressed={filters.view === "place"}
          onClick={() => setView("place")}>
          Era / Region
        </button>
      </div>
      <div className="filter-row">
        <label className="search-field" htmlFor="event-search">
          <Search size={17} />
          <input
            ref={searchRef}
            id="event-search"
            type="search"
            placeholder="Search events, places, or people"
            value={filters.search}
            onChange={(event) =>
              onChange({ ...filters, search: event.target.value })
            }
          />
          {filters.search && (
            <button
              aria-label="Clear search"
              onClick={() => {
                onChange({ ...filters, search: "" });
                searchRef.current?.focus();
              }}>
              <X size={16} />
            </button>
          )}
        </label>
        {filters.view === "character" && (
          <label className="filter-select">
            Character{" "}
            <AppSelect
              value={filters.characterId}
              onValueChange={(next) =>
                onChange({ ...filters, characterId: next })
              }
              options={[
                { value: "", label: "Choose a character" },
                ...archive.characters.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
          </label>
        )}
        {filters.view === "place" && (
          <>
            <label className="filter-select">
              Era{" "}
              <AppSelect
                value={filters.eraId}
                onValueChange={(next) => onChange({ ...filters, eraId: next })}
                options={[
                  { value: "", label: "Any era" },
                  ...archive.eras.map((item) => ({
                    value: item.id,
                    label: item.name,
                  })),
                ]}
              />
            </label>
            <label className="filter-select">
              Region{" "}
              <AppSelect
                value={filters.regionId}
                onValueChange={(next) => onChange({ ...filters, regionId: next })}
                options={[
                  { value: "", label: "Any region" },
                  ...archive.regions.map((item) => ({
                    value: item.id,
                    label: item.name,
                  })),
                ]}
              />
            </label>
          </>
        )}
        <label className="filter-select">
          Lore certainty{" "}
          <AppSelect
            value={filters.lore}
            onValueChange={(next) =>
              onChange({ ...filters, lore: next as ExplorerFilters["lore"] })
            }
            options={[
              { value: "all", label: "All levels" },
              { value: "confirmed", label: "Confirmed" },
              { value: "inferred", label: "Inferred" },
              { value: "theory", label: "Theory" },
            ]}
          />
        </label>
        <label className="filter-select">
          Spoilers through level{" "}
          <AppSelect
            value={String(filters.spoilerLevel)}
            onValueChange={(next) =>
              onChange({ ...filters, spoilerLevel: Number(next) })
            }
            options={[
              { value: "0", label: "0 · spoiler free" },
              { value: "1", label: "Level 1" },
              { value: "2", label: "Level 2" },
              { value: "3", label: "3 · all marked spoilers" },
            ]}
          />
        </label>
      </div>
      {questIds.length > 0 && (
        <details className="quest-gates">
          <summary>
            Completed quests ({filters.completedQuestIds.length})
          </summary>
          <p>
            Only events from completed quests appear. Quest IDs are set by the
            editor.
          </p>
          <div>
            {questIds.map((id) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={filters.completedQuestIds.includes(id)}
                  onChange={(event) =>
                    onChange({
                      ...filters,
                      completedQuestIds: event.target.checked
                        ? [...filters.completedQuestIds, id]
                        : filters.completedQuestIds.filter(
                            (item) => item !== id,
                          ),
                    })
                  }
                />
                {id}
              </label>
            ))}
          </div>
        </details>
      )}
      <div className="filter-foot">
        <span role="status">
          {count} {count === 1 ? "record" : "records"} in this view
        </span>
        {filters.view === "character" && !filters.characterId && (
          <span>Choose a character to follow their timeline.</span>
        )}
        {filters.view === "place" && !filters.eraId && !filters.regionId && (
          <span>Choose an era or region to narrow the timeline.</span>
        )}
        <button
          onClick={() => onChange(defaultFilters)}
          disabled={JSON.stringify(filters) === JSON.stringify(defaultFilters)}>
          Clear filters
        </button>
      </div>
      {filters.view === "character" &&
        filters.characterId &&
        (() => {
          const character = archive.characters.find(
            (item) => item.id === filters.characterId,
          );
          return character ? (
            <div className="character-profile">
              <div>
                <span className="eyebrow">Character archive</span>
                <h3>{character.name}</h3>
                <p>
                  {character.description || "Biography pending source review."}
                </p>
              </div>
              <span>
                {count} linked {count === 1 ? "event" : "events"}
              </span>
              <div className="focus-controls">
                <button
                  className={focusMode ? "active" : ""}
                  aria-pressed={focusMode}
                  onClick={() => onFocusChange(!focusMode)}>
                  Focus mode {focusMode ? "on" : "off"}
                </button>
                <button
                  onClick={() => onStep(-1)}
                  disabled={count === 0}
                  aria-label="Previous character event">
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => onStep(1)}
                  disabled={count === 0}
                  aria-label="Next character event">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : null;
        })()}
    </div>
  );
}

export default function PublicExplorer() {
  const app = useMemo(() => getFirebaseApp(), []);
  const initialUrl = useMemo(
    () => readExplorerUrl(new URL(window.location.href)),
    [],
  );
  const [filters, setFilters] = useState<ExplorerFilters>(initialUrl.filters);
  const [eventId, setEventId] = useState(initialUrl.eventId);
  const [archive, setArchive] = useState<PublicArchive | null>(
    app ? null : sampleArchive,
  );
  const [loading, setLoading] = useState(!!app);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [focusMode, setFocusMode] = useState(true);

  useEffect(() => {
    if (!app) return;
    let live = true;
    import("./firestore")
      .then(({ loadPublishedArchive }) => loadPublishedArchive(app))
      .then((value) => {
        if (live) {
          setArchive(value);
          setLoading(false);
          setLoadError("");
        }
      })
      .catch((error) => {
        if (live) {
          setLoading(false);
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load the archive.",
          );
        }
      });
    return () => {
      live = false;
    };
  }, [app, reloadKey]);

  useEffect(() => {
    const onPopState = () => {
      const next = readExplorerUrl(new URL(window.location.href));
      setFilters((current) => ({
        ...next.filters,
        spoilerLevel: current.spoilerLevel,
        completedQuestIds: current.completedQuestIds,
      }));
      setEventId(next.eventId);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const index = useMemo(
    () => (archive ? createEventIndex(archive) : null),
    [archive],
  );
  const visible = useMemo(
    () => (archive && index ? selectEvents(archive, filters, index) : []),
    [archive, filters, index],
  );
  const allowedEvents = useMemo(
    () =>
      archive && index
        ? selectEvents(
            archive,
            {
              ...defaultFilters,
              spoilerLevel: filters.spoilerLevel,
              completedQuestIds: filters.completedQuestIds,
            },
            index,
          )
        : [],
    [archive, index, filters.spoilerLevel, filters.completedQuestIds],
  );
  const allowedEventIds = useMemo(
    () => new Set(allowedEvents.map((event) => event.id)),
    [allowedEvents],
  );
  const worldEvents = useMemo(
    () =>
      archive && index
        ? selectEvents(archive, { ...filters, view: "world" }, index)
        : [],
    [archive, index, filters],
  );
  const contextEvents = useMemo(() => {
    if (
      !archive ||
      !index ||
      filters.view !== "character" ||
      !filters.characterId ||
      !focusMode
    )
      return visible;
    return worldEvents;
  }, [archive, index, filters, focusMode, visible, worldEvents]);
  const selected = allowedEvents.find((event) => event.id === eventId) ?? null;
  function updateFilters(next: ExplorerFilters) {
    setFilters(next);
    window.history.replaceState(
      null,
      "",
      writeExplorerUrl(new URL(window.location.href), next, eventId),
    );
  }
  function openEvent(id: string) {
    setEventId(id);
    window.history.pushState(
      null,
      "",
      writeExplorerUrl(new URL(window.location.href), filters, id),
    );
  }
  function closeEvent() {
    setEventId("");
    window.history.replaceState(
      null,
      "",
      writeExplorerUrl(new URL(window.location.href), filters, ""),
    );
  }
  function stepCharacter(direction: -1 | 1) {
    if (visible.length === 0) return;
    const current = visible.findIndex((event) => event.id === eventId);
    const next =
      current === -1
        ? direction === 1
          ? 0
          : visible.length - 1
        : Math.max(0, Math.min(visible.length - 1, current + direction));
    openEvent(visible[next].id);
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          href="#top"
          className="brand"
          aria-label="Teyvat Chronicle, back to top">
          <span className="brand-mark">✦</span>
          <span>
            TEYVAT <em>CHRONICLE</em>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#timeline">
            Explore timeline <ArrowUpRight size={14} />
          </a>
        </nav>
      </header>
      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-content">
            <p className="eyebrow hero-eyebrow">
              <Compass size={15} /> An atlas of remembered time
            </p>
            <h1 id="hero-title">
              Every age
              <br />
              leaves <i>a trace.</i>
            </h1>
            <p className="hero-copy">
              Explore the stories, kingdoms, and turning points that shaped
              Teyvat. Follow a character, place, or era through the record.
            </p>
            <a className="hero-link" href="#explore">
              Explore the archive <ArrowUpRight size={18} />
            </a>
            {archive && archive.eras.length > 0 && (
              <div className="hero-shortcuts">
                <span>Begin with an era</span>
                {archive.eras.slice(0, 2).map((era) => (
                  <button
                    key={era.id}
                    onClick={() => {
                      updateFilters({
                        ...defaultFilters,
                        view: "place",
                        eraId: era.id,
                      });
                      window.location.hash = "explore";
                    }}>
                    {era.name} ↗
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="hero-side-note">
            <span className="vertical-line" /> THE WORLD REMEMBERS
          </div>
          <div className="hero-bottom">
            <span>
              01 /{" "}
              {archive?.timeline.events.length.toString().padStart(2, "0") ??
                "—"}{" "}
              {archive?.sample ? "sample" : "published"} records
            </span>
            <span>
              Scroll to explore <span aria-hidden="true">↓</span>
            </span>
          </div>
        </section>
        <section
          className="explorer-panel"
          id="explore"
          aria-label="Explore the archive">
          <div className="explorer-panel-head">
            <p className="eyebrow">Choose your path</p>
            <h2>Explore the archive</h2>
            <p>One chronicle, many ways through it.</p>
          </div>
          {loading ? (
            <div className="explorer-state" role="status">
              Loading published records…
            </div>
          ) : loadError ? (
            <div className="explorer-state error" role="alert">
              <h3>The archive could not load</h3>
              <p>{loadError}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  setReloadKey((key) => key + 1);
                }}>
                Try again
              </button>
            </div>
          ) : archive ? (
            <Filters
              archive={archive}
              filters={filters}
              onChange={updateFilters}
              count={visible.length}
              focusMode={focusMode}
              onFocusChange={setFocusMode}
              onStep={stepCharacter}
            />
          ) : (
            <div className="explorer-state">
              <h3>No published timeline yet</h3>
              <p>
                Publish a timeline and events in the Back Office to open the
                public archive.
              </p>
            </div>
          )}
        </section>
        {archive && !loading && !loadError && (
          <Timeline
            archive={archive}
            events={contextEvents}
            view={filters.view}
            onSelect={openEvent}
            focusCharacterId={
              focusMode && filters.view === "character"
                ? filters.characterId
                : ""
            }
            selectedEventId={eventId}
          />
        )}
        {archive && !loading && !loadError && (
          <AdvancedExplorer
            archive={archive}
            events={allowedEvents}
            storyEvents={worldEvents}
            onSelect={openEvent}
          />
        )}
        {archive && eventId && !selected && !loading && (
          <p className="deep-link-error" role="alert">
            This event link is unavailable in the public archive.
          </p>
        )}
      </main>
      <footer className="site-footer">
        <span>✦ Teyvat Chronicle</span>
        <span>
          {archive?.sample ? "Sample chronology" : "Published lore archive"}
        </span>
        <a href="#bo">Back Office</a>
      </footer>
      {archive && (
        <EventDialog
          event={selected}
          archive={archive}
          onClose={closeEvent}
          focusEvents={filters.view === "character" ? visible : []}
          allowedEventIds={allowedEventIds}
          onSelect={openEvent}
        />
      )}
    </div>
  );
}
