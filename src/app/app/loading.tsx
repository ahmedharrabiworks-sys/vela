// Perf round FIX 3: instant loading UI for every /app/* route. Placed next
// to layout.tsx (not per-route) so it's the shared Suspense fallback for
// every nested segment under /app that doesn't define a more specific
// loading.tsx of its own -- avoids a blank/frozen screen during the page's
// JS chunk fetch on a client-side navigation, without needing ~15 near-
// duplicate files. Pure static markup, no state, no client JS beyond the
// pulse animation (already defined via Tailwind's animate-pulse).
export default function AppLoading() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-7 w-40 rounded-lg bg-[#F3F4F6] animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-[#F3F4F6] animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-[#F3F4F6] animate-pulse" />
      <div className="h-40 rounded-2xl bg-[#F3F4F6] animate-pulse" />
    </div>
  );
}
