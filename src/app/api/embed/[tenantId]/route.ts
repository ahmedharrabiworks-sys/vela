import { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const { tenantId } = params;
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://app.vela.ai";
  // source=site (set only by the auto-injected script on a published Vela
  // site, see site/[tenantId]/route.ts) vs. absent (an externally pasted
  // embed) -- passed through to the widget so conversations are tagged
  // with the correct channel.
  const source = req.nextUrl.searchParams.get("source") === "site" ? "site" : "";
  // CRITICAL FIX: identifies exactly which of this tenant's websites the
  // widget is embedded on -- see the comment in site/[tenantId]/route.ts's
  // buildWidgetScript for the full root-cause explanation (a tenant's own
  // business_name is account-level, not per-website).
  const websiteId = req.nextUrl.searchParams.get("websiteId") || "";

  // Round 5 FIX 7: the floating button was a fixed Vela-brand gradient
  // regardless of the site it's embedded on -- same fix as the widget
  // iframe's own chat UI (chat-client.tsx), applied here too since this is
  // the actual bubble a visitor sees first, before opening the chat. Looks
  // up the exact website when websiteId is known (precise); falls back to
  // the tenant's most-recently-updated published site otherwise (the old
  // approximation, still used for externally-pasted embeds with no
  // websiteId context).
  let accentColor: string | null = null;
  // FIX 6 (round M): this route is now the SINGLE source of truth for
  // whether the widget should actually render -- fetched fresh by the
  // browser on every real page load (short cache below), unlike the parent
  // site HTML which can be served from a stale cache for minutes. Reuses
  // the SAME live website lookup this route already ran for accentColor --
  // no new query, just one more selected column.
  let disabled = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;
    const query = admin.from("websites").select("published_spec, embed_ai_assistant").eq("is_published", true);
    const { data: site } = websiteId
      ? await query.eq("id", websiteId).eq("tenant_id", tenantId).maybeSingle()
      : await query.eq("tenant_id", tenantId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    disabled = site?.embed_ai_assistant === false;
    const spec = site?.published_spec as { designDNA?: { palette?: { accent?: string } } } | null;
    const accent = spec?.designDNA?.palette?.accent;
    if (typeof accent === "string" && /^#[0-9a-f]{6}$/i.test(accent)) accentColor = accent;
  } catch { /* fall back to brand gradient below; never treat a lookup failure as "disabled" */ }

  if (disabled) {
    return new Response("", {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        // FIX 2 (round N): real root cause of "turning ON takes up to ~2
        // minutes, OFF is instant" -- confirmed live via x-vercel-cache
        // response headers. Vercel's Edge Network caches this route's
        // response by URL for the full max-age window, and that cache is
        // purely TIME-based -- a DB write (the toggle) has no way to
        // invalidate it. Once an edge node caches the DISABLED (empty)
        // response, it keeps serving that exact response for up to 30s
        // from ITS OWN edge PoP regardless of the toggle being flipped back
        // on in between -- and with multiple edge regions each caching
        // independently on their own schedule, a real visitor's requests
        // landing on different PoPs compounds this into a much longer
        // effective delay than any single 30s window, matching the
        // reported ~2 minutes. A toggle's live state is exactly the kind of
        // thing that must never be time-cached at any layer -- switched to
        // no-store so every single request (both directions) always hits
        // this function fresh and reads the real current DB value, with no
        // caching-layer asymmetry possible in either direction.
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
  const btnGradient = accentColor
    ? `linear-gradient(135deg,${accentColor},${accentColor})`
    : "linear-gradient(135deg,#FF6B35,#FF3366)";
  const btnShadowColor = accentColor ? `${accentColor}73` : "rgba(255,107,53,0.45)"; // 45% alpha hex suffix

  const js = `
(function () {
  if (document.getElementById('__vela_widget')) return;

  var tenantId  = ${JSON.stringify(tenantId)};
  var base      = ${JSON.stringify(base)};
  var source    = ${JSON.stringify(source)};
  var websiteId = ${JSON.stringify(websiteId)};

  // Deliberately NOT persisted anywhere (no sessionStorage/localStorage
  // dismiss flag): a real, separately-confirmed bug had the widget bubble
  // disappear entirely after a browser/PC restart on a previously-working
  // site. Browsers with "reopen previous tabs" session restore treat a
  // restored tab as a CONTINUATION of the same sessionStorage session, so a
  // dismiss flag written there could easily explain exactly that symptom on
  // a future visit. A flick-dismiss below only ever hides the widget for
  // the CURRENT page view (a plain in-memory flag) -- every fresh
  // load/reload/revisit always shows it again, no exceptions, no state
  // that can outlive the page.

  // FIX (position persistence): drag-to-reposition position survives
  // reloads on this domain via localStorage, scoped per tenant so multiple
  // embeds on the same domain don't fight over one saved position.
  var POS_KEY = '__vela_widget_pos_' + tenantId;
  var savedPos = null;
  try {
    var raw = localStorage.getItem(POS_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      // Validate before trusting a stored position -- a corrupted/stale
      // value (e.g. from a future format change) must never be able to
      // place the button off-screen, where it would look "disappeared"
      // exactly like the confirmed restart bug this whole rewrite guards
      // against.
      if (parsed && isFinite(parsed.right) && isFinite(parsed.bottom) &&
          parsed.right >= 0 && parsed.right < 4000 &&
          parsed.bottom >= 0 && parsed.bottom < 4000) {
        savedPos = parsed;
      }
    }
  } catch (e) {}

  var ICON_CHAT = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>';
  var ICON_CLOSE = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4l12 12M16 4L4 16" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>';

  /* Floating button */
  var btn = document.createElement('button');
  btn.id = '__vela_btn';
  btn.setAttribute('aria-label', 'Open chat');
  btn.innerHTML = ICON_CHAT;
  var baseRight  = savedPos ? savedPos.right  : 24;
  var baseBottom = savedPos ? savedPos.bottom : 24;
  btn.style.cssText = [
    'position:fixed', 'bottom:' + baseBottom + 'px', 'right:' + baseRight + 'px',
    'width:56px', 'height:56px', 'border-radius:50%',
    'background:${btnGradient}',
    'border:none', 'cursor:grab', 'z-index:9998',
    'box-shadow:0 4px 20px ${btnShadowColor}',
    'display:flex', 'align-items:center', 'justify-content:center',
    'transition:opacity 0.2s, box-shadow 0.2s', 'touch-action:none'
  ].join(';');

  /* iframe */
  var frame = document.createElement('iframe');
  frame.id    = '__vela_widget';
  var qs = [];
  if (source)    qs.push('source=' + source);
  if (websiteId) qs.push('websiteId=' + encodeURIComponent(websiteId));
  frame.src   = base + '/widget/' + tenantId + (qs.length ? '?' + qs.join('&') : '');
  frame.title = 'Chat with us';
  var frameRight  = baseRight;
  var frameBottom = baseBottom + 72;
  frame.style.cssText = [
    'position:fixed', 'bottom:' + frameBottom + 'px', 'right:' + frameRight + 'px',
    'width: min(400px, calc(100vw - 48px))', 'height:520px',
    'border:none', 'border-radius:16px',
    'box-shadow:0 8px 40px rgba(0,0,0,0.18)',
    'z-index:9999', 'display:none',
    'transition:opacity 0.25s, transform 0.25s',
    'opacity:0', 'transform:translateY(12px)'
  ].join(';');

  function repositionFrame() {
    frame.style.right  = btn.style.right;
    frame.style.bottom = (parseFloat(btn.style.bottom) + 72) + 'px';
  }

  var open = false;
  function setOpen(next) {
    open = next;
    frame.style.display = open ? 'block' : 'none';
    setTimeout(function () {
      frame.style.opacity  = open ? '1' : '0';
      frame.style.transform = open ? 'translateY(0)' : 'translateY(12px)';
    }, open ? 10 : 0);
    // FIX: icon used to rotate 45deg when open, turning the chat-bubble
    // glyph into an illegible tilted shape instead of a real close icon.
    // Now swaps to a proper upright X -- no rotation, ever.
    btn.innerHTML = open ? ICON_CLOSE : ICON_CHAT;
    btn.setAttribute('aria-label', open ? 'Close chat' : 'Open chat');
  }

  // FIX: the panel itself had no close control of its own -- the ONLY way
  // to close was clicking the same floating button again. The iframe
  // (chat-client.tsx) now posts a message when its own close button is
  // clicked; listen for it here since the parent page owns the toggle state.
  window.addEventListener('message', function (ev) {
    if (ev && ev.data && ev.data.type === 'vela-widget-close') setOpen(false);
  });

  /* Drag-to-reposition + flick-to-dismiss (pointer events cover mouse + touch) */
  var dragging = false, moved = false, startX = 0, startY = 0;
  var startRight = 0, startBottom = 0;
  var lastX = 0, lastY = 0, lastT = 0, vx = 0, vy = 0;

  function onPointerDown(e) {
    dragging = true; moved = false;
    var p = e.touches ? e.touches[0] : e;
    startX = lastX = p.clientX; startY = lastY = p.clientY;
    lastT = Date.now();
    startRight  = parseFloat(btn.style.right)  || 24;
    startBottom = parseFloat(btn.style.bottom) || 24;
    btn.style.cursor = 'grabbing';
  }

  function onPointerMove(e) {
    if (!dragging) return;
    var p = e.touches ? e.touches[0] : e;
    var dx = p.clientX - startX, dy = p.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
    if (!moved) return;
    e.preventDefault();

    var now = Date.now();
    var dt = Math.max(1, now - lastT);
    vx = (p.clientX - lastX) / dt;
    vy = (p.clientY - lastY) / dt;
    lastX = p.clientX; lastY = p.clientY; lastT = now;

    var newRight  = Math.max(8, Math.min(window.innerWidth  - 64, startRight  - dx));
    var newBottom = Math.max(8, Math.min(window.innerHeight - 64, startBottom - dy));
    btn.style.right  = newRight  + 'px';
    btn.style.bottom = newBottom + 'px';
    if (open) repositionFrame();
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    btn.style.cursor = 'grab';
    if (!moved) return; // a plain click, not a drag -- let onclick handle it

    // Flick-to-dismiss: fast enough movement (any direction) dismisses the
    // bubble for the rest of this session rather than leaving it stuck
    // wherever the flick ended.
    var speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > 1.2) {
      // In-memory only for this page view -- see the note above the widget
      // hides for the rest of THIS page, but is never suppressed on the
      // next load/reload/navigation.
      btn.style.transition = 'opacity 0.2s, transform 0.2s';
      btn.style.opacity = '0';
      btn.style.transform = 'scale(0.5)';
      setOpen(false);
      setTimeout(function () {
        btn.remove(); frame.remove();
      }, 200);
      return;
    }

    // Persist the dropped position (not a dismiss -- just moved).
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({
        right: parseFloat(btn.style.right), bottom: parseFloat(btn.style.bottom)
      }));
    } catch (e) {}
  }

  btn.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  btn.addEventListener('touchstart', onPointerDown, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp);

  btn.onclick = function () {
    if (moved) { moved = false; return; } // suppress the click that follows a drag
    setOpen(!open);
  };

  document.body.appendChild(frame);
  document.body.appendChild(btn);
})();
`.trim();

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // FIX 2 (round N): no-store -- see the matching comment on the
      // disabled branch above for the full root-cause (Vercel Edge caching
      // is time-based and cannot be invalidated by the toggle's DB write,
      // causing a real, confirmed asymmetric delay between the two
      // directions). Both branches must behave identically here.
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
