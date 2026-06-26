import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { email, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!loading && email) return <Navigate to="/overview" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signIn(form.email.trim(), form.password);
      navigate("/overview", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-card">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h3l2 5 4-12 2 7h7" />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Calm<span className="text-brand-600">utopia</span>
        </h1>
        <p className="mt-2 text-sm text-gray-500">Admin dashboard — sign in to continue</p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            required
            autoFocus
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            className="input"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-400">
        Calmutopia · internal use only
      </p>
    </main>
  );
}
