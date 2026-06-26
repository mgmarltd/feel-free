import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchUsers, type UserSummary } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { ErrorPanel, Loading, PageHeader } from "../components/States";
import { fmtNumber, fmtRelative } from "../lib/format";
import { IconSearch } from "../components/icons";

export default function Users() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Debounced search.
  useEffect(() => {
    const handle = setTimeout(() => {
      setError(null);
      setUsers(null);
      fetchUsers(query.trim() || undefined)
        .then((res) => {
          setUsers(res.users);
          setCount(res.count);
        })
        .catch((e) => setError(e.message));
      setParams(query.trim() ? { q: query.trim() } : {}, { replace: true });
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <>
      <PageHeader
        title="Users"
        subtitle={users ? `${fmtNumber(count)} ${count === 1 ? "user" : "users"}` : "All Calmutopia users"}
        action={
          <div className="relative w-full sm:w-72">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-10"
              placeholder="Search name, email, goal…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        }
      />

      {error ? (
        <ErrorPanel message={error} onRetry={() => setQuery((q) => q + "")} />
      ) : !users ? (
        <Loading />
      ) : users.length === 0 ? (
        <div className="card-pad grid h-40 place-items-center text-sm text-gray-400">No users found</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Goal</th>
                  <th className="px-5 py-3">Lang</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3 text-right">Sessions</th>
                  <th className="px-5 py-3 text-right">Homework</th>
                  <th className="px-5 py-3 text-right">Last active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => (
                  <tr key={u.userId} className="group hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <Link to={`/users/${encodeURIComponent(u.userId)}`} className="flex items-center gap-3">
                        <Avatar seed={u.userId} label={u.name ?? u.email ?? u.userId} size="md" />
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-gray-900 group-hover:text-brand-600">
                            {u.name ?? u.email ?? u.userId}
                          </div>
                          <div className="truncate text-xs text-gray-400">
                            {u.email ?? u.userId}
                            {u.age != null && ` · ${u.age}`}
                            {u.gender && ` · ${u.gender}`}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{u.goal ?? "—"}</td>
                    <td className="px-5 py-3">
                      {u.language ? (
                        <span className="pill bg-gray-100 text-gray-600 uppercase">{u.language}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{u.source ?? "—"}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">{u.sessionCount}</td>
                    <td className="px-5 py-3 text-right text-gray-600">
                      {u.homeworkCompleted}/{u.homeworkCount}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400">{fmtRelative(u.lastActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
