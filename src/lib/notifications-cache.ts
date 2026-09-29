// Perf round FIX 3: Sidebar.tsx and NotificationBell.tsx each independently
// fetch /api/notifications on mount (confirmed live via a real authenticated
// Playwright session -- both fired within milliseconds of each other on
// every single /app page load). They intentionally keep separate component
// state (see Sidebar's own comment above its fetch effect), so this doesn't
// merge them -- it only collapses the underlying network call: a short
// dedupe window means two callers that ask within the same few seconds
// share one real fetch instead of issuing two.
export interface NotificationRow {
  id: string;
  type: "lead" | "appointment" | "missed_call";
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationsPayload {
  notifications: NotificationRow[];
  unreadCount: number;
}

let cached: NotificationsPayload | null = null;
let inFlight: Promise<NotificationsPayload | null> | null = null;
let fetchedAt = 0;

// Covers "both components mounted on the same page load" and "both
// components' independent 30s poll timers happen to fire together" --
// without caching so long that a real new notification feels delayed.
const DEDUPE_WINDOW_MS = 5_000;

export async function fetchNotificationsShared(): Promise<NotificationsPayload | null> {
  const now = Date.now();
  if (cached && now - fetchedAt < DEDUPE_WINDOW_MS) return cached;
  if (inFlight) return inFlight;

  inFlight = fetch("/api/notifications")
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { notifications?: NotificationRow[]; unreadCount?: number } | null) => {
      if (!data) return null;
      const payload: NotificationsPayload = {
        notifications: data.notifications ?? [],
        unreadCount: data.unreadCount ?? 0,
      };
      cached = payload;
      fetchedAt = Date.now();
      return payload;
    })
    .catch(() => null)
    .finally(() => { inFlight = null; });

  return inFlight;
}
