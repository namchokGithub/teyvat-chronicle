import * as Dialog from "@radix-ui/react-dialog";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import type { FirebaseApp } from "firebase/app";
import {
  ArrowLeft,
  BookOpen,
  FilePlus2,
  Download,
  Upload,
  LogOut,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ZodError, type z } from "zod";
import {
  collectionLabels,
  draftTemplate,
  recordTitle,
} from "../../content/templates";
import {
  type CollectionName,
  type ContentRecord,
  type eventSchema,
  type timelineSchema,
} from "../../content/schema";
import {
  FirestoreContentStore,
  LocalContentStore,
  type ContentStore,
} from "../../content/store";
import { getFirebaseApp } from "../../lib/firebase";
import {
  exportSnapshot,
  importSnapshotAddOnly,
  parseSnapshot,
} from "../../content/transfer";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { RecordForm } from "./RecordForm";
import { buildPublishedArchive } from "../explorer/archive";
import { Timeline } from "../explorer/Timeline";
import {
  fieldErrors,
  normalizeFormRecord,
  pruneFieldErrors,
  type DraftRecord,
  type FieldErrors,
} from "./formModel";

const collections = Object.keys(collectionLabels) as CollectionName[];
type Section = CollectionName | "dashboard";
type Route = { section: Section; id: string | null };

// Back Office location lives in the hash: #bo, #bo/<collection>, or
// #bo/<collection>/<id>, so a refresh reopens the same list or record.
function readRoute(): Route {
  const [, name = "", id = ""] = window.location.hash.split("/");
  if (!collections.includes(name as CollectionName))
    return { section: "dashboard", id: null };
  return {
    section: name as CollectionName,
    id: id ? decodeURIComponent(id) : null,
  };
}

function routeHash({ section, id }: Route): string {
  if (section === "dashboard") return "#bo";
  return `#bo/${section}${id ? `/${encodeURIComponent(id)}` : ""}`;
}

const OWNER_KEY = "teyvat-chronicle:bo-owner";

