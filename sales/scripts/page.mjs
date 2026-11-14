// Shared page shell for today.html and check-plan.html: Vela brand, self
// contained (no external scripts), mobile 375 px first.
export const h = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "")) ? h(u) : "");

export function shell(title, body) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${h(title)}</title>
<style>
:root{--o:#ed5426;--o2:#9e3819;--ink:#111;--mut:#6b7280;--line:#efe4dc;--cream:#fff8f3}
*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font:15px/1.5 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:860px;margin:0 auto;padding:16px}
h1{font-size:22px;margin:4px 0 2px}h2{font-size:16px;margin:0}.sub{color:var(--mut);font-size:13px;margin:0 0 16px}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;margin:12px 0;box-shadow:0 8px 24px rgba(80,30,10,.05)}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.sp{flex:1}
.pill{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:700;background:#fff1ea;color:#c2410c}
.pill.g{background:#ecfdf5;color:#15803d}.pill.m{background:#f3f4f6;color:#4b5563}
.score{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:#fff;background:linear-gradient(135deg,var(--o),var(--o2))}
.k{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin:14px 0 4px}
ul{margin:4px 0;padding-inline-start:18px}li{margin:2px 0}a{color:#c2410c;overflow-wrap:anywhere}
.msg{border:1px solid var(--line);border-radius:12px;padding:12px;margin-top:8px;background:#fffdfb;white-space:pre-wrap}
.msg[dir=rtl]{font-family:"IBM Plex Sans Arabic",Tahoma,sans-serif;font-size:16px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 14px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink);font-weight:700;font-size:14px;text-decoration:none;cursor:pointer}
.btn.p{background:linear-gradient(135deg,var(--o),var(--o2));color:#fff;border:0}
audio{width:100%;margin-top:6px}.unk{color:var(--mut);font-size:13px}
.wrap{overflow-wrap:anywhere}
@media (max-width:420px){main{padding:12px}.card{padding:14px}}
</style></head><body><main>${body}</main>
<script>
document.addEventListener('click',async e=>{const b=e.target.closest('[data-copy]');if(!b)return;const t=document.getElementById(b.dataset.copy).innerText;try{await navigator.clipboard.writeText(t);const o=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=o,1500)}catch{}});
</script></body></html>`;
}
