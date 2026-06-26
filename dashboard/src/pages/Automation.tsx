import { useEffect, useState } from "react";
import {
  fetchAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  sendAutomation,
  type Automation,
  type AutomationInput,
  type PushStats,
} from "../lib/api";
import { ErrorPanel, Loading, PageHeader } from "../components/States";
import { fmtRelative } from "../lib/format";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const blankDraft = (): AutomationInput => ({
  name: "",
  enabled: true,
  title_en: "",
  title_tr: "",
  body_en: "",
  body_tr: "",
  time: "09:00",
  days: [],
  timezone: "Europe/Istanbul",
});

function scheduleText(a: Automation): string {
  const days = a.days.length === 0 || a.days.length === 7 ? "every day" : a.days.map((d) => DAY_LABELS[d]).join(", ");
  return `${a.time} · ${days} · ${a.timezone}`;
}

export default function AutomationPage() {
  const [automations, setAutomations] = useState<Automation[] | null>(null);
  const [push, setPush] = useState<PushStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Editor state: either creating (id null) or editing an existing one.
  const [editing, setEditing] = useState<{ id: string | null; draft: AutomationInput } | null>(null);

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

  function startCreate() {
    setEditing({ id: null, draft: blankDraft() });
  }

  function startEdit(a: Automation) {
    setEditing({
      id: a.id,
      draft: {
        name: a.name, enabled: a.enabled,
        title_en: a.title_en, title_tr: a.title_tr,
        body_en: a.body_en, body_tr: a.body_tr,
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

  async function onSaveEditor() {
    if (!editing) return;
    const d = editing.draft;
    if (!d.title_en.trim() && !d.title_tr.trim()) return flash("Add a title (EN or TR)");
    if (!d.body_en.trim() && !d.body_tr.trim()) return flash("Add a body (EN or TR)");
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
      const res = await updateAutomation(a.id, { ...a, enabled: !a.enabled });
      setAutomations(res.automations);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function onDelete(a: Automation) {
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
    setBusy(a.id);
    try {
      const { result } = await sendAutomation(a.id);
      flash(`Sent to ${result.sent}/${result.audience} · ${result.failed} failed`);
      load();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(null);
    }
  }

  if (error) return <ErrorPanel message={error} onRetry={load} />;
  if (!automations) return <Loading />;

  return (
    <>
      <PageHeader
        title="Automation"
        subtitle="Schedule push notifications to your users. Each automation fires at its local time on the chosen days and is sent in each user's language."
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="card-pad flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Push subscribers</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{push?.total ?? 0}</div>
          <div className="mt-0.5 text-xs text-gray-400">
            {push && Object.keys(push.byLanguage).length
              ? Object.entries(push.byLanguage).map(([k, v]) => `${v} ${k.toUpperCase()}`).join(" · ")
              : "No devices registered yet"}
          </div>
        </div>
        <button className="btn-primary" onClick={startCreate}>+ New automation</button>
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

      {/* Editor */}
      {editing && (
        <div className="card-pad mb-5 border-brand-200">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              {editing.id ? "Edit automation" : "New automation"}
            </h2>
            <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500">Name (internal)</label>
              <input className="input" value={editing.draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Morning reminder" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Title (EN)</label>
              <input className="input" value={editing.draft.title_en} onChange={(e) => patch({ title_en: e.target.value })} placeholder="Time to tap" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Title (TR)</label>
              <input className="input" value={editing.draft.title_tr} onChange={(e) => patch({ title_tr: e.target.value })} placeholder="Tapping zamanı" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Body (EN)</label>
              <textarea className="input text-sm" style={{ minHeight: 64 }} value={editing.draft.body_en} onChange={(e) => patch({ body_en: e.target.value })} placeholder="A few minutes of calm is waiting." />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Body (TR)</label>
              <textarea className="input text-sm" style={{ minHeight: 64 }} value={editing.draft.body_tr} onChange={(e) => patch({ body_tr: e.target.value })} placeholder="Birkaç dakikalık huzur seni bekliyor." />
            </div>

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
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        on ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
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
              {busy === "editor" ? "Saving…" : "Save automation"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {automations.length === 0 && !editing ? (
        <div className="card-pad text-center text-sm text-gray-500">
          No automations yet. Create one to schedule a recurring notification.
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((a) => (
            <div key={a.id} className={`card-pad ${a.enabled ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{a.name || "(untitled)"}</h3>
                    <span className={`pill ${a.enabled ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                      {a.enabled ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700">{a.title_tr || a.title_en} — {a.body_tr || a.body_en}</p>
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
