import { useEffect, useState } from "react";
import { fetchActivity, type ActivityEvent } from "../lib/api";
import { ActivityFeed, ErrorPanel, Loading, PageHeader } from "../components/States";

export default function Activity() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    setEvents(null);
    fetchActivity(100)
      .then((res) => setEvents(res.activity))
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  return (
    <>
      <PageHeader title="Activity" subtitle="Everything going on, newest first" />
      {error ? (
        <ErrorPanel message={error} onRetry={load} />
      ) : !events ? (
        <Loading />
      ) : (
        <div className="card-pad">
          <ActivityFeed events={events} />
        </div>
      )}
    </>
  );
}
