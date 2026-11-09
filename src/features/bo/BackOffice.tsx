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
import { ZodError } from "zod";
import {
  collectionLabels,
  draftTemplate,
  recordTitle,
} from "../../content/templates";
import { type CollectionName, type ContentRecord } from "../../content/schema";
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
import { normalizeFormRecord, type DraftRecord } from "./formModel";

const collections = Object.keys(collectionLabels) as CollectionName[];
type Section = CollectionName | "dashboard";

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

function Editor({
  store,
  mode,
  onSignOut,
}: {
  store: ContentStore;
  mode: "local" | "firebase";
  onSignOut?: () => void;
}) {
  const [section, setSection] = useState<Section>("dashboard");
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [counts, setCounts] = useState<Partial<Record<CollectionName, number>>>(
    {},
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftRecord, setDraftRecord] = useState<DraftRecord | null>(null);
  const [savedRecord, setSavedRecord] = useState<DraftRecord | null>(null);
  const [references, setReferences] = useState<
    Partial<Record<CollectionName, ContentRecord[]>>
  >({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
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
        if (live) setItems(results.sort((a, b) => a.id.localeCompare(b.id)));
      })
      .catch((cause) => {
        if (live) toast.error(errorMessage(cause));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [section, store]);

  function navigate(next: Section) {
    if (dirty) {
      toast.error("Save or reset your changes before leaving this record.");
      return;
    }
    setSection(next);
    setLoading(next !== "dashboard");
    setItems([]);
    setSelectedId(null);
    setDraftRecord(null);
    setSavedRecord(null);
  }

  function selectRecord(record: ContentRecord | null) {
    if (dirty) {
      toast.error("Save or reset your changes before opening another record.");
      return;
    }
    const next = (record ??
      draftTemplate(section as CollectionName)) as DraftRecord;
    setSelectedId(record?.id ?? null);
    setDraftRecord(next);
    setSavedRecord(next);
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
      if (selectedId !== null && value.id !== selectedId)
        throw new Error(
          "Record IDs cannot be renamed. Create a new record instead.",
        );
      if (selectedId === null && items.some((item) => item.id === value.id))
        throw new Error(
          "That ID already exists. Open the record or choose another ID.",
        );
      const saved = await store.save(section, value);
      setSelectedId(saved.id);
      setDraftRecord(saved);
      setSavedRecord(saved);
      await refresh(section);
      toast.success(
        nextStatus === "published"
          ? "Record published."
          : nextStatus === "draft"
            ? "Record moved to draft."
            : "Record saved.",
      );
    } catch (cause) {
      toast.error(errorMessage(cause));
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
      if (section === "dashboard") {
        const results = await Promise.all(
          collections.map(
            async (name) => [name, (await store.list(name)).length] as const,
          ),
        );
        setCounts(Object.fromEntries(results));
      }
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
      <Toaster closeButton />
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
                          <strong>{recordTitle(item)}</strong>
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
                        onChange={setDraftRecord}
                      />
                      <div className="bo-actions">
                        <button
                          type="button"
                          className="bo-secondary"
                          onClick={() => setDraftRecord(savedRecord)}
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
        setUser(nextUser);
        setChecking(true);
        setIsOwner(false);
        setError("");
        if (nextUser) {
          try {
            const owner = await getDoc(
              doc(getFirestore(app), "owners", nextUser.uid),
            );
            if (live && currentUid === nextUser.uid) setIsOwner(owner.exists());
          } catch (cause) {
            if (live && currentUid === nextUser.uid)
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
        <p>Checking owner access…</p>
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
