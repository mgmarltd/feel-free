// Admin dashboard API — authentication + read-only aggregation over the
// file-based user store. Mounted at /api/admin by index.js.
//
// Auth: a tiny HS256 JWT implemented with Node's built-in crypto (no extra
// dependencies). The admin signs in with ADMIN_EMAIL / ADMIN_PASSWORD and
// receives a bearer token that every other admin route requires.
//
// Env:
//   ADMIN_EMAIL        admin login email      (default admin@calmutopia.app)
//   ADMIN_PASSWORD     admin login password   (default calmutopia-admin)
//   ADMIN_JWT_SECRET   token signing secret   (default derived from password)
//   ADMIN_TOKEN_TTL_H  token lifetime, hours  (default 168 = 7 days)

const crypto = require('crypto');
const express = require('express');
const userStore = require('./userStore');
const affirmations = require('./affirmations');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@calmutopia.app').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'calmutopia-admin';
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || `calmutopia::${ADMIN_PASSWORD}`;
const TTL_SECONDS = (parseInt(process.env.ADMIN_TOKEN_TTL_H, 10) || 168) * 3600;

if (!process.env.ADMIN_PASSWORD) {
  console.warn('[admin] ADMIN_PASSWORD not set — using insecure default. Set it in .env for production.');
}

// ─── Minimal HS256 JWT ────────────────────────────────────────────────────
function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + TTL_SECONDS };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(body))}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const data = `${parts[0]}.${parts[1]}`;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (body.exp && Math.floor(Date.now() / 1000) > body.exp) return null;
    return body;
  } catch (e) {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.admin = payload;
  next();
}

// Constant-time string compare for credentials.
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// ─── Aggregation helpers ────────────────────────────────────────────────────
function toTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

// Best-effort "last active" timestamp for a user record.
function lastActive(profile) {
  return toTime(profile.lastSessionDate) || toTime(profile.updatedAt) || null;
}

