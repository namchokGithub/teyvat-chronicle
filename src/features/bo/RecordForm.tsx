import { recordTitle } from "../../content/templates";
import type { CollectionName, ContentRecord } from "../../content/schema";
import {
  applyAutoId,
  getField,
  setField,
  type DraftRecord,
  type FieldPath,
} from "./formModel";

type References = Partial<Record<CollectionName, ContentRecord[]>>;
type EntityType = "event" | "character" | "era" | "region";

const entityCollections: Record<EntityType, CollectionName> = {
  event: "events",
  character: "characters",
  era: "eras",
  region: "regions",
};

export function RecordForm({
  collection,
  value,
  references,
  existing,
  onChange,
}: {
  collection: CollectionName;
  value: DraftRecord;
  references: References;
  existing: boolean;
  onChange: (next: DraftRecord) => void;
}) {
  const read = (path: FieldPath) => getField(value, path);
  const write = (path: FieldPath, next: unknown) => {
    const updated = setField(value, path, next);
    onChange(existing ? updated : applyAutoId(collection, value, updated));
  };
  const text = (path: FieldPath) => String(read(path) ?? "");

  function input(
    label: string,
    path: FieldPath,
    options: {
      type?: string;
      multiline?: boolean;
      hint?: string;
      disabled?: boolean;
    } = {},
  ) {
    return (
      <label className="bo-form-field" key={path.join(".")}>
        <span>{label}</span>
        {options.multiline ? (
          <textarea
            className="resize-none"
            value={text(path)}
            onChange={(event) => write(path, event.target.value)}
            rows={4}
            disabled={options.disabled}
          />
        ) : (
          <input
            type={options.type ?? "text"}
            value={text(path)}
            onChange={(event) => write(path, event.target.value)}
            disabled={options.disabled}
            step={options.type === "number" ? "any" : undefined}
          />
        )}
        {options.hint && <small>{options.hint}</small>}
      </label>
    );
  }

  function choice(label: string, path: FieldPath, options: readonly string[]) {
    return (
      <label className="bo-form-field" key={path.join(".")}>
        <span>{label}</span>
        <select
          value={text(path)}
          onChange={(event) => write(path, event.target.value)}
        >
          {options.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function singleReference(
    label: string,
    path: FieldPath,
    target: CollectionName,
    empty = "Choose a record",
  ) {
    const current = text(path);
    const records = references[target] ?? [];
    return (
      <label className="bo-form-field" key={path.join(".")}>
        <span>{label}</span>
        <select
          value={current}
          onChange={(event) => write(path, event.target.value)}
        >
          <option value="">{empty}</option>
          {current && !records.some((item) => item.id === current) && (
            <option value={current}>{current} · unavailable in list</option>
          )}
          {records.map((item) => (
            <option key={item.id} value={item.id}>
              {recordTitle(item)} · {item.id}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function multipleReferences(
    label: string,
    path: FieldPath,
    target: CollectionName,
  ) {
    const selected = Array.isArray(read(path)) ? (read(path) as string[]) : [];
    const records = references[target] ?? [];
    const missing = selected.filter(
      (id) => !records.some((item) => item.id === id),
    );
    return (
      <fieldset className="bo-reference-field" key={path.join(".")}>
        <legend>{label}</legend>
        <div className="bo-reference-options">
          {[
            ...records.map((item) => ({
              id: item.id,
              label: recordTitle(item),
            })),
            ...missing.map((id) => ({
              id,
              label: `${id} · unavailable in list`,
            })),
          ].map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={(event) =>
                  write(
                    path,
                    event.target.checked
                      ? [...selected, item.id]
                      : selected.filter((id) => id !== item.id),
                  )
                }
              />
              <span>{item.label}</span>
              <small>{item.id}</small>
            </label>
          ))}
          {records.length === 0 && missing.length === 0 && (
            <p>No {target} records yet.</p>
          )}
        </div>
      </fieldset>
    );
  }

  function localized(label: string, path: FieldPath, multiline = false) {
    return (
      <fieldset className="bo-form-group">
        <legend>{label}</legend>
        <div className="bo-form-grid">
          {input("English", [...path, "en"], { multiline })}
          {input("Thai (optional)", [...path, "th"], { multiline })}
        </div>
      </fieldset>
    );
  }

  function sortOrder() {
    return input("Sort order", ["sortOrder"], { type: "number" });
  }

  const breaks = read(["breaks"]);
  const breakItems = Array.isArray(breaks) ? breaks : [];
  const fromType = text(["fromType"]) as EntityType;
  const toType = text(["toType"]) as EntityType;

  return (
    <div className="bo-form">
      <div className="bo-form-grid">
        {input("ID", ["id"], {
          disabled: existing,
          hint: "Generated from the English title until you edit it. Lowercase letters, numbers, and hyphens. ID cannot change after saving.",
        })}
        <div className="bo-form-status">
          <span>Status</span>
          <strong>{text(["status"]) || "private"}</strong>
          <small>Use Save, Publish, or Move to draft below.</small>
        </div>
      </div>

      {collection === "timelines" && (
        <>
          {localized("Title", ["title"])}
          {localized("Description", ["description"], true)}
          <fieldset className="bo-form-group">
            <legend>Time axis</legend>
            <div className="bo-form-grid">
              {input("Start year", ["start"], { type: "number" })}
              {input("End year", ["end"], { type: "number" })}
              {input("Lane count", ["laneCount"], {
                type: "number",
                hint: "1–12; cards may use extra rows when dates are crowded.",
              })}
              {sortOrder()}
            </div>
          </fieldset>
          <fieldset className="bo-form-group">
            <legend>Timeline breaks</legend>
            <p className="bo-form-note">
              Breaks compress quiet intervals while keeping a marker on the
              axis.
            </p>
            {breakItems.map((_, index) => (
              <div className="bo-break" key={index}>
                <div className="bo-break-head">
                  <strong>Break {index + 1}</strong>
                  <button
                    type="button"
                    className="bo-secondary"
                    onClick={() =>
                      write(
                        ["breaks"],
                        breakItems.filter(
                          (__, itemIndex) => itemIndex !== index,
                        ),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
                <div className="bo-form-grid">
                  {input("Start year", ["breaks", index, "start"], {
                    type: "number",
                  })}
                  {input("End year", ["breaks", index, "end"], {
                    type: "number",
                  })}
                  {input("Display width (px)", ["breaks", index, "width"], {
                    type: "number",
                  })}
                  {input("Label", ["breaks", index, "label"])}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="bo-secondary"
              onClick={() => {
                const start = Number(read(["start"])) || 0;
                write(
                  ["breaks"],
                  [
                    ...breakItems,
                    {
                      start,
                      end: start + 1,
                      width: 80,
                      label: "Quiet interval",
                    },
                  ],
                );
              }}
            >
              Add break
            </button>
          </fieldset>
        </>
      )}

      {collection === "events" && (
        <>
          {localized("Title", ["title"])}
          {localized("Description", ["description"], true)}
          <fieldset className="bo-form-group">
            <legend>Time and interpretation</legend>
            <div className="bo-form-grid">
              <label className="bo-form-field">
                <span>Event type</span>
                <select
                  value={text(["type"])}
                  onChange={(event) => {
                    let next = setField(value, ["type"], event.target.value);
                    if (event.target.value === "point")
                      next = setField(next, ["time", "end"], null);
                    if (
                      event.target.value === "range" &&
                      read(["time", "end"]) == null
                    )
                      next = setField(
                        next,
                        ["time", "end"],
                        String((Number(read(["time", "start"])) || 0) + 1),
                      );
                    onChange(next);
                  }}
                >
                  <option value="point">point</option>
                  <option
                    value="range"
                    disabled={text(["time", "type"]) === "unknown"}
                  >
                    range
                  </option>
                </select>
              </label>
              <label className="bo-form-field">
                <span>Date precision</span>
                <select
                  value={text(["time", "type"])}
                  onChange={(event) => {
                    let next = setField(
                      value,
                      ["time", "type"],
                      event.target.value,
                    );
                    if (event.target.value === "unknown") {
                      next = setField(next, ["time", "start"], null);
                      next = setField(next, ["time", "end"], null);
                      next = setField(next, ["type"], "point");
                    } else if (read(["time", "start"]) == null) {
                      next = setField(next, ["time", "start"], "0");
                    }
                    onChange(next);
                  }}
                >
                  <option value="exact">exact</option>
                  <option value="approximate">approximate</option>
                  <option value="unknown">unknown</option>
                </select>
              </label>
              {text(["time", "type"]) !== "unknown" &&
                input("Start year", ["time", "start"], { type: "number" })}
              {text(["time", "type"]) !== "unknown" &&
                input("End year (required for range)", ["time", "end"], {
                  type: "number",
                })}
              {input("Time reference", ["time", "reference"], {
                hint: "A note identifying how the date was estimated.",
              })}
              {choice(
                "Date confidence",
                ["time", "confidence"],
                ["high", "medium", "low"],
              )}
              {choice(
                "Lore certainty",
                ["loreStatus"],
                ["confirmed", "inferred", "theory"],
              )}
              {choice("Spoiler level", ["spoilerLevel"], ["0", "1", "2", "3"])}
              <label className="bo-form-field">
                <span>Required quest IDs</span>
                <input
                  value={(Array.isArray(read(["requiredQuestIds"]))
                    ? (read(["requiredQuestIds"]) as string[])
                    : []
                  ).join(", ")}
                  onChange={(event) =>
                    write(
                      ["requiredQuestIds"],
                      event.target.value
                        .split(",")
                        .map((id) => id.trim())
                        .filter(Boolean),
                    )
                  }
                />
                <small>
                  Comma separated lowercase IDs; leave empty for no quest gate.
                </small>
              </label>
              {sortOrder()}
            </div>
          </fieldset>
          <fieldset className="bo-form-group">
            <legend>Card display</legend>
            <div className="bo-form-grid">
              {choice(
                "Card variant",
                ["display", "variant"],
                ["standard", "image-card"],
              )}
              {input("Image path or HTTPS URL", ["display", "image"])}
              {input("Icon path or URL", ["display", "icon"])}
              {input("Color hex", ["display", "color"], {
                hint: "Example: #B8A5DD",
              })}
              {choice(
                "Line style",
                ["display", "lineStyle"],
                ["solid", "dashed"],
              )}
              {input("Preferred lane", ["display", "lane"], { type: "number" })}
            </div>
          </fieldset>
          <fieldset className="bo-form-group">
            <legend>Linked records</legend>
            <div className="bo-reference-grid">
              {multipleReferences("Timelines", ["timelineIds"], "timelines")}
              {multipleReferences("Sources", ["sourceIds"], "sources")}
              {multipleReferences("Characters", ["characterIds"], "characters")}
              {multipleReferences("Eras", ["eraIds"], "eras")}
              {multipleReferences("Regions", ["regionIds"], "regions")}
            </div>
          </fieldset>
        </>
      )}

      {collection === "characters" && (
        <>
          {localized("Name", ["name"])}
          {localized("Biography", ["biography"], true)}
          <div className="bo-form-grid">
            {input("Image path or HTTPS URL", ["image"])}
            {sortOrder()}
          </div>
          <div className="bo-reference-grid">
            {multipleReferences("Regions", ["regionIds"], "regions")}
            {multipleReferences("Sources", ["sourceIds"], "sources")}
          </div>
        </>
      )}

      {collection === "eras" && (
        <>
          {localized("Name", ["name"])}
          {localized("Description", ["description"], true)}
          <div className="bo-form-grid">
            {input("Start year (optional)", ["start"], { type: "number" })}
            {input("End year (optional)", ["end"], { type: "number" })}
            {sortOrder()}
          </div>
        </>
      )}

      {collection === "regions" && (
        <>
          {localized("Name", ["name"])}
          {localized("Description", ["description"], true)}
          <div className="bo-form-grid">
            {input("Image path or HTTPS URL", ["image"])}
            {sortOrder()}
          </div>
        </>
      )}

      {collection === "sources" && (
        <div className="bo-form-grid">
          {input("Title", ["title"])}
          {choice(
            "Source type",
            ["kind"],
            ["quest", "book", "dialogue", "official", "other"],
          )}
          {input("HTTPS URL (optional)", ["url"], { type: "url" })}
          {input("Notes", ["note"], { multiline: true })}
          {sortOrder()}
        </div>
      )}

      {collection === "relationships" && (
        <>
          <div className="bo-form-grid">
            <label className="bo-form-field">
              <span>From type</span>
              <select
                value={fromType}
                onChange={(event) =>
                  onChange(
                    setField(
                      setField(value, ["fromType"], event.target.value),
                      ["fromId"],
                      "",
                    ),
                  )
                }
              >
                {Object.keys(entityCollections).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            {singleReference(
              "From record",
              ["fromId"],
              entityCollections[fromType] ?? "events",
            )}
            <label className="bo-form-field">
              <span>To type</span>
              <select
                value={toType}
                onChange={(event) =>
                  onChange(
                    setField(
                      setField(value, ["toType"], event.target.value),
                      ["toId"],
                      "",
                    ),
                  )
                }
              >
                {Object.keys(entityCollections).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            {singleReference(
              "To record",
              ["toId"],
              entityCollections[toType] ?? "events",
            )}
            {input("Relationship", ["relation"], {
              hint: "Example: participant, predecessor, or related history.",
            })}
            {choice(
              "Importance",
              ["importance"],
              ["major", "supporting", "minor"],
            )}
            {sortOrder()}
          </div>
        </>
      )}

      {collection === "settings" && (
        <div className="bo-form-grid">
          {choice("Theme", ["theme"], ["dark", "light"])}
          {singleReference(
            "Default timeline",
            ["defaultTimelineId"],
            "timelines",
            "No default timeline",
          )}
          {input("Accent color hex", ["accentColor"], {
            hint: "Example: #B8A5DD",
          })}
        </div>
      )}
    </div>
  );
}
