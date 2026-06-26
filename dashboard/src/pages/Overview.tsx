import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchOverview, type Overview as OverviewData } from "../lib/api";
import { Kpi } from "../components/Kpi";
import { AreaTrend, BarList, Donut } from "../components/Charts";
import { ActivityFeed, ErrorPanel, Loading, PageHeader } from "../components/States";
import { fmtNumber } from "../lib/format";
import { IconBook, IconCheck, IconPulse, IconSpark, IconUsers } from "../components/icons";

export default function Overview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    setData(null);
    fetchOverview()
      .then(setData)
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  if (error) return <ErrorPanel message={error} onRetry={load} />;
  if (!data) return <Loading />;

  const k = data.kpis;

  return (
    <>
      <PageHeader title="Overview" subtitle="Everything happening across Calmutopia" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total Users" value={fmtNumber(k.totalUsers)} caption={`${fmtNumber(k.activeUsers7d)} active this week`} icon={<IconUsers />} />
        <Kpi label="Sessions" value={fmtNumber(k.totalSessions)} caption="EFT tapping sessions" icon={<IconPulse />} />
        <Kpi label="Self-analyses" value={fmtNumber(k.selfAnalyses)} caption="Completed intakes" icon={<IconSpark />} />
        <Kpi
          label="Homework done"
          value={fmtNumber(k.completedHomeworks)}
          total={fmtNumber(k.totalHomeworks)}
          caption={`${k.homeworkCompletionRate}% completion`}
          icon={<IconCheck />}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card-pad lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Activity (30 days)</h2>
            <span className="pill bg-brand-50 text-brand-600">
              <span className="dot bg-brand-500" /> Daily active users
            </span>
          </div>
          <AreaTrend data={data.activityByDay} />
        </section>

        <section className="card-pad">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Recent activity</h2>
            <Link to="/activity" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          <ActivityFeed events={data.recentActivity} />
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card-pad">
          <h2 className="mb-3 text-base font-semibold text-gray-900">By language</h2>
          <Donut data={data.breakdowns.language} />
        </section>
        <section className="card-pad">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Top goals</h2>
          <BarList data={data.breakdowns.goal} />
        </section>
        <section className="card-pad">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Acquisition source</h2>
          <BarList data={data.breakdowns.source} />
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card-pad">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Stress level</h2>
          <BarList data={data.breakdowns.stress} />
        </section>
        <section className="card-pad">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Current feeling</h2>
          <BarList data={data.breakdowns.feeling} />
        </section>
        <section className="card-pad flex flex-col justify-between">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Affirmation library</h2>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="icon-chip mb-3 h-12 w-12 rounded-2xl">
              <IconBook className="h-6 w-6" />
            </span>
            <div className="text-3xl font-bold tracking-tight text-gray-900">{fmtNumber(k.affirmations)}</div>
            <p className="mt-1 text-xs text-gray-400">Problem → cause → affirmation entries</p>
          </div>
        </section>
      </div>
    </>
  );
}