function ageFromDob(dob) {
  if (!dob || typeof dob !== 'object' || typeof dob.year !== 'number') return null;
  const now = new Date();
  let age = now.getFullYear() - dob.year;
  const m = now.getMonth() - (dob.monthIndex || 0);
  if (m < 0 || (m === 0 && now.getDate() < (dob.day || 1))) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

function countBy(items, keyFn) {
  const map = {};
  for (const item of items) {
    const key = keyFn(item);
    if (key == null || key === '') continue;
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function summarizeUser(userId, profile) {
  const hw = Array.isArray(profile.homeworks) ? profile.homeworks : [];
  return {
    userId,
    name: profile.name || null,
    email: profile.email || null,
    language: profile.language || null,
    source: profile.source || null,
    goal: profile.goal || null,
    feeling: profile.feeling || null,
    stress: profile.stress || null,
    gender: profile.gender || null,
    age: ageFromDob(profile.dob),
    sessionCount: profile.sessionCount || 0,
    homeworkCount: hw.length,
    homeworkCompleted: hw.filter((h) => h && h.completedAt).length,
    hasSelfAnalysis: !!(profile.selfAnalysis && profile.selfAnalysis.summary),
    lastActive: lastActive(profile),
    updatedAt: profile.updatedAt || null,
  };
}

// Build a flat, time-sorted activity feed from the user store.
function buildActivity(allUsers, limit = 40) {
  const events = [];
  for (const [userId, profile] of Object.entries(allUsers)) {
    const who = profile.name || profile.email || userId;
    if (profile.lastSessionDate) {
      events.push({
        type: 'session',
        userId,
        who,
        at: toTime(profile.lastSessionDate),
        detail: `Completed a session (#${profile.sessionCount || 1})`,
      });
    }
    if (profile.selfAnalysis && profile.selfAnalysis.summary) {
      events.push({
        type: 'analysis',
        userId,
        who,
        at: toTime(profile.updatedAt),
        detail: profile.selfAnalysis.summary.slice(0, 140),
      });
    }
    const hw = Array.isArray(profile.homeworks) ? profile.homeworks : [];
    for (const h of hw) {
      if (h && h.createdAt) {
        events.push({
          type: 'homework',
          userId,
          who,
          at: toTime(h.createdAt),
          detail: `New homework: ${h.title || h.topic || 'practice'}`,
        });
      }
      if (h && h.completedAt) {
        events.push({
          type: 'homework_done',
          userId,
          who,
          at: toTime(h.completedAt),
          detail: `Completed homework: ${h.title || h.topic || 'practice'}`,
        });
      }
    }
  }
  return events
    .filter((e) => e.at)
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

// Daily activity counts for the last `days` days (today-anchored).
function activityByDay(allUsers, days = 30) {
  const buckets = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets[d.toISOString().slice(0, 10)] = 0;
  }
  for (const profile of Object.values(allUsers)) {
    const t = lastActive(profile);
    if (!t) continue;
    const key = new Date(t).toISOString().slice(0, 10);
    if (key in buckets) buckets[key] += 1;
  }
  return Object.entries(buckets).map(([day, count]) => ({ day, count }));
}

// ─── Router ─────────────────────────────────────────────────────────────────
function createAdminRouter() {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!safeEqual(email, ADMIN_EMAIL) || !safeEqual(password, ADMIN_PASSWORD)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signToken({ role: 'admin', email });
    res.json({ token, email });
  });

  router.get('/me', requireAdmin, (req, res) => {
    res.json({ email: req.admin.email, role: req.admin.role });
  });

  // Aggregate KPIs + breakdowns + trend for the Overview page.
  router.get('/overview', requireAdmin, (req, res) => {
    const all = userStore.getAll();
    const entries = Object.entries(all);
    const profiles = entries.map(([, p]) => p);
    const now = Date.now();
    const DAY = 86400000;

    const totalSessions = profiles.reduce((sum, p) => sum + (p.sessionCount || 0), 0);
    const allHw = profiles.flatMap((p) => (Array.isArray(p.homeworks) ? p.homeworks : []));
    const completedHw = allHw.filter((h) => h && h.completedAt).length;
    const active7 = profiles.filter((p) => {
      const t = lastActive(p);
      return t && now - t <= 7 * DAY;
    }).length;
    const active30 = profiles.filter((p) => {
      const t = lastActive(p);
      return t && now - t <= 30 * DAY;
    }).length;

    res.json({
      kpis: {
        totalUsers: entries.length,
        activeUsers7d: active7,
        activeUsers30d: active30,
        totalSessions,
        totalHomeworks: allHw.length,
        completedHomeworks: completedHw,
        homeworkCompletionRate: allHw.length ? Math.round((completedHw / allHw.length) * 100) : 0,
        selfAnalyses: profiles.filter((p) => p.selfAnalysis && p.selfAnalysis.summary).length,
        affirmations: affirmations.count(),
      },
      breakdowns: {
        language: countBy(profiles, (p) => p.language),
        source: countBy(profiles, (p) => p.source),
        goal: countBy(profiles, (p) => p.goal),
        stress: countBy(profiles, (p) => p.stress),
        feeling: countBy(profiles, (p) => p.feeling),
      },
      activityByDay: activityByDay(all, 30),
      recentActivity: buildActivity(all, 8),
    });
  });

  // Paginated / searchable user list (summaries only).
  router.get('/users', requireAdmin, (req, res) => {
    const all = userStore.getAll();
    let list = Object.entries(all).map(([id, p]) => summarizeUser(id, p));

    const q = String(req.query.q || '').trim().toLowerCase();
    if (q) {
      list = list.filter((u) =>
        [u.userId, u.name, u.email, u.goal, u.source]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    list.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
    res.json({ count: list.length, users: list });
  });

  // Full profile (incl. homeworks + self-analysis transcript) for one user.
  router.get('/users/:userId', requireAdmin, (req, res) => {
    const profile = userStore.getUser(req.params.userId);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json({
      userId: req.params.userId,
      profile,
      summary: summarizeUser(req.params.userId, profile),
      homeworks: Array.isArray(profile.homeworks) ? profile.homeworks : [],
    });
  });

  // Full activity feed.
  router.get('/activity', requireAdmin, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    res.json({ activity: buildActivity(userStore.getAll(), limit) });
  });

  return router;
}

module.exports = { createAdminRouter, requireAdmin, signToken, verifyToken };
