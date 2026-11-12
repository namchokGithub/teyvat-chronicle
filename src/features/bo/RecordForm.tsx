import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { AppSelect } from "@/components/AppSelect";
import { recordTitle } from "../../content/templates";
import type { CollectionName, ContentRecord } from "../../content/schema";
import {
  applyAutoId,
  errorFor,
  getField,
  setField,
  type DraftRecord,
  type FieldErrors,
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

function ImagePreview({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (!src.trim()) return null;
  if (failed)
    return <p className="bo-image-error">Image could not be loaded.</p>;
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="bo-image-preview"
          aria-label="View full image"
        >
          <img src={src} alt="" onError={() => setFailed(true)} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="bo-image-dialog">
          <div className="bo-image-dialog-top">
            <Dialog.Title>Image preview</Dialog.Title>
            <Dialog.Close aria-label="Close" className="icon-button">
              <X size={18} />
            </Dialog.Close>
          </div>
          <img src={src} alt="" />
          <Dialog.Description className="bo-image-dialog-source">
            <span>{src}</span>
            <a href={src} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} /> Open original
            </a>
          </Dialog.Description>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const YEAR_HINT =
  "Negative = years before present (\u2212500 = 500 years ago). 0 = present.";

export function RecordForm({
  collection,
  value,
  references,
  existing,
  errors,
  onChange,
}: {
  collection: CollectionName;
  value: DraftRecord;
  references: References;
  existing: boolean;
  errors: FieldErrors;
  onChange: (next: DraftRecord) => void;
}) {
  const read = (path: FieldPath) => getField(value, path);
  const write = (path: FieldPath, next: unknown) => {
    const updated = setField(value, path, next);
    onChange(existing ? updated : applyAutoId(collection, value, updated));
  };
  const text = (path: FieldPath) => String(read(path) ?? "");
  // unknown and ancient events carry no year, so year fields and ranges hide.
  const noYear = ["unknown", "ancient"].includes(text(["time", "type"]));

  /** Wrapper class, data path, ARIA state, and message for one field. */
  function fieldState(path: FieldPath, baseClass: string, required = false) {
    const key = path.join(".");
    const error = errorFor(errors, path);
    const errorId = `field-error-${key.replace(/\./g, "-")}`;
    return {
      wrapper: {
        className: error ? `${baseClass} bo-invalid` : baseClass,
        "data-path": key,
      },
      control: {
        "aria-invalid": error ? true : undefined,
        "aria-required": required || undefined,
        "aria-describedby": error ? errorId : undefined,
      },
      message: error ? (
        <small className="bo-field-error" id={errorId}>
          {error}
        </small>
      ) : null,
    };
  }

  function labelText(label: string, required = false) {
    return (
      <span>
        {label}
        {required && (
          <span className="bo-required" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </span>
    );
  }

  function input(
    label: string,
    path: FieldPath,
    options: {
      type?: string;
      multiline?: boolean;
      hint?: string;
      disabled?: boolean;
      required?: boolean;
      preview?: boolean;
    } = {},
  ) {
    const state = fieldState(path, "bo-form-field", options.required);
    return (
      <label {...state.wrapper} key={path.join(".")}>
        {labelText(label, options.required)}
        {options.multiline ? (
          <textarea
            className="resize-none"
            value={text(path)}
            onChange={(event) => write(path, event.target.value)}
            rows={4}
            disabled={options.disabled}
            {...state.control}
          />
        ) : (
          <input
            type={options.type ?? "text"}
            value={text(path)}
            onChange={(event) => write(path, event.target.value)}
            disabled={options.disabled}
            step={options.type === "number" ? "any" : undefined}
            {...state.control}
          />
        )}
        {state.message}
        {options.hint && <small>{options.hint}</small>}
        {options.preview && <ImagePreview key={text(path)} src={text(path)} />}
      </label>
    );
  }

  function color(label: string, path: FieldPath, hint: string) {
    const state = fieldState(path, "bo-form-field");
    const current = text(path);
    const valid = /^#[0-9a-fA-F]{6}$/.test(current);
    return (
      <label {...state.wrapper} key={path.join(".")}>
        {labelText(label)}
        <span className="bo-color-field">
          <input
            type="color"
            className={valid ? "bo-color-swatch" : "bo-color-swatch empty"}
            value={valid ? current.toLowerCase() : "#000000"}
            onChange={(event) => write(path, event.target.value)}
            aria-label={`${label} picker`}
          />
          <input
            type="text"
            value={current}
            onChange={(event) => write(path, event.target.value)}
            spellCheck={false}
            {...state.control}
          />
        </span>
        {state.message}
        <small>{hint}</small>
      </label>
    );
  }

  function choice(label: string, path: FieldPath, options: readonly string[]) {
    const state = fieldState(path, "bo-form-field");
    return (
      <label {...state.wrapper} key={path.join(".")}>
        {labelText(label)}
        <AppSelect
          value={text(path)}
          onValueChange={(next) => write(path, next)}
          options={options.map((item) => ({ value: item, label: item }))}
          invalid={!!state.control["aria-invalid"]}
          describedBy={state.control["aria-describedby"]}
        />
        {state.message}
      </label>
    );
  }

  function singleReference(
    label: string,
    path: FieldPath,
    target: CollectionName,
    empty = "Choose a record",
    required = false,
  ) {
    const current = text(path);
    const records = references[target] ?? [];
    const state = fieldState(path, "bo-form-field", required);
    return (
      <label {...state.wrapper} key={path.join(".")}>
        {labelText(label, required)}
        <AppSelect
          value={current}
          onValueChange={(next) => write(path, next)}
          options={[
            { value: "", label: empty },
            ...(current && !records.some((item) => item.id === current)
              ? [{ value: current, label: `${current} · unavailable in list` }]
              : []),
            ...records.map((item) => ({
              value: item.id,
              label: `${recordTitle(item)} · ${item.id}`,
            })),
          ]}
          invalid={!!state.control["aria-invalid"]}
          describedBy={state.control["aria-describedby"]}
          required={required}
        />
        {state.message}
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
    const state = fieldState(path, "bo-reference-field");
    return (
      <fieldset
        {...state.wrapper}
        aria-invalid={state.control["aria-invalid"]}
        aria-describedby={state.control["aria-describedby"]}
        key={path.join(".")}
      >
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
        {state.message}
      </fieldset>
    );
  }

  function localized(
    label: string,
    path: FieldPath,
    multiline = false,
    required = false,
  ) {
    return (
      <fieldset className="bo-form-group">
        <legend>{label}</legend>
        <div className="bo-form-grid">
          {input("English", [...path, "en"], { multiline, required })}
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
          required: true,
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
          {localized("Title", ["title"], false, true)}
          {localized("Description", ["description"], true)}
          <fieldset className="bo-form-group">
            <legend>Time axis</legend>
            <div className="bo-form-grid">
              {input("Start year", ["start"], {
                type: "number",
                required: true,
                hint: YEAR_HINT,
              })}
              {input("End year", ["end"], { type: "number", required: true })}
              {input("Lane count", ["laneCount"], {
                type: "number",
                required: true,
                hint: "1–12; cards may use extra rows when dates are crowded.",
              })}
              {input("Unknown before (year)", ["unknownBefore"], {
                type: "number",
                hint: "Older years collapse into one Unknown zone. Leave empty to turn it off.",
              })}
              {input("Unknown zone width (px)", ["unknownWidth"], {
                type: "number",
                required: true,
                hint: "80–1200. Widen it when the zone holds many cards.",
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
                    hint: YEAR_HINT,
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
          {localized("Title", ["title"], false, true)}
          {localized("Description", ["description"], true)}
          <fieldset className="bo-form-group">
            <legend>Time and interpretation</legend>
            <div className="bo-form-grid">
              <label className="bo-form-field">
                <span>Event type</span>
                <AppSelect
                  value={text(["type"])}
                  onValueChange={(type) => {
                    let next = setField(value, ["type"], type);
                    if (type === "point")
                      next = setField(next, ["time", "end"], null);
                    if (type === "range" && read(["time", "end"]) == null)
                      next = setField(
                        next,
                        ["time", "end"],
                        String((Number(read(["time", "start"])) || 0) + 1),
                      );
                    onChange(next);
                  }}
                  options={[
                    { value: "point", label: "point" },
                    {
                      value: "range",
                      label: "range",
                      disabled: noYear,
                    },
                  ]}
                />
              </label>
              <label className="bo-form-field">
                <span>Date precision</span>
                <AppSelect
                  value={text(["time", "type"])}
                  onValueChange={(precision) => {
                    let next = setField(value, ["time", "type"], precision);
                    if (precision === "unknown" || precision === "ancient") {
                      next = setField(next, ["time", "start"], null);
                      next = setField(next, ["time", "end"], null);
                      next = setField(next, ["type"], "point");
                    } else if (read(["time", "start"]) == null) {
                      next = setField(next, ["time", "start"], "0");
                    }
                    onChange(next);
                  }}
                  options={[
                    { value: "exact", label: "exact" },
                    { value: "approximate", label: "approximate" },
                    { value: "unknown", label: "unknown (no year)" },
                    {
                      value: "ancient",
                      label: "ancient (before the Unknown boundary)",
                    },
                  ]}
                />
              </label>
              {!noYear &&
                input("Start year", ["time", "start"], {
                  type: "number",
                  hint: YEAR_HINT,
                })}
              {!noYear &&
                input("End year (required for range)", ["time", "end"], {
                  type: "number",
                })}
              {input("Time reference", ["time", "reference"], {
                required: true,
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
              <label
                {...fieldState(["requiredQuestIds"], "bo-form-field").wrapper}
              >
                <span>Required quest IDs</span>
                <input
                  {...fieldState(["requiredQuestIds"], "bo-form-field").control}
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
                {fieldState(["requiredQuestIds"], "bo-form-field").message}
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
              {input("Image path or HTTPS URL", ["display", "image"], {
                preview: true,
              })}
              {input("Icon path or URL", ["display", "icon"], {
                preview: true,
              })}
              {color("Color", ["display", "color"], "Example: #B8A5DD")}
              {choice(
                "Line style",
                ["display", "lineStyle"],
                ["solid", "dashed"],
              )}
              {input("Preferred lane", ["display", "lane"], {
                type: "number",
                hint: "Row from 0 up to the timeline's lane count − 1.",
              })}
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
          {localized("Name", ["name"], false, true)}
          {localized("Biography", ["biography"], true)}
          <div className="bo-form-grid">
            {input("Image path or HTTPS URL", ["image"], { preview: true })}
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
          {localized("Name", ["name"], false, true)}
          {localized("Description", ["description"], true)}
          <div className="bo-form-grid">
            {input("Start year (optional)", ["start"], {
              type: "number",
              hint: YEAR_HINT,
            })}
            {input("End year (optional)", ["end"], { type: "number" })}
            {sortOrder()}
          </div>
        </>
      )}

      {collection === "regions" && (
        <>
          {localized("Name", ["name"], false, true)}
          {localized("Description", ["description"], true)}
          <div className="bo-form-grid">
            {input("Image path or HTTPS URL", ["image"], { preview: true })}
            {sortOrder()}
          </div>
        </>
      )}

      {collection === "sources" && (
        <div className="bo-form-grid">
          {input("Title", ["title"], { required: true })}
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
              <AppSelect
                value={fromType}
                onValueChange={(type) =>
                  onChange(
                    setField(
                      setField(value, ["fromType"], type),
                      ["fromId"],
                      "",
                    ),
                  )
                }
                options={Object.keys(entityCollections).map((item) => ({
                  value: item,
                  label: item,
                }))}
              />
            </label>
            {singleReference(
              "From record",
              ["fromId"],
              entityCollections[fromType] ?? "events",
              undefined,
              true,
            )}
            <label className="bo-form-field">
              <span>To type</span>
              <AppSelect
                value={toType}
                onValueChange={(type) =>
                  onChange(
                    setField(setField(value, ["toType"], type), ["toId"], ""),
                  )
                }
                options={Object.keys(entityCollections).map((item) => ({
                  value: item,
                  label: item,
                }))}
              />
            </label>
            {singleReference(
              "To record",
              ["toId"],
              entityCollections[toType] ?? "events",
              undefined,
              true,
            )}
            {input("Relationship", ["relation"], {
              required: true,
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
          {color("Accent color", ["accentColor"], "Example: #B8A5DD")}
        </div>
      )}
    </div>
  );
}
