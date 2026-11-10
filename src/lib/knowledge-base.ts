/**
 * The one knowledge base. tenant_config.knowledge_base is the only source the
 * text chat, the phone agent and the owner assistant read. This file is safe
 * in the browser and on the server; database helpers are in
 * knowledge-base-server.ts.
 */

import { formatWeeklyHours, normalizeSchedule, parseOpeningHours, type OpeningHours } from "./opening-hours";

export interface KbService {
  name: string;
  price: string;
  duration: string;
  description: string;
}

export interface KnowledgeBase {
  services: KbService[];
  faqs: Array<{ q: string; a: string }>;
  business: {
    hours: string;
    // Structured week; hours above is its readable text, kept in sync.
    schedule?: OpeningHours | null;
    address: string;
    bookingPolicy: string;
    tone: "professional" | "friendly" | "luxury";
  };
  extra: string;
}

export const EMPTY_KB: KnowledgeBase = {
  services: [],
  faqs: [],
  business: { hours: "", address: "", bookingPolicy: "", tone: "professional" },
  extra: "",
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Accepts the stored JSON string, an object, or nothing; always returns a full shape. */
export function parseKnowledgeBase(raw: unknown): KnowledgeBase {
  let o: Record<string, unknown> = {};
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === "object") o = parsed as Record<string, unknown>;
  } catch { /* malformed: treated as empty */ }

  const b = (o.business && typeof o.business === "object" ? o.business : {}) as Record<string, unknown>;
  const tone = b.tone === "friendly" || b.tone === "luxury" ? b.tone : "professional";
  return {
    services: (Array.isArray(o.services) ? o.services : [])
      .filter((s) => s && typeof s === "object")
      .map((s: Record<string, unknown>) => ({ name: str(s.name), price: str(s.price), duration: str(s.duration), description: str(s.description) })),
    faqs: (Array.isArray(o.faqs) ? o.faqs : [])
      .filter((f) => f && typeof f === "object")
      .map((f: Record<string, unknown>) => ({ q: str(f.q), a: str(f.a) })),
    business: { hours: str(b.hours), schedule: normalizeSchedule(b.schedule), address: str(b.address), bookingPolicy: str(b.bookingPolicy), tone },
    extra: str(o.extra),
  };
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function appendText(existing: string, addition: string): string {
  const add = addition.trim();
  if (!add || existing.includes(add)) return existing;
  return existing.trim() ? `${existing.trim()}\n\n${add}` : add;
}

/**
 * Adds imported knowledge without losing anything already saved: a service
 * with the same name is updated (blank fields never erase), others are kept.
 */
export function mergeImportedKnowledge(existing: KnowledgeBase, incoming: KnowledgeBase): KnowledgeBase {
  const services = existing.services.map((s) => ({ ...s }));
  for (const s of incoming.services) {
    if (!s.name.trim()) continue;
    const match = services.find((x) => sameName(x.name, s.name));
    if (match) {
      match.price = s.price || match.price;
      match.duration = s.duration || match.duration;
      match.description = s.description || match.description;
    } else {
      services.push({ ...s });
    }
  }
  const faqs = [...existing.faqs];
  for (const f of incoming.faqs) if (f.q && !faqs.some((x) => sameName(x.q, f.q))) faqs.push(f);
  return {
    services,
    faqs,
    business: {
      hours: incoming.business.hours || existing.business.hours,
      schedule: incoming.business.hours ? null : existing.business.schedule,
      address: incoming.business.address || existing.business.address,
      bookingPolicy: incoming.business.bookingPolicy || existing.business.bookingPolicy,
      tone: existing.business.tone,
    },
    extra: appendText(existing.extra, incoming.extra),
  };
}

/**
 * Keeps the weekly editor and the free text in step, wherever a save came
 * from: a changed week rewrites the text, a changed text re-reads the week.
 */
export function syncHoursFields(prev: KnowledgeBase, next: KnowledgeBase): KnowledgeBase {
  const weekChanged = JSON.stringify(prev.business.schedule ?? null) !== JSON.stringify(next.business.schedule ?? null);
  if (weekChanged && next.business.schedule) {
    return { ...next, business: { ...next.business, hours: formatWeeklyHours(next.business.schedule) } };
  }
  if (prev.business.hours.trim() !== next.business.hours.trim()) {
    return { ...next, business: { ...next.business, schedule: parseOpeningHours(next.business.hours) } };
  }
  return next;
}

export type KbSection = "services" | "hours" | "address" | "policy" | "extra";

export function knowledgeChecklist(kb: KnowledgeBase): Record<KbSection, boolean> {
  return {
    services: kb.services.some((s) => s.name.trim()),
    hours: !!kb.business.hours.trim(),
    address: !!kb.business.address.trim(),
    policy: !!kb.business.bookingPolicy.trim(),
    extra: !!kb.extra.trim(),
  };
}

export interface SuggestedFact {
  kind: "note" | "price";
  fact: string;
  service_name?: string | null;
  price?: string | null;
}

/** What approving a suggestion does. Used by the server and to update the open editor. */
export function applySuggestion(kb: KnowledgeBase, s: SuggestedFact): KnowledgeBase {
  if (s.kind === "price" && s.service_name && s.price) {
    const name = s.service_name;
    const price = s.price;
    const exists = kb.services.some((x) => sameName(x.name, name));
    return {
      ...kb,
      services: exists
        ? kb.services.map((x) => (sameName(x.name, name) ? { ...x, price } : x))
        : [...kb.services, { name, price, duration: "", description: "" }],
    };
  }
  return { ...kb, extra: appendText(kb.extra, s.fact) };
}
