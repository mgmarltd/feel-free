import { useEffect, useState } from "react";
import {
  fetchHomeworkConfig,
  saveHomeworkConfig,
  resetHomeworkConfig,
  type HomeworkConfig,
  type HomeworkTopic,
  type HomeworkConfigView,
} from "../lib/api";
import { ErrorPanel, Loading, PageHeader } from "../components/States";
import { IconRefresh } from "../components/icons";
import { fmtRelative } from "../lib/format";

const blankTopic = (): HomeworkTopic => ({
  key: "",
  label_en: "",
  label_tr: "",
  keywords: [],
  practice_en: "",
  practice_tr: "",
});

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

export default function Homeworks() {
  const [meta, setMeta] = useState<HomeworkConfigView | null>(null);
  const [cfg, setCfg] = useState<HomeworkConfig | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function load() {
    setError(null);
    setMeta(null);
    fetchHomeworkConfig()
      .then((res) => {
        setMeta(res);
        setCfg(structuredClone(res.config));
      })
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function patch(p: Partial<HomeworkConfig>) {
    setCfg((c) => (c ? { ...c, ...p } : c));
  }

  function patchTopic(i: number, p: Partial<HomeworkTopic>) {
    setCfg((c) =>
      c ? { ...c, topics: c.topics.map((t, idx) => (idx === i ? { ...t, ...p } : t)) } : c,
    );
  }

  function removeTopic(i: number) {
    setCfg((c) => (c ? { ...c, topics: c.topics.filter((_, idx) => idx !== i) } : c));
    setExpanded((e) => (e === null ? null : e === i ? null : e > i ? e - 1 : e));
  }

  function addTopic() {
    setCfg((c) => (c ? { ...c, topics: [...c.topics, blankTopic()] } : c));
    if (cfg) setExpanded(cfg.topics.length);
  }

  async function onSave() {
    if (!cfg) return;
    if (!cfg.topics.length) return flash("Add at least one topic");
    if (cfg.topics.some((t) => !t.label_en.trim() && !t.label_tr.trim())) {
      return flash("Each topic needs an English or Turkish label");
    }
    setBusy(true);
    try {
      const res = await saveHomeworkConfig(cfg);
      setMeta(res);
      setCfg(structuredClone(res.config));
      flash("Homework settings saved");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setBusy(true);
    try {
      const res = await resetHomeworkConfig();
      setMeta(res);
      setCfg(structuredClone(res.config));
      setExpanded(null);
      flash("Reset to defaults");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorPanel message={error} onRetry={load} />;
  if (!meta || !cfg) return <Loading />;

  const dirty = JSON.stringify(cfg) !== JSON.stringify(meta.config);

  return (
    <>
      <PageHeader
        title="Homeworks"
        subtitle="Control how the homework at the end of each session is generated. Changes apply to homeworks created after saving."
      />

      <div className="card-pad mb-4 flex items-start gap-3 border-line bg-gray-50">
        <span className="mt-0.5 text-gray-400">ℹ</span>
        <p className="text-sm text-gray-600">
          A homework is built automatically when a session ends. The session topic is detected from
          the conversation using each topic's <strong>keywords</strong>, then its <strong>practice</strong>{" "}
          text, affirmations, title, duration and frequency come from here. Use{" "}
          <code className="rounded bg-gray-100 px-1">{"{topic}"}</code> in the title template.
        </p>
      </div>

      {/* Global settings */}
      <section className="card-pad mb-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Global settings</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Duration (minutes)</label>
            <input type="number" min={1} max={60} className="input" value={cfg.durationMinutes}
              onChange={(e) => patch({ durationMinutes: parseInt(e.target.value, 10) || 1 })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Affirmations per homework</label>
            <input type="number" min={1} max={8} className="input" value={cfg.affirmationCount}
              onChange={(e) => patch({ affirmationCount: parseInt(e.target.value, 10) || 1 })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Frequency (EN)</label>
            <input className="input" value={cfg.frequency_en} onChange={(e) => patch({ frequency_en: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Frequency (TR)</label>
            <input className="input" value={cfg.frequency_tr} onChange={(e) => patch({ frequency_tr: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Title template (EN)</label>
            <input className="input" value={cfg.titleTemplate_en} onChange={(e) => patch({ titleTemplate_en: e.target.value })} placeholder="Daily {topic} release" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Title template (TR)</label>
            <input className="input" value={cfg.titleTemplate_tr} onChange={(e) => patch({ titleTemplate_tr: e.target.value })} placeholder="Günlük {topic} bırakma" />
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Fallback affirmations (EN) — one per line"
            hint="Used when the library returns too few matches."
            rows={3}
            value={cfg.fallback_en.join("\n")}
            onChange={(v) => patch({ fallback_en: v.split("\n") })}
          />
          <Field
            label="Fallback affirmations (TR) — one per line"
            rows={3}
            value={cfg.fallback_tr.join("\n")}
            onChange={(v) => patch({ fallback_tr: v.split("\n") })}
          />
        </div>
      </section>

      {/* Topics */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Topics</h2>
      <div className="space-y-3">
        {cfg.topics.map((t, i) => {
          const open = expanded === i;
          const isDefault = t.key === "default";
          const title = t.label_en || t.label_tr || "(untitled)";
          return (
            <div key={i} className="card-pad">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[160px] flex-1">
                  <input className="input font-medium" value={t.label_en}
                    onChange={(e) => patchTopic(i, { label_en: e.target.value })} placeholder="Label (EN)" />
                </div>
                <div className="min-w-[160px] flex-1">
                  <input className="input font-medium" value={t.label_tr}
                    onChange={(e) => patchTopic(i, { label_tr: e.target.value })} placeholder="Etiket (TR)" />
                </div>
                {isDefault && <span className="pill bg-gray-100 text-gray-500">fallback</span>}
                <button className="btn-outline" onClick={() => setExpanded(open ? null : i)}>
                  {open ? "Hide details" : "Details"}
                </button>
                <button
                  className="btn-outline text-rose-600 disabled:opacity-40"
                  onClick={() => removeTopic(i)}
                  disabled={isDefault}
                  title={isDefault ? "The fallback topic can't be removed" : "Remove topic"}
                >
                  Remove
                </button>
              </div>

              {open && (
                <div className="mt-4 space-y-4 border-t border-line pt-4">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-mono">{t.key || "(key assigned on save)"}</span>
                    <span>·</span>
                    <span>Editing <strong className="text-gray-600">{title}</strong></span>
                  </div>

                  {!isDefault && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">Detection keywords</label>
                      <input
                        className="input text-sm"
                        value={t.keywords.join(", ")}
                        onChange={(e) => patchTopic(i, { keywords: e.target.value.split(",").map((s) => s.replace(/^\s+/, "")) })}
                        placeholder="anxiety, kaygı, panik, worried"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        Comma-separated. If any appears in the session text, this topic is chosen.
                      </p>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Real-life practice (EN)"
                      hint="The concrete action shown in the homework."
                      rows={3}
                      value={t.practice_en}
                      onChange={(v) => patchTopic(i, { practice_en: v })}
                    />
                    <Field
                      label="Real-life practice (TR)"
                      rows={3}
                      value={t.practice_tr}
                      onChange={(v) => patchTopic(i, { practice_tr: v })}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn-outline mt-3" onClick={addTopic} disabled={busy}>
        + Add topic
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
            <button className="btn-outline" disabled={busy} onClick={onReset} title="Restore the built-in defaults">
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
