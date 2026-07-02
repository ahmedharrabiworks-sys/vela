import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const { tenantId } = params;
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://app.vela.ai";

  const js = `
(function () {
  if (document.getElementById('__vela_widget')) return;

  var tenantId = ${JSON.stringify(tenantId)};
  var base     = ${JSON.stringify(base)};

  /* Floating button */
  var btn = document.createElement('button');
  btn.id = '__vela_btn';
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>';
  btn.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px',
    'width:56px', 'height:56px', 'border-radius:50%',
    'background:linear-gradient(135deg,#FF6B35,#FF3366)',
    'border:none', 'cursor:pointer', 'z-index:9998',
    'box-shadow:0 4px 20px rgba(255,107,53,0.45)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'transition:transform 0.2s'
  ].join(';');

  /* iframe */
  var frame = document.createElement('iframe');
  frame.id    = '__vela_widget';
  frame.src   = base + '/widget/' + tenantId;
  frame.title = 'Chat with us';
  frame.style.cssText = [
    'position:fixed', 'bottom:96px', 'right:24px',
    'width:400px', 'height:600px',
    'border:none', 'border-radius:16px',
    'box-shadow:0 8px 40px rgba(0,0,0,0.18)',
    'z-index:9999', 'display:none',
    'transition:opacity 0.25s, transform 0.25s',
    'opacity:0', 'transform:translateY(12px)'
  ].join(';');

  var open = false;
  btn.onclick = function () {
    open = !open;
    frame.style.display = open ? 'block' : 'none';
    setTimeout(function () {
      frame.style.opacity  = open ? '1' : '0';
      frame.style.transform = open ? 'translateY(0)' : 'translateY(12px)';
    }, open ? 10 : 0);
    btn.style.transform = open ? 'rotate(45deg) scale(0.9)' : 'scale(1)';
  };

  document.body.appendChild(frame);
  document.body.appendChild(btn);
})();
`.trim();

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