function cachedOwner(): string | null {
  try {
    return window.localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function rememberOwner(uid: string | null) {
  try {
    if (uid) window.localStorage.setItem(OWNER_KEY, uid);
    else window.localStorage.removeItem(OWNER_KEY);
  } catch {
    // Storage unavailable: the owner check simply runs on every load.
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof ZodError)
    return error.issues
      .map((issue) => `${issue.path.join(".") || "record"}: ${issue.message}`)
      .join("\n");
  if (error instanceof SyntaxError)
    return "JSON is invalid. Check commas and quotation marks.";
  return error instanceof Error
    ? error.message
    : "The action could not be completed.";
}

type EventRecord = z.infer<typeof eventSchema>;
type TimelineRecord = z.infer<typeof timelineSchema>;

/** Titles of linked timelines whose start–end range does not hold the event dates. */
function outsideTimelines(
  event: EventRecord,
  timelines: TimelineRecord[],
): string[] {
  const { start, end, type } = event.time;
  const hasZone = (item: TimelineRecord) =>
    item.unknownBefore !== null && item.start < item.unknownBefore;
  const last = end ?? start;
  return timelines
    .filter((item) => {
      if (!event.timelineIds.includes(item.id)) return false;
      // Ancient events need an Unknown zone; dated ones older than the
      // boundary sit in the zone, so only the end of the axis can be passed.
      if (type === "ancient") return !hasZone(item);
      if (start === null || last === null) return false;
      const early =
        start < item.start && !(hasZone(item) && start < item.unknownBefore!);
      return early || last > item.end;
    })
    .map(
      (item) =>
        `"${item.title.en || item.id}" (${item.start.toLocaleString("en-US")} to ${item.end.toLocaleString("en-US")})`,
    );
}

function OverviewTimeline({
  references,
  onOpenEvent,
  onOpenTimelines,
}: {
  references: Partial<Record<CollectionName, ContentRecord[]>>;
  onOpenEvent: (id: string) => void;
  onOpenTimelines: () => void;
}) {
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [timelineId, setTimelineId] = useState("");
  const loaded = references.timelines !== undefined;
  const result = useMemo(() => {
    if (!loaded) return { archive: null, error: "" };
    const list = <T,>(name: CollectionName) =>
      (references[name] ?? []) as unknown as T;
    try {
      return {
        archive: buildPublishedArchive(
          {
            timelines: list("timelines"),
            events: list("events"),
            characters: list("characters"),
            eras: list("eras"),
            regions: list("regions"),
            sources: list("sources"),
            relationships: list("relationships"),
          },
          { includeDrafts, timelineId },
        ),
        error: "",
      };
    } catch (cause) {
      return { archive: null, error: errorMessage(cause) };
    }
  }, [loaded, references, includeDrafts, timelineId]);

  const heading = (
    <div>
      <h2 id="timeline-title" className="bo-timeline-title">
        Timeline preview
      </h2>
      <label className="bo-timeline-toggle">
        <input
          type="checkbox"
          checked={includeDrafts}
          onChange={(event) => setIncludeDrafts(event.target.checked)}
        />
        Include drafts
      </label>
    </div>
  );

  if (!loaded)
    return <p className="bo-timeline-note">Loading timeline preview…</p>;
  if (!result.archive)
    return (
      <div className="bo-timeline-empty">
        {heading}
        <p role={result.error ? "alert" : undefined}>
          {result.error ||
            (includeDrafts
              ? "Add a timeline to preview events here."
              : "No published timeline yet.")}
        </p>
        <button className="bo-secondary" onClick={onOpenTimelines}>
          Open timelines
        </button>
      </div>
    );
  return (
    <div className="bo-timeline-preview">
      <Timeline
        archive={result.archive}
        events={result.archive.timeline.events}
        view="world"
        onSelect={onOpenEvent}
        focusCharacterId=""
        selectedEventId=""
        heading={heading}
        onTimelineChange={setTimelineId}
        footnote={
          includeDrafts
            ? "Draft and published records · select a card to edit"
            : "Published records · select a card to edit"
        }
      />
    </div>
  );
}

function Editor({
  store,
  mode,
  onSignOut,
}: {
  store: ContentStore;
  mode: "local" | "firebase";
  onSignOut?: () => void;
}) {
  const [initialRoute] = useState(readRoute);
  const [section, setSection] = useState<Section>(initialRoute.section);
  // Record ID from the URL, opened once its section's list has loaded.
  const restoreId = useRef<string | null>(initialRoute.id);
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [counts, setCounts] = useState<Partial<Record<CollectionName, number>>>(
    {},
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftRecord, setDraftRecord] = useState<DraftRecord | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const pendingErrors = useRef<FieldErrors | null>(null);
  const [savedRecord, setSavedRecord] = useState<DraftRecord | null>(null);
  const [references, setReferences] = useState<
    Partial<Record<CollectionName, ContentRecord[]>>
  >({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(initialRoute.section !== "dashboard");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(draftRecord) !== JSON.stringify(savedRecord);

  useEffect(() => {
    let live = true;
    Promise.all(
      collections.map(async (name) => [name, await store.list(name)] as const),
    )
      .then((entries) => {
        if (live) setReferences(Object.fromEntries(entries));
      })
      .catch((cause) => {
        if (live) toast.error(errorMessage(cause));
      });
    return () => {
      live = false;
    };
  }, [store]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (section !== "dashboard") return;
    let live = true;
    Promise.all(
      collections.map(
        async (name) => [name, (await store.list(name)).length] as const,
      ),
    )
      .then((results) => {
        if (live) setCounts(Object.fromEntries(results));
      })
      .catch((cause) => {
        if (live) toast.error(errorMessage(cause));
      });
    return () => {
      live = false;
    };
  }, [section, store]);

  useEffect(() => {
    if (section === "dashboard") return;
    let live = true;
    store
      .list(section)
      .then((results) => {
        if (!live) return;
        const sorted = results.sort((a, b) => a.id.localeCompare(b.id));
        setItems(sorted);
        const wanted = restoreId.current;
        if (wanted === null) return;
        restoreId.current = null;
        const record = sorted.find((item) => item.id === wanted);
        if (record) openRecord(record);
        else
          window.history.replaceState(
            null,
            "",
            routeHash({ section, id: null }),
          );
      })
      .catch((cause) => {
        if (!live) return;
        restoreId.current = null;
        toast.error(errorMessage(cause));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [section, store]);

  // After a failed save renders its highlights: focus the first invalid
  // field and summarize the result, listing errors that have no field.
  useEffect(() => {
    const pending = pendingErrors.current;
    if (!pending) return;
    pendingErrors.current = null;
    const paths = [
      ...document.querySelectorAll<HTMLElement>(".bo-form [data-path]"),
    ].map((element) => element.dataset.path ?? "");
    const shown = (key: string) =>
      paths.some((path) => key === path || key.startsWith(`${path}.`));
    const highlighted = Object.keys(pending).filter(shown).length;
    const other = Object.entries(pending)
      .filter(([key]) => !shown(key))
      .map(([key, message]) =>
        key === "record" ? message : `${key}: ${message}`,
      );
    toast.error(
      [
        highlighted
          ? `Check ${highlighted} highlighted field${highlighted === 1 ? "" : "s"}.`
          : "",
        ...other,
      ]
        .filter(Boolean)
        .join("\n"),
    );
    const first = document.querySelector<HTMLElement>(
      ".bo-form .bo-invalid :is(input, textarea, button[role='combobox'])",
    );
    first?.focus({ preventScroll: true });
    first?.scrollIntoView({ block: "center" });
  }, [errors]);

  function showErrors(next: FieldErrors) {
    pendingErrors.current = next;
    setErrors(next);
  }

  function updateDraft(next: DraftRecord) {
    if (draftRecord)
      setErrors((current) => pruneFieldErrors(current, draftRecord, next));
    setDraftRecord(next);
  }

  // Keep the hash in step with the open section and record. Skipped while a
  // record from the URL is still loading, so its ID is not dropped.
  useEffect(() => {
    if (restoreId.current !== null) return;
    const hash = routeHash({ section, id: selectedId });
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  }, [section, selectedId]);

  // Browser back/forward: follow the hash unless the open record is dirty.
  useEffect(() => {
    const onHashChange = () => {
      const next = readRoute();
      const { hash } = window.location;
      if (hash !== "#bo" && !hash.startsWith("#bo/")) return;
      if (next.section === section && next.id === selectedId) return;
      if (dirty) {
        toast.error("Save or reset your changes before leaving this record.");
        window.history.replaceState(
          null,
          "",
          routeHash({ section, id: selectedId }),
        );
        return;
      }
      if (next.section !== section) {
        openSection(next.section, next.id);
        return;
      }
      const record = items.find((item) => item.id === next.id);
      if (record) openRecord(record);
      else closeRecord();
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  });

  function openSection(next: Section, id: string | null = null) {
    restoreId.current = next === "dashboard" ? null : id;
    setSection(next);
    setLoading(next !== "dashboard");
    setItems([]);
    closeRecord();
  }

  function openRecord(record: ContentRecord) {
    setSelectedId(record.id);
    setDraftRecord(record as DraftRecord);
    setSavedRecord(record as DraftRecord);
    setErrors({});
  }

  function closeRecord() {
    setSelectedId(null);
    setDraftRecord(null);
    setSavedRecord(null);
    setErrors({});
  }

  function navigate(next: Section) {
    if (dirty) {
      toast.error("Save or reset your changes before leaving this record.");
      return;
    }
    openSection(next);
  }

  function selectRecord(record: ContentRecord | null) {
    if (dirty) {
      toast.error("Save or reset your changes before opening another record.");
      return;
    }
    if (record) {
      openRecord(record);
      return;
    }
    const next = draftTemplate(section as CollectionName) as DraftRecord;
    setSelectedId(null);
    setDraftRecord(next);
    setSavedRecord(next);
    setErrors({});
  }

  async function refresh(collectionName: CollectionName) {
    const results = await store.list(collectionName);
    setItems(results.sort((a, b) => a.id.localeCompare(b.id)));
    setReferences((current) => ({ ...current, [collectionName]: results }));
  }

  async function saveRecord(nextStatus?: "draft" | "published") {
    if (section === "dashboard" || !draftRecord) return;
    setBusy(true);
    try {
      const candidate = normalizeFormRecord(section, draftRecord);
      const value: Record<string, unknown> = {
        ...candidate,
        ...(nextStatus ? { status: nextStatus } : {}),
      };
      if (selectedId !== null && value.id !== selectedId) {
        showErrors({
          id: "Record IDs cannot be renamed. Create a new record instead.",
        });
        return;
      }
      if (selectedId === null && items.some((item) => item.id === value.id)) {
        showErrors({
          id: "That ID already exists. Open the record or choose another ID.",
        });
        return;
      }
      const saved = await store.save(section, value);
      setSelectedId(saved.id);
      setDraftRecord(saved);
      setSavedRecord(saved);
      setErrors({});
      await refresh(section);
      toast.success(
        nextStatus === "published"
          ? "Record published."
          : nextStatus === "draft"
            ? "Record moved to draft."
            : "Record saved.",
      );
      if (section === "events") {
        const outside = outsideTimelines(
          saved as EventRecord,
          (references.timelines ?? []) as TimelineRecord[],
        );
        if (outside.length)
          toast.warning(
            (saved as EventRecord).time.type === "ancient"
              ? `${outside.join(", ")} has no Unknown zone, so this event is listed under "Time unknown".`
              : `Dates fall outside ${outside.join(", ")}. The card will sit at the timeline edge.`,
          );
      }
      window.scrollTo({ top: 0 });
    } catch (cause) {
      if (cause instanceof ZodError) showErrors(fieldErrors(cause));
      else toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function removeRecord() {
    if (section === "dashboard" || !deleteId) return;
    setBusy(true);
    try {
      await store.remove(section, deleteId);
      await refresh(section);
      if (selectedId === deleteId) {
        setSelectedId(null);
        setDraftRecord(null);
        setSavedRecord(null);
      }
      toast.success("Record deleted.");
      setDeleteId(null);
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function downloadBackup() {
    setBusy(true);
    try {
      const snapshot = await exportSnapshot(store);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(snapshot, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "teyvat-chronicle-backup.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Backup downloaded.");
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function uploadBackup(file: File) {
    setBusy(true);
    try {
      const snapshot = parseSnapshot(await file.text());
      const count = await importSnapshotAddOnly(store, snapshot);
      toast.success(
        mode === "local"
          ? `${count} records imported into the local sandbox.`
          : `${count} records imported into Firestore as saved.`,
      );
      // Reload every list so counts, linked-record pickers, and the
      // overview timeline include the imported records.
      const results = await Promise.all(
        collections.map(
          async (name) => [name, await store.list(name)] as const,
        ),
      );
      setReferences(Object.fromEntries(results));
      setCounts(
        Object.fromEntries(results.map(([name, list]) => [name, list.length])),
      );
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  const selectedStatus = draftRecord?.status;

  return (
    <>
      <Toaster />
      <div className="bo-shell">
        <aside className="bo-sidebar">
          <a
            className="bo-brand"
            href="#top"
            onClick={(event) => {
              if (dirty) {
                event.preventDefault();
                toast.error("Save or reset your changes before leaving.");
              }
            }}
          >
            ✦ TEYVAT CHRONICLE
          </a>
          <div className="bo-sidebar-label">Back Office</div>
          <nav aria-label="Back Office sections">
            <button
              className={section === "dashboard" ? "active" : ""}
              onClick={() => navigate("dashboard")}
            >
              Overview
            </button>
            {collections.map((name) => (
              <button
                key={name}
                className={section === name ? "active" : ""}
                onClick={() => navigate(name)}
              >
                {collectionLabels[name]}
              </button>
            ))}
          </nav>
          <div className="bo-sidebar-bottom">
            <span className={`bo-mode ${mode}`}>
              {mode === "local" ? "Local sandbox" : "Firebase connected"}
            </span>
            {onSignOut && (
              <button
                onClick={() => {
                  if (dirty)
                    toast.error(
                      "Save or reset your changes before signing out.",
                    );
                  else onSignOut();
                }}
              >
                <LogOut size={15} /> Sign out
              </button>
            )}
            <a
              href="#top"
              onClick={(event) => {
                if (dirty) {
                  event.preventDefault();
                  toast.error("Save or reset your changes before leaving.");
                }
              }}
            >
              <ArrowLeft size={15} /> Public timeline
            </a>
          </div>
        </aside>
        <main className="bo-main">
          <header className="bo-header">
            <div>
              <span className="bo-kicker">Chronicle management</span>
              <h1>
                {section === "dashboard"
                  ? "Overview"
                  : collectionLabels[section]}
              </h1>
            </div>
            <span className="bo-header-mode">
              {mode === "local"
                ? "Records stay in this browser"
                : "Owner access"}
            </span>
          </header>
          {mode === "local" && (
            <p className="bo-banner">
              Development sandbox: these records are stored only in this
              browser. They do not appear on the public timeline or in
              Firestore.
            </p>
          )}
          {section === "dashboard" ? (
            <div className="bo-dashboard">
              <p className="bo-lead">
                Manage draft and published lore records. Start with timelines
                and sources, then link events to them.
              </p>
              <div className="bo-transfer">
                <button
                  className="bo-secondary"
                  onClick={downloadBackup}
                  disabled={busy}
                >
                  <Download size={16} /> Download JSON backup
                </button>
                <button
                  className="bo-secondary"
                  onClick={() => importInputRef.current?.click()}
                  disabled={busy}
                >
                  <Upload size={16} /> Import new records
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="bo-transfer-input"
                  aria-label="Choose JSON backup to import"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadBackup(file);
                  }}
                />
                <p>
                  Import validates the whole backup and rejects IDs already in{" "}
                  {mode === "local" ? "this browser" : "Firestore"}. It writes
                  every record or none.
                </p>
              </div>
              <div className="bo-stat-grid">
                {collections.map((name) => (
                  <button
                    key={name}
                    onClick={() => navigate(name)}
                    className="bo-stat"
                  >
                    <span>{collectionLabels[name]}</span>
                    <strong>{counts[name] ?? "—"}</strong>
                    <span>Open records →</span>
                  </button>
                ))}
              </div>
              <OverviewTimeline
                references={references}
                onOpenEvent={(id) => openSection("events", id)}
                onOpenTimelines={() => navigate("timelines")}
              />
              <div className="bo-guidance">
                <BookOpen size={22} />
                <div>
                  <strong>Source of truth</strong>
                  <p>
                    Published events require at least one timeline and source.
                    Time precision and lore certainty are separate fields.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bo-workspace">
              <section
                className="bo-list"
                aria-label={`${collectionLabels[section]} records`}
              >
                <div className="bo-list-head">
                  <h2>Records</h2>
                  <button
                    className="bo-small-button"
                    onClick={() => selectRecord(null)}
                  >
                    <FilePlus2 size={15} /> New
                  </button>
                </div>
                {loading ? (
                  <p className="bo-empty">Loading records…</p>
                ) : items.length === 0 ? (
                  <p className="bo-empty">
                    No records yet. Create the first{" "}
                    {collectionLabels[section].toLowerCase()} record.
                  </p>
                ) : (
                  <ul>
                    {items.map((item) => (
                      <li key={item.id}>
                        <button
                          className={selectedId === item.id ? "selected" : ""}
                          onClick={() => selectRecord(item)}
                        >
                          <strong>
                            {section === "events" && "display" in item && (
                              <span
                                className="bo-color-dot"
                                style={{ background: item.display.color }}
                                aria-hidden="true"
                              />
                            )}
                            {recordTitle(item)}
                          </strong>
                          <small>{item.id}</small>
                          <span
                            className={`bo-status ${"status" in item ? item.status : "settings"}`}
                          >
                            {"status" in item ? item.status : "private"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="bo-editor" aria-label="Record editor">
                {draftRecord ? (
                  <>
                    <div className="bo-editor-head">
                      <div>
                        <span className="bo-kicker">
                          {selectedId ? "Editing record" : "New record"}
                        </span>
                        <h2>{selectedId ?? "Create record"}</h2>
                      </div>
                      {selectedId && (
                        <button
                          className="bo-danger"
                          onClick={() => setDeleteId(selectedId)}
                          disabled={busy}
                        >
                          <Trash2 size={15} /> Delete
                        </button>
                      )}
                    </div>
                    <p className="bo-editor-help">
                      Complete the fields below. Validation runs before saving;
                      published events need a source, timeline, and description.
                      {dirty && <strong> Unsaved changes.</strong>}
                    </p>
                    <form
                      noValidate
                      onSubmit={(event) => {
                        event.preventDefault();
                        void saveRecord();
                      }}
                    >
                      <RecordForm
                        collection={section}
                        value={draftRecord}
                        references={references}
                        existing={selectedId !== null}
                        errors={errors}
                        onChange={updateDraft}
                      />
                      <div className="bo-actions">
                        <button
                          type="button"
                          className="bo-secondary"
                          onClick={() => {
                            setDraftRecord(savedRecord);
                            setErrors({});
                          }}
                          disabled={!dirty || busy}
                        >
                          Reset changes
                        </button>
                        <button
                          type="submit"
                          className="bo-secondary"
                          disabled={busy}
                        >
                          <Save size={16} /> Save
                        </button>
                        {section !== "settings" &&
                          (selectedStatus === "published" ? (
                            <button
                              type="button"
                              className="bo-primary"
                              onClick={() => saveRecord("draft")}
                              disabled={busy}
                            >
                              Move to draft
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="bo-primary"
                              onClick={() => saveRecord("published")}
                              disabled={busy}
                            >
                              <Send size={16} /> Publish
                            </button>
                          ))}
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="bo-editor-placeholder">
                    <FilePlus2 size={27} />
                    <h2>Select a record</h2>
                    <p>Choose one from the list or create a new record.</p>
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
        <Dialog.Root
          open={deleteId !== null}
          onOpenChange={(open) => !open && setDeleteId(null)}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="bo-confirm">
              <div className="bo-confirm-top">
                <Dialog.Title>Delete this record?</Dialog.Title>
                <Dialog.Close aria-label="Close" className="icon-button">
                  <X size={18} />
                </Dialog.Close>
              </div>
              <Dialog.Description>
                This permanently removes <strong>{deleteId}</strong> from{" "}
                {mode === "local" ? "this browser" : "Firestore"}. Related
                records are not deleted automatically.
              </Dialog.Description>
              <div className="bo-actions">
                <Dialog.Close className="bo-secondary">Cancel</Dialog.Close>
                <button
                  className="bo-danger filled"
                  onClick={removeRecord}
                  disabled={busy}
                >
                  Delete record
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </>
  );
}

function FirebaseGate({ app }: { app: FirebaseApp }) {
  const auth = useMemo(() => getAuth(app), [app]);
  const store = useMemo(() => new FirestoreContentStore(app), [app]);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    let currentUid: string | null = null;
    const unsubscribe = onAuthStateChanged(
      auth,
      async (nextUser) => {
        if (!live) return;
        currentUid = nextUser?.uid ?? null;
        // A uid confirmed as owner on an earlier load opens the editor at
        // once; the owner document is still re-checked in the background.
        // Firestore rules remain the real access boundary.
        const trusted = !!nextUser && cachedOwner() === nextUser.uid;
        setUser(nextUser);
        setChecking(!!nextUser && !trusted);
        setIsOwner(trusted);
        setError("");
        if (!nextUser) rememberOwner(null);
        if (nextUser) {
          try {
            const owner = await getDoc(
              doc(getFirestore(app), "owners", nextUser.uid),
            );
            if (live && currentUid === nextUser.uid) {
              setIsOwner(owner.exists());
              rememberOwner(owner.exists() ? nextUser.uid : null);
            }
          } catch (cause) {
            if (live && currentUid === nextUser.uid && !trusted)
              setError(errorMessage(cause));
          }
        }
        if (live && currentUid === (nextUser?.uid ?? null)) setChecking(false);
      },
      (cause) => {
        if (live) {
          setError(errorMessage(cause));
          setChecking(false);
        }
      },
    );
    return () => {
      live = false;
      unsubscribe();
    };
  }, [app, auth]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setPassword("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (checking)
    return (
      <div className="bo-gate">
        <p>{user ? "Checking owner access…" : "Loading Back Office…"}</p>
      </div>
    );
  if (user && isOwner)
    return (
      <Editor
        store={store}
        mode="firebase"
        onSignOut={() => void signOut(auth)}
      />
    );
  if (user)
    return (
      <div className="bo-gate">
        <h1>Access unavailable</h1>
        <p>This account is not listed as a Chronicle owner.</p>
        {error && <p role="alert">{error}</p>}
        <button className="bo-primary" onClick={() => void signOut(auth)}>
          Sign out
        </button>
      </div>
    );
  return (
    <div className="bo-gate">
      <a href="#top">
        <ArrowLeft size={15} /> Public timeline
      </a>
      <div className="bo-login-card">
        <span className="bo-kicker">Private Back Office</span>
        <h1>Welcome back.</h1>
        <p>
          Sign in with the owner account created in Firebase Authentication.
        </p>
        <form onSubmit={login}>
          <label htmlFor="bo-email">Email</label>
          <input
            id="bo-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="bo-password">Password</label>
          <input
            id="bo-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && (
            <p role="alert" className="bo-feedback error">
              {error}
            </p>
          )}
          <button className="bo-primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function BackOffice() {
  const app = useMemo(() => getFirebaseApp(), []);
  const localStore = useMemo(
    () => new LocalContentStore(window.localStorage),
    [],
  );
  if (app) return <FirebaseGate app={app} />;
  if (import.meta.env.DEV) return <Editor store={localStore} mode="local" />;
  return (
    <div className="bo-gate">
      <a href="#top">
        <ArrowLeft size={15} /> Public timeline
      </a>
      <div className="bo-login-card">
        <span className="bo-kicker">Private Back Office</span>
        <h1>Not configured</h1>
        <p>
          Firebase credentials are required before the Back Office can be used
          on a deployed site.
        </p>
      </div>
    </div>
  );
}
