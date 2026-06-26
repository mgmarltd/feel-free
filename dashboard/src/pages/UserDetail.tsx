import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchUser, type UserDetail as UserDetailData } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { ErrorPanel, Loading } from "../components/States";
import { fmtDate, fmtRelative } from "../lib/format";
import { IconChevronLeft } from "../components/icons";

// Profile fields surfaced as labelled rows, in display order.
const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: "gender", label: "Sex" },
  { key: "stress", label: "Stress" },
  { key: "feeling", label: "Feeling" },
  { key: "feelingIntensity", label: "Feeling intensity" },
  { key: "goal", label: "Goal" },
  { key: "blocker", label: "Blocker" },
  { key: "knowsEFT", label: "EFT familiarity" },
  { key: "hasEFTCoach", label: "Has EFT coach" },
  { key: "meditates", label: "Meditates" },
  { key: "dailyRoutine", label: "Daily routine" },
  { key: "dailyCheckin", label: "Wants daily check-in" },
  { key: "wantsDailyRelief", label: "Wants daily relief" },
  { key: "triedOtherApps", label: "Tried other apps" },
  { key: "source", label: "Source" },
  { key: "authProvider", label: "Auth provider" },
  { key: "referralCode", label: "Referral code" },
  { key: "notificationsGranted", label: "Notifications" },
];

function fmtVal(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

export default function UserDetail() {
  const { userId = "" } = useParams();
  const [data, setData] = useState<UserDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    setData(null);
    fetchUser(userId)
      .then(setData)
      .catch((e) => setError(e.message));
  }

  useEffect(load, [userId]);

  if (error) return <ErrorPanel message={error} onRetry={load} />;
  if (!data) return <Loading />;

  const { profile, summary, homeworks } = data;
  const displayName = summary.name ?? summary.email ?? userId;
  const dob = profile.dob as { monthIndex: number; day: number; year: number } | undefined;

  return (
    <>
      <Link to="/users" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
        <IconChevronLeft className="h-4 w-4" /> Back to users
      </Link>

      {/* Header card */}
      <div className="card-pad mb-4 flex flex-wrap items-center gap-4">
        <Avatar seed={userId} label={displayName} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight text-gray-900">{displayName}</h1>
          <p className="truncate text-sm text-gray-500">
            {summary.email ?? userId}
            {summary.age != null && ` · ${summary.age} yrs`}
            {dob && ` · born ${dob.year}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.language && <span className="pill bg-gray-100 text-gray-600 uppercase">{summary.language}</span>}
          <span className="pill bg-brand-50 text-brand-600">{summary.sessionCount} sessions</span>
          <span className="pill bg-emerald-50 text-emerald-600">
            {summary.homeworkCompleted}/{summary.homeworkCount} homework
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Profile */}
        <section className="card-pad lg:col-span-1">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Profile</h2>
          <dl className="divide-y divide-line">
            {PROFILE_FIELDS.filter((f) => profile[f.key] != null && profile[f.key] !== "").map((f) => (
              <div key={f.key} className="flex items-start justify-between gap-3 py-2">
                <dt className="text-sm text-gray-500">{f.label}</dt>
                <dd className="text-right text-sm font-medium text-gray-900">{fmtVal(profile[f.key])}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="text-sm text-gray-500">Last active</dt>
              <dd className="text-right text-sm font-medium text-gray-900">{fmtRelative(summary.lastActive)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="text-sm text-gray-500">Updated</dt>
              <dd className="text-right text-sm font-medium text-gray-900">{fmtDate(profile.updatedAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="text-sm text-gray-500">User ID</dt>
              <dd className="text-right font-mono text-xs text-gray-500">{userId}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-4 lg:col-span-2">
          {/* Self analysis */}
          {profile.selfAnalysis && (profile.selfAnalysis.summary || profile.selfAnalysis.transcript) && (
            <section className="card-pad">
              <h2 className="mb-3 text-base font-semibold text-gray-900">Self-analysis</h2>
              {profile.selfAnalysis.summary && (
                <div className="mb-3 rounded-xl bg-brand-50 p-3.5 text-sm text-brand-800">
                  {profile.selfAnalysis.summary}
                </div>
              )}
              {profile.selfAnalysis.transcript && (
                <div>
                  <div className="label">Transcript</div>
                  <p className="whitespace-pre-wrap rounded-xl border border-line bg-gray-50 p-3.5 text-sm leading-relaxed text-gray-600">
                    {profile.selfAnalysis.transcript}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Homeworks */}
          <section className="card-pad">
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              Homework <span className="text-gray-300">({homeworks.length})</span>
            </h2>
            {homeworks.length === 0 ? (
              <div className="grid h-24 place-items-center text-sm text-gray-400">No homework yet</div>
            ) : (
              <ul className="space-y-3">
                {homeworks.map((hw) => (
                  <li key={hw.id} className="rounded-xl border border-line p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900">{hw.title}</span>
                      {hw.completedAt ? (
                        <span className="pill bg-emerald-50 text-emerald-600">Completed</span>
                      ) : (
                        <span className="pill bg-amber-50 text-amber-600">Pending</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {hw.topic} · {hw.durationMinutes} min · {hw.frequency} · {fmtDate(hw.createdAt)}
                    </p>
                    {hw.tappingScript && (
                      <p className="mt-2 text-sm italic text-gray-600">“{hw.tappingScript}”</p>
                    )}
                    {hw.realLifeAction && (
                      <p className="mt-2 text-sm text-gray-500">{hw.realLifeAction}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
