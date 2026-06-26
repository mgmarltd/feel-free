import { useEffect, useMemo, useState } from "react";
import { fetchPrompts, savePrompts, resetPrompt, type Prompt } from "../lib/api";
import { ErrorPanel, Loading, PageHeader } from "../components/States";
import { IconRefresh } from "../components/icons";
import { fmtRelative } from "../lib/format";

const LANG_BADGE: Record<Prompt["lang"], { text: string; cls: string }> = {
  en: { text: "EN", cls: "bg-sky-50 text-sky-600" },
  tr: { text: "TR", cls: "bg-violet-50 text-violet-600" },
  both: { text: "EN · TR", cls: "bg-gray-100 text-gray-600" },
};

export default function Prompts() {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Local edits keyed by prompt key.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<"editor" | "defaults">("editor");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function load() {
    setError(null);
    setPrompts(null);
    fetchPrompts()
      .then((res) => {
        setPrompts(res.prompts);
        setDrafts(Object.fromEntries(res.prompts.map((p) => [p.key, p.value])));
      })
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      flash("Copy failed — select and copy manually");
    }
  }

  async function onSave(p: Prompt) {
    const value = drafts[p.key] ?? "";
    if (value.trim().length === 0) {
      flash("Prompt can't be empty");
      return;
    }
    setBusy(p.key);
    try {
      const res = await savePrompts({ [p.key]: value });
      setPrompts(res.prompts);
      if (res.errors?.length) flash(res.errors[0].error);
      else flash(`Saved “${p.label}”`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function onReset(p: Prompt) {
    setBusy(p.key);
    try {
      const res = await resetPrompt(p.key);
      setPrompts(res.prompts);
      const fresh = res.prompts.find((x) => x.key === p.key);
      if (fresh) setDrafts((d) => ({ ...d, [p.key]: fresh.value }));
      flash(`Reset “${p.label}” to default`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(null);
    }
  }

  const groups = useMemo(() => {
    const map = new Map<string, Prompt[]>();
    for (const p of prompts ?? []) {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group)!.push(p);
    }
    return Array.from(map.entries());
  }, [prompts]);

  if (error) return <ErrorPanel message={error} onRetry={load} />;
  if (!prompts) return <Loading />;

  return (
    <>
      <PageHeader
        title="LLM Prompts"
        subtitle="View and edit the prompts that drive the voice agents. Changes apply to new sessions."
      />

      {/* Sub-tabs: live editor vs read-only originals */}
      <div className="mb-5 inline-flex rounded-xl border border-line bg-white p-1">
        <button
          className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
            view === "editor" ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
          onClick={() => setView("editor")}
        >
          Editor
        </button>
        <button
          className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
            view === "defaults" ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
          onClick={() => setView("defaults")}
        >
          Base prompts
        </button>
      </div>

      {view === "defaults" ? (
        <DefaultsView groups={groups} copyText={copyText} copiedKey={copiedKey} />
      ) : (
        <>
          <div className="card-pad mb-4 flex items-start gap-3 border-amber-200 bg-amber-50">
            <span className="mt-0.5 text-amber-500">⚠</span>
            <p className="text-sm text-amber-700">
              These prompts control the live AI guide. Edits take effect on the <strong>next</strong> session
              started after saving. Use <strong>Reset</strong> to restore the built-in default at any time.
            </p>
          </div>

          <div className="space-y-6">
        {groups.map(([group, items]) => (
          <section key={group}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">{group}</h2>
            <div className="space-y-4">
              {items.map((p) => {
                const draft = drafts[p.key] ?? "";
                const dirty = draft !== p.value;
                const badge = LANG_BADGE[p.lang];
                const multiline = p.default.length > 80;
                return (
                  <div key={p.key} className="card-pad">
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900">{p.label}</h3>
                          <span className={`pill ${badge.cls}`}>{badge.text}</span>
                          {p.isOverridden && (
                            <span className="pill bg-brand-50 text-brand-600">Customized</span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{p.description}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {p.isOverridden && (
                          <button
                            className="btn-outline"
                            disabled={busy === p.key}
                            onClick={() => onReset(p)}
                            title="Restore built-in default"
                          >
                            <IconRefresh className="h-4 w-4" /> Reset
                          </button>
                        )}
                        <button
                          className="btn-primary"
                          disabled={!dirty || busy === p.key}
                          onClick={() => onSave(p)}
                        >
                          {busy === p.key ? "Saving…" : dirty ? "Save" : "Saved"}
                        </button>
                      </div>
                    </div>

                    <textarea
                      className="input font-mono text-[13px] leading-relaxed"
                      style={{ minHeight: multiline ? 220 : 52, resize: "vertical" }}
                      spellCheck={false}
                      value={draft}
                      onChange={(e) => setDrafts((d) => ({ ...d, [p.key]: e.target.value }))}
                    />
                    <div className="mt-1.5 flex items-center justify-between text-xs text-gray-400">
                      <span className="font-mono">{p.key}</span>
                      <span>
                        {draft.length} chars
                        {p.updatedAt ? ` · edited ${fmtRelative(new Date(p.updatedAt).getTime())}` : ""}
                        {dirty ? " · unsaved" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
          </div>
        </>
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

// Read-only reference of the built-in default prompts, always copyable —
// independent of whatever is currently saved/customized.
function DefaultsView({
  groups,
  copyText,
  copiedKey,
}: {
  groups: [string, Prompt[]][];
  copyText: (key: string, text: string) => void;
  copiedKey: string | null;
}) {
  return (
    <>
      <div className="card-pad mb-4 flex items-start gap-3 border-line bg-gray-50">
        <span className="mt-0.5 text-gray-400">ℹ</span>
        <p className="text-sm text-gray-600">
          These are the original built-in prompts shipped with the app — read-only. Copy any of them to
          restore wording by hand, or as a backup before a big edit. The <strong>Editor</strong> tab is
          where changes are saved.
        </p>
      </div>

      <div className="space-y-6">
        {groups.map(([group, items]) => (
          <section key={group}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">{group}</h2>
            <div className="space-y-4">
              {items.map((p) => {
                const badge = LANG_BADGE[p.lang];
                const copied = copiedKey === p.key;
                return (
                  <div key={p.key} className="card-pad">
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900">{p.label}</h3>
                          <span className={`pill ${badge.cls}`}>{badge.text}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{p.description}</p>
                      </div>
                      <button className="btn-outline shrink-0" onClick={() => copyText(p.key, p.default)}>
                        {copied ? "Copied ✓" : "Copy"}
                      </button>
                    </div>
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-gray-50 p-3.5 font-mono text-[13px] leading-relaxed text-gray-700">
                      {p.default}
                    </pre>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-gray-400">
                      <span className="font-mono">{p.key}</span>
                      <span>{p.default.length} chars</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
