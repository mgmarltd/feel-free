// Notification scheduler.
//
// Ticks once a minute, evaluates every enabled automation against its local
// time/weekday, and broadcasts the ones that are due (once per day, guarded by
// lastSentDate). Timezone math uses Intl — no dependency.

const automationStore = require('./automationStore');
const pushService = require('./pushService');

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Current wall-clock in a timezone → { hhmm: 'HH:MM', date: 'YYYY-MM-DD', dow: 0-6 }.
function nowInTz(timezone) {
  const tz = timezone || automationStore.DEFAULT_TZ;
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    }).formatToParts(new Date());
  } catch (e) {
    // Bad timezone → fall back to default.
    return nowInTz(automationStore.DEFAULT_TZ);
  }
  const get = (t) => parts.find((p) => p.type === t)?.value || '';
  let hour = get('hour');
  if (hour === '24') hour = '00'; // some ICU builds emit 24 at midnight
  return {
    hhmm: `${hour}:${get('minute')}`,
    date: `${get('year')}-${get('month')}-${get('day')}`,
    dow: WEEKDAY_INDEX[get('weekday')] ?? 0,
  };
}

function isDue(automation, now) {
  if (!automation.enabled) return false;
  if (automation.time !== now.hhmm) return false;
  if (Array.isArray(automation.days) && automation.days.length && !automation.days.includes(now.dow)) {
    return false;
  }
  if (automation.lastSentDate === now.date) return false; // already fired today
  return true;
}

async function runDueAutomation(automation) {
  const now = nowInTz(automation.timezone);
  // Mark BEFORE sending so a slow send can't double-fire on the next tick.
  automationStore.markSent(automation.id, now.date, new Date().toISOString());
  try {
    const res = await pushService.broadcast(pushService.resolvePayload(automation));
    console.log(`[scheduler] fired "${automation.name}" (${automation.type || 'custom'}) → sent=${res.sent} failed=${res.failed} audience=${res.audience}`);
  } catch (e) {
    console.error(`[scheduler] automation "${automation.name}" send error:`, e.message || e);
  }
}

async function tick() {
  try {
    const automations = automationStore.list();
    for (const a of automations) {
      const now = nowInTz(a.timezone);
      if (isDue(a, now)) {
        // eslint-disable-next-line no-await-in-loop
        await runDueAutomation(a);
      }
    }
  } catch (e) {
    console.error('[scheduler] tick error:', e.message || e);
  }
}

let timer = null;

function start() {
  if (timer) return;
  // Align loosely to minute boundaries by checking every 30s; the lastSentDate
  // guard + HH:MM match keep it exactly-once-per-day.
  timer = setInterval(tick, 30000);
  console.log('[scheduler] started (30s tick)');
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, tick, nowInTz };
