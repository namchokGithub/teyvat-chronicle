import { useState } from "react";
import { AppSelect } from "@/components/AppSelect";
import type { TimelineEvent } from "../../timeline/model";
import type { PublicArchive } from "./archive";

type Mode = "relationships" | "compare" | "story";

function EventButton({
  event,
  onSelect,
}: {
  event: TimelineEvent;
  onSelect: (id: string) => void;
}) {
  return (
    <button className="advanced-event" onClick={() => onSelect(event.id)}>
      <span>{event.era}</span>
      <strong>{event.title}</strong>
      <span>{event.summary}</span>
    </button>
  );
}

export function AdvancedExplorer({
  archive,
  events,
  storyEvents,
  onSelect,
}: {
  archive: PublicArchive;
  events: TimelineEvent[];
  storyEvents: TimelineEvent[];
  onSelect: (id: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("relationships");
  const [seedId, setSeedId] = useState("");
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [storyIndex, setStoryIndex] = useState(0);
  const visibleIds = new Set(events.map((event) => event.id));
  const seed = events.find((event) => event.id === seedId);
  const links = seed
    ? archive.eventRelations
        .filter(
          (relation) =>
            relation.fromId === seed.id || relation.toId === seed.id,
        )
        .map((relation) => ({
          relation,
          event: events.find(
            (item) =>
              item.id ===
              (relation.fromId === seed.id ? relation.toId : relation.fromId),
          ),
        }))
        .filter((item) => item.event && visibleIds.has(item.event.id))
    : [];
  const left = archive.characters.find((item) => item.id === leftId);
  const right = archive.characters.find((item) => item.id === rightId);
  const leftEvents = left
    ? events.filter((event) => event.characterIds.includes(left.id))
    : [];
  const rightEvents = right
    ? events.filter((event) => event.characterIds.includes(right.id))
    : [];
  const sharedIds = new Set(
    leftEvents
      .filter((event) => rightEvents.some((item) => item.id === event.id))
      .map((event) => event.id),
  );
  const currentStoryIndex = Math.min(storyIndex, storyEvents.length - 1);
  const story = storyEvents[currentStoryIndex];

  return (
    <section className="advanced-explorer" aria-labelledby="advanced-title">
      <div className="advanced-heading">
        <div>
          <p className="eyebrow">Explore further</p>
          <h2 id="advanced-title">Follow the threads</h2>
        </div>
        <p>
          Trace a connection, compare two lives, or read the record in order.
        </p>
      </div>
      <div className="advanced-tabs" role="group" aria-label="Explore mode">
        {(
          [
            ["relationships", "Relationships"],
            ["compare", "Compare characters"],
            ["story", "Story mode"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className={mode === value ? "active" : ""}
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "relationships" && (
        <div className="advanced-body">
          <label className="advanced-select">
            Start with an event
            <AppSelect
              value={seedId}
              onValueChange={setSeedId}
              options={[
                { value: "", label: "Choose an event" },
                ...events.map((event) => ({
                  value: event.id,
                  label: event.title,
                })),
              ]}
            />
          </label>
          {seed ? (
            <div className="advanced-columns">
              <div>
                <h3>{seed.title}</h3>
                <p>{seed.summary}</p>
                {seed.characterIds.length > 0 && (
                  <p>
                    Characters:{" "}
                    {seed.characterIds
                      .map(
                        (id) =>
                          archive.characters.find((item) => item.id === id)
                            ?.name ?? id,
                      )
                      .join(", ")}
                  </p>
                )}
                <button
                  className="advanced-action"
                  onClick={() => onSelect(seed.id)}
                >
                  Read event details
                </button>
              </div>
              <div>
                <h3>Connected events</h3>
                {links.length ? (
                  links.map(
                    ({ relation, event }) =>
                      event && (
                        <div className="advanced-link" key={relation.id}>
                          <small>
                            {relation.relation} · {relation.importance}
                          </small>
                          <EventButton event={event} onSelect={onSelect} />
                        </div>
                      ),
                  )
                ) : (
                  <p>
                    No visible event connections. Change the spoiler settings to
                    reveal more of the archive.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="advanced-empty">
              Choose an event to see its published connections.
            </p>
          )}
        </div>
      )}
      {mode === "compare" && (
        <div className="advanced-body">
          <div className="advanced-pickers">
            {(
              [
                [leftId, setLeftId, "First character"],
                [rightId, setRightId, "Second character"],
              ] as const
            ).map(([value, setValue, label]) => (
              <label className="advanced-select" key={label}>
                {label}
                <AppSelect
                  value={value}
                  onValueChange={setValue}
                  options={[
                    { value: "", label: "Choose a character" },
                    ...archive.characters.map((item) => ({
                      value: item.id,
                      label: item.name,
                    })),
                  ]}
                />
              </label>
            ))}
          </div>
          {left && right ? (
            left.id === right.id ? (
              <p className="advanced-empty">
                Choose two different characters to compare their timelines.
              </p>
            ) : (
              <>
                <p className="advanced-summary">
                  {sharedIds.size} shared{" "}
                  {sharedIds.size === 1 ? "event" : "events"} in the visible
                  archive
                </p>
                <div className="advanced-columns">
                  {(
                    [
                      [left, leftEvents],
                      [right, rightEvents],
                    ] as const
                  ).map(([character, characterEvents]) => (
                    <div key={character.id}>
                      <h3>{character.name}</h3>
                      <p>{characterEvents.length} visible events</p>
                      <div className="advanced-list">
                        {characterEvents.map((event) => (
                          <div key={event.id}>
                            {sharedIds.has(event.id) && (
                              <small>Shared event</small>
                            )}
                            <EventButton event={event} onSelect={onSelect} />
                          </div>
                        ))}
                        {characterEvents.length === 0 && (
                          <p>No visible events for this character.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : (
            <p className="advanced-empty">
              Choose two characters to compare their visible events.
            </p>
          )}
        </div>
      )}
      {mode === "story" && (
        <div className="advanced-body">
          {story ? (
            <div className="story-card">
              <span className="eyebrow">
                Record {currentStoryIndex + 1} / {storyEvents.length}
              </span>
              <h3>{story.title}</h3>
              <p>{story.summary}</p>
              <p>
                {story.start === null && !story.ancient
                  ? "Time unknown"
                  : story.era}
              </p>
              <div className="story-actions">
                <button
                  disabled={currentStoryIndex <= 0}
                  onClick={() => setStoryIndex(currentStoryIndex - 1)}
                >
                  Previous
                </button>
                <button
                  className="advanced-action"
                  onClick={() => onSelect(story.id)}
                >
                  Read details
                </button>
                <button
                  disabled={currentStoryIndex >= storyEvents.length - 1}
                  onClick={() => setStoryIndex(currentStoryIndex + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <p className="advanced-empty">
              No visible events to read. Adjust your filters or spoiler
              settings.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
