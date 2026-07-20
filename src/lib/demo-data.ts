// ⚠ DEMO ONLY — Real app pages (src/app/app/*) must never import from this file.

export const DEMO_PROFILE = {
  name: "Dr. Ahmed Al-Rashid",
  initials: "AA",
  plan: "pro",
  email: "ahmed@ahmeddentalclinic.ae",
  business: "Ahmed Dental Clinic",
};

export type DemoKPI = { label: string; value: string; change?: number };
export type DemoConv = { id: string; customer_name: string; channel: string; preview: string; time: string; isNew: boolean };
export type DemoAppt = { id: string; time: string; name: string; service: string; status: string };

export const DEMO_KPIS: DemoKPI[] = [
  { label: "kpiTotalLeads",        value: "184", change: 23 },
  { label: "kpiNewLeads",          value: "47",  change: 12 },
  { label: "kpiAppointmentsToday", value: "8",   change: 5  },
];

export const DEMO_CONVS: DemoConv[] = [
  { id: "c1", customer_name: "Sara Khalid",     channel: "whatsapp",  preview: "Is Tuesday 11 AM still available?",    time: "1m",  isNew: true  },
  { id: "c2", customer_name: "Mohammed Hassan", channel: "instagram", preview: "What are your prices for whitening?",  time: "5m",  isNew: true  },
  { id: "c3", customer_name: "Layla Mansouri",  channel: "whatsapp",  preview: "I'd like to book a cleaning please",  time: "18m", isNew: false },
  { id: "c4", customer_name: "Omar Al-Farsi",   channel: "website",   preview: "Do you accept Daman insurance?",      time: "1h",  isNew: false },
  { id: "c5", customer_name: "Fatima Nasser",   channel: "instagram", preview: "How long does a root canal take?",    time: "3h",  isNew: false },
];

export const DEMO_APPTS: DemoAppt[] = [
  { id: "a1", time: "09:00", name: "Sara Khalid",    service: "Dental Cleaning",   status: "confirmed" },
  { id: "a2", time: "10:30", name: "Rania Mahmoud",  service: "Teeth Whitening",   status: "confirmed" },
  { id: "a3", time: "12:00", name: "Khaled Ibrahim", service: "Cavity Filling",    status: "pending"   },
  { id: "a4", time: "14:00", name: "Nour Al-Saad",   service: "Orthodontic Check", status: "confirmed" },
  { id: "a5", time: "15:30", name: "Omar Al-Farsi",  service: "Root Canal",        status: "confirmed" },
  { id: "a6", time: "16:45", name: "Aisha Qasim",    service: "Dental Cleaning",   status: "pending"   },
];

// ── Phase-2 fixtures (not yet wired to pages) ────────────────────────────

export type DemoLead = {
  id: string; name: string; channel: string; status: string; phone: string | null; updated_at: string;
};

export const DEMO_LEADS: DemoLead[] = [
  { id: "l01", name: "Sara Khalid",     channel: "whatsapp",  status: "new",       phone: "+971 50 123 4567", updated_at: new Date(Date.now() -  2 * 60000).toISOString() },
  { id: "l02", name: "Mohammed Hassan", channel: "instagram", status: "new",       phone: null,               updated_at: new Date(Date.now() -  5 * 60000).toISOString() },
  { id: "l03", name: "Layla Mansouri",  channel: "whatsapp",  status: "contacted", phone: "+971 55 987 6543", updated_at: new Date(Date.now() - 18 * 60000).toISOString() },
  { id: "l04", name: "Omar Al-Farsi",   channel: "website",   status: "contacted", phone: "+971 56 234 5678", updated_at: new Date(Date.now() -  1 * 3600000).toISOString() },
  { id: "l05", name: "Fatima Nasser",   channel: "instagram", status: "qualified", phone: null,               updated_at: new Date(Date.now() -  3 * 3600000).toISOString() },
  { id: "l06", name: "Rania Mahmoud",   channel: "whatsapp",  status: "qualified", phone: "+971 52 345 6789", updated_at: new Date(Date.now() -  5 * 3600000).toISOString() },
  { id: "l07", name: "Khaled Ibrahim",  channel: "whatsapp",  status: "booked",    phone: "+971 50 456 7890", updated_at: new Date(Date.now() -  8 * 3600000).toISOString() },
  { id: "l08", name: "Nour Al-Saad",    channel: "website",   status: "booked",    phone: "+971 54 567 8901", updated_at: new Date(Date.now() - 12 * 3600000).toISOString() },
  { id: "l09", name: "Aisha Qasim",     channel: "instagram", status: "client",    phone: null,               updated_at: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: "l10", name: "Hassan Youssef",  channel: "whatsapp",  status: "client",    phone: "+971 50 678 9012", updated_at: new Date(Date.now() - 48 * 3600000).toISOString() },
];
