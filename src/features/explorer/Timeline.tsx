import { AppSelect } from "@/components/AppSelect";
import { select } from "d3-selection";
import {
  zoom,
  zoomIdentity,
  type ZoomBehavior,
  type ZoomTransform,
} from "d3-zoom";
import {
  ArrowDownRight,
  ArrowUpRight,
  Grip,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { compareEvents, layoutEventCards } from "../../timeline/layout";
import type { TimelineEvent } from "../../timeline/model";
import {
  axisBreaks,
  createTimelineProjection,
  formatUnknownZone,
  spreadAcross,
  formatAxisYear,
  formatTimelineYear,
  timelineTicks,
} from "../../timeline/projection";
import { loreLabels, type PublicArchive } from "./archive";
import type { ViewMode } from "./filter";

const CONTENT_WIDTH = 1840;
const MIN_ZOOM = 0.2;
const ROW_HEIGHT = 280;
const CARD_TOP = 105;
const CARD_HEIGHT = 250;

/** Starts with the whole axis in view, as far as the minimum zoom allows. */
function fitTransform(viewportWidth: number): ZoomTransform {
  const scale = Math.min(3, Math.max(MIN_ZOOM, viewportWidth / CONTENT_WIDTH));
  return zoomIdentity.scale(scale);
}

export function Timeline({
  archive,
  events,
  view,
  onSelect,
  focusCharacterId,
  selectedEventId,
  heading,
  footnote,
  onTimelineChange,
}: {
  archive: PublicArchive;
  events: TimelineEvent[];
  view: ViewMode;
  onSelect: (id: string) => void;
  focusCharacterId: string;
  selectedEventId: string;
  /** Replaces the public section heading (title and intro), keeping the controls. */
  heading?: ReactNode;
  /** Replaces the data note in the footer. */
  footnote?: string;
  /** Shows a timeline picker when the archive offers more than one. */
  onTimelineChange?: (id: string) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [viewportWidth, setViewportWidth] = useState(1100);
  const [hoveredId, setHoveredId] = useState("");
  const frameRef = useRef<number | null>(null);
  const latestTransformRef = useRef<ZoomTransform>(zoomIdentity);
  const projection = useMemo(
    () =>
      createTimelineProjection(
        archive.timeline.start,
        archive.timeline.end,
        CONTENT_WIDTH,
        axisBreaks(archive.timeline),
      ),
    [archive],
  );
  const zone = archive.timeline.unknownZone;
  // Content x for every card on the axis. Unknown-zone cards are spread
  // evenly across the zone in chronological order instead of by year.
  const positions = useMemo(() => {
    const result = new Map<string, number>();
    const zoned = events.filter((event) => event.ancient).sort(compareEvents);
    if (zone) {
      const spread = spreadAcross(
        zoned.length,
        projection.x(archive.timeline.start),
        zone.width,
      );
      zoned.forEach((event, index) => result.set(event.id, spread[index]));
    }
    for (const event of events)
      if (!event.ancient && event.start !== null)
        result.set(event.id, projection.x(event.start));
    return result;
  }, [events, zone, projection, archive.timeline.start]);
  const placed = useMemo(
    () => events.filter((event) => positions.has(event.id)),
    [events, positions],
  );
  const undated = useMemo(
    () => events.filter((event) => !positions.has(event.id)),
    [events, positions],
  );
  const layout = useMemo(
    () =>
      layoutEventCards(placed, projection.x, {
        laneCount: archive.timeline.laneCount,
        minZoom: MIN_ZOOM,
        positions,
      }),
    [placed, projection, positions, archive.timeline.laneCount],
  );
  const axisY = CARD_TOP + layout.laneCount * ROW_HEIGHT + 18;
  const surfaceHeight = axisY + 90;
  const activeId = selectedEventId || hoveredId;
  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const relation of archive.eventRelations) {
      if (relation.fromId === activeId) ids.add(relation.toId);
      if (relation.toId === activeId) ids.add(relation.fromId);
    }
    return ids;
  }, [archive.eventRelations, activeId]);
  const ticks = useMemo(
    () =>
      timelineTicks(
        archive.timeline.start,
        archive.timeline.end,
        axisBreaks(archive.timeline),
        projection.pixelsPerYear * transform.k,
      ).filter((year) => !zone || year >= zone.before),
    [archive.timeline, projection, transform.k, zone],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) =>
      setViewportWidth(entry.contentRect.width),
    );
    observer.observe(viewport);
    const behavior = zoom<HTMLDivElement, unknown>()
      .scaleExtent([MIN_ZOOM, 3])
      // Panning stops at the timeline ends; a narrower axis stays centered.
      .translateExtent([
        [0, Number.NEGATIVE_INFINITY],
        [CONTENT_WIDTH, Number.POSITIVE_INFINITY],
      ])
      // Plain wheel scrolls the page; Ctrl/⌘ + wheel (and trackpad pinch,
      // which arrives as a Ctrl wheel) zooms. Rejected wheels are not
      // prevented, so the page keeps scrolling.
      .filter((event) => {
        if (event.type === "wheel") return event.ctrlKey || event.metaKey;
        return !event.button && !(event.target as Element).closest("button");
      })
      // d3 speeds every Ctrl wheel up 10×, meant for small pinch deltas; a
      // mouse wheel with Ctrl would then jump about 4× per notch.
      .wheelDelta((event: WheelEvent) => {
        const delta =
          -event.deltaY *
          (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002);
        const pinch =
          event.ctrlKey && event.deltaMode === 0 && Math.abs(event.deltaY) < 50;
        return pinch ? delta * 10 : delta;
      })
      .on("zoom", (event) => {
        latestTransformRef.current = event.transform;
        if (frameRef.current === null)
          frameRef.current = requestAnimationFrame(() => {
            setTransform(latestTransformRef.current);
            frameRef.current = null;
          });
      });
    zoomRef.current = behavior;
    const selection = select<HTMLDivElement, unknown>(viewport);
    selection.call(behavior);
    selection.call(behavior.transform, fitTransform(viewport.clientWidth));
    return () => {
      observer.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      selection.on(".zoom", null);
      zoomRef.current = null;
    };
  }, [archive.timeline.id]);

  const screenX = (year: number) => transform.applyX(projection.x(year));
  const applyZoom = (factor: number) => {
    const viewport = viewportRef.current;
    const behavior = zoomRef.current;
    if (viewport && behavior)
      select(viewport).call(behavior.scaleBy, factor, [viewportWidth / 2, 0]);
  };
  const shiftBy = (amount: number) => {
    const viewport = viewportRef.current;
    const behavior = zoomRef.current;
    if (viewport && behavior)
      select(viewport).call(behavior.translateBy, amount / transform.k, 0);
  };
  const reset = () => {
    const viewport = viewportRef.current;
    const behavior = zoomRef.current;
    if (viewport && behavior)
      select(viewport).call(
        behavior.transform,
        fitTransform(viewport.clientWidth),
      );
  };
  function onViewportKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      shiftBy(180);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      shiftBy(-180);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      applyZoom(1.3);
    } else if (event.key === "-") {
      event.preventDefault();
      applyZoom(1 / 1.3);
    } else if (event.key === "Home") {
      event.preventDefault();
      reset();
    }
  }
  const bands = archive.eras.filter(
    (era): era is typeof era & { start: number; end: number } =>
      era.start !== null &&
      era.start !== undefined &&
      era.end !== null &&
      era.end !== undefined,
  );

  return (
    <section
      className="timeline-section"
      id="timeline"
      aria-labelledby="timeline-title"
    >
      <div className="section-heading">
        {heading ?? (
          <div>
            <p className="eyebrow">01 / The passage of time</p>
            <h2 id="timeline-title">
              {view === "character"
                ? "A life across ages"
                : view === "place"
                  ? "Places in time"
                  : "A world in fragments"}
            </h2>
            <p className="section-intro">
              Follow the surviving traces. Select a moment to read its place in
              the record.
            </p>
          </div>
        )}
        <div className="timeline-tools" aria-label="Timeline controls">
          <button
            className="icon-button"
            onClick={() => shiftBy(180)}
            aria-label="Move timeline left"
            title="Move left"
          >
            <ArrowDownRight className="arrow-left" size={17} />
          </button>
          <button
            className="icon-button"
            onClick={() => shiftBy(-180)}
            aria-label="Move timeline right"
            title="Move right"
          >
            <ArrowUpRight size={17} />
          </button>
          <span className="tool-divider" />
          <button
            className="icon-button"
            onClick={() => applyZoom(1 / 1.3)}
            aria-label="Zoom out"
            title="Zoom out"
          >
            <Minus size={17} />
          </button>
          <span className="zoom-value" aria-live="polite">
            {Math.round(transform.k * 100)}%
          </span>
          <button
            className="icon-button"
            onClick={() => applyZoom(1.3)}
            aria-label="Zoom in"
            title="Zoom in"
          >
            <Plus size={17} />
          </button>
          <span className="tool-divider" />
          <button
            className="icon-button"
            onClick={reset}
            aria-label="Reset timeline view"
            title="Reset view"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
      <div className="timeline-frame">
        <div className="timeline-meta">
          {onTimelineChange && archive.timelines.length > 1 ? (
            <div className="timeline-picker">
              <span className="live-dot" />
              <AppSelect
                label="Timeline"
                value={archive.timeline.id}
                onValueChange={onTimelineChange}
                options={archive.timelines.map((item) => ({
                  value: item.id,
                  label: item.title,
                }))}
              />
            </div>
          ) : (
            <span>
              <span className="live-dot" /> {archive.timeline.title}
            </span>
          )}
          <span>
            <Grip size={14} /> Drag to explore · Ctrl/⌘ + scroll to zoom
          </span>
        </div>
        <div
          className="timeline-viewport"
          ref={viewportRef}
          tabIndex={0}
          onKeyDown={onViewportKeyDown}
          aria-keyshortcuts="ArrowLeft ArrowRight + - Home"
          aria-label="Interactive timeline. Use Left and Right arrows to pan, plus or minus to zoom, Home to reset, and Tab to open events."
          style={
            { height: surfaceHeight, "--axis-y": `${axisY}px` } as CSSProperties
          }
        >
          <div className="timeline-surface" style={{ width: viewportWidth }}>
            {bands.map((era, index) => (
              <div
                className={`era-band era-${index % 3}`}
                key={era.id}
                style={{
                  left: screenX(era.start),
                  width: screenX(era.end) - screenX(era.start),
                }}
              >
                <span>{era.name}</span>
              </div>
            ))}
            <div
              className="axis-line"
              style={{
                left: screenX(archive.timeline.start),
                width:
                  screenX(archive.timeline.end) -
                  screenX(archive.timeline.start),
              }}
            />
            {ticks.map((tick) => (
              <div
                className="axis-tick"
                key={tick}
                style={{ left: screenX(tick) }}
              >
                <span>{formatAxisYear(tick)}</span>
              </div>
            ))}
            {zone && (
              <div
                className="unknown-zone"
                style={{
                  left: screenX(archive.timeline.start),
                  width: screenX(zone.before) - screenX(archive.timeline.start),
                }}
              >
                <strong>Unknown</strong>
                <small>
                  Over {Math.abs(zone.before).toLocaleString("en-US")} years ago
                </small>
              </div>
            )}
            {archive.timeline.breaks.map((item) => (
              <div
                className="timeline-break"
                key={`${item.start}-${item.end}`}
                style={{
                  left: screenX(item.start),
                  width: screenX(item.end) - screenX(item.start),
                }}
              >
                <span>∿</span>
                <small>{item.label}</small>
              </div>
            ))}
            <svg
              className="relation-overlay"
              width={viewportWidth}
              height={surfaceHeight}
              aria-hidden="true"
            >
              {activeId &&
                archive.eventRelations
                  .filter(
                    (relation) =>
                      relation.fromId === activeId ||
                      relation.toId === activeId,
                  )
                  .map((relation) => {
                    const from = positions.get(relation.fromId);
                    const to = positions.get(relation.toId);
                    if (from === undefined || to === undefined) return null;
                    const x1 = transform.applyX(from);
                    const x2 = transform.applyX(to);
                    const curveY =
                      axisY - 44 - Math.min(70, Math.abs(x2 - x1) / 9);
                    return (
                      <path
                        key={relation.id}
                        d={`M ${x1} ${axisY} Q ${(x1 + x2) / 2} ${curveY} ${x2} ${axisY}`}
                      />
                    );
                  })}
            </svg>
            {placed.map((event) => {
              const x = transform.applyX(positions.get(event.id) ?? 0);
              const rangeWidth =
                !event.ancient && event.end !== null && event.end !== undefined
                  ? screenX(event.end) - x
                  : 0;
              return (
                <div
                  className={`event-position ${focusCharacterId && !event.characterIds.includes(focusCharacterId) && !connectedIds.has(event.id) ? "is-muted" : ""} ${activeId === event.id || connectedIds.has(event.id) ? "is-related" : ""}`}
                  key={event.id}
                  style={
                    {
                      left: x,
                      "--card-top": `${CARD_TOP + (layout.laneById.get(event.id) ?? 0) * ROW_HEIGHT}px`,
                      "--card-height": `${CARD_HEIGHT}px`,
                    } as CSSProperties
                  }
                >
                  <div className={`event-stem stem-${event.accent}`} />
                  <span className={`event-node node-${event.accent}`} />
                  {event.kind === "range" && (
                    <div
                      className={`event-range range-${event.accent}`}
                      style={{ width: rangeWidth }}
                    />
                  )}
                  <button
                    className={`event-card card-${event.accent}${event.image ? " has-image" : ""}${event.draft ? " is-draft" : ""}`}
                    onClick={() => onSelect(event.id)}
                    onMouseEnter={() => setHoveredId(event.id)}
                    onMouseLeave={() => setHoveredId("")}
                    onFocus={() => setHoveredId(event.id)}
                    onBlur={() => setHoveredId("")}
                  >
                    {event.image && (
                      <img className="event-image" src={event.image} alt="" />
                    )}
                    <span className="event-card-body">
                      <span className="event-era">
                        {event.era} <ArrowUpRight size={13} />
                      </span>
                      <strong>{event.title}</strong>
                      <span className="event-summary">{event.summary}</span>
                      <span
                        className={`certainty-badge certainty-${event.loreStatus}`}
                      >
                        {loreLabels[event.loreStatus]}
                      </span>
                      {event.draft && (
                        <span className="draft-badge">Draft</span>
                      )}
                      <span className="event-date">
                        {event.start === null && zone
                          ? formatUnknownZone(zone.before)
                          : formatTimelineYear(event.start ?? 0)}
                        {!event.ancient &&
                          event.end !== null &&
                          event.end !== undefined &&
                          " — range"}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="timeline-footer">
          <span>
            ○ Point event <span className="legend-line" /> Range event{" "}
            <span className="legend-break">∿</span> Compressed interval
          </span>
          <span>
            {footnote ??
              (archive.sample
                ? "Illustrative dates · mock data"
                : "Published records")}
          </span>
        </div>
      </div>
      {events.length === 0 && (
        <div className="explorer-empty">
          <h3>No records in this view</h3>
          <p>Change the search or filters to see more of the chronicle.</p>
        </div>
      )}
      {undated.length > 0 && (
        <div className="undated-records">
          <h3>Time unknown</h3>
          <p>These events have no reliable position on the timeline.</p>
          <div>
            {undated.map((event) => (
              <button key={event.id} onClick={() => onSelect(event.id)}>
                <span>{event.era}</span>
                <strong>{event.title}</strong>
                <span>
                  {event.draft ? "Draft · " : ""}
                  {loreLabels[event.loreStatus]} →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
