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

export interface Prompt {
  key: string;
  label: string;
  description: string;
  lang: "en" | "tr" | "both";
  group: string;
  value: string;
  default: string;
  isOverridden: boolean;
  updatedAt: string | null;
}

export async function fetchPrompts() {
  return request<{ prompts: Prompt[] }>("/api/admin/prompts");
}

export async function savePrompts(updates: Record<string, string>) {
  return request<{ applied: string[]; errors: { key: string; error: string }[]; prompts: Prompt[] }>(
    "/api/admin/prompts",
    { method: "PUT", body: JSON.stringify({ updates }) },
  );
}

export async function resetPrompt(key: string) {
  return request<{ success: boolean; prompts: Prompt[] }>(
    `/api/admin/prompts/${encodeURIComponent(key)}/reset`,
    { method: "POST" },
  );
}

export interface DailyTask {
  id: string;
  emoji: string;
  title_en: string;
  title_tr: string;
  enabled: boolean;
}

export interface DailyTasksView {
  tasks: DailyTask[];
  defaults: DailyTask[];
  isCustomized: boolean;
  updatedAt: string | null;
}

export async function fetchDailyTasks() {
  return request<DailyTasksView>("/api/admin/daily-tasks");
}

export async function saveDailyTasks(tasks: DailyTask[]) {
  return request<DailyTasksView>("/api/admin/daily-tasks", {
    method: "PUT",
    body: JSON.stringify({ tasks }),
  });
}

export async function resetDailyTasks() {
  return request<DailyTasksView>("/api/admin/daily-tasks/reset", { method: "POST" });
}

export interface QuickSessionMode {
  id: string;
  emoji: string;
  color: string;
  duration: string;
  featured: boolean;
  enabled: boolean;
  label_en: string;
  label_tr: string;
  description_en: string;
  description_tr: string;
  focus_en: string;
  focus_tr: string;
  instructions_en: string;
  instructions_tr: string;
  firstMessage_en: string;
  firstMessage_tr: string;
  issues: string[];
}

export interface QuickSessionsView {
  modes: QuickSessionMode[];
  defaults: QuickSessionMode[];
  isCustomized: boolean;
  updatedAt: string | null;
}

export async function fetchQuickSessions() {
  return request<QuickSessionsView>("/api/admin/quick-sessions");
}

export async function saveQuickSessions(modes: QuickSessionMode[]) {
  return request<QuickSessionsView>("/api/admin/quick-sessions", {
    method: "PUT",
    body: JSON.stringify({ modes }),
  });
}

export async function resetQuickSessions() {
  return request<QuickSessionsView>("/api/admin/quick-sessions/reset", { method: "POST" });
}

export interface HomeworkTopic {
  key: string;
  label_en: string;
  label_tr: string;
  keywords: string[];
  practice_en: string;
  practice_tr: string;
}

export interface HomeworkConfig {
  durationMinutes: number;
  affirmationCount: number;
  frequency_en: string;
  frequency_tr: string;
  titleTemplate_en: string;
  titleTemplate_tr: string;
  fallback_en: string[];
  fallback_tr: string[];
  topics: HomeworkTopic[];
}

export interface HomeworkConfigView {
  config: HomeworkConfig;
  defaults: HomeworkConfig;
  isCustomized: boolean;
  updatedAt: string | null;
}

export async function fetchHomeworkConfig() {
  return request<HomeworkConfigView>("/api/admin/homework-config");
}

export async function saveHomeworkConfig(config: HomeworkConfig) {
  return request<HomeworkConfigView>("/api/admin/homework-config", {
    method: "PUT",
    body: JSON.stringify({ config }),
  });
}

export async function resetHomeworkConfig() {
  return request<HomeworkConfigView>("/api/admin/homework-config/reset", { method: "POST" });
}

export type AutomationType = "custom" | "affirmation";

export interface Automation {
  id: string;
  type: AutomationType;
  name: string;
  enabled: boolean;
  title_en: string;
  title_tr: string;
  body_en: string;
  body_tr: string;
  topic: string;
  time: string; // "HH:MM"
  days: number[]; // 0=Sun..6=Sat; [] = every day
  timezone: string;
  lastSentDate: string | null;
  lastRunAt: string | null;
  createdAt: string | null;
}

export interface AffirmationSample {
  id: string;
  affirmation_en: string;
  affirmation_tr: string;
  symptom_en: string;
  symptom_tr: string;
}

export interface PushStats {
  total: number;
  byLanguage: Record<string, number>;
}

export interface SendResult {
  sent: number;
  failed: number;
  removed: number;
  audience: number;
}

export type AutomationInput = Pick<
  Automation,
  "type" | "name" | "enabled" | "title_en" | "title_tr" | "body_en" | "body_tr" | "topic" | "time" | "days" | "timezone"
>;

export async function fetchAutomations() {
  return request<{ automations: Automation[]; push: PushStats }>("/api/admin/automations");
}

export async function createAutomation(input: AutomationInput) {
  return request<{ automation: Automation; automations: Automation[] }>("/api/admin/automations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateAutomation(id: string, input: AutomationInput) {
  return request<{ automation: Automation; automations: Automation[] }>(
    `/api/admin/automations/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export async function deleteAutomation(id: string) {
  return request<{ success: boolean; automations: Automation[] }>(
    `/api/admin/automations/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export async function sendAutomation(id: string) {
  return request<{ success: boolean; result: SendResult }>(
    `/api/admin/automations/${encodeURIComponent(id)}/send`,
    { method: "POST" },
  );
}

export async function fetchAffirmationSample(topic?: string) {
  const q = topic ? `?topic=${encodeURIComponent(topic)}` : "";
  return request<{ sample: AffirmationSample | null }>(`/api/admin/affirmation-sample${q}`);
}

export async function broadcastPush(input: {
  title_en?: string;
  title_tr?: string;
  body_en?: string;
  body_tr?: string;
}) {
  return request<{ success: boolean; result: SendResult }>("/api/admin/push/broadcast", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export { API_BASE };
