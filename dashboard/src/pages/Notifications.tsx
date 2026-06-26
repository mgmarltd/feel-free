import { useEffect, useState } from "react";
import {
  fetchAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  sendAutomation,
  broadcastPush,
  fetchAffirmationSample,
  type Automation,
  type AutomationInput,
  type AutomationType,
  type PushStats,
} from "../lib/api";
import { ErrorPanel, Loading, PageHeader } from "../components/States";
import { fmtRelative } from "../lib/format";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Tab = "manual" | "automation" | "affirmation";

function blankDraft(type: AutomationType): AutomationInput {
  return {
    type,
    name: "",
    enabled: true,
    title_en: type === "affirmation" ? "Daily affirmation" : "",
    title_tr: type === "affirmation" ? "Günün olumlaması" : "",
    body_en: "",
    body_tr: "",
    topic: "",
    time: "09:00",
    days: [],
    timezone: "Europe/Istanbul",
  };
}

function scheduleText(a: Automation): string {
  const days = a.days.length === 0 || a.days.length === 7 ? "every day" : a.days.map((d) => DAY_LABELS[d]).join(", ");
  return `${a.time} · ${days} · ${a.timezone}`;
}

export default function Notifications() {
  const [tab, setTab] = useState<Tab>("manual");
  const [automations, setAutomations] = useState<Automation[] | null>(null);
  const [push, setPush] = useState<PushStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function load() {
    setError(null);
    setAutomations(null);
    fetchAutomations()
      .then((res) => {
        setAutomations(res.automations);
        setPush(res.push);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  if (error) return <ErrorPanel message={error} onRetry={load} />;
  if (!automations) return <Loading />;

  const TABS: { key: Tab; label: string }[] = [
    { key: "manual", label: "Manual" },
    { key: "automation", label: "Automation" },
    { key: "affirmation", label: "Affirmations" },
  ];

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Send a notification now, schedule recurring ones, or push a daily affirmation. Each is delivered in the user's language."
      />

      <div className="card-pad mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Push subscribers</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{push?.total ?? 0}</div>
          <div className="mt-0.5 text-xs text-gray-400">
            {push && Object.keys(push.byLanguage).length
              ? Object.entries(push.byLanguage).map(([k, v]) => `${v} ${k.toUpperCase()}`).join(" · ")
              : "No devices registered yet"}
          </div>
        </div>
        <div className="inline-flex rounded-xl border border-line bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {push?.total === 0 && (
        <div className="card-pad mb-4 flex items-start gap-3 border-amber-200 bg-amber-50">
          <span className="mt-0.5 text-amber-500">⚠</span>
          <p className="text-sm text-amber-700">
            No devices have registered for push yet. Notifications only deliver to app builds with
            notifications enabled (Expo Go on SDK 54 can't receive remote push — use a dev/production build).
          </p>
        </div>
      )}

      {tab === "manual" && <ManualTab audience={push?.total ?? 0} flash={flash} onSent={load} />}
      {tab === "automation" && (
        <ScheduleTab kind="custom" automations={automations} setAutomations={setAutomations} flash={flash} reload={load} />
      )}
      {tab === "affirmation" && (
        <ScheduleTab kind="affirmation" automations={automations} setAutomations={setAutomations} flash={flash} reload={load} />
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="pointer-events-auto rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-pop">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Manual: compose + send a one-off broadcast now ──────────────────────────
function ManualTab({
  audience,
  flash,
  onSent,
}: {
  audience: number;
  flash: (m: string) => void;
  onSent: () => void;
}) {
  const [titleEn, setTitleEn] = useState("");
  const [titleTr, setTitleTr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyTr, setBodyTr] = useState("");
  const [sending, setSending] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  function clear() {
    setTitleEn(""); setTitleTr(""); setBodyEn(""); setBodyTr("");
  }

  async function onSend() {
    if (!titleEn.trim() && !titleTr.trim()) return flash("Add a title (EN or TR)");
    if (!bodyEn.trim() && !bodyTr.trim()) return flash("Add a body (EN or TR)");
    if (!window.confirm(`Send this notification now to all ${audience} subscriber(s)?`)) return;
    setSending(true);
    try {
      const { result } = await broadcastPush({ title_en: titleEn, title_tr: titleTr, body_en: bodyEn, body_tr: bodyTr });
      setLast(`Sent to ${result.sent}/${result.audience} · ${result.failed} failed`);
      flash("Notification sent");
      clear();
      onSent();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card-pad">
      <h2 className="mb-1 text-base font-semibold text-gray-900">Send a notification now</h2>
      <p className="mb-4 text-sm text-gray-500">
        Goes to every registered device immediately. Users see the text for their language; a blank
        language falls back to the other.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Title (EN)</label>
          <input className="input" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Time to tap" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Title (TR)</label>
          <input className="input" value={titleTr} onChange={(e) => setTitleTr(e.target.value)} placeholder="Tapping zamanı" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Body (EN)</label>
          <textarea className="input text-sm" style={{ minHeight: 80 }} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} placeholder="A few minutes of calm is waiting for you." />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Body (TR)</label>
          <textarea className="input text-sm" style={{ minHeight: 80 }} value={bodyTr} onChange={(e) => setBodyTr(e.target.value)} placeholder="Birkaç dakikalık huzur seni bekliyor." />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-gray-400">{last || ""}</span>
        <div className="flex items-center gap-2">
          <button className="btn-outline" onClick={clear} disabled={sending}>Clear</button>
          <button className="btn-primary" onClick={onSend} disabled={sending}>
            {sending ? "Sending…" : `Send to all (${audience})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule: recurring custom OR affirmation notifications ──────────────────
function ScheduleTab({
  kind,
  automations,
  setAutomations,
  flash,
  reload,
}: {
  kind: AutomationType;
  automations: Automation[];
  setAutomations: (a: Automation[]) => void;
  flash: (m: string) => void;
  reload: () => void;
}) {
  const isAff = kind === "affirmation";
  // Existing automations without a type are treated as "custom".
  const rows = automations.filter((a) => (a.type || "custom") === kind);

  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; draft: AutomationInput } | null>(null);
  const [sample, setSample] = useState<{ en: string; tr: string } | null>(null);
  const [sampling, setSampling] = useState(false);

  function startCreate() {
    setSample(null);
    setEditing({ id: null, draft: blankDraft(kind) });
  }

  function startEdit(a: Automation) {
    setSample(null);
    setEditing({
      id: a.id,
      draft: {
        type: (a.type || "custom") as AutomationType,
        name: a.name, enabled: a.enabled,
        title_en: a.title_en, title_tr: a.title_tr,
        body_en: a.body_en, body_tr: a.body_tr,
        topic: a.topic || "",
        time: a.time, days: a.days, timezone: a.timezone,
      },
    });
  }

  function patch(p: Partial<AutomationInput>) {
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...p } } : e));
  }

  function toggleDay(d: number) {
    setEditing((e) => {
      if (!e) return e;
      const has = e.draft.days.includes(d);
      const days = has ? e.draft.days.filter((x) => x !== d) : [...e.draft.days, d].sort((a, b) => a - b);
      return { ...e, draft: { ...e.draft, days } };
    });
  }

  async function previewSample() {
    setSampling(true);
    try {
      const { sample } = await fetchAffirmationSample(editing?.draft.topic);
      if (!sample) flash("No affirmation found for that topic");
      setSample(sample ? { en: sample.affirmation_en, tr: sample.affirmation_tr } : null);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setSampling(false);
    }
  }

  async function onSaveEditor() {
    if (!editing) return;
    const d = editing.draft;
    if (!d.title_en.trim() && !d.title_tr.trim()) return flash("Add a title (EN or TR)");
    if (!isAff && !d.body_en.trim() && !d.body_tr.trim()) return flash("Add a body (EN or TR)");
    setBusy("editor");
    try {
      const res = editing.id ? await updateAutomation(editing.id, d) : await createAutomation(d);
      setAutomations(res.automations);
      setEditing(null);
      flash("Saved");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function onToggleEnabled(a: Automation) {
    setBusy(a.id);
    try {
      const res = await updateAutomation(a.id, { ...a, type: (a.type || "custom") as AutomationType, enabled: !a.enabled });
      setAutomations(res.automations);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function onDelete(a: Automation) {
    if (!window.confirm(`Delete "${a.name || "this notification"}"?`)) return;
    setBusy(a.id);
    try {
      const res = await deleteAutomation(a.id);
      setAutomations(res.automations);
      flash("Deleted");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function onSendNow(a: Automation) {
    if (!window.confirm(`Send "${a.name || "this notification"}" to all subscribers now?`)) return;
    setBusy(a.id);
    try {
      const { result } = await sendAutomation(a.id);
      flash(`Sent to ${result.sent}/${result.audience} · ${result.failed} failed`);
      reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {isAff && (
        <div className="card-pad mb-4 flex items-start gap-3 border-line bg-gray-50">
          <span className="mt-0.5 text-gray-400">ℹ</span>
          <p className="text-sm text-gray-600">
            Affirmation notifications send a <strong>random affirmation from the library</strong> each
            time they fire (a fresh one per send). Set an optional <strong>topic</strong> to bias the
            pick (e.g. <code className="rounded bg-gray-100 px-1">anxiety</code>); leave it blank for any.
          </p>
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={startCreate}>
          + New {isAff ? "affirmation notification" : "automation"}
        </button>
      </div>

      {editing && (
        <div className="card-pad mb-5 border-brand-200">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              {editing.id ? "Edit" : "New"} {isAff ? "affirmation notification" : "automation"}
            </h2>
            <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500">Name (internal)</label>
              <input className="input" value={editing.draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder={isAff ? "Daily affirmation" : "Morning reminder"} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Title (EN)</label>
              <input className="input" value={editing.draft.title_en} onChange={(e) => patch({ title_en: e.target.value })} placeholder="Daily affirmation" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Title (TR)</label>
              <input className="input" value={editing.draft.title_tr} onChange={(e) => patch({ title_tr: e.target.value })} placeholder="Günün olumlaması" />
            </div>

            {isAff ? (
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-500">Topic filter (optional)</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input className="input flex-1" value={editing.draft.topic} onChange={(e) => patch({ topic: e.target.value })} placeholder="anxiety, sleep, confidence… (blank = any)" />
                  <button className="btn-outline" onClick={previewSample} disabled={sampling}>
                    {sampling ? "Picking…" : "Preview a sample"}
                  </button>
                </div>
                {sample && (
                  <div className="mt-2 rounded-xl border border-line bg-gray-50 p-3 text-sm">
                    <div className="text-gray-700"><span className="text-gray-400">EN:</span> {sample.en || "—"}</div>
                    <div className="mt-1 text-gray-700"><span className="text-gray-400">TR:</span> {sample.tr || "—"}</div>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-400">The body is a random affirmation chosen at send time — no need to write one.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Body (EN)</label>
                  <textarea className="input text-sm" style={{ minHeight: 64 }} value={editing.draft.body_en} onChange={(e) => patch({ body_en: e.target.value })} placeholder="A few minutes of calm is waiting." />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Body (TR)</label>
                  <textarea className="input text-sm" style={{ minHeight: 64 }} value={editing.draft.body_tr} onChange={(e) => patch({ body_tr: e.target.value })} placeholder="Birkaç dakikalık huzur seni bekliyor." />
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Time (24h, local)</label>
              <input type="time" className="input" value={editing.draft.time} onChange={(e) => patch({ time: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Timezone</label>
              <input className="input" value={editing.draft.timezone} onChange={(e) => patch({ timezone: e.target.value })} placeholder="Europe/Istanbul" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500">Days (none selected = every day)</label>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((lbl, d) => {
                  const on = editing.draft.days.includes(d);
                  return (
                    <button key={d} type="button" onClick={() => toggleDay(d)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        on ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-gray-600 hover:bg-gray-50"
                      }`}>
                      {lbl}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={editing.draft.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />
              Enabled
            </label>
          </div>

          <div className="mt-4 flex justify-end">
            <button className="btn-primary" disabled={busy === "editor"} onClick={onSaveEditor}>
              {busy === "editor" ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 && !editing ? (
        <div className="card-pad text-center text-sm text-gray-500">
          {isAff
            ? "No affirmation notifications yet. Create one to push a daily affirmation."
            : "No automations yet. Create one to schedule a recurring notification."}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <div key={a.id} className={`card-pad ${a.enabled ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{a.name || "(untitled)"}</h3>
                    <span className={`pill ${a.enabled ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                      {a.enabled ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700">
                    {isAff
                      ? `${a.title_tr || a.title_en} — random affirmation${a.topic ? ` · topic: ${a.topic}` : ""}`
                      : `${a.title_tr || a.title_en} — ${a.body_tr || a.body_en}`}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {scheduleText(a)}
                    {a.lastRunAt ? ` · last sent ${fmtRelative(new Date(a.lastRunAt).getTime())}` : " · never sent"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button className="btn-outline" disabled={busy === a.id} onClick={() => onSendNow(a)}>Send now</button>
                  <button className="btn-outline" disabled={busy === a.id} onClick={() => onToggleEnabled(a)}>
                    {a.enabled ? "Pause" : "Resume"}
                  </button>
                  <button className="btn-outline" onClick={() => startEdit(a)}>Edit</button>
                  <button className="btn-outline text-rose-600" disabled={busy === a.id} onClick={() => onDelete(a)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
