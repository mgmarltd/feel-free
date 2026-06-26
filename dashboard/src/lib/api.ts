// Thin fetch wrapper around the Calmutopia admin API.
//
// Base URL resolves from VITE_API_BASE, falling back to the production server.
// Point it at http://localhost:3900 (or your dev port) via a .env file for
// local development.

const API_BASE = (import.meta.env.VITE_API_BASE || "http://91.99.194.149:3900").replace(/\/$/, "");

const TOKEN_KEY = "calmutopia_admin_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    // Let route guards redirect; surface a clear error too.
    throw new ApiError(401, "Unauthorized");
  }

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "error" in body && (body as any).error) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, String(message));
  }
  return body as T;
}

// ─── Endpoints ──────────────────────────────────────────────────────────────
export async function login(email: string, password: string) {
  return request<{ token: string; email: string }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchMe() {
  return request<{ email: string; role: string }>("/api/admin/me");
}

export interface Overview {
  kpis: {
    totalUsers: number;
    activeUsers7d: number;
    activeUsers30d: number;
    totalSessions: number;
    totalHomeworks: number;
    completedHomeworks: number;
    homeworkCompletionRate: number;
    selfAnalyses: number;
    affirmations: number;
  };
  breakdowns: {
    language: NameCount[];
    source: NameCount[];
    goal: NameCount[];
    stress: NameCount[];
    feeling: NameCount[];
  };
  activityByDay: { day: string; count: number }[];
  recentActivity: ActivityEvent[];
}

export interface NameCount {
  name: string;
  count: number;
}

export interface ActivityEvent {
  type: "session" | "analysis" | "homework" | "homework_done";
  userId: string;
  who: string;
  at: number;
  detail: string;
}

export interface UserSummary {
  userId: string;
  name: string | null;
  email: string | null;
  language: string | null;
  source: string | null;
  goal: string | null;
  feeling: string | null;
  stress: string | null;
  gender: string | null;
  age: number | null;
  sessionCount: number;
  homeworkCount: number;
  homeworkCompleted: number;
  hasSelfAnalysis: boolean;
  lastActive: number | null;
  updatedAt: string | null;
}

export interface Homework {
  id: string;
  createdAt: string;
  completedAt: string | null;
  topic: string;
  language: string;
  title: string;
  affirmations: string[];
  tappingScript: string;
  realLifeAction: string;
  durationMinutes: number;
  frequency: string;
}

export interface UserDetail {
  userId: string;
  profile: Record<string, any>;
  summary: UserSummary;
  homeworks: Homework[];
}

export async function fetchOverview() {
  return request<Overview>("/api/admin/overview");
}

export async function fetchUsers(q?: string) {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return request<{ count: number; users: UserSummary[] }>(`/api/admin/users${query}`);
}

export async function fetchUser(userId: string) {
  return request<UserDetail>(`/api/admin/users/${encodeURIComponent(userId)}`);
}

export async function fetchActivity(limit = 50) {
  return request<{ activity: ActivityEvent[] }>(`/api/admin/activity?limit=${limit}`);
}

export { API_BASE };
