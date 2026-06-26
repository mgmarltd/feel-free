import { useEffect, useState } from "react";
import {
  fetchDailyTasks,
  saveDailyTasks,
  resetDailyTasks,
  type DailyTask,
  type DailyTasksView,
} from "../lib/api";
import { ErrorPanel, Loading, PageHeader } from "../components/States";
import { IconRefresh } from "../components/icons";
import { fmtRelative } from "../lib/format";

const blankTask = (): DailyTask => ({
  id: "",
  emoji: "",
  title_en: "",
  title_tr: "",
  enabled: true,
});

function sameTasks(a: DailyTask[], b: DailyTask[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function DailyTasks() {
  const [meta, setMeta] = useState<DailyTasksView | null>(null);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function load() {
    setError(null);
    setMeta(null);
    fetchDailyTasks()
      .then((res) => {
        setMeta(res);
        setTasks(res.tasks.map((t) => ({ ...t })));
      })
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function update(i: number, patch: Partial<DailyTask>) {
    setTasks((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }

  function remove(i: number) {
    setTasks((prev) => prev.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    setTasks((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function addTask() {
    setTasks((prev) => [...prev, blankTask()]);
  }

  async function onSave() {
    if (!tasks.length) {
      flash("Add at least one task");
      return;
    }
    if (tasks.some((t) => !t.title_en.trim() && !t.title_tr.trim())) {
      flash("Each task needs an English or Turkish title");
      return;
    }
    setBusy(true);
    try {
      const res = await saveDailyTasks(tasks);
      setMeta(res);
      setTasks(res.tasks.map((t) => ({ ...t })));
      flash("Daily tasks saved");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setBusy(true);
    try {
      const res = await resetDailyTasks();
      setMeta(res);
      setTasks(res.tasks.map((t) => ({ ...t })));
      flash("Reset to defaults");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorPanel message={error} onRetry={load} />;
  if (!meta) return <Loading />;

  const dirty = !sameTasks(tasks, meta.tasks);

  return (
    <>
      <PageHeader
        title="Daily Tasks"
        subtitle="The recurring habits shown on the app Home screen. Changes apply the next time a user opens the app."
      />

      <div className="card-pad mb-4 flex items-start gap-3 border-line bg-gray-50">
        <span className="mt-0.5 text-gray-400">ℹ</span>
        <p className="text-sm text-gray-600">
          Each task shows with its emoji and a title per language. Disabled tasks stay saved but are
          hidden from users. Users complete tasks on their own device — completion isn't stored here.
        </p>
      </div>

      <div className="space-y-3">
        {tasks.map((t, i) => (
          <div key={i} className={`card-pad ${t.enabled ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-start gap-3">
              {/* Reorder */}
              <div className="flex flex-col gap-1 pt-1">
                <button
                  className="btn-outline px-2 py-0.5 text-xs"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  className="btn-outline px-2 py-0.5 text-xs"
                  disabled={i === tasks.length - 1}
                  onClick={() => move(i, 1)}
                  title="Move down"
                >
                  ↓
                </button>
              </div>

              {/* Emoji */}
              <div className="w-16">
                <label className="mb-1 block text-xs font-medium text-gray-400">Emoji</label>
                <input
                  className="input text-center text-lg"
                  maxLength={8}
                  value={t.emoji}
                  onChange={(e) => update(i, { emoji: e.target.value })}
                  placeholder="✨"
                />
              </div>

              {/* Titles */}
              <div className="min-w-[180px] flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-400">Title (EN)</label>
                <input
                  className="input"
                  maxLength={80}
                  value={t.title_en}
                  onChange={(e) => update(i, { title_en: e.target.value })}
                  placeholder="Morning Tapping"
                />
              </div>
              <div className="min-w-[180px] flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-400">Title (TR)</label>
                <input
                  className="input"
                  maxLength={80}
                  value={t.title_tr}
                  onChange={(e) => update(i, { title_tr: e.target.value })}
                  placeholder="Sabah Tapping"
                />
              </div>

              {/* Enabled + remove */}
              <div className="flex flex-col items-end gap-2 pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-600"
                    checked={t.enabled}
                    onChange={(e) => update(i, { enabled: e.target.checked })}
                  />
                  Enabled
                </label>
                <button
                  className="btn-outline text-rose-600"
                  onClick={() => remove(i)}
                  title="Remove task"
                >
                  Remove
                </button>
              </div>
            </div>
            {t.id && (
              <div className="mt-2 text-xs text-gray-400">
                <span className="font-mono">{t.id}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="btn-outline mt-3" onClick={addTask} disabled={busy}>
        + Add task
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
            <button
              className="btn-outline"
              disabled={busy}
              onClick={onReset}
              title="Restore the built-in default tasks"
            >
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
