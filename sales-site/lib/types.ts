export type Quote = { quote?: string; link?: string; date?: string };
export type Fact = { fact?: string; link?: string } | string;
export type Followup = { day: number; due?: string; ar?: string; en?: string; adds?: string };

export type Lead = {
  slug: string; name: string; niche: string | null; area: string | null; score: number | null;
  why_fits: string | null; status: string; status_note: string | null; route: "A" | "B" | "C" | null;
  owner_name: string | null; owner_role: string | null; owner_confidence: string | null; owner_source: string | null;
  direct_contact: string | null; direct_type: string | null; contact_url: string | null;
  website: string | null; instagram: string | null; whatsapp_public: string | null; phone_public: string | null;
  google_rating: string | null; google_reviews: string | null; closing_time: string | null; after_hours: string | null;
  evidence: { unanswered_comments?: Quote[]; slow_reply_reviews?: Quote[]; other_evidence?: Fact[]; unknowns?: string[]; branches?: string | null; staff?: string | null };
  message: { ar: string; en: string; route: string | null; send_lang: string; angle: string; angle_key?: string | null; to: string; followups: Followup[] } | null;
  check_result: { summary?: string } | null;
  check_plan: { question: string; from: string; to: string; closes: string } | null;
  demo_url: string | null; audio: { voice_note?: string; call?: string };
  in_today: boolean; today_rank: number | null; followup_due: number | null;
  contacted_at: string | null; last_contacted_at: string | null; replied_at: string | null;
};

export type Worker = {
  heartbeat_at: string | null; power_on: boolean; running: string | null; queue: string[];
  hunt: { on?: boolean; note?: string; cells?: number; done?: number; batchesToday?: number };
  sender_status: string | null; today_sent: number; daily_limit: number; queue_left: number; eleven_week: number; eleven_cap: number;
};

export type Stats = {
  total_leads: number; owners_found: number; ready: number; sent_total: number; sent_today: number;
  replied: number; demos_booked: number; won: number; cells_done: number; cells_total: number; by_niche: Record<string, number> | null;
};

export type Job = { id: number; task: string; params: Record<string, unknown>; status: string; result: string | null; created_at: string };
export type LogLine = { id: number; line: string; kind: string; created_at: string };

export const STATUSES = ["sent", "replied", "demo-booked", "won", "lost", "do-not-contact"] as const;
