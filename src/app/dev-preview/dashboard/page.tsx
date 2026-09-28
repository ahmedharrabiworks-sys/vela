import { notFound } from "next/navigation";
import DashboardPreviewClient from "./DashboardPreviewClient";

// Dev-only preview of the populated Dashboard (Dashboard-redesign round,
// FIX 1 verification requirement #3): renders DashboardPageUI with fixture
// data so the "real data only" look can be verified without needing a
// production account with real history. Never deployed as a real route --
// 404s outright whenever NODE_ENV is production, checked at request time
// (a Server Component, not a client-side redirect, so this can't be
// reached by a direct URL hit in prod either).
export default function DashboardPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <DashboardPreviewClient />;
}
