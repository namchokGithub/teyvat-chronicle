import * as Dialog from "@radix-ui/react-dialog";
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
  Compass,
  Grip,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { mockTimeline } from "./timeline/mock-data";
import type { TimelineEvent } from "./timeline/model";
import {
  createTimelineProjection,
  formatTimelineYear,
} from "./timeline/projection";

const CONTENT_WIDTH = 1840;
const projection = createTimelineProjection(
  mockTimeline.start,
  mockTimeline.end,
  CONTENT_WIDTH,
  mockTimeline.breaks,
);
const ticks = Array.from({ length: 12 }, (_, index) => -5500 + index * 500);
const lanes = [100, 250, 500];

function EventDialog({
  event,
  onClose,
}: {
  event: TimelineEvent | null;
  onClose: () => void;
}) {
  return (
    <Dialog.Root
      open={event !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content"
          aria-describedby="event-description"
        >
          {event && (
            <>
              <div className="dialog-topline">
                <span className="eyebrow">The chronicle / {event.era}</span>
                <Dialog.Close
                  className="icon-button dialog-close"
                  aria-label="Close event details"
                >
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
              <p className="dialog-time">
                {formatTimelineYear(event.start)}
                {event.end !== undefined &&
                  ` — ${formatTimelineYear(event.end)}`}
                {event.precision === "approximate" && " · approximate"}
              </p>
              <Dialog.Description
                id="event-description"
                className="dialog-description"
              >
                {event.detail}
              </Dialog.Description>
              <div className="dialog-note">
                Sample chronology · not verified lore
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Timeline() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(
    null,
  );
  const [viewportWidth, setViewportWidth] = useState(1100);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) =>
      setViewportWidth(entry.contentRect.width),
    );
    observer.observe(viewport);

    const behavior = zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.72, 3])
      .filter((event) => !(event.target as Element).closest("button"))
      .on("zoom", (event) => setTransform(event.transform));
    zoomRef.current = behavior;
    const selection = select<HTMLDivElement, unknown>(viewport);
    selection.call(behavior);
    selection.call(behavior.transform, zoomIdentity.translate(-340, 0));

    return () => {
      observer.disconnect();
      selection.on(".zoom", null);
      zoomRef.current = null;
    };
  }, []);

  const screenX = (time: number) => transform.applyX(projection.x(time));
  const zoomBy = (factor: number) => {
    const viewport = viewportRef.current;
    const behavior = zoomRef.current;
    if (viewport && behavior)
      select(viewport).call(behavior.scaleBy, factor, [viewportWidth / 2, 0]);
  };
  const reset = () => {
    const viewport = viewportRef.current;
    const behavior = zoomRef.current;
    if (viewport && behavior)
      select(viewport).call(
        behavior.transform,
        zoomIdentity.translate(-340, 0),
      );
  };
  const shiftBy = (amount: number) => {
    const viewport = viewportRef.current;
    const behavior = zoomRef.current;
    if (viewport && behavior)
      select(viewport).call(behavior.translateBy, amount / transform.k, 0);
  };

  return (
    <section
      className="timeline-section"
      id="timeline"
      aria-labelledby="timeline-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">01 / The passage of time</p>
          <h2 id="timeline-title">A world in fragments</h2>
          <p className="section-intro">
            Follow the surviving traces. Select a moment to read its place in
            the record.
          </p>
        </div>
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
            onClick={() => zoomBy(1 / 1.3)}
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
            onClick={() => zoomBy(1.3)}
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
          <span>
            <span className="live-dot" /> World timeline
          </span>
          <span>
            <Grip size={14} /> Drag to explore · scroll to zoom
          </span>
        </div>
        <div
          className="timeline-viewport"
          ref={viewportRef}
          tabIndex={0}
          aria-label="Interactive timeline. Use the controls above to pan or zoom, then Tab to explore events."
        >
          <div className="timeline-surface" style={{ width: viewportWidth }}>
            <div
              className="era-band era-ancient"
              style={{
                left: screenX(-5600),
                width: screenX(-2850) - screenX(-5600),
              }}
            >
              <span>Ancient Teyvat</span>
            </div>
            <div
              className="era-band era-gods"
              style={{
                left: screenX(-2850),
                width: screenX(-1000) - screenX(-2850),
              }}
            >
              <span>Age of gods</span>
            </div>
            <div
              className="era-band era-recent"
              style={{
                left: screenX(-1000),
                width: screenX(100) - screenX(-1000),
              }}
            >
              <span>Recent history</span>
            </div>
            <div
              className="axis-line"
              style={{
                left: screenX(mockTimeline.start),
                width: screenX(mockTimeline.end) - screenX(mockTimeline.start),
              }}
            />
            {ticks.map((tick) => (
              <div
                className="axis-tick"
                key={tick}
                style={{ left: screenX(tick) }}
              >
                <span>
                  {tick === -500
                    ? "500 years ago"
                    : `${Math.abs(tick).toLocaleString("en-US")}y`}
                </span>
              </div>
            ))}
            {mockTimeline.breaks.map((item) => (
              <div
                className="timeline-break"
                key={item.start}
                style={{
                  left: screenX(item.start),
                  width: screenX(item.end) - screenX(item.start),
                }}
              >
                <span>∿</span>
                <small>{item.label}</small>
              </div>
            ))}
            {mockTimeline.events.map((event) => {
              const x = screenX(event.start);
              const rangeWidth =
                event.end !== undefined ? screenX(event.end) - x : 0;
              return (
                <div
                  className={`event-position lane-${event.lane}`}
                  key={event.id}
                  style={{ left: x, top: lanes[event.lane] }}
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
                    className={`event-card card-${event.accent}`}
                    onClick={() => setSelectedEvent(event)}
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
                      <span className="event-date">
                        {formatTimelineYear(event.start)}
                        {event.end !== undefined && " — range"}
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
          <span>Illustrative dates · mock data</span>
        </div>
      </div>
      <EventDialog
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </section>
  );
}

function PublicApp() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          href="#top"
          className="brand"
          aria-label="Teyvat Chronicle, back to top"
        >
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
              Every age leaves
              <br />
              <i>a trace.</i>
            </h1>
            <p className="hero-copy">
              Explore the stories, kingdoms, and turning points that shaped
              Teyvat. The first pages of this chronicle are open.
            </p>
            <a className="hero-link" href="#timeline">
              Explore the timeline <ArrowUpRight size={18} />
            </a>
          </div>
          <div className="hero-side-note">
            <span className="vertical-line" /> THE WORLD REMEMBERS
          </div>
          <div className="hero-bottom">
            <span>
              01 / {mockTimeline.events.length.toString().padStart(2, "0")}{" "}
              sample records
            </span>
            <span>
              Scroll to explore <span aria-hidden="true">↓</span>
            </span>
          </div>
        </section>
        <Timeline />
      </main>
      <footer className="site-footer">
        <span>✦ Teyvat Chronicle</span>
        <span>Phase 1 prototype · sample chronology</span>
        <a href="#bo">Back Office</a>
      </footer>
    </div>
  );
}

const BackOffice = lazy(() => import("./features/bo/BackOffice"));

export default function App() {
  const [isBackOffice, setIsBackOffice] = useState(
    window.location.hash === "#bo",
  );

  useEffect(() => {
    const onHashChange = () => setIsBackOffice(window.location.hash === "#bo");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return isBackOffice ? (
    <Suspense fallback={<div className="bo-gate">Loading Back Office…</div>}>
      <BackOffice />
    </Suspense>
  ) : (
    <PublicApp />
  );
}
