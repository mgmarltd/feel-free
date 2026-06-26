import { useEffect, useState } from "react";
import {
  fetchQuickSessions,
  saveQuickSessions,
  resetQuickSessions,
  type QuickSessionMode,
  type QuickSessionsView,
} from "../lib/api";
import { ErrorPanel, Loading, PageHeader } from "../components/States";
import { IconRefresh } from "../components/icons";
import { fmtRelative } from "../lib/format";

const blankMode = (): QuickSessionMode => ({
  id: "",
  emoji: "",
  color: "rgba(139,92,246,0.2)",
  duration: "5 min",
  featured: false,
  enabled: true,
  label_en: "",
  label_tr: "",
  description_en: "",
  description_tr: "",
  focus_en: "",
  focus_tr: "",
  instructions_en: "",
  instructions_tr: "",
  firstMessage_en: "",
  firstMessage_tr: "",
  issues: [],
});

function sameModes(a: QuickSessionMode[], b: QuickSessionMode[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// A labelled textarea used throughout the details panel.
function Field({
  label,
  hint,
  value,
  onChange,
  rows = 2,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <textarea
        className="input text-sm"
        style={{ minHeight: rows * 24 + 16, resize: "vertical" }}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function QuickSessions() {
  const [meta, setMeta] = useState<QuickSessionsView | null>(null);
  const [modes, setModes] = useState<QuickSessionMode[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function load() {
    setError(null);
    setMeta(null);
    fetchQuickSessions()
      .then((res) => {
        setMeta(res);
        setModes(res.modes.map((m) => ({ ...m })));
      })
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function update(i: number, patch: Partial<QuickSessionMode>) {
    setModes((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  function remove(i: number) {
    setModes((prev) => prev.filter((_, idx) => idx !== i));
    setExpanded((e) => (e === null ? null : e === i ? null : e > i ? e - 1 : e));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= modes.length) return;
    setModes((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setExpanded((e) => (e === i ? j : e === j ? i : e));
  }

  function addMode() {
    setModes((prev) => [...prev, blankMode()]);
    setExpanded(modes.length);
  }

  async function onSave() {
    if (!modes.length) return flash("Add at least one mode");
    if (modes.some((m) => !m.label_en.trim() && !m.label_tr.trim())) {
      return flash("Each mode needs an English or Turkish title");
    }
    if (modes.some((m) => !m.focus_en.trim() && !m.focus_tr.trim())) {
      return flash("Each mode needs a focus line (Details) in at least one language");
    }
    setBusy(true);
    try {
      const res = await saveQuickSessions(modes);
      setMeta(res);
      setModes(res.modes.map((m) => ({ ...m })));
      flash("Quick sessions saved");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setBusy(true);
    try {
      const res = await resetQuickSessions();
      setMeta(res);
      setModes(res.modes.map((m) => ({ ...m })));
      setExpanded(null);
      flash("Reset to defaults");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorPanel message={error} onRetry={load} />;
  if (!meta) return <Loading />;

  const dirty = !sameModes(modes, meta.modes);

  return (
    <>
      <PageHeader
        title="Quick Sessions"
        subtitle="The focused tapping modes on the app Home screen. Add modes, edit each one's prompt in Details. Display changes show on next app open; prompt changes apply to the next session started."
      />

      <div className="card-pad mb-4 flex items-start gap-3 border-line bg-gray-50">
        <span className="mt-0.5 text-gray-400">ℹ</span>
        <p className="text-sm text-gray-600">
          <strong>Featured</strong> modes render as the large card; the rest fill the quick row.
          Disabled modes stay saved but are hidden from users. In <strong>Details</strong> you control
          how the AI runs each session — the focus line, extra guidance, opening message, and the
          affirmation keywords used to match the library.
        </p>
      </div>

      <div className="space-y-3">
        {modes.map((m, i) => {
          const open = expanded === i;
          const title = m.label_en || m.label_tr || "(untitled)";
          return (
            <div key={i} className={`card-pad ${m.enabled ? "" : "opacity-60"}`}>
              {/* Header row */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col gap-1">
                  <button className="btn-outline px-2 py-0.5 text-xs" disabled={i === 0} onClick={() => move(i, -1)} title="Move up">↑</button>
                  <button className="btn-outline px-2 py-0.5 text-xs" disabled={i === modes.length - 1} onClick={() => move(i, 1)} title="Move down">↓</button>
                </div>

                <input
                  className="input w-14 text-center text-lg"
                  maxLength={8}
                  value={m.emoji}
                  onChange={(e) => update(i, { emoji: e.target.value })}
                  placeholder="✨"
                  title="Emoji"
                />

                <div className="min-w-[160px] flex-1">
                  <input
                    className="input font-medium"
                    maxLength={120}
                    value={m.label_en}
                    onChange={(e) => update(i, { label_en: e.target.value })}
                    placeholder="Title (EN)"
                  />
                </div>
                <div className="min-w-[160px] flex-1">
                  <input
                    className="input font-medium"
                    maxLength={120}
                    value={m.label_tr}
                    onChange={(e) => update(i, { label_tr: e.target.value })}
                    placeholder="Başlık (TR)"
                  />
                </div>

                <input
                  className="input w-20 text-center"
                  maxLength={120}
                  value={m.duration}
                  onChange={(e) => update(i, { duration: e.target.value })}
                  placeholder="5 min"
                  title="Duration label"
                />

                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-600" title="Big featured card">
                  <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={m.featured} onChange={(e) => update(i, { featured: e.target.checked })} />
                  Featured
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-600">
                  <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={m.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} />
                  Enabled
                </label>

                <button className="btn-outline" onClick={() => setExpanded(open ? null : i)}>
                  {open ? "Hide details" : "Details"}
                </button>
                <button className="btn-outline text-rose-600" onClick={() => remove(i)} title="Remove mode">Remove</button>
              </div>

              {/* Details panel */}
              {open && (
                <div className="mt-4 space-y-4 border-t border-line pt-4">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-mono">{m.id || "(id assigned on save)"}</span>
                    <span>·</span>
                    <span>Editing prompt for <strong className="text-gray-600">{title}</strong></span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Focus — EN"
                      hint="One line: what this session works on. The agent opens straight on this."
                      value={m.focus_en}
                      onChange={(v) => update(i, { focus_en: v })}
                      placeholder="calming anxious, racing energy and coming back to safety"
                    />
                    <Field
                      label="Focus — TR"
                      value={m.focus_tr}
                      onChange={(v) => update(i, { focus_tr: v })}
                      placeholder="kaygılı enerjiyi yatıştırmak…"
                    />
                    <Field
                      label="Extra prompt guidance — EN"
                      hint="Optional. Appended to the session prompt for this mode (imagery, tone, special steps)."
                      value={m.instructions_en}
                      onChange={(v) => update(i, { instructions_en: v })}
                      rows={3}
                    />
                    <Field
                      label="Extra prompt guidance — TR"
                      value={m.instructions_tr}
                      onChange={(v) => update(i, { instructions_tr: v })}
                      rows={3}
                    />
                    <Field
                      label="Opening message — EN"
                      hint="Optional. Overrides the first thing the AI says. Use {name} for the user's name."
                      value={m.firstMessage_en}
                      onChange={(v) => update(i, { firstMessage_en: v })}
                      placeholder="{name}, let's calm that down together — where do you feel it?"
                    />
                    <Field
                      label="Opening message — TR"
                      value={m.firstMessage_tr}
                      onChange={(v) => update(i, { firstMessage_tr: v })}
                    />
                    <Field
                      label="Featured card text — EN"
                      hint="Shown under the title on the big card (featured modes only)."
                      value={m.description_en}
                      onChange={(v) => update(i, { description_en: v })}
                    />
                    <Field
                      label="Featured card text — TR"
                      value={m.description_tr}
                      onChange={(v) => update(i, { description_tr: v })}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        Affirmation keywords
                      </label>
                      <input
                        className="input text-sm"
                        value={m.issues.join(", ")}
                        onChange={(e) =>
                          update(i, { issues: e.target.value.split(",").map((s) => s.replace(/^\s+/, "")) })
                        }
                        placeholder="anxiety, worry, panic, kaygı"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        Comma-separated. Used to pre-match library affirmations for this theme.
                      </p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        Card color (CSS rgba/hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="h-9 w-9 shrink-0 rounded-lg border border-line" style={{ background: m.color }} />
                        <input
                          className="input text-sm font-mono"
                          value={m.color}
                          onChange={(e) => update(i, { color: e.target.value })}
                          placeholder="rgba(139,92,246,0.2)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn-outline mt-3" onClick={addMode} disabled={busy}>
        + Add mode
      </button>

      {/* Action bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="text-xs text-gray-400">
          {meta.isCustomized ? "Customized" : "Using built-in defaults"}
          {meta.updatedAt ? ` · edited ${fmtRelative(new Date(meta.updatedAt).getTime())}` : ""}
          {dirty ? " · unsaved changes" : ""}
        </div>
        <div className="flex items-center gap-2">
          {meta.isCustomized && (
            <button className="btn-outline" disabled={busy} onClick={onReset} title="Restore the built-in default modes">
              <IconRefresh className="h-4 w-4" /> Reset to defaults
            </button>
          )}
          <button className="btn-primary" disabled={!dirty || busy} onClick={onSave}>
            {busy ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>

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
