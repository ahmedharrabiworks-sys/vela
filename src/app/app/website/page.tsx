"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { setBottomSheetOpen } from "@/lib/useBottomSheetState";
import { useTheme } from "@/lib/theme";
import ChannelAiConfigFields from "@/components/ui/ChannelAiConfigFields";
import type { WebsiteSpec } from "@/lib/website-renderer";

// FIX 2 (round G): real smoothed-curve chart for the Analytics panel's daily
// visits, matching the exact visual language of the main Analytics page's
// LineChart (same cubic-bezier smoothing, gradient area fill, single
// endpoint dot, grid lines, "No data yet" honest state when every day is
// zero) -- self-contained here rather than importing that page's local
// function, so this panel can't regress if Analytics' own chart changes.
function WebsiteVisitsChart({ data, height = 140 }: { data: { date: string; count: number }[]; height?: number }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#2A2A32" : "#F3F4F6";
  const axisTextColor = theme === "dark" ? "#6E6E76" : "#9CA3AF";
  const W = 800, H = height, padX = 8, padTop = 12, padBottom = 20;
  const chartH = H - padTop - padBottom;
  const counts = data.map((d) => d.count);
  const max = Math.max(...counts, 1);
  const n = counts.length;
  const hasData = counts.some((v) => v > 0);
  const [hover, setHover] = useState<{ i: number; clientX: number; clientY: number } | null>(null);

  const pts = counts.map((v, i) => ({
    x: padX + (i / Math.max(n - 1, 1)) * (W - padX * 2),
    y: padTop + ((max - v) / max) * chartH,
  }));
  let d = pts.length > 0 ? `M ${pts[0].x} ${pts[0].y}` : "";
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const cpX = (p0.x + p1.x) / 2;
    d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  const areaD = pts.length > 0 ? d + ` L ${pts[pts.length - 1].x} ${H - padBottom} L ${pts[0].x} ${H - padBottom} Z` : "";

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!hasData || n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((relX - padX) / (W - padX * 2)) * Math.max(n - 1, 1))));
    setHover({ i, clientX: e.clientX, clientY: e.clientY });
  };
  const hp = hover ? pts[hover.i] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none"
        onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="wbVisitsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => {
          const y = padTop + (i / 3) * chartH;
          return <line key={i} x1={padX} x2={W - padX} y1={y} y2={y} stroke={gridColor} strokeWidth="1"/>;
        })}
        {hasData && (
          <>
            <path d={areaD} fill="url(#wbVisitsGrad)"/>
            <path d={d} fill="none" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            {pts.length > 0 && <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="4" fill="#FF6B35" stroke="white" strokeWidth="1.5"/>}
            {hp && (
              <>
                <line x1={hp.x} x2={hp.x} y1={padTop} y2={H - padBottom} stroke="#FF6B35" strokeWidth="1" strokeDasharray="3,3" opacity="0.4"/>
                <circle cx={hp.x} cy={hp.y} r="5" fill="#FF6B35" stroke="white" strokeWidth="2"/>
              </>
            )}
          </>
        )}
        {!hasData && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11" fill={axisTextColor}>No data yet</text>
        )}
      </svg>
      {hover && hasData && data[hover.i] && (
        <div className="fixed z-50 pointer-events-none bg-[#111111] text-white text-xs rounded-lg px-3 py-2 shadow-lg"
          style={{ left: hover.clientX + 14, top: hover.clientY - 44 }}>
          <p className="font-semibold whitespace-nowrap">{new Date(data[hover.i].date).toLocaleDateString("default", { weekday: "short", month: "short", day: "numeric" })}</p>
          <p className="text-[#FF6B35] font-bold">{data[hover.i].count} visits</p>
        </div>
      )}
    </div>
  );
}

// ── Spec helpers (for inline edit mode) ──────────────────────────────────────
function extractSpec(html: string): WebsiteSpec | null {
  const m = html.match(/<!-- WEBSITE_SPEC: ([\s\S]+?) -->/);
  if (!m) return null;
  try { return JSON.parse(m[1]) as WebsiteSpec; } catch { return null; }
}

// Self-contained edit script injected into the preview iframe when Edit mode is ON.
// Reads window.VS_SPEC, annotates editable text elements with data-ve attributes,
// and postMessages { type:"vela-edit", sectionIndex, field, itemIndex?, subField?, value }
// to the parent on blur.
const EDIT_SCRIPT = String.raw`(function(){
'use strict';
var spec=window.VS_SPEC;
if(!spec||!Array.isArray(spec.sections))return;
/* ── Edit-mode styles ──────────────────────────────────────────────────── */
var sty=document.createElement('style');
sty.textContent=[
  '[data-ve]{cursor:pointer;transition:outline .12s;}',
  '[data-ve]:hover{outline:2px dashed rgba(255,107,53,.65);outline-offset:2px;border-radius:2px;}',
  '[data-ve][data-ve-active]{outline:2px solid #FF6B35!important;outline-offset:2px;border-radius:2px;}',
  '#ve-panel{position:fixed;z-index:99999;background:#fff;border:1px solid #E5E7EB;border-radius:12px;',
    'box-shadow:0 8px 40px rgba(0,0,0,.18);padding:12px 14px;display:flex;flex-direction:column;',
    'gap:9px;width:258px;max-height:80vh;overflow-y:auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;}',
  '#ve-panel[hidden]{display:none!important;}',
  '.vep-row{display:flex;align-items:center;gap:5px;}',
  '.vep-grp{display:flex;flex-direction:column;gap:4px;}',
  '.vep-lbl{font-size:10px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:.05em;}',
  '.vep-btn{flex:1;padding:4px 6px;border:1px solid #E5E7EB;border-radius:6px;background:#fff;',
    'cursor:pointer;font-size:12px;font-weight:500;text-align:center;transition:all .1s;color:#374151;}',
  '.vep-btn.on,.vep-btn:hover{background:#FF6B35;color:#fff;border-color:#FF6B35;}',
  '.vep-ta{width:100%;border:1px solid #E5E7EB;border-radius:7px;padding:7px 9px;',
    'font-size:13px;resize:vertical;min-height:54px;font-family:inherit;line-height:1.45;box-sizing:border-box;}',
  '.vep-ta:focus{outline:2px solid #FF6B35;outline-offset:-1px;border-color:transparent;}',
  '.vep-divider{height:1px;background:#F3F4F6;margin:1px 0;}',
  '[data-vs]{position:relative;}',
  '.vs-rbar{position:absolute;top:10px;right:10px;z-index:9990;display:flex;gap:4px;',
    'opacity:0;transition:opacity .15s;pointer-events:none;}',
  '[data-vs]:hover>.vs-rbar{opacity:1;pointer-events:auto;}',
  '.vs-rbtn{background:rgba(17,17,17,.72);backdrop-filter:blur(4px);color:#fff;border:none;',
    'border-radius:7px;width:30px;height:30px;cursor:pointer;font-size:16px;display:flex;',
    'align-items:center;justify-content:center;transition:background .12s;line-height:1;}',
  '.vs-rbtn:hover{background:#FF6B35;}',
].join('');
document.head.appendChild(sty);
/* ── Build floating panel DOM ──────────────────────────────────────────── */
var panel=document.createElement('div');
panel.id='ve-panel';
panel.setAttribute('hidden','');
document.body.appendChild(panel);
var _ta=document.createElement('textarea');
_ta.className='vep-ta';
_ta.placeholder='Edit text…';
panel.appendChild(_ta);
var _div1=document.createElement('div');_div1.className='vep-divider';panel.appendChild(_div1);
function mkGrp(label,items){
  var g=document.createElement('div');g.className='vep-grp';
  var l=document.createElement('div');l.className='vep-lbl';l.textContent=label;g.appendChild(l);
  var r=document.createElement('div');r.className='vep-row';
  var btns=items.map(function(it){
    var b=document.createElement('button');b.className='vep-btn';b.textContent=it.lbl;b.dataset.val=it.val;
    r.appendChild(b);return b;
  });
  g.appendChild(r);return{g:g,btns:btns};
}
var szGrp=mkGrp('Size',[{lbl:'S',val:'small'},{lbl:'M',val:'default'},{lbl:'L',val:'large'}]);
panel.appendChild(szGrp.g);
var wtGrp=mkGrp('Weight',[{lbl:'Normal',val:'normal'},{lbl:'Bold',val:'bold'}]);
panel.appendChild(wtGrp.g);
var alGrp=mkGrp('Align',[{lbl:'←',val:'left'},{lbl:'↔',val:'center'},{lbl:'→',val:'right'}]);
panel.appendChild(alGrp.g);
var _div2=document.createElement('div');_div2.className='vep-divider';panel.appendChild(_div2);
var clrGrp=document.createElement('div');clrGrp.className='vep-grp';
var clrLbl=document.createElement('div');clrLbl.className='vep-lbl';clrLbl.textContent='Color';
clrGrp.appendChild(clrLbl);
var clrRow=document.createElement('div');clrRow.className='vep-row';
var clrInp=document.createElement('input');
clrInp.type='color';
clrInp.style.cssText='width:34px;height:28px;border:1px solid #E5E7EB;border-radius:6px;padding:2px 3px;cursor:pointer;flex-shrink:0;';
var clrReset=document.createElement('button');
clrReset.className='vep-btn';clrReset.textContent='Reset';clrReset.style.flex='1';
clrRow.appendChild(clrInp);clrRow.appendChild(clrReset);
clrGrp.appendChild(clrRow);panel.appendChild(clrGrp);
/* ── Section spacing group ──────────────────────────────────────────────── */
var _div3=document.createElement('div');_div3.className='vep-divider';panel.appendChild(_div3);
var SP_VALS=['','16px','32px','48px','64px'];
var SP_LBLS=['—','S','M','L','XL'];
var topGrp=mkGrp('↑ Top',SP_VALS.map(function(v,i){return{lbl:SP_LBLS[i],val:v};}));
panel.appendChild(topGrp.g);
var botGrp=mkGrp('↓ Bot',SP_VALS.map(function(v,i){return{lbl:SP_LBLS[i],val:v};}));
panel.appendChild(botGrp.g);
/* ── Section border group ──────────────────────────────────────────────── */
var _div4=document.createElement('div');_div4.className='vep-divider';panel.appendChild(_div4);
var SHADOW_VALS=['','0 1px 3px rgba(0,0,0,.08)','0 4px 16px rgba(0,0,0,.12)','0 8px 32px rgba(0,0,0,.20)'];
var bdrWGrp=mkGrp('Border',[{lbl:'—',val:''},{lbl:'1px',val:'1px'},{lbl:'2px',val:'2px'}]);
panel.appendChild(bdrWGrp.g);
var bdrClrGrp=document.createElement('div');bdrClrGrp.className='vep-grp';
var bdrClrLbl=document.createElement('div');bdrClrLbl.className='vep-lbl';bdrClrLbl.textContent='Border color';bdrClrGrp.appendChild(bdrClrLbl);
var bdrClrRow=document.createElement('div');bdrClrRow.className='vep-row';
var bdrClrInp=document.createElement('input');bdrClrInp.type='color';
bdrClrInp.style.cssText='width:34px;height:28px;border:1px solid #E5E7EB;border-radius:6px;padding:2px 3px;cursor:pointer;flex-shrink:0;';
bdrClrInp.value='#374151';
var bdrReset=document.createElement('button');bdrReset.className='vep-btn';bdrReset.textContent='Reset';bdrReset.style.flex='1';
bdrClrRow.appendChild(bdrClrInp);bdrClrRow.appendChild(bdrReset);
bdrClrGrp.appendChild(bdrClrRow);panel.appendChild(bdrClrGrp);
/* ── Section shadow group ──────────────────────────────────────────────── */
var shdGrp=mkGrp('Shadow',[{lbl:'—',val:SHADOW_VALS[0]},{lbl:'Low',val:SHADOW_VALS[1]},{lbl:'Med',val:SHADOW_VALS[2]},{lbl:'High',val:SHADOW_VALS[3]}]);
panel.appendChild(shdGrp.g);
/* ── Per-element spacing ────────────────────────────────────────────────── */
var _div_elsp=document.createElement('div');_div_elsp.className='vep-divider';panel.appendChild(_div_elsp);
var elTopGrp=mkGrp('El ↑',SP_VALS.map(function(v,i){return{lbl:SP_LBLS[i],val:v};}));
panel.appendChild(elTopGrp.g);
var elBotGrp=mkGrp('El ↓',SP_VALS.map(function(v,i){return{lbl:SP_LBLS[i],val:v};}));
panel.appendChild(elBotGrp.g);
var elSpEls=[_div_elsp,elTopGrp.g,elBotGrp.g];
elSpEls.forEach(function(el2){el2.style.display='none';});
/* ── State ─────────────────────────────────────────────────────────────── */
var curEl=null,curSi=null,curF=null,curIi=null,curSk=null;
var curTop='',curBot='',curBorderW='',curBorderC='#374151',curShadow='',curElTop='',curElBot='';
var FS={small:'0.85em','default':'',large:'1.3em'};
var FW={normal:'','bold':'bold'};
var TA={left:'left',center:'center',right:'right'};
function pe(si,f,ii,sk,v){parent.postMessage({type:'vela-edit',sectionIndex:si,field:f,itemIndex:ii!=null?ii:undefined,subField:sk!=null?sk:undefined,value:v},'*');}
function ps(key,st){parent.postMessage({type:'vela-style',key:key,style:st},'*');}
function psp(si,top,bot){parent.postMessage({type:'vela-spacing',sectionIndex:si,paddingTop:top,paddingBottom:bot},'*');}
function pbdr(si,border){parent.postMessage({type:'vela-border',sectionIndex:si,border:border},'*');}
function pshd(si,boxShadow){parent.postMessage({type:'vela-shadow',sectionIndex:si,boxShadow:boxShadow},'*');}
function pels(si,etype,top,bot){parent.postMessage({type:'vela-el-spacing',sectionIndex:si,elementType:etype,marginTop:top,marginBottom:bot},'*');}
function isHeading(f){return f==='headline'||f==='subheadline'||f==='eyebrow';}
function isCta(f){return f==='ctaPrimary'||f==='ctaSecondary'||f==='ctaText';}
function elTypeOf(f){return isHeading(f)?'heading':isCta(f)?'cta':'';}
function sKey(si,f,ii,sk){return si+'_'+(f||'')+'_'+(ii!=null?ii:'')+'_'+(sk!=null?sk:'');}
function hexOf(el){var c=getComputedStyle(el).color,m=c.match(/\d+/g);if(!m)return'#000000';return'#'+[m[0],m[1],m[2]].map(function(n){return(+n).toString(16).padStart(2,'0')}).join('');}
function setActive(btns,val){btns.forEach(function(b){b.classList.toggle('on',b.dataset.val===val);});}
function applyS(el,props){
  if('fontSize'in props)el.style.fontSize=props.fontSize;
  if('fontWeight'in props)el.style.fontWeight=props.fontWeight;
  if('textAlign'in props)el.style.textAlign=props.textAlign;
  if('color'in props)el.style.color=props.color;
}
function pos(){
  if(!curEl||panel.hasAttribute('hidden'))return;
  var r=curEl.getBoundingClientRect(),pw=panel.offsetWidth||260,ph=panel.offsetHeight||300;
  var t=r.bottom+6,l=r.left;
  if(t+ph>window.innerHeight-8)t=r.top-ph-6;
  if(t<6)t=6;
  if(l+pw>window.innerWidth-8)l=window.innerWidth-pw-8;
  if(l<6)l=6;
  panel.style.top=t+'px';panel.style.left=l+'px';
}
function show(el,si,f,ii,sk){
  if(curEl)curEl.removeAttribute('data-ve-active');
  curEl=el;curSi=si;curF=f;curIi=ii;curSk=sk;
  el.setAttribute('data-ve-active','1');
  _ta.value=el.textContent||'';
  var cs=getComputedStyle(el);
  var fw=cs.fontWeight,fwVal=(parseInt(fw,10)>=600||fw==='bold')?'bold':'normal';
  var fsVal=el.style.fontSize?(el.style.fontSize.indexOf('0.85')>=0?'small':(el.style.fontSize.indexOf('1.3')>=0?'large':'default')):'default';
  setActive(szGrp.btns,fsVal);
  setActive(wtGrp.btns,fwVal);
  setActive(alGrp.btns,cs.textAlign||'left');
  clrInp.value=hexOf(el);
  var secEl=document.querySelector('[data-vs="'+si+'"]');
  curTop=secEl?(secEl.style.paddingTop||''):'';
  curBot=secEl?(secEl.style.paddingBottom||''):'';
  setActive(topGrp.btns,curTop);
  setActive(botGrp.btns,curBot);
  var borderEntry=(spec._sectionBorders||{})[String(si)];
  var storedBorder=borderEntry?(borderEntry.border||''):'';
  var bdrMatch=storedBorder.match(/^(\S+)\s+solid\s+(.+)$/);
  curBorderW=bdrMatch?bdrMatch[1]:'';
  curBorderC=bdrMatch?bdrMatch[2]:'#374151';
  setActive(bdrWGrp.btns,curBorderW);
  bdrClrInp.value=curBorderC||'#374151';
  var shadowEntry=(spec._sectionShadows||{})[String(si)];
  curShadow=shadowEntry?(shadowEntry.boxShadow||''):'';
  setActive(shdGrp.btns,curShadow);
  var eltype=elTypeOf(f);
  var elKey=String(si)+'_'+eltype;
  var elSt=(spec._sectionSpacing||{})[elKey]||{};
  curElTop=elSt.marginTop||'';
  curElBot=elSt.marginBottom||'';
  setActive(elTopGrp.btns,curElTop);
  setActive(elBotGrp.btns,curElBot);
  elSpEls.forEach(function(el2){el2.style.display=eltype?'':'none';});
  panel.removeAttribute('hidden');
  pos();
}
function hide(){
  if(curEl)curEl.removeAttribute('data-ve-active');
  curEl=null;panel.setAttribute('hidden','');
}
_ta.addEventListener('input',function(){if(curEl)curEl.textContent=_ta.value;});
_ta.addEventListener('blur',function(){if(!curEl)return;pe(curSi,curF,curIi,curSk,_ta.value);});
function wireBtns(btns,propFn){
  btns.forEach(function(b){b.addEventListener('click',function(){
    if(!curEl)return;
    var p=propFn(b.dataset.val);setActive(btns,b.dataset.val);applyS(curEl,p);
    ps(sKey(curSi,curF,curIi,curSk),p);pos();
  });});
}
wireBtns(szGrp.btns,function(v){return{fontSize:FS[v]||''};});
wireBtns(wtGrp.btns,function(v){return{fontWeight:FW[v]||''};});
wireBtns(alGrp.btns,function(v){return{textAlign:TA[v]||''};});
clrInp.addEventListener('input',function(){if(!curEl)return;applyS(curEl,{color:clrInp.value});ps(sKey(curSi,curF,curIi,curSk),{color:clrInp.value});});
clrReset.addEventListener('click',function(){if(!curEl)return;applyS(curEl,{color:''});ps(sKey(curSi,curF,curIi,curSk),{color:''});});
topGrp.btns.forEach(function(b){b.addEventListener('click',function(){
  if(curSi===null)return;
  var v=b.dataset.val||'';
  var sec=document.querySelector('[data-vs="'+curSi+'"]');
  if(sec)sec.style.paddingTop=v;
  curTop=v;setActive(topGrp.btns,v);psp(curSi,curTop,curBot);pos();
});});
botGrp.btns.forEach(function(b){b.addEventListener('click',function(){
  if(curSi===null)return;
  var v=b.dataset.val||'';
  var sec=document.querySelector('[data-vs="'+curSi+'"]');
  if(sec)sec.style.paddingBottom=v;
  curBot=v;setActive(botGrp.btns,v);psp(curSi,curTop,curBot);pos();
});});
bdrWGrp.btns.forEach(function(b){b.addEventListener('click',function(){
  if(curSi===null)return;
  var w=b.dataset.val||'';
  var border=w?w+' solid '+curBorderC:'';
  var sec=document.querySelector('[data-vs="'+curSi+'"]');
  if(sec)sec.style.border=border;
  curBorderW=w;setActive(bdrWGrp.btns,w);pbdr(curSi,border);pos();
});});
bdrClrInp.addEventListener('input',function(){
  if(curSi===null||!curBorderW)return;
  curBorderC=bdrClrInp.value;
  var border=curBorderW+' solid '+curBorderC;
  var sec=document.querySelector('[data-vs="'+curSi+'"]');
  if(sec)sec.style.border=border;
  pbdr(curSi,border);
});
bdrReset.addEventListener('click',function(){
  if(curSi===null)return;
  var sec=document.querySelector('[data-vs="'+curSi+'"]');
  if(sec)sec.style.border='';
  curBorderW='';curBorderC='#374151';setActive(bdrWGrp.btns,'');bdrClrInp.value='#374151';
  pbdr(curSi,'');pos();
});
shdGrp.btns.forEach(function(b){b.addEventListener('click',function(){
  if(curSi===null)return;
  var v=b.dataset.val||'';
  var sec=document.querySelector('[data-vs="'+curSi+'"]');
  if(sec)sec.style.boxShadow=v;
  curShadow=v;setActive(shdGrp.btns,v);pshd(curSi,v);pos();
});});
elTopGrp.btns.forEach(function(b){b.addEventListener('click',function(){
  if(!curEl||curSi===null)return;
  var v=b.dataset.val||'';
  curEl.style.marginTop=v;
  curElTop=v;setActive(elTopGrp.btns,v);
  var etype=elTypeOf(curF);if(!etype)return;
  pels(curSi,etype,curElTop,curElBot);pos();
});});
elBotGrp.btns.forEach(function(b){b.addEventListener('click',function(){
  if(!curEl||curSi===null)return;
  var v=b.dataset.val||'';
  curEl.style.marginBottom=v;
  curElBot=v;setActive(elBotGrp.btns,v);
  var etype=elTypeOf(curF);if(!etype)return;
  pels(curSi,etype,curElTop,curElBot);pos();
});});
document.addEventListener('click',function(e){if(!panel.hasAttribute('hidden')&&!panel.contains(e.target)&&e.target!==curEl)hide();});
document.addEventListener('keydown',function(e){if(e.key==='Escape')hide();});
/* ── mk: attach editable marker ────────────────────────────────────────── */
function mk(el,si,f,ii,sk){
  if(el.hasAttribute('data-ve'))return;
  el.setAttribute('data-ve','1');
  el.setAttribute('data-ve-si',String(si));
  el.setAttribute('data-ve-f',f||'');
  el.addEventListener('click',function(e){e.stopPropagation();e.preventDefault();show(el,si,f,ii,sk);});
}
/* ── Field definitions ─────────────────────────────────────────────────── */
var HERO=[{sel:'[class*="ws-hero-headline"]',field:'headline'},{sel:'[class*="ws-hero-sub"]',field:'subheadline'},{sel:'.ws-btn-accent',field:'ctaPrimary'},{sel:'.ws-btn-ghost',field:'ctaSecondary'},{sel:'.ws-btn-outline',field:'ctaSecondary'}];
var D={};
D['hero']=D['hero-fullbleed']=D['hero-split']=D['hero-minimal']=HERO;
D['about']=D['about-story']=[{sel:'.ws-heading',field:'headline'},{sel:'.ws-eyebrow',field:'eyebrow'},{sel:'p[style*="color:var(--color-muted)"]',field:'body'},{items:'.ws-bullet',arrayField:'bullets',fields:[{sel:'.ws-bullet-title',field:'title'},{sel:'.ws-bullet-text',field:'text'}]}];
D['services']=[{sel:'.ws-heading',field:'headline'},{sel:'.ws-subheading',field:'subheadline'},{sel:'.ws-eyebrow',field:'eyebrow'},{items:'.ws-service-card',arrayField:'items',fields:[{sel:'.ws-service-title',field:'title'},{sel:'.ws-service-desc',field:'description'},{sel:'.ws-service-price',field:'price'}]}];
D['feature-grid']=[{sel:'.ws-heading',field:'headline'},{sel:'.ws-subheading',field:'subheadline'},{sel:'.ws-eyebrow',field:'eyebrow'},{items:'.ws-feat-card',arrayField:'items',fields:[{sel:'.ws-feat-title',field:'title'},{sel:'.ws-feat-desc',field:'description'}]}];
D['testimonials']=D['testimonials-section']=[{sel:'.ws-heading',field:'headline'},{sel:'.ws-eyebrow',field:'eyebrow'},{items:'.ws-test-card',arrayField:'items',fields:[{sel:'.ws-test-quote',field:'quote'},{sel:'.ws-test-name',field:'name'},{sel:'.ws-test-role',field:'role'}]}];
D['team']=D['team-grid']=[{sel:'.ws-heading',field:'headline'},{sel:'.ws-eyebrow',field:'eyebrow'},{items:'.ws-team-card',arrayField:'members',fields:[{sel:'.ws-team-name',field:'name'},{sel:'.ws-team-role',field:'role'},{sel:'.ws-team-bio',field:'bio'}]}];
D['pricing-tiers']=[{sel:'.ws-heading',field:'headline'},{sel:'.ws-subheading',field:'subheadline'},{sel:'.ws-eyebrow',field:'eyebrow'},{items:'.ws-price-card',arrayField:'tiers',fields:[{sel:'.ws-price-name',field:'name'},{sel:'.ws-btn',field:'ctaText'}]}];
D['service-list']=[{sel:'.ws-heading',field:'headline'},{sel:'.ws-subheading',field:'subheadline'},{sel:'.ws-eyebrow',field:'eyebrow'},{items:'.ws-svc-item',arrayField:'items',fields:[{sel:'.ws-svc-title',field:'title'},{sel:'.ws-svc-desc',field:'description'},{sel:'.ws-svc-price',field:'price'}]}];
D['listings-grid']=[{sel:'.ws-heading',field:'headline'},{sel:'.ws-eyebrow',field:'eyebrow'},{items:'.ws-listing-card',arrayField:'items',fields:[{sel:'.ws-listing-title',field:'title'},{sel:'.ws-listing-sub',field:'subtitle'},{sel:'.ws-listing-desc',field:'description'},{sel:'.ws-listing-price',field:'price'}]}];
D['stats-band']=[{items:'.ws-stat',arrayField:'items',fields:[{sel:'.ws-stat-value',field:'value'},{sel:'.ws-stat-label',field:'label'}]}];
D['process-steps']=[{sel:'.ws-heading',field:'headline'},{sel:'.ws-eyebrow',field:'eyebrow'},{items:'.ws-step',arrayField:'steps',fields:[{sel:'.ws-step-title',field:'title'},{sel:'.ws-step-desc',field:'description'}]}];
D['faq']=D['faq-accordion']=[{sel:'.ws-heading',field:'headline'},{sel:'.ws-eyebrow',field:'eyebrow'},{items:'.ws-faq-item',arrayField:'items',fields:[{sel:'.ws-faq-q span:first-child',field:'q'},{sel:'.ws-faq-a',field:'a'}]}];
D['cta_banner']=D['cta-band']=[{sel:'.ws-cta-headline',field:'headline'},{sel:'.ws-cta-sub',field:'sub'},{sel:'.ws-btn-white',field:'ctaText'}];
D['booking']=D['contact-block']=[{sel:'.ws-heading',field:'headline'},{sel:'.ws-subheading',field:'subheadline'},{sel:'.ws-eyebrow',field:'eyebrow'},{sel:'button[type="submit"]',field:'ctaText'},{sel:'.ws-contact-value[data-field="phone"]',field:'phone'},{sel:'.ws-contact-value[data-field="email"]',field:'email'},{sel:'.ws-contact-value[data-field="address"]',field:'address'},{sel:'.ws-contact-value[data-field="hours"]',field:'hours'}];
D['footer']=[{sel:'.ws-footer-tag',field:'tagline'},{sel:'.ws-footer-bottom',field:'copyright'}];
D['gallery']=D['gallery-grid']=D['logo-strip']=D['product-grid']=[];
D['feature-showcase']=[{sel:'.ws-heading',field:'headline'},{sel:'.ws-eyebrow',field:'eyebrow'},{items:'.ws-showcase-item',arrayField:'items',fields:[{sel:'.ws-showcase-title',field:'title'},{sel:'.ws-showcase-desc',field:'description'}]}];
D['integration-grid']=[{sel:'.ws-heading',field:'headline'},{sel:'.ws-eyebrow',field:'eyebrow'},{items:'.ws-intg-tile',arrayField:'integrations',fields:[{sel:'.ws-intg-name',field:'name'}]}];
/* ── Process sections ──────────────────────────────────────────────────── */
function proc(el,si,sec){
  var defs=D[sec.type];if(!defs)return;
  defs.forEach(function(def){
    if(def.items){
      el.querySelectorAll(def.items).forEach(function(item,j){
        def.fields.forEach(function(fd){var t=item.querySelector(fd.sel);if(t)mk(t,si,def.arrayField,j,fd.field);});
      });
    }else{var t=el.querySelector(def.sel);if(t)mk(t,si,def.field,null,null);}
  });
}
document.querySelectorAll('[data-vs]').forEach(function(el){
  var vs=el.getAttribute('data-vs');
  if(vs==='footer'){var fi=spec.sections.findIndex(function(s){return s.type==='footer';});if(fi>=0)proc(el,fi,spec.sections[fi]);return;}
  var si=parseInt(vs,10);
  if(!isNaN(si)&&si<spec.sections.length)proc(el,si,spec.sections[si]);
});
/* ── Re-apply persisted text styles ────────────────────────────────────── */
var ts=spec._textStyles;
if(ts&&typeof ts==='object'){
  Object.keys(ts).forEach(function(key){
    var parts=key.split('_'),si=parseInt(parts[0],10),f=parts[1],st=ts[key];
    var sec=document.querySelector('[data-vs="'+si+'"]');if(!sec)return;
    sec.querySelectorAll('[data-ve-si="'+si+'"][data-ve-f="'+f+'"]').forEach(function(el){applyS(el,st);});
  });
}
/* ── Re-apply persisted section spacing + element spacing ──────────────── */
var ss=spec._sectionSpacing;
if(ss&&typeof ss==='object'){
  Object.keys(ss).forEach(function(key){
    var st=ss[key];
    if(key.indexOf('_')===-1){
      var sec=document.querySelector('[data-vs="'+key+'"]');if(!sec)return;
      if(st.paddingTop!==undefined)sec.style.paddingTop=st.paddingTop;
      if(st.paddingBottom!==undefined)sec.style.paddingBottom=st.paddingBottom;
    }else{
      var kp=key.split('_');var sec2=document.querySelector('[data-vs="'+kp[0]+'"]');if(!sec2)return;
      var elsel=kp[1]==='heading'?'[data-ve-f="headline"],[data-ve-f="subheadline"],[data-ve-f="eyebrow"]':
               kp[1]==='cta'?'[data-ve-f="ctaPrimary"],[data-ve-f="ctaSecondary"],[data-ve-f="ctaText"]':'';
      if(!elsel)return;
      sec2.querySelectorAll(elsel).forEach(function(eli){
        if(st.marginTop!==undefined)eli.style.marginTop=st.marginTop;
        if(st.marginBottom!==undefined)eli.style.marginBottom=st.marginBottom;
      });
    }
  });
}
/* ── Re-apply persisted section borders ────────────────────────────────── */
var sb=spec._sectionBorders;
if(sb&&typeof sb==='object'){
  Object.keys(sb).forEach(function(key){
    var st=sb[key];
    var sec=document.querySelector('[data-vs="'+key+'"]');if(!sec)return;
    if(st.border!==undefined)sec.style.border=st.border;
  });
}
/* ── Re-apply persisted section shadows ────────────────────────────────── */
var sshad=spec._sectionShadows;
if(sshad&&typeof sshad==='object'){
  Object.keys(sshad).forEach(function(key){
    var st=sshad[key];
    var sec=document.querySelector('[data-vs="'+key+'"]');if(!sec)return;
    if(st.boxShadow!==undefined)sec.style.boxShadow=st.boxShadow;
  });
}
/* ── Image click handler ───────────────────────────────────────────────── */
var imgSty=document.createElement('style');
imgSty.textContent='[data-vs] img{cursor:pointer;transition:filter .15s;}[data-vs] img:hover{filter:brightness(.78) saturate(.9);}';
document.head.appendChild(imgSty);
document.querySelectorAll('[data-vs] img').forEach(function(img){
  img.addEventListener('click',function(e){
    e.stopPropagation();e.preventDefault();
    var sec=img.closest('[data-vs]');if(!sec)return;
    var vs=sec.getAttribute('data-vs');
    var allImgs=Array.prototype.slice.call(sec.querySelectorAll('img'));
    var imgIdx=allImgs.indexOf(img);
    parent.postMessage({type:'vela-img-click',vs:vs,imgIdx:imgIdx,src:img.src},'*');
  });
});
/* ── Section reorder handles ────────────────────────────────────────────── */
var total=spec.sections.length;
document.querySelectorAll('[data-vs]').forEach(function(el){
  var vs=el.getAttribute('data-vs'),si=parseInt(vs,10);if(isNaN(si))return;
  var isFooter=si>=total-1&&spec.sections[si]&&spec.sections[si].type==='footer';
  if(isFooter)return;
  var bar=document.createElement('div');bar.className='vs-rbar';
  if(si>0){
    var up=document.createElement('button');up.className='vs-rbtn';up.title='Move up';up.innerHTML='&#8679;';
    up.addEventListener('click',function(e){e.stopPropagation();parent.postMessage({type:'vela-reorder',from:si,to:si-1},'*');});
    bar.appendChild(up);
  }
  var nextSec=spec.sections[si+1];
  var nextIsFooter=nextSec&&nextSec.type==='footer';
  if(si<total-1&&!nextIsFooter){
    var dn=document.createElement('button');dn.className='vs-rbtn';dn.title='Move down';dn.innerHTML='&#8681;';
    dn.addEventListener('click',function(e){e.stopPropagation();parent.postMessage({type:'vela-reorder',from:si,to:si+1},'*');});
    bar.appendChild(dn);
  }
  if(bar.children.length)el.appendChild(bar);
});
})();`;

// ── Types ─────────────────────────────────────────────────────────────────────
type AttachedImage = { preview: string; base64: string; mimeType: string };
type ContactInfo   = { phone: string; email: string; address: string; hours: string };

type VersionRecord = {
  id:         string;
  label:      string;
  siteName?:  string;
  created_at: string;
  type:       "generate" | "publish";
  html:       string;
};

type WebsiteProject = { id: string; name: string | null; slug: string | null; is_published: boolean; published_url?: string | null; updated_at?: string | null };

type AnalyticsData = {
  totalVisits:    number;
  uniqueVisitors: number;
  last7Days:      number;
  last30Days:     number;
  dailyVisits:    { date: string; count: number }[];
  topReferrers:   { referrer: string; count: number }[];
  deviceSplit:    { desktop: number; mobile: number; tablet: number };
};

type DevicePreset = "desktop" | "laptop" | "tablet" | "phone";

// Chat messages include both AI/user text, inline version cards, and session separators
type Msg = {
  role:        "ai" | "user" | "version";
  content:     string;
  isBuilding?: boolean;
  isError?:    boolean;
  isSeparator?: boolean;    // "New website" divider in the chat feed
  images?:     string[];
  // for role === "version"
  version?:    VersionRecord;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_ATTACH   = 4;
const MAX_IMG_SIZE = 5 * 1024 * 1024;

const INDUSTRY_SUGGESTIONS: Record<string, string[]> = {
  "Gym & Fitness":     ["Build a bold fitness website with membership plans", "Add a free trial offer section", "Show class schedule and trainers"],
  "Beauty & Wellness": ["Build a luxury salon website with service menu", "Make it elegant, rose-gold tones", "Add a before/after gallery section"],
  "Restaurant":        ["Build a warm restaurant site with menu", "Add a table reservation section", "Show signature dishes and ambiance"],
  "Medical Clinic":    ["Build a clean dental clinic website in Dubai Marina", "Show our specialties and team", "Add online appointment booking"],
  "Real Estate":       ["Build a premium property agency website", "Show featured listings with photos", "Add a free valuation CTA"],
  "Coffee Shop":       ["Build a cozy coffee shop website", "Show our drinks menu and story", "Make it warm and inviting"],
  "Education":         ["Build a modern education website", "Show our courses and success stories", "Highlight student outcomes"],
  "Hotel":             ["Build a luxury hotel website", "Show room types and amenities", "Add direct booking button"],
  "Law Firm":          ["Build an authoritative law firm website", "Show practice areas and team", "Add free consultation CTA"],
  "E-Commerce":        ["Build a product showcase site", "Show bestselling items with prices", "Add customer reviews section"],
};

const DEFAULT_SUGGESTIONS = [
  "Build a dental clinic website in Dubai Marina",
  "Build a gym website with membership plans",
  "Build a luxury hair salon website with service menu",
];

const PLAN_WEBSITE_LIMITS: Record<string, number> = { starter: 1, pro: 2, premium: 3 };

const LANGUAGE_OPTIONS = ["English", "Arabic", "French", "Spanish", "German", "Italian", "Portuguese", "Russian"];

const INITIAL_MSG = (btype: string | null, lang?: string): Msg => ({
  role: "ai",
  content: lang
    ? (btype && INDUSTRY_SUGGESTIONS[btype]
      ? `Great! I'll build your ${btype} website in ${lang}. What's your business name and location?`
      : `Great! I'll build your website in ${lang}. Tell me about your business. Name, what you do, and your city.`)
    : "Hi! First, what language should your website be in?",
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function stripImages(m: Msg): { role: string; content: string; isError?: boolean } {
  return { role: m.role, content: m.content, isError: m.isError };
}

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
  }
}

// ── Publish Panel ─────────────────────────────────────────────────────────────
function PublishPanel({
  isPublished, publishedUrl, visitCount,
  siteName, setSiteName, siteSlug, setSiteSlug, savedSlug, setSavedSlug,
  slugError, setSlugError, settingsError, setSettingsError,
  savingSettings, setSavingSettings, websiteId,
  customDomain, setCustomDomain, domainStatus, setDomainStatus,
  domainInput, setDomainInput, domainError, setDomainError,
  connectingDomain, setConnectingDomain, checkingDomain, setCheckingDomain,
  removingDomain, setRemovingDomain,
  draftDiffers, publishing, hasDraft, hasContactInfo, onPublish, onClose, setPublishedUrl,
}: {
  isPublished: boolean; publishedUrl: string; visitCount: number;
  siteName: string; setSiteName: (v: string) => void;
  siteSlug: string; setSiteSlug: (v: string) => void;
  savedSlug: string; setSavedSlug: (v: string) => void;
  slugError: string; setSlugError: (v: string) => void;
  settingsError: string; setSettingsError: (v: string) => void;
  savingSettings: boolean; setSavingSettings: (v: boolean) => void;
  websiteId: string | null;
  customDomain: string | null; setCustomDomain: (v: string | null) => void;
  domainStatus: "pending" | "verified" | "failed" | null; setDomainStatus: (v: "pending" | "verified" | "failed" | null) => void;
  domainInput: string; setDomainInput: (v: string) => void;
  domainError: string; setDomainError: (v: string) => void;
  connectingDomain: boolean; setConnectingDomain: (v: boolean) => void;
  checkingDomain: boolean; setCheckingDomain: (v: boolean) => void;
  removingDomain: boolean; setRemovingDomain: (v: boolean) => void;
  draftDiffers: boolean; publishing: boolean;
  hasDraft: boolean; hasContactInfo: boolean;
  onPublish: () => void; onClose: () => void;
  setPublishedUrl: (v: string) => void;
}) {
  // step 1=details, 2=pre-publish checks, 3=live/published view
  const [step, setStep] = useState<1 | 2 | 3>(() => (isPublished ? 3 : 1));
  type CheckItem = { id: string; label: string; status: "running" | "pass" | "warn" | "fail"; detail?: string };
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [checksRunning, setChecksRunning] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);
  const [showDomain, setShowDomain] = useState(false);
  const [showDomainGuide, setShowDomainGuide] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isDirty = siteSlug !== savedSlug;
  const [savedOk, setSavedOk] = useState(false);

  // Run real pre-publish checks when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    const ITEMS = [
      { id: "draft",    label: "Website draft ready" },
      { id: "contact",  label: "Contact info present" },
      { id: "endpoint", label: "Booking endpoint reachable" },
      { id: "slug",     label: "URL slug configured" },
    ];
    setChecks(ITEMS.map(c => ({ ...c, status: "running" as const })));
    setChecksRunning(true);
    (async () => {
      const done: CheckItem[] = [];
      const push = (item: CheckItem) => {
        done.push(item);
        setChecks([...done, ...ITEMS.slice(done.length).map(c => ({ ...c, status: "running" as const }))]);
      };
      push({ id: "draft", label: "Website draft ready",
        status: hasDraft ? "pass" : "fail",
        detail: !hasDraft ? "Generate your website first." : undefined });
      await new Promise(r => setTimeout(r, 220));
      push({ id: "contact", label: "Contact info present",
        status: hasContactInfo ? "pass" : "warn",
        detail: !hasContactInfo ? "No phone or email. Visitors won't be able to call or email you." : undefined });
      await new Promise(r => setTimeout(r, 220));
      let endpointOk = false;
      try { const r = await fetch("/api/health"); endpointOk = r.ok; } catch { endpointOk = false; }
      push({ id: "endpoint", label: "Booking endpoint reachable",
        status: endpointOk ? "pass" : "fail",
        detail: !endpointOk ? "Cannot reach the API. Try refreshing the page." : undefined });
      await new Promise(r => setTimeout(r, 220));
      push({ id: "slug", label: "URL slug configured",
        status: siteSlug.length >= 3 ? "pass" : "warn",
        detail: siteSlug.length < 3 ? "No slug set. Your site will use a generated URL." : undefined });
      setChecksRunning(false);
    })();
  }, [step, hasDraft, hasContactInfo, siteSlug]);

  // Advance to step 3 once publish completes (isPublished flips to true)
  const prevPublishedRef = useRef(isPublished);
  useEffect(() => {
    if (!prevPublishedRef.current && isPublished) setStep(3);
    prevPublishedRef.current = isPublished;
  }, [isPublished]);

  const handleSaveSettings = async (): Promise<boolean> => {
    if (!websiteId) return false;
    setSlugError(""); setSettingsError(""); setSavingSettings(true);
    let succeeded = false;
    try {
      const res  = await fetch("/api/website/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, name: siteName, slug: siteSlug }),
      });
      const data = await res.json() as { slug?: string; error?: string };
      if (!res.ok) {
        const msg = data.error ?? "Failed to save.";
        if (msg.toLowerCase().includes("slug")) setSlugError(msg);
        else setSettingsError(msg);
      } else {
        const confirmedSlug = data.slug || siteSlug;
        setSiteSlug(confirmedSlug);
        setSavedSlug(confirmedSlug);
        if (isPublished && confirmedSlug) setPublishedUrl(`/site/${confirmedSlug}`);
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 1500);
        succeeded = true;
      }
    } catch { setSettingsError("Connection error."); }
    finally { setSavingSettings(false); }
    return succeeded;
  };

  const handleConnectDomain = async () => {
    if (!websiteId) return;
    setDomainError(""); setConnectingDomain(true);
    try {
      const res  = await fetch("/api/website/domain", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput.trim(), websiteId }),
      });
      const data = await res.json() as { error?: string; domain?: string; status?: "pending" | "verified" | "failed" };
      if (!res.ok) {
        setDomainError(data.error ?? "Failed to save domain.");
      } else {
        setCustomDomain(data.domain ?? domainInput.trim());
        setDomainStatus("pending");
      }
    } catch { setDomainError("Connection error. Please try again."); }
    finally { setConnectingDomain(false); }
  };

  const handleCheckDomain = async () => {
    if (!websiteId) return;
    setDomainError(""); setCheckingDomain(true);
    try {
      const res  = await fetch(`/api/website/domain?websiteId=${encodeURIComponent(websiteId)}`);
      const data = await res.json() as { error?: string; status?: "pending" | "verified" | "failed" | null; message?: string };
      if (!res.ok) {
        setDomainError(data.error ?? "Could not check status.");
      } else {
        if (data.status) setDomainStatus(data.status as "pending" | "verified" | "failed");
        setDomainError(data.message ?? "");
      }
    } catch { setDomainError("Connection error. Please try again."); }
    finally { setCheckingDomain(false); }
  };

  const handleRemoveDomain = async () => {
    if (!customDomain || !websiteId) return;
    if (!confirm(`Remove ${customDomain}?`)) return;
    setRemovingDomain(true);
    try {
      const res = await fetch("/api/website/domain", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      });
      if (res.ok) { setCustomDomain(null); setDomainStatus(null); setDomainInput(""); setDomainError(""); }
    } catch { /* ignore */ }
    finally { setRemovingDomain(false); }
  };

  const handleCopyRecord = async (value: string) => {
    await copyText(value); setCopiedRecord(value);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  // Domain section — shared between step 1 and step 3 settings
  // Defined as a render helper (not a React component) so React never unmounts/remounts it on re-render.
  const renderDomainSection = () => (
    <div className="space-y-3">
      <button onClick={() => setShowDomain((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-[#374151] dark:text-[#9CA3AF] hover:text-[#FF6B35] transition-colors w-full text-left">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        {customDomain && domainStatus === "verified" ? `Custom domain: ${customDomain}` : "Add custom domain"}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`ml-auto transition-transform ${showDomain ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {showDomain && (
        <div className="flex justify-end">
          <button onClick={() => setShowDomainGuide(true)}
            className="text-[10px] font-semibold text-[#FF6B35] hover:underline">
            How to connect your domain?
          </button>
        </div>
      )}

      {showDomain && (
        customDomain ? (
          <div className="space-y-3">
            {/* Status row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                domainStatus === "verified" ? "bg-green-400" :
                domainStatus === "failed"   ? "bg-red-400"   : "bg-yellow-400"}`} />
              <span className="text-xs font-semibold text-[#111111] dark:text-white truncate max-w-[140px]">{customDomain}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                domainStatus === "verified" ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400" :
                domainStatus === "failed"   ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400"     : "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400"}`}>
                {domainStatus === "verified" ? "Connected" :
                 domainStatus === "failed"   ? "Failed. Records not found yet" : "Pending. Add DNS records"}
              </span>
            </div>

            {/* DNS setup instructions — shown until verified */}
            {domainStatus !== "verified" && (
              <div className="rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] bg-[#F9FAFB] dark:bg-[#1E1E24] p-3 space-y-2.5">
                <p className="text-[11px] text-[#6B7280] leading-relaxed">
                  Go to your domain registrar (GoDaddy, Namecheap, etc.), find DNS settings, and add these two records:
                </p>
                {/* A record */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-[#9CA3AF] shrink-0 w-11">A</span>
                  <span className="text-[10px] text-[#9CA3AF] shrink-0 w-7">@</span>
                  <code className="text-[11px] font-mono text-[#374151] dark:text-[#E5E7EB] flex-1 min-w-0 truncate">76.76.21.21</code>
                  <button onClick={() => handleCopyRecord("76.76.21.21")}
                    className="text-[11px] font-semibold text-[#FF6B35] hover:opacity-80 shrink-0">
                    {copiedRecord === "76.76.21.21" ? "Copied" : "Copy"}
                  </button>
                </div>
                {/* CNAME record */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-[#9CA3AF] shrink-0 w-11">CNAME</span>
                  <span className="text-[10px] text-[#9CA3AF] shrink-0 w-7">www</span>
                  <code className="text-[11px] font-mono text-[#374151] dark:text-[#E5E7EB] flex-1 min-w-0 truncate">cname.vercel-dns.com</code>
                  <button onClick={() => handleCopyRecord("cname.vercel-dns.com")}
                    className="text-[11px] font-semibold text-[#FF6B35] hover:opacity-80 shrink-0">
                    {copiedRecord === "cname.vercel-dns.com" ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-[10px] text-[#9CA3AF]">DNS changes can take up to 48 hours to propagate.</p>
              </div>
            )}

            {/* Informational / error message from last check */}
            {domainError && (
              <p className={`text-[11px] leading-relaxed ${domainStatus === "failed" ? "text-red-500" : "text-[#9CA3AF]"}`}>
                {domainError}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {domainStatus !== "verified" && (
                <button onClick={handleCheckDomain} disabled={checkingDomain}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#9CA3AF] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1E24] disabled:opacity-40 transition-colors">
                  {checkingDomain ? "Checking…" : "Check Status"}
                </button>
              )}
              <button onClick={handleRemoveDomain} disabled={removingDomain}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 transition-colors">
                {removingDomain ? "Removing…" : "Remove domain"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-stretch gap-2">
              <input value={domainInput} onChange={(e) => { setDomainInput(e.target.value); setDomainError(""); }}
                placeholder="mysalon.com or www.mysalon.com"
                className="flex-1 text-sm px-3 py-2 border border-[#E5E7EB] dark:border-[#2A2A32] rounded-lg focus:border-[#FF6B35] focus:outline-none bg-white dark:bg-[#1E1E24] text-[#111111] dark:text-[#E5E7EB] placeholder:text-[#9CA3AF]"
                onKeyDown={(e) => { if (e.key === "Enter") handleConnectDomain(); }}
              />
              <button onClick={handleConnectDomain} disabled={connectingDomain || !domainInput.trim()}
                className="text-[11px] font-semibold px-3 py-2 rounded-lg text-white hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap"
                style={{ background: "var(--vp-color)" }}>
                {connectingDomain ? "Saving…" : "Save"}
              </button>
            </div>
            {domainError && <p className="text-[11px] text-red-500">{domainError}</p>}
          </div>
        )
      )}

      {/* How to connect your domain — step-by-step guide. Vela does NOT
          register or provide a domain; the owner buys/owns it themselves at
          any registrar and points it here. */}
      {showDomainGuide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowDomainGuide(false)}>
          <div className="bg-white dark:bg-[#17171C] rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6] dark:border-[#2A2A32] sticky top-0 bg-white dark:bg-[#17171C]">
              <h2 className="text-base font-bold text-[#111111] dark:text-white">How to connect your domain</h2>
              <button onClick={() => setShowDomainGuide(false)} aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1E1E24] transition-colors">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
                Vela doesn&apos;t sell or include a domain. You buy and own your own domain from any registrar, then point it at your Vela site with the steps below.
              </p>
              {[
                { n: 1, title: "Buy a domain", body: "If you don't already own one, register it at any provider you like — GoDaddy, Namecheap, Google Domains, etc." },
                { n: 2, title: "Enter it above", body: "Type your domain into the field above and click Save." },
                { n: 3, title: "Add two DNS records", body: "In your registrar's DNS settings, add the A record and CNAME record shown above — copy buttons included." },
                { n: 4, title: "Wait for DNS to propagate", body: "This can take up to 48 hours, though it's often much faster." },
                { n: 5, title: "Check status", body: "Come back here and click Check Status. Once it says Connected, your domain is live." },
              ].map((step) => (
                <div key={step.n} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                    style={{ background: "var(--vp-color)" }}>
                    {step.n}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#111111] dark:text-white">{step.title}</p>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
              <button onClick={() => setShowDomainGuide(false)}
                className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity"
                style={{ background: "var(--vp-color)" }}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Site details form — render helper (not a React component) to avoid re-mount on every keystroke.
  const renderSiteDetailsForm = () => (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-[#374151] dark:text-[#9CA3AF] uppercase tracking-wide">Site Name</label>
        <input value={siteName} onChange={(e) => setSiteName(e.target.value)}
          placeholder="My Business"
          className="w-full text-sm px-3 py-2 border border-[#E5E7EB] dark:border-[#2A2A32] rounded-lg focus:border-[#FF6B35] focus:outline-none bg-white dark:bg-[#1E1E24] text-[#111111] dark:text-[#E5E7EB] placeholder:text-[#9CA3AF]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-[#374151] dark:text-[#9CA3AF] uppercase tracking-wide">URL Slug</label>
        <div className="flex items-stretch border border-[#E5E7EB] dark:border-[#2A2A32] rounded-lg overflow-hidden focus-within:border-[#FF6B35]">
          <span className="text-[11px] text-[#9CA3AF] bg-[#F9FAFB] dark:bg-[#101014] px-2.5 flex items-center border-r border-[#E5E7EB] dark:border-[#2A2A32] whitespace-nowrap shrink-0">/site/</span>
          <input value={siteSlug}
            onChange={(e) => { setSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugError(""); }}
            placeholder="my-business"
            className="flex-1 text-sm px-3 py-2 focus:outline-none bg-white dark:bg-[#1E1E24] text-[#111111] dark:text-[#E5E7EB] placeholder:text-[#9CA3AF]"
          />
        </div>
        {slugError && <p className="text-[11px] text-red-500">{slugError}</p>}
        {siteSlug.length >= 3 && (
          isDirty ? (
            <p className="text-[10px] text-[#9CA3AF] dark:text-[#6B7280] truncate italic px-0.5">
              Will become: {origin}/site/{siteSlug}
            </p>
          ) : (
            <div className="flex items-center gap-2 bg-[#F9FAFB] dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-lg px-2.5 py-1.5 overflow-hidden">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" className="shrink-0"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              <span className="text-[10px] font-mono text-[#6B7280] dark:text-[#9CA3AF] truncate">{origin}/site/{siteSlug}</span>
            </div>
          )
        )}
        {isDirty && savedSlug.length >= 3 && (
          <p className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-lg px-2.5 py-1.5 leading-snug">
            Unsaved. Your site is still at <span className="font-mono">/site/{savedSlug}</span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 bg-[#F9FAFB] dark:bg-[#1E1E24] rounded-lg px-3 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
        <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]"><strong className="text-[#374151] dark:text-[#E5E7EB]">Public</strong>. Anyone with the URL can view</span>
      </div>
      {settingsError && <p className="text-[11px] text-red-500">{settingsError}</p>}
      <button onClick={handleSaveSettings} disabled={savingSettings || !websiteId}
        className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${
          savedOk    ? "bg-green-500 text-white" :
          isDirty    ? "bg-[#FF6B35] text-white hover:opacity-90" :
                       "border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#9CA3AF] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1E24]"
        }`}>
        {savingSettings ? "Saving…" : savedOk ? "✓ Saved" : isDirty ? "Save" : "Saved"}
      </button>
    </div>
  );

  return (
    <div className="absolute top-full right-0 mt-2 w-[360px] bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-2xl shadow-xl z-50 overflow-hidden
      md:w-[360px]
      max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:top-auto max-md:w-full max-md:rounded-b-none max-md:rounded-t-2xl max-md:mt-0">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#F3F4F6] dark:border-[#2A2A32]">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isPublished ? "bg-green-400" : "bg-[#9CA3AF]"}`} />
          <span className="text-sm font-bold text-[#111111] dark:text-white">{isPublished ? "Published" : "Publish your site"}</span>
          {visitCount > 0 && (
            <span className="text-[10px] font-medium text-[#9CA3AF] ml-1">{visitCount.toLocaleString()} visitor{visitCount !== 1 ? "s" : ""}</span>
          )}
        </div>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full text-[#9CA3AF] hover:text-[#374151] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#1E1E24] transition-colors text-sm font-bold">×</button>
      </div>

      {/* Step indicator (pre-publish flow only) */}
      {!isPublished && (
        <div className="flex items-center px-5 pt-3 pb-1 gap-0">
          {([1, 2, 3] as const).map((s, idx) => (
            <div key={s} className="flex items-center">
              {idx > 0 && <div className={`w-6 h-px mx-1 ${step >= s ? "bg-[#FF6B35]" : "bg-[#E5E7EB] dark:bg-[#2A2A32]"}`} />}
              <div className="flex items-center gap-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step > s ? "bg-[#FF6B35] text-white" : step === s ? "bg-[#FF6B35] text-white" : "bg-[#F3F4F6] dark:bg-[#1E1E24] text-[#9CA3AF]"}`}>
                  {step > s ? <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : s}
                </div>
                <span className={`text-[10px] font-semibold ${step >= s ? "text-[#374151] dark:text-[#E5E7EB]" : "text-[#9CA3AF]"}`}>
                  {s === 1 ? "Details" : s === 2 ? "Check" : "Go Live"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 py-4 space-y-4 max-h-[78vh] overflow-y-auto">

        {/* ── STEP 1: Site Details ─────────────────────────────────────────── */}
        {step === 1 && (
          <>
            {renderSiteDetailsForm()}
            {renderDomainSection()}
            <div className="border-t border-[#F3F4F6] pt-3">
              <button onClick={async () => {
                if (isDirty && websiteId) {
                  const ok = await handleSaveSettings();
                  if (ok) setStep(2);
                } else {
                  setStep(2);
                }
              }}
                disabled={savingSettings}
                className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ background: "var(--vp-color)" }}>
                {savingSettings ? "Saving…" : "Continue →"}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Pre-publish checks ───────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <p className="text-xs font-semibold text-[#374151] dark:text-[#E5E7EB]">Pre-publish checks</p>
            <div className="space-y-3">
              {checks.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  {c.status === "running" && <div className="w-4 h-4 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin shrink-0 mt-0.5" />}
                  {c.status === "pass" && <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5"><svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
                  {c.status === "warn" && <div className="w-4 h-4 rounded-full bg-yellow-100 flex items-center justify-center shrink-0 mt-0.5"><span className="text-yellow-700 text-[8px] font-bold leading-none">!</span></div>}
                  {c.status === "fail" && <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5"><svg width="8" height="8" viewBox="0 0 12 12" fill="none"><line x1="2" y1="2" x2="10" y2="10" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/></svg></div>}
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs ${c.status === "running" ? "text-[#9CA3AF]" : c.status === "fail" ? "text-red-700 dark:text-red-400" : c.status === "warn" ? "text-yellow-700 dark:text-yellow-500" : "text-[#374151] dark:text-[#E5E7EB]"}`}>{c.label}</span>
                    {c.detail && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{c.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
            {!checksRunning && checks.length > 0 && (
              <div className="space-y-3 pt-1">
                {checks.some(c => c.status === "fail") ? (
                  <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2">Fix the issues above before publishing.</p>
                ) : (
                  <>
                    {checks.some(c => c.status === "warn") && (
                      <p className="text-[10px] text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg px-3 py-2">
                        Some info is missing. Your site will still publish.
                      </p>
                    )}
                    <button onClick={onPublish} disabled={publishing}
                      className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                      style={{ background: "var(--vp-color)" }}>
                      {publishing ? (isPublished ? "Updating…" : "Publishing…") : isPublished ? "Update Site" : "Publish Now"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Live view (post-publish) ────────────────────────────── */}
        {step === 3 && (
          <>
            {/* Live URL */}
            {publishedUrl && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Your Site</p>
                <div className="bg-[#F9FAFB] dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-lg px-3 py-2">
                  <span className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF] truncate block">{origin}{publishedUrl}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => { await copyText(`${origin}${publishedUrl}`); setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000); }}
                    className="flex-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#9CA3AF] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1E24] transition-colors">
                    {urlCopied ? "Copied!" : "Copy Link"}
                  </button>
                  <a href={`${origin}${publishedUrl}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-center text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
                    style={{ background: "var(--vp-color)" }}>
                    Open ↗
                  </a>
                </div>
              </div>
            )}

            {/* Visitor count */}
            {visitCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <span>{visitCount.toLocaleString()} visitor{visitCount !== 1 ? "s" : ""}</span>
              </div>
            )}

            {/* Update Site — always visible */}
            <div className="space-y-1.5">
              <button
                onClick={onPublish}
                disabled={publishing}
                className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: "var(--vp-color)" }}>
                {publishing ? "Updating…" : draftDiffers ? "Push Updates Live" : "Update Site"}
              </button>
              {!draftDiffers && (
                <p className="text-center text-[10px] text-[#9CA3AF]">Site is up to date. Republish anytime</p>
              )}
            </div>

            {/* Settings accordion */}
            <div className="border-t border-[#F3F4F6] dark:border-[#2A2A32] pt-3 space-y-3">
              <button onClick={() => setShowSettings((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#374151] dark:text-[#9CA3AF] hover:text-[#FF6B35] transition-colors w-full text-left">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                Site Settings
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`ml-auto transition-transform ${showSettings ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showSettings && (
                <div className="space-y-4">
                  {renderSiteDetailsForm()}
                  {renderDomainSection()}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Inline version card rendered in the chat feed ─────────────────────────────
function VersionCard({
  version, isFirst, onPreview, onRestore, restoring, previewing,
}: {
  version: VersionRecord; isFirst: boolean;
  onPreview: (v: VersionRecord) => void;
  onRestore: (v: VersionRecord) => void;
  restoring: boolean; previewing: boolean;
}) {
  return (
    <div className="ml-8 mr-2 bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl p-3 flex items-start gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${version.type === "publish" ? "bg-green-100 dark:bg-green-950/40" : "bg-[#F3F4F6] dark:bg-[#17171C]"}`}>
        {version.type === "publish" ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="3 9 21 9"/></svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[11px] font-semibold text-[#111111] dark:text-white truncate">{version.label}</p>
          {version.type === "publish" && <span className="text-[9px] font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-1.5 py-0.5 rounded-full shrink-0">Published</span>}
        </div>
        <p className="text-[10px] text-[#9CA3AF] mt-0.5">{timeAgo(version.created_at)}</p>
      </div>
      {isFirst ? (
        <span className="text-[10px] font-medium text-[#9CA3AF] shrink-0 mt-0.5">Current</span>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onPreview(version)} disabled={previewing}
            className="text-[10px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111111] dark:hover:text-white disabled:opacity-40 transition-colors">
            Preview
          </button>
          <button onClick={() => onRestore(version)} disabled={restoring}
            className="text-[10px] font-semibold text-[#FF6B35] hover:opacity-80 disabled:opacity-40">
            {restoring ? "…" : "Restore"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WebsitePage() {
  const { t } = useI18n();
  const btype       = typeof window !== "undefined" ? localStorage.getItem("vela_business_type") : null;
  const suggestions = (btype && INDUSTRY_SUGGESTIONS[btype]) ? INDUSTRY_SUGGESTIONS[btype] : DEFAULT_SUGGESTIONS;

  // ── Language (persisted, question #1) ───────────────────────────────────────
  const [siteLanguage, setSiteLanguage] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("vela_site_language") ?? "";
    return "";
  });

  // ── Add AI assistant to this site? (persisted, question #2, default yes) ───
  const [embedAssistant, setEmbedAssistant] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vela_embed_assistant");
      if (saved === "no") return false;
    }
    return true;
  });
  const [embedAssistantChosen, setEmbedAssistantChosen] = useState<boolean>(() => {
    if (typeof window !== "undefined") return !!localStorage.getItem("vela_embed_assistant");
    return false;
  });

  // ── Core state ──────────────────────────────────────────────────────────────
  const [loading, setLoading]         = useState(true);
  const [msgs, setMsgs]               = useState<Msg[]>(() => {
    const lang = typeof window !== "undefined" ? (localStorage.getItem("vela_site_language") || undefined) : undefined;
    return [INITIAL_MSG(btype, lang)];
  });
  const [input, setInput]             = useState("");
  const [html, setHtml]               = useState("");
  const [device, setDevice]           = useState<DevicePreset>("desktop");
  const [rotated, setRotated]         = useState(false);
  const [viewMode, setViewMode]       = useState<"preview" | "code">("preview");
  const [building, setBuilding]       = useState(false);
  const [built, setBuilt]             = useState(false);
  const [codeCopied, setCodeCopied]   = useState(false);
  const [activeTab, setActiveTab]     = useState<"chat" | "preview">("chat");
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  // FIX 3 (round G): this chat had a paperclip attach button but no paste
  // handler at all -- Ctrl+V here did nothing, silently, on every browser.
  // Also surfaces real rejection reasons instead of a silent drop (matches
  // VelaAssistant's attachError pattern).
  const [attachError, setAttachError] = useState<string | null>(null);
  const [contactInfo, setContactInfo]       = useState<ContactInfo>({ phone: "", email: "", address: "", hours: "" });

  // Per-site contact info: spec embedded in draft_html is the authoritative source;
  // contactInfo state (from tenant_config.website_intake) is a global fallback.
  const specHasContactInfo = useMemo(() => {
    if (html) {
      const spec = extractSpec(html);
      if (spec?.sections?.some(s => {
        const c = s.content as Record<string, unknown> | null | undefined;
        return !!(c?.phone || c?.email);
      })) return true;
    }
    return !!(contactInfo.phone || contactInfo.email);
  }, [html, contactInfo]);

  // ── Publish state ────────────────────────────────────────────────────────────
  const [publishedUrl, setPublishedUrl]     = useState("");
  const [publishing, setPublishing]         = useState(false);
  const [isPublished, setIsPublished]       = useState(false);
  const [showPublishPanel, setShowPublishPanel] = useState(false);
  const [draftDiffers, setDraftDiffers]     = useState(false);
  const [visitCount, setVisitCount]         = useState(0);

  // ── Website metadata ─────────────────────────────────────────────────────────
  const [websiteId, setWebsiteId]       = useState<string | null>(null);
  const [siteName, setSiteName]         = useState("");
  const [siteSlug, setSiteSlug]         = useState("");
  const [savedSlug, setSavedSlug]       = useState("");
  const [slugError, setSlugError]       = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError]   = useState("");

  // ── Projects sidebar ─────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<WebsiteProject[]>([]);

  // ── Version history ──────────────────────────────────────────────────────────
  const [versions, setVersions]             = useState<VersionRecord[]>([]);
  const [previewVersionHtml, setPreviewVersionHtml] = useState<string | null>(null);
  const [restoringVersion, setRestoringVersion]     = useState<string | null>(null);
  const [previewingVersion, setPreviewingVersion]   = useState<string | null>(null);

  // ── Plan limits ──────────────────────────────────────────────────────────────
  const [websiteLimit, setWebsiteLimit] = useState(1);
  const [websiteCount, setWebsiteCount] = useState(0);

  // ── Domain state ─────────────────────────────────────────────────────────────
  const [domainInput, setDomainInput]       = useState("");
  const [customDomain, setCustomDomain]     = useState<string | null>(null);
  const [domainStatus, setDomainStatus]     = useState<"pending" | "verified" | "failed" | null>(null);
  const [connectingDomain, setConnectingDomain] = useState(false);
  const [checkingDomain, setCheckingDomain]     = useState(false);
  const [removingDomain, setRemovingDomain]     = useState(false);
  const [domainError, setDomainError]           = useState("");

  // ── Inline edit mode ─────────────────────────────────────────────────────────
  const [editMode, setEditMode]           = useState(false);
  const [editSpec, setEditSpec]           = useState<WebsiteSpec | null>(null);
  const [undoStack, setUndoStack]         = useState<WebsiteSpec[]>([]);
  const [editSaving, setEditSaving]       = useState(false);
  const editSpecRef                        = useRef<WebsiteSpec | null>(null);
  const editSaveTimerRef                   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const siteLanguageRef                    = useRef(siteLanguage);

  // ── New Website modal ─────────────────────────────────────────────────────────
  const [showNewWebsiteModal, setShowNewWebsiteModal] = useState(false);

  // ── Sidebar resize ────────────────────────────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = parseInt(localStorage.getItem("wb-left-panel-width") ?? "", 10);
      return isNaN(stored) ? 160 : Math.max(140, Math.min(320, stored));
    }
    return 160;
  });
  const isDraggingRef     = useRef(false);
  const dragStartXRef     = useRef(0);
  const dragStartWidthRef = useRef(0);

  // ── Chat panel resize ─────────────────────────────────────────────────────────
  const [chatWidth, setChatWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = parseInt(localStorage.getItem("wb-chat-width") ?? "", 10);
      return isNaN(stored) ? 320 : Math.max(280, Math.min(520, stored));
    }
    return 320;
  });
  const isChatDraggingRef     = useRef(false);
  const chatDragStartXRef     = useRef(0);
  const chatDragStartWidthRef = useRef(0);

  // ── Project menu / inline rename ──────────────────────────────────────────────
  const [menuOpenId, setMenuOpenId]   = useState<string | null>(null);
  const [menuPos, setMenuPos]         = useState<{ top: number; right: number } | null>(null);
  const [renamingId, setRenamingId]   = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // ── Versions panel (inside chat) + Delete confirm modal ───────────────────────
  const [showVersionsPanel, setShowVersionsPanel] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);
  const [analyticsData, setAnalyticsData]           = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading]     = useState(false);
  // FIX 3 (round H): real Website-channel AI-behavior config, surfaced here
  // now that Channels' Website "Manage" lands on this panel instead of a
  // separate modal -- same tenant_config.channel_ai_config mechanism, same
  // ChannelAiConfigFields component already used for Instagram/WhatsApp.
  const [websiteAiCfgLoading, setWebsiteAiCfgLoading] = useState(false);
  const [websiteAiCfgSaving, setWebsiteAiCfgSaving]   = useState(false);
  const [websiteAiCfgSaved, setWebsiteAiCfgSaved]     = useState(false);
  const [websiteAiTone, setWebsiteAiTone]             = useState("professional");
  const [websiteAiLanguage, setWebsiteAiLanguage]     = useState("Auto-detect");
  const [deleteTarget, setDeleteTarget]           = useState<WebsiteProject | null>(null);
  const [restoreConfirmTarget, setRestoreConfirmTarget] = useState<VersionRecord | null>(null);
  const [imgEditTarget, setImgEditTarget]         = useState<{ vs: string; imgIdx: number; src: string; websiteId: string } | null>(null);
  const [imgSearchQuery, setImgSearchQuery]       = useState("");
  const [imgSearching, setImgSearching]           = useState(false);
  const [showColorPanel, setShowColorPanel]       = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const bottomRef    = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const htmlRef      = useRef<string>("");
  const websiteIdRef = useRef<string | null>(null);
  const publishBtnRef = useRef<HTMLDivElement>(null);
  const chatPanelRef  = useRef<HTMLDivElement>(null);
  const chatInputRef  = useRef<HTMLTextAreaElement>(null);
  const [showToolbarSiteMenu, setShowToolbarSiteMenu] = useState(false);

  const refreshProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/website/list");
      if (!res.ok) return;
      const data = await res.json() as { sites?: WebsiteProject[] };
      if (Array.isArray(data.sites)) {
        setProjects(data.sites.map((s) => ({
          id:           s.id,
          name:         s.name ?? null,
          slug:         s.slug ?? null,
          is_published: s.is_published,
          published_url: s.is_published ? (s.slug ? `/site/${s.slug}` : null) : null,
          updated_at:   s.updated_at ?? null,
        })));
      }
    } catch { /* non-critical */ }
  }, []);

  const loadAnalytics = useCallback(async () => {
    const wId = websiteIdRef.current;
    if (!wId) return;
    setAnalyticsLoading(true);
    setAnalyticsData(null);
    try {
      const res = await fetch(`/api/website/analytics?websiteId=${encodeURIComponent(wId)}`);
      if (res.ok) setAnalyticsData(await res.json() as AnalyticsData);
    } catch { /* non-critical */ }
    finally { setAnalyticsLoading(false); }
  }, []);

  const loadWebsiteAiConfig = useCallback(async () => {
    setWebsiteAiCfgLoading(true);
    setWebsiteAiCfgSaved(false);
    try {
      const res = await fetch("/api/channels/ai-config?channel=website");
      if (res.ok) {
        const data = await res.json() as { tone?: string; language?: string };
        setWebsiteAiTone(data.tone ?? "professional");
        setWebsiteAiLanguage(data.language ?? "Auto-detect");
      }
    } catch { /* non-critical */ }
    finally { setWebsiteAiCfgLoading(false); }
  }, []);

  const saveWebsiteAiConfig = useCallback(async () => {
    setWebsiteAiCfgSaving(true);
    try {
      const res = await fetch("/api/channels/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "website", tone: websiteAiTone, language: websiteAiLanguage }),
      });
      if (res.ok) {
        setWebsiteAiCfgSaved(true);
        setTimeout(() => setWebsiteAiCfgSaved(false), 2000);
      }
    } catch { /* non-critical */ }
    finally { setWebsiteAiCfgSaving(false); }
  }, [websiteAiTone, websiteAiLanguage]);

  const handleOpenInNewTab = useCallback(() => {
    const content = previewVersionHtml ?? htmlRef.current;
    if (!content) return;
    if (publishedUrl) {
      window.open(`${window.location.origin}${publishedUrl}`, "_blank", "noopener,noreferrer");
      return;
    }
    // Draft: open via blob URL so the page renders with correct HTML
    const blob = new Blob([content], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const tab  = window.open(url, "_blank", "noopener,noreferrer");
    if (tab) setTimeout(() => URL.revokeObjectURL(url), 15_000);
  }, [previewVersionHtml, publishedUrl]);

  // ── Mount: load persisted state ──────────────────────────────────────────────
  // FIX 2 (round F): Channels page's Website "Manage" now deep-links here via
  // ?site={websiteId}&tab=analytics instead of opening its own modal. Read
  // via window.location.search (not useSearchParams) so this large,
  // statically-prerendered client page never needs a Suspense boundary.
  useEffect(() => {
    (async () => {
      try {
        const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const requestedSite = params?.get("site");
        const requestedTab  = params?.get("tab");
        const res  = await fetch(requestedSite ? `/api/website/state?websiteId=${encodeURIComponent(requestedSite)}` : "/api/website/state");
        const data = await res.json() as {
          websiteId?:    string | null;
          html?:         string | null;
          slug?:         string | null;
          name?:         string | null;
          isPublished?:  boolean;
          publishedUrl?: string | null;
          projects?:     WebsiteProject[];
          chat?:         Msg[] | null;
          intake?:       ContactInfo | null;
          versions?:     VersionRecord[];
          customDomain?: string | null;
          domainStatus?: "pending" | "verified" | "failed" | null;
          visitCount?:   number;
          plan?:         string;
          embedAiAssistant?: boolean;
        };

        if (data.websiteId) {
          setWebsiteId(data.websiteId);
          websiteIdRef.current = data.websiteId;
          setWebsiteCount(1);
        }
        // FIX 6 (round M): real regression -- this state previously only
        // ever came from a one-time-onboarding localStorage flag, never the
        // live DB value, and was then resent unmodified on every chat/edit
        // call, silently reverting whatever the Channels page toggle had
        // just set (in either direction) the next time the owner used
        // Website Builder at all. Now synced from the real persisted value
        // on every load, same as every other real site field above.
        if (typeof data.embedAiAssistant === "boolean") {
          setEmbedAssistant(data.embedAiAssistant);
          setEmbedAssistantChosen(true);
        }
        if (data.html) {
          setHtml(data.html);
          htmlRef.current = data.html;
          setBuilt(true);
          setActiveTab("preview");
        }
        if (data.slug) { setSiteSlug(data.slug); setSavedSlug(data.slug); }
        if (data.name)        setSiteName(data.name);
        if (data.isPublished) setIsPublished(true);
        if (data.publishedUrl) setPublishedUrl(data.publishedUrl);
        if (data.visitCount)   setVisitCount(data.visitCount);
        if (data.plan) setWebsiteLimit(PLAN_WEBSITE_LIMITS[data.plan] ?? 1);

        // Restore chat (filter out stubs, inject persisted version cards)
        if (Array.isArray(data.chat) && data.chat.length > 1) {
          const cleanChat = (data.chat as Msg[]).filter(m => !m.isBuilding);
          setMsgs(cleanChat);
        }
        if (data.intake) {
          setContactInfo(data.intake);
          // Restore language from DB intake if localStorage was cleared (e.g. new browser/session)
          const savedLang = (data.intake as Record<string, string>)?.language;
          if (savedLang && !siteLanguage) {
            setSiteLanguage(savedLang);
            if (typeof window !== "undefined") localStorage.setItem("vela_site_language", savedLang);
          }
        }
        if (Array.isArray(data.versions)) setVersions(data.versions as VersionRecord[]);
        if (Array.isArray(data.projects)) setProjects(data.projects as WebsiteProject[]);
        if (data.customDomain) { setCustomDomain(data.customDomain); setDomainInput(data.customDomain); }
        if (data.domainStatus) setDomainStatus(data.domainStatus as "pending" | "verified" | "failed");

        if (requestedTab === "analytics" && data.websiteId && data.isPublished) {
          setShowAnalyticsPanel(true);
          setShowVersionsPanel(false);
          setActiveTab("preview");
          void loadAnalytics();
          void loadWebsiteAiConfig();
        }
        if (requestedSite || requestedTab) window.history.replaceState({}, "", "/app/website");

      } catch { /* ignore. Show empty state */ }
      setLoading(false);
      void refreshProjects();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keep siteLanguageRef in sync ─────────────────────────────────────────────
  useEffect(() => { siteLanguageRef.current = siteLanguage; }, [siteLanguage]);

  // ── Auto-scroll chat ─────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Signal VelaAssistant bubble to hide on mobile when publish panel is open.
  useEffect(() => {
    setBottomSheetOpen(showPublishPanel);
    return () => setBottomSheetOpen(false);
  }, [showPublishPanel]);

  // Auto-refresh visit count when publish panel opens.
  // Domain status is NOT auto-checked here — user must click "Check Status" explicitly
  // to avoid showing "Connected" before DNS is actually verified.
  useEffect(() => {
    if (!showPublishPanel) return;
    (async () => {
      try {
        const stateRes = await fetch("/api/website/state");
        if (stateRes.ok) {
          const stateData = await stateRes.json() as { visitCount?: number };
          if (typeof stateData.visitCount === "number") setVisitCount(stateData.visitCount);
        }
      } catch { /* non-critical */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPublishPanel]);

  // ── Language selection (question #1) ─────────────────────────────────────────
  const handleSelectLanguage = useCallback((lang: string) => {
    setSiteLanguage(lang);
    localStorage.setItem("vela_site_language", lang);
    setMsgs([INITIAL_MSG(btype, lang)]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [btype]);

  // ── Add AI assistant to this site? (question #2, default yes) ───────────────
  const handleSelectEmbedAssistant = useCallback((choice: boolean) => {
    setEmbedAssistant(choice);
    setEmbedAssistantChosen(true);
    localStorage.setItem("vela_embed_assistant", choice ? "yes" : "no");
  }, []);

  // ── Persist chat + intake ─────────────────────────────────────────────────────
  // FIX 4: must include websiteId so this write lands on the per-site websites.chat
  // column -- without it, the client-side-only closing message (e.g. "Got it. Your
  // website is ready!") that gets appended AFTER the generate response never made
  // it into what /api/website/generate's own draft-save persisted (that save uses
  // only the request's chat, sent before this reply exists), and reopening the
  // site from the sidebar showed history missing its own final message.
  const persistChat = useCallback((finalMsgs: Msg[], intake: ContactInfo) => {
    const chatToSave = finalMsgs
      .filter(m => !m.isBuilding && m.role !== "version" && !m.isSeparator)
      .map(stripImages);
    fetch("/api/website/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat: chatToSave, intake, websiteId: websiteIdRef.current ?? undefined }),
    }).catch(() => {});
  }, []);

  // ── Publish / Update ──────────────────────────────────────────────────────────
  // Opens/closes the publish panel — never triggers publishing directly.
  const handleTogglePanel = useCallback(() => {
    setShowPublishPanel((v) => !v);
  }, []);

  // Does the actual publish API call — called from inside the publish panel.
  const handleDoPublish = useCallback(async () => {
    const currentHtml = htmlRef.current;
    if (!built || publishing || !currentHtml) return;

    setPublishing(true);
    try {
      const res  = await fetch("/api/website/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: websiteIdRef.current }),
      });
      const data = await res.json() as { url?: string; slug?: string; error?: string };
      if (!res.ok || !data.url) {
        alert(data.error ?? "Publish failed. Please try again.");
        return;
      }
      const finalUrl = data.slug ? `/site/${data.slug}` : (data.url ?? "");
      setPublishedUrl(finalUrl);
      setIsPublished(true);
      setDraftDiffers(false);
      if (data.slug) { setSiteSlug(data.slug); setSavedSlug(data.slug); }
      if (websiteIdRef.current) {
        setProjects((prev) => prev.map((p) =>
          p.id === websiteIdRef.current ? { ...p, is_published: true, slug: data.slug ?? p.slug } : p
        ));
      }

      // Append published version card to chat
      const publishVer: VersionRecord = {
        id: crypto.randomUUID(), label: "Published",
        siteName: siteName || undefined,
        created_at: new Date().toISOString(), type: "publish", html: currentHtml,
      };
      setVersions((prev) => [...prev, publishVer].slice(-20));
      setMsgs((prev) => [...prev, { role: "version" as const, content: "", version: publishVer }]);
    } catch {
      alert("Connection error. Please try again.");
    } finally {
      setPublishing(false);
    }
  }, [built, publishing]);

  // ── Version preview / restore ─────────────────────────────────────────────────
  const handlePreviewVersion = useCallback((v: VersionRecord) => {
    setPreviewingVersion(v.id);
    setPreviewVersionHtml(v.html);
    setViewMode("preview");
    setActiveTab("preview");
    setTimeout(() => setPreviewingVersion(null), 500);
  }, []);

  const handleRestoreVersion = useCallback(async (v: VersionRecord) => {
    const wId = websiteIdRef.current;
    if (!wId) return;
    setRestoringVersion(v.id);
    try {
      const res  = await fetch("/api/website/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: wId, versionId: v.id, html: v.html }),
      });
      const data = await res.json() as { html?: string; error?: string };
      if (data.html) {
        setHtml(data.html); htmlRef.current = data.html;
        setPreviewVersionHtml(null); setBuilt(true); setDraftDiffers(true);
        setViewMode("preview"); setActiveTab("preview");
        const restoredMsg: Msg = { role: "ai", content: `Restored "${v.label}". Click "Update Site" to push it live.` };
        setMsgs((prev) => { const m = [...prev, restoredMsg]; persistChat(m, contactInfo); return m; });
      } else {
        alert(data.error ?? "Restore failed.");
      }
    } catch { alert("Connection error."); }
    finally { setRestoringVersion(null); }
  }, [contactInfo, persistChat]);

  // ── New Website ───────────────────────────────────────────────────────────────
  // Opens the confirmation modal. The previous project stays in DB and sidebar.
  const handleNewWebsite = useCallback(() => {
    setShowNewWebsiteModal(true);
  }, []);

  // Confirmed: upsert current project into sidebar, then reset all draft state.
  const handleConfirmNewWebsite = useCallback(() => {
    setShowNewWebsiteModal(false);

    setShowVersionsPanel(false);
    setShowAnalyticsPanel(false);
    setAnalyticsData(null);
    setRotated(false);
    setEditMode(false); setEditSpec(null); setUndoStack([]);
    editSpecRef.current = null;
    if (editSaveTimerRef.current) { clearTimeout(editSaveTimerRef.current); editSaveTimerRef.current = null; }

    // Ensure the active project is in the sidebar before clearing websiteId
    if (websiteId) {
      const currentProject: WebsiteProject = {
        id:            websiteId,
        name:          siteName || null,
        slug:          savedSlug || null,
        is_published:  isPublished,
        published_url: isPublished ? (savedSlug ? `/site/${savedSlug}` : null) : null,
        updated_at:    new Date().toISOString(),
      };
      setProjects((prev) => {
        const idx = prev.findIndex((p) => p.id === websiteId);
        return idx >= 0
          ? prev.map((p, i) => i === idx ? currentProject : p)
          : [...prev, currentProject];
      });
    }

    // Clear server-side state so the next page load doesn't rehydrate the old session.
    fetch("/api/website/reset", { method: "POST" }).catch(() => {});

    setHtml(""); htmlRef.current = "";
    setBuilt(false); setDraftDiffers(false); setPreviewVersionHtml(null);
    setInput(""); setAttachedImages([]);
    setContactInfo({ phone: "", email: "", address: "", hours: "" });
    setActiveTab("chat"); setViewMode("preview"); setShowPublishPanel(false);
    setIsPublished(false); setPublishedUrl(""); setSiteName(""); setSiteSlug(""); setSavedSlug("");
    setWebsiteId(null); websiteIdRef.current = null;
    // Clear persisted language so the language picker re-appears for the new project
    setSiteLanguage("");
    if (typeof window !== "undefined") localStorage.removeItem("vela_site_language");
    // Clear persisted AI assistant choice so that question re-appears for the new project too
    setEmbedAssistant(true); setEmbedAssistantChosen(false);
    if (typeof window !== "undefined") localStorage.removeItem("vela_embed_assistant");
    setMsgs([INITIAL_MSG(btype, undefined)]);
  }, [btype, websiteId, siteName, siteSlug, savedSlug, isPublished]);

  // ── Switch to an existing project ────────────────────────────────────────────
  const handleSwitchProject = useCallback(async (p: WebsiteProject) => {
    if (p.id === websiteIdRef.current && built) return;
    setShowVersionsPanel(false);
    setShowAnalyticsPanel(false);
    setAnalyticsData(null);
    setRotated(false);
    setEditMode(false); setEditSpec(null); setUndoStack([]);
    editSpecRef.current = null;
    if (editSaveTimerRef.current) { clearTimeout(editSaveTimerRef.current); editSaveTimerRef.current = null; }
    setBuilding(false); setBuilt(false); setDraftDiffers(false);
    setHtml(""); htmlRef.current = ""; setPreviewVersionHtml(null);
    setInput(""); setAttachedImages([]);
    setContactInfo({ phone: "", email: "", address: "", hours: "" });
    setVersions([]); setMsgs([INITIAL_MSG(btype, siteLanguage || undefined)]);
    setActiveTab("chat"); setViewMode("preview"); setShowPublishPanel(false);
    const switchTarget = p.id;
    setWebsiteId(p.id); websiteIdRef.current = p.id;
    setSiteName(p.name ?? ""); setSiteSlug(p.slug ?? ""); setSavedSlug(p.slug ?? "");
    setIsPublished(p.is_published);
    setPublishedUrl(p.is_published ? (p.published_url ?? (p.slug ? `/site/${p.slug}` : "")) : "");
    try {
      const res = await fetch(`/api/website/state?websiteId=${encodeURIComponent(p.id)}`);
      if (websiteIdRef.current !== switchTarget) return;
      if (res.ok) {
        const data = await res.json() as {
          html?: string | null; versions?: VersionRecord[];
          name?: string | null; slug?: string | null;
          isPublished?: boolean; publishedUrl?: string | null;
          intake?: ContactInfo | null; chat?: Msg[] | null;
          embedAiAssistant?: boolean;
        };
        if (websiteIdRef.current !== switchTarget) return;
        if (data.html) {
          setHtml(data.html); htmlRef.current = data.html;
          setBuilt(true); setActiveTab("preview");
        }
        if (Array.isArray(data.versions)) setVersions(data.versions as VersionRecord[]);
        // Refresh name/slug/published from DB to override any stale project-list values
        if (data.name) setSiteName(data.name);
        if (data.slug) { setSiteSlug(data.slug); setSavedSlug(data.slug); }
        if (typeof data.isPublished === "boolean") setIsPublished(data.isPublished);
        if (data.publishedUrl != null) setPublishedUrl(data.publishedUrl);
        if (data.intake) setContactInfo(data.intake);
        // FIX 6 (round M): same real-value sync as initial page load -- each
        // site has its own embed_ai_assistant value, switching sites must
        // pick up THAT site's real value, not carry over whatever the
        // previous site (or stale localStorage) had.
        if (typeof data.embedAiAssistant === "boolean") {
          setEmbedAssistant(data.embedAiAssistant);
          setEmbedAssistantChosen(true);
        }
        // FIX 4: restore this site's own chat history instead of leaving the
        // reset-to-initial-prompt state set above -- same pattern already used
        // on first page load.
        if (Array.isArray(data.chat) && data.chat.length > 1) {
          const cleanChat = data.chat.filter((m) => !m.isBuilding);
          setMsgs(cleanChat);
        }
      }
    } catch { /* ignore */ }
  }, [btype, siteLanguage]);

  // ── Panel drag-resize ─────────────────────────────────────────────────────────
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current     = true;
    dragStartXRef.current     = e.clientX;
    dragStartWidthRef.current = sidebarWidth;
    document.body.style.cursor     = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  const handleChatResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isChatDraggingRef.current     = true;
    chatDragStartXRef.current     = e.clientX;
    chatDragStartWidthRef.current = chatWidth;
    document.body.style.cursor     = "col-resize";
    document.body.style.userSelect = "none";
  }, [chatWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const newW = Math.max(140, Math.min(320, dragStartWidthRef.current + e.clientX - dragStartXRef.current));
        setSidebarWidth(newW);
      }
      if (isChatDraggingRef.current) {
        const newW = Math.max(280, Math.min(520, chatDragStartWidthRef.current + e.clientX - chatDragStartXRef.current));
        setChatWidth(newW);
      }
    };
    const onMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current          = false;
        document.body.style.cursor     = "";
        document.body.style.userSelect = "";
        setSidebarWidth((w) => { localStorage.setItem("wb-left-panel-width", String(w)); return w; });
      }
      if (isChatDraggingRef.current) {
        isChatDraggingRef.current      = false;
        document.body.style.cursor     = "";
        document.body.style.userSelect = "";
        setChatWidth((w) => { localStorage.setItem("wb-chat-width", String(w)); return w; });
      }
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup",   onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup",   onMouseUp);
    };
  }, []);

  // ⋯ menu is closed via a transparent overlay rendered below the dropdown (see JSX).

  // ── Project rename / delete ───────────────────────────────────────────────────
  const handleStartRename = useCallback((p: WebsiteProject) => {
    setMenuOpenId(null);
    setRenamingId(p.id);
    setRenameValue(p.name ?? "");
  }, []);

  const handleSaveRename = useCallback(async (projectId: string, name: string) => {
    const trimmed = name.trim();
    setRenamingId(null);
    if (!trimmed) return;
    setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, name: trimmed } : p));
    if (projectId === websiteIdRef.current) setSiteName(trimmed);
    try {
      await fetch("/api/website/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: projectId, name: trimmed }),
      });
    } catch { /* ignore */ }
    void refreshProjects();
  }, [refreshProjects]);

  const handleDeleteProject = useCallback((p: WebsiteProject) => {
    setMenuOpenId(null);
    setDeleteTarget(p);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    const p = deleteTarget;
    if (!p) return;
    setDeleteTarget(null);
    const wasActive = p.id === websiteIdRef.current;
    setProjects((prev) => prev.filter((proj) => proj.id !== p.id));
    if (wasActive) {
      setHtml(""); htmlRef.current = "";
      setBuilt(false); setDraftDiffers(false); setPreviewVersionHtml(null);
      setWebsiteId(null); websiteIdRef.current = null;
      setVersions([]); setSiteName(""); setSiteSlug(""); setShowVersionsPanel(false); setShowAnalyticsPanel(false); setAnalyticsData(null);
      setIsPublished(false); setPublishedUrl("");
      setActiveTab("chat"); setViewMode("preview"); setShowPublishPanel(false);
      setEditMode(false); setEditSpec(null); setUndoStack([]);
      editSpecRef.current = null;
      if (editSaveTimerRef.current) { clearTimeout(editSaveTimerRef.current); editSaveTimerRef.current = null; }
      setMsgs([INITIAL_MSG(btype, siteLanguage || undefined)]);
    }
    try {
      await fetch("/api/website/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: p.id }),
      });
    } catch { /* ignore. UI already updated */ }
    void refreshProjects();
  }, [deleteTarget, btype, siteLanguage, refreshProjects]);

  // ── File attachment ───────────────────────────────────────────────────────────
  // FIX 3 (round G): shared by both the paperclip picker and the new paste
  // handler below. Previously silently `return`ed on a rejected file (wrong
  // type or too large) with zero feedback -- now surfaces a real, specific
  // error the same way VelaAssistant's chat already does, so a real
  // rejection is visible instead of looking like "paste doesn't work".
  const attachFilesToChat = useCallback((files: File[]) => {
    setAttachError(null);
    console.log(`[WebsiteBuilder paste-pipeline] step 2/5 file(s) detected: ${files.length}`, files.map((f) => ({ name: f.name, type: f.type, size: f.size })));
    files.slice(0, MAX_ATTACH - attachedImages.length).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        console.error(`[WebsiteBuilder paste-pipeline] REJECTED at validation -- unsupported type "${file.type}" for "${file.name}"`);
        setAttachError(`"${file.name || "That file"}" is a ${file.type || "format"} this chat can't read yet. Try a PNG, JPG, or WEBP.`);
        return;
      }
      if (file.size > MAX_IMG_SIZE) {
        console.error(`[WebsiteBuilder paste-pipeline] REJECTED at validation -- "${file.name}" is ${file.size} bytes, over the ${MAX_IMG_SIZE} byte cap`);
        setAttachError(`"${file.name || "That image"}" is too large (max 5MB). Try a smaller screenshot.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.split(",")[1] ?? "";
        console.log(`[WebsiteBuilder paste-pipeline] step 3/5 file read OK -- "${file.name}", base64 length ${base64.length}`);
        setAttachedImages((prev) =>
          prev.length < MAX_ATTACH
            ? [...prev, { preview: dataUrl, base64, mimeType: file.type }]
            : prev,
        );
      };
      reader.onerror = () => {
        console.error(`[WebsiteBuilder paste-pipeline] REJECTED at file read -- FileReader.onerror fired for "${file.name}"`, reader.error);
        setAttachError("Couldn't read that image. Please try again.");
      };
      reader.readAsDataURL(file);
    });
  }, [attachedImages.length]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    attachFilesToChat(files);
  }, [attachFilesToChat]);

  // FIX 3 (round G): real root-cause -- this chat's textarea never had an
  // onPaste handler at all (confirmed by reading every handler in this file
  // end to end; VelaAssistant's floating widget is a completely separate
  // component and its own paste fix never touched this surface). A user
  // pasting a screenshot here did nothing, silently, on every browser --
  // not a MIME/permissions/race-condition issue, just a missing wire.
  const handleChatPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    console.log("[WebsiteBuilder paste-pipeline] step 1/5 paste event received");
    if (!e.clipboardData) {
      console.warn("[WebsiteBuilder paste-pipeline] REJECTED at step 1 -- paste event fired with no clipboardData (browser did not expose clipboard contents)");
      return;
    }
    const items = Array.from(e.clipboardData.items);
    console.log(`[WebsiteBuilder paste-pipeline] clipboard has ${items.length} item(s):`, items.map((i) => i.type));
    const imageItems = items.filter((item) => item.type.startsWith("image/"));
    const imageFiles = imageItems.map((item) => item.getAsFile()).filter((f): f is File => f !== null);
    if (imageItems.length > 0 && imageFiles.length === 0) {
      console.error("[WebsiteBuilder paste-pipeline] REJECTED at step 2 -- image clipboard item(s) present but getAsFile() returned null for all of them:", imageItems.map((i) => i.type));
      setAttachError("Couldn't read the pasted image from your clipboard. Try the attach (paperclip) button instead.");
      e.preventDefault();
      return;
    }
    if (imageFiles.length === 0) {
      console.log("[WebsiteBuilder paste-pipeline] no image items in this paste (plain text paste) -- no-op, correct behavior");
      return;
    }
    e.preventDefault();
    attachFilesToChat(imageFiles);
  }, [attachFilesToChat]);

  const copyCode = useCallback(async () => {
    if (!html) return;
    await copyText(html);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [html]);

  // ── Generate / Send ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if ((!text && attachedImages.length === 0) || building) return;
    setInput("");
    // Exit edit mode before generation (edit mode is blocked during builds)
    if (editMode) {
      if (editSaveTimerRef.current) { clearTimeout(editSaveTimerRef.current); editSaveTimerRef.current = null; }
      editSpecRef.current = null; setEditSpec(null); setUndoStack([]); setEditMode(false);
    }

    const capturedImages = [...attachedImages];
    setAttachedImages([]);

    const userMsg:    Msg = { role: "user", content: text || "Please use the uploaded image(s) on the website.", images: capturedImages.map((i) => i.preview) };
    const loadingMsg: Msg = { role: "ai",  content: built ? "Updating your website…" : "Building your website…", isBuilding: true };

    const msgsWithLoading = [...msgs, userMsg, loadingMsg];
    setMsgs(msgsWithLoading);
    setBuilding(true);

    try {
      // isSeparator messages have content:"" — filter them so OpenAI never receives an empty assistant message
      const chatToSend = [...msgs, userMsg].filter(m => !m.isBuilding && m.role !== "version" && !m.isSeparator).map(stripImages);

      // Build intake payload — always include language so the server can persist it and
      // restore it on the next page load (handles cases where user chose language verbally).
      const intakePayload: Record<string, string> = {};
      if (contactInfo.phone)   intakePayload.phone   = contactInfo.phone;
      if (contactInfo.email)   intakePayload.email   = contactInfo.email;
      if (contactInfo.address) intakePayload.address = contactInfo.address;
      if (contactInfo.hours)   intakePayload.hours   = contactInfo.hours;
      if (siteLanguage)        intakePayload.language = siteLanguage;

      if (capturedImages.length > 0) {
        console.log(`[WebsiteBuilder paste-pipeline] step 4/5 sending ${capturedImages.length} image(s) to /api/website/generate`, capturedImages.map((i) => ({ mimeType: i.mimeType, base64Length: i.base64.length })));
      }

      const res = await fetch("/api/website/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:         text,
          currentHtml:     built ? html : undefined,
          websiteId:       websiteIdRef.current ?? undefined,
          language:        siteLanguage || "English",
          languageChosen:  !!siteLanguage,
          images:          capturedImages.map((i) => ({ data: i.base64, mimeType: i.mimeType })),
          contactInfo:     (contactInfo.phone || contactInfo.email || contactInfo.address || contactInfo.hours) ? contactInfo : undefined,
          chat:            chatToSend,
          intake:          Object.keys(intakePayload).length ? intakePayload : undefined,
          embedAiAssistant: embedAssistant,
        }),
      });

      const data = await res.json() as {
        html?: string; question?: string; reply?: string; error?: string;
        websiteId?: string; slug?: string; name?: string; isPublished?: boolean;
        intake?: { phone?: string; email?: string };
      };
      if (capturedImages.length > 0) {
        console.log(`[WebsiteBuilder paste-pipeline] step 5/5 API response received -- status ${res.status}, ok=${res.ok}`, data.error ? { error: data.error } : { hasHtml: !!data.html });
      }

      // Conversational intake: GPT is asking a follow-up question
      if (res.ok && data.question && !data.html) {
        const finalMsgs: Msg[] = [...msgs, userMsg, { role: "ai", content: data.question }];
        setMsgs(finalMsgs);
        persistChat(finalMsgs, contactInfo);
        setBuilding(false);
        return;
      }

      // Conversational reply (question about the site, not a revision command)
      if (res.ok && data.reply && !data.html) {
        const finalMsgs: Msg[] = [...msgs, userMsg, { role: "ai", content: data.reply }];
        setMsgs(finalMsgs);
        persistChat(finalMsgs, contactInfo);
        setBuilding(false);
        return;
      }

      if (!res.ok || !data.html) {
        const errText =
          data.error === "Unauthorized"      ? "Please sign in to use the website builder." :
          data.error === "AI not configured"  ? "The AI service isn't set up yet. Contact support." :
          (data.error ?? "Something went wrong. Please try again.");
        setMsgs([...msgs, userMsg, { role: "ai", content: errText, isError: true }]);
        setBuilding(false);
        return;
      }

      setHtml(data.html);
      htmlRef.current = data.html;

      if (data.websiteId && data.websiteId !== websiteIdRef.current) {
        setWebsiteId(data.websiteId);
        websiteIdRef.current = data.websiteId;
        setWebsiteCount((c) => Math.max(c, 1));
      }
      if (data.slug) { setSiteSlug(data.slug); setSavedSlug(data.slug); }
      if (data.name)  setSiteName(data.name);
      if (typeof data.isPublished === "boolean") setIsPublished(data.isPublished);

      // Keep projects sidebar in sync
      const wId = data.websiteId;
      if (wId) {
        setProjects((prev) => {
          const entry: WebsiteProject = {
            id: wId,
            name: data.name ?? siteName ?? null,
            slug: data.slug ?? null,
            is_published: data.isPublished ?? false,
            published_url: (data.isPublished && data.slug) ? `/site/${data.slug}` : undefined,
            updated_at: new Date().toISOString(),
          };
          const idx = prev.findIndex((p) => p.id === wId);
          return idx >= 0 ? prev.map((p, i) => i === idx ? entry : p) : [...prev, entry];
        });
      }

      setBuilt(true);
      setDraftDiffers(true);
      setPreviewVersionHtml(null);
      setViewMode("preview");
      setActiveTab("preview");

      const successMsg = built
        ? "Done! Your website has been updated. Click \"Update Site\" to push it live, or keep refining."
        : "Got it. Your website is ready! Check the preview →\n\nYou can say things like \"make the hero darker\", \"add a gallery section\", or upload a photo to refine it.";

      const finalMsgs: Msg[] = [
        ...msgs, userMsg,
        { role: "ai", content: successMsg },
      ];

      // Only record a version entry on initial generate, not on revisions
      if (!built) {
        const newVer: VersionRecord = {
          id: crypto.randomUUID(),
          label: (text.slice(0, 60) || "Initial version").trim(),
          siteName: data.name || siteName || undefined,
          created_at: new Date().toISOString(), type: "generate", html: data.html,
        };
        setVersions((prev) => [...prev, newVer].slice(-20));
        finalMsgs.push({ role: "version" as const, content: "", version: newVer });
      }

      // Merge phone/email extracted from conversation by the generate route
      const updatedContactInfo = data.intake ? { ...contactInfo, ...data.intake } : contactInfo;
      if (data.intake) setContactInfo(updatedContactInfo);

      setMsgs(finalMsgs);
      persistChat(finalMsgs, updatedContactInfo);
      void refreshProjects();

    } catch (err) {
      if (capturedImages.length > 0) {
        console.error("[WebsiteBuilder paste-pipeline] REJECTED at step 4/5 -- network/fetch error sending images to /api/website/generate:", err);
      }
      setMsgs([...msgs, userMsg, { role: "ai", content: "Connection error. Check your internet and try again.", isError: true }]);
    }
    setBuilding(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, attachedImages, building, built, html, msgs, contactInfo, persistChat, embedAssistant]);

  // ── Inline edit: save edited spec to server ───────────────────────────────────
  const handleSaveEdit = useCallback(async (spec: WebsiteSpec) => {
    const wId = websiteIdRef.current;
    if (!wId) return;
    setEditSaving(true);
    try {
      const res  = await fetch("/api/website/save-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: wId, spec, language: siteLanguageRef.current || "English" }),
      });
      const data = await res.json() as { html?: string; error?: string };
      if (data.html) {
        setHtml(data.html);
        htmlRef.current = data.html;
        setDraftDiffers(true);
        const freshSpec = extractSpec(data.html);
        if (freshSpec) { editSpecRef.current = freshSpec; setEditSpec(freshSpec); }
        const editVer: VersionRecord = {
          id: crypto.randomUUID(), label: "Manual edit",
          created_at: new Date().toISOString(), type: "generate", html: data.html,
        };
        setVersions((prev) => [...prev.slice(-19), editVer]);
      }
    } catch { /* non-critical */ }
    finally { setEditSaving(false); }
  // reads refs only — no state deps needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Inline edit: toggle edit mode ────────────────────────────────────────────
  const handleToggleEditMode = useCallback(() => {
    if (building || !built) return;
    if (editMode) {
      // Exiting: flush any pending debounced save immediately
      if (editSaveTimerRef.current) {
        clearTimeout(editSaveTimerRef.current);
        editSaveTimerRef.current = null;
        if (editSpecRef.current) void handleSaveEdit(editSpecRef.current);
      }
      editSpecRef.current = null;
      setEditSpec(null);
      setUndoStack([]);
      setEditMode(false);
    } else {
      // Entering: parse spec from current preview HTML
      const pHtml = previewVersionHtml ?? htmlRef.current;
      const spec = extractSpec(pHtml);
      if (!spec) return;
      editSpecRef.current = spec;
      setEditSpec(spec);
      setUndoStack([]);
      setEditMode(true);
    }
  }, [editMode, building, built, previewVersionHtml, handleSaveEdit]);

  // ── Inline edit: undo ────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prevSpec = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    editSpecRef.current = prevSpec;
    setEditSpec(prevSpec);
    if (editSaveTimerRef.current) clearTimeout(editSaveTimerRef.current);
    void handleSaveEdit(prevSpec);
  }, [undoStack, handleSaveEdit]);

  // ── Inline edit: replace image ────────────────────────────────────────────────
  const handleImageReplace = useCallback(async (
    wsId: string, vs: string, imgIdx: number,
    action: { query?: string; imageData?: string; remove?: boolean }
  ) => {
    setImgSearching(true);
    try {
      const res = await fetch("/api/website/image-replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: wsId, vs, imgIdx, ...action }),
      });
      if (!res.ok) return;
      const data = await res.json() as { html?: string };
      if (data.html) { setHtml(data.html); htmlRef.current = data.html; }
    } finally {
      setImgSearching(false);
      setImgEditTarget(null);
      setImgSearchQuery("");
    }
  }, []);

  // ── Inline edit: change palette colour ───────────────────────────────────────
  const handlePaletteChange = useCallback((key: string, value: string) => {
    const cur = editSpecRef.current;
    if (!cur) return;
    const next: WebsiteSpec = JSON.parse(JSON.stringify(cur));
    if (next.designDNA?.palette) (next.designDNA.palette as Record<string, string>)[key] = value;
    editSpecRef.current = next;
    setEditSpec(next);
    if (editSaveTimerRef.current) clearTimeout(editSaveTimerRef.current);
    editSaveTimerRef.current = setTimeout(() => { void handleSaveEdit(next); }, 600);
  }, [handleSaveEdit]);

  // ── Inline edit: postMessage listener (iframe → parent) ──────────────────────
  useEffect(() => {
    if (!editMode) return;
    function handleMessage(e: MessageEvent) {
      if ((e.data as Record<string, unknown>)?.type === "vela-img-click") {
        const { vs, imgIdx, src } = e.data as { vs: string; imgIdx: number; src: string };
        if (websiteIdRef.current) {
          setImgSearchQuery("");
          setImgEditTarget({ vs, imgIdx, src, websiteId: websiteIdRef.current });
        }
        return;
      }
      const msgType = (e.data as Record<string, unknown>)?.type as string | undefined;

      if (msgType === "vela-style") {
        const { key, style } = e.data as { key: string; style: Record<string, string> };
        const cur = editSpecRef.current;
        if (!cur) return;
        const next: WebsiteSpec = JSON.parse(JSON.stringify(cur));
        const ts = (next._textStyles ?? {}) as Record<string, Record<string, string>>;
        if (Object.values(style).some(Boolean)) {
          ts[key] = { ...(ts[key] ?? {}), ...style };
        } else {
          const merged = { ...(ts[key] ?? {}), ...style };
          const remaining = Object.fromEntries(Object.entries(merged).filter(([, v]) => v));
          if (Object.keys(remaining).length === 0) delete ts[key];
          else ts[key] = remaining;
        }
        (next as Record<string, unknown>)._textStyles = ts;
        editSpecRef.current = next;
        setEditSpec(next);
        if (editSaveTimerRef.current) clearTimeout(editSaveTimerRef.current);
        editSaveTimerRef.current = setTimeout(() => { void handleSaveEdit(next); }, 800);
        return;
      }

      if (msgType === "vela-spacing") {
        const { sectionIndex, paddingTop, paddingBottom } = e.data as { sectionIndex: number; paddingTop: string; paddingBottom: string };
        const cur = editSpecRef.current;
        if (!cur) return;
        const next: WebsiteSpec = JSON.parse(JSON.stringify(cur));
        const ssp = ((next as Record<string, unknown>)._sectionSpacing ?? {}) as Record<string, { paddingTop?: string; paddingBottom?: string }>;
        const spKey = String(sectionIndex);
        if (!paddingTop && !paddingBottom) {
          delete ssp[spKey];
        } else {
          ssp[spKey] = { paddingTop: paddingTop || undefined, paddingBottom: paddingBottom || undefined };
        }
        (next as Record<string, unknown>)._sectionSpacing = ssp;
        editSpecRef.current = next;
        setEditSpec(next);
        if (editSaveTimerRef.current) clearTimeout(editSaveTimerRef.current);
        editSaveTimerRef.current = setTimeout(() => { void handleSaveEdit(next); }, 800);
        return;
      }

      if (msgType === "vela-border") {
        const { sectionIndex, border } = e.data as { sectionIndex: number; border: string };
        const cur = editSpecRef.current;
        if (!cur) return;
        const next: WebsiteSpec = JSON.parse(JSON.stringify(cur));
        const sbdr = ((next as Record<string, unknown>)._sectionBorders ?? {}) as Record<string, { border?: string }>;
        const bKey = String(sectionIndex);
        if (!border) { delete sbdr[bKey]; } else { sbdr[bKey] = { border }; }
        (next as Record<string, unknown>)._sectionBorders = sbdr;
        editSpecRef.current = next;
        setEditSpec(next);
        if (editSaveTimerRef.current) clearTimeout(editSaveTimerRef.current);
        editSaveTimerRef.current = setTimeout(() => { void handleSaveEdit(next); }, 800);
        return;
      }

      if (msgType === "vela-shadow") {
        const { sectionIndex, boxShadow } = e.data as { sectionIndex: number; boxShadow: string };
        const cur = editSpecRef.current;
        if (!cur) return;
        const next: WebsiteSpec = JSON.parse(JSON.stringify(cur));
        const sshd = ((next as Record<string, unknown>)._sectionShadows ?? {}) as Record<string, { boxShadow?: string }>;
        const shKey = String(sectionIndex);
        if (!boxShadow) { delete sshd[shKey]; } else { sshd[shKey] = { boxShadow }; }
        (next as Record<string, unknown>)._sectionShadows = sshd;
        editSpecRef.current = next;
        setEditSpec(next);
        if (editSaveTimerRef.current) clearTimeout(editSaveTimerRef.current);
        editSaveTimerRef.current = setTimeout(() => { void handleSaveEdit(next); }, 800);
        return;
      }

      if (msgType === "vela-el-spacing") {
        const { sectionIndex, elementType, marginTop, marginBottom } = e.data as { sectionIndex: number; elementType: string; marginTop: string; marginBottom: string };
        const cur = editSpecRef.current;
        if (!cur) return;
        const next: WebsiteSpec = JSON.parse(JSON.stringify(cur));
        const selsp = ((next as Record<string, unknown>)._sectionSpacing ?? {}) as Record<string, { paddingTop?: string; paddingBottom?: string; marginTop?: string; marginBottom?: string }>;
        const elKey = `${sectionIndex}_${elementType}`;
        if (!marginTop && !marginBottom) { delete selsp[elKey]; } else { selsp[elKey] = { marginTop: marginTop || undefined, marginBottom: marginBottom || undefined }; }
        (next as Record<string, unknown>)._sectionSpacing = selsp;
        editSpecRef.current = next;
        setEditSpec(next);
        if (editSaveTimerRef.current) clearTimeout(editSaveTimerRef.current);
        editSaveTimerRef.current = setTimeout(() => { void handleSaveEdit(next); }, 800);
        return;
      }

      if (msgType === "vela-reorder") {
        const { from, to } = e.data as { from: number; to: number };
        const cur = editSpecRef.current;
        if (!cur) return;
        const next: WebsiteSpec = JSON.parse(JSON.stringify(cur));
        const secs = next.sections;
        if (from < 0 || to < 0 || from >= secs.length || to >= secs.length) return;
        const tmp = secs[from]; secs[from] = secs[to]; secs[to] = tmp;
        editSpecRef.current = next;
        setEditSpec(next);
        void handleSaveEdit(next);
        return;
      }

      if (msgType !== "vela-edit") return;
      if (building) return;
      const { sectionIndex, field, itemIndex, subField, value } = e.data as {
        sectionIndex: number; field: string;
        itemIndex?: number; subField?: string; value: string;
      };
      const cur = editSpecRef.current;
      if (!cur) return;
      // Push snapshot to undo stack
      setUndoStack((prev) => [...prev.slice(-19), JSON.parse(JSON.stringify(cur)) as WebsiteSpec]);
      // Deep-clone and apply edit
      const next: WebsiteSpec = JSON.parse(JSON.stringify(cur));
      const sec = next.sections[sectionIndex];
      if (!sec) return;
      if (itemIndex !== undefined && subField !== undefined) {
        const arr = sec.content[field] as Record<string, unknown>[] | undefined;
        if (arr && arr[itemIndex]) arr[itemIndex][subField] = value;
      } else {
        sec.content[field] = value;
      }
      editSpecRef.current = next;
      setEditSpec(next);
      // Debounce save: 1s after last field edit
      if (editSaveTimerRef.current) clearTimeout(editSaveTimerRef.current);
      editSaveTimerRef.current = setTimeout(() => { void handleSaveEdit(next); }, 1000);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [editMode, building, handleSaveEdit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Derived values ────────────────────────────────────────────────────────────
  const origin      = typeof window !== "undefined" ? window.location.origin : "";
  const previewHtml = previewVersionHtml ?? html;

  // When edit mode is ON, inject window.VS_SPEC + the edit script before </body>.
  // Depends on previewHtml (reloads iframe after server save) but intentionally
  // reads editSpecRef.current (not editSpec state) so that mid-edit field changes
  // do NOT trigger an iframe reload — only the server-returned HTML does.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const editSrcDoc = useMemo(() => {
    if (!editMode || !previewHtml) return previewHtml;
    const spec = editSpecRef.current;
    if (!spec) return previewHtml;
    const specJson = JSON.stringify(spec)
      .replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
    const inject = `<script>window.VS_EDIT_MODE=true;window.VS_SPEC=${specJson};${EDIT_SCRIPT}<\/script>`;
    return previewHtml.includes("</body>")
      ? previewHtml.replace("</body>", inject + "</body>")
      : previewHtml + inject;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, previewHtml]); // editSpec intentionally excluded. Uses ref

  const iframeSrc = editMode ? (editSrcDoc ?? previewHtml) : previewHtml;

  // Device preview — real pixel dimensions, no transform scaling
  const _baseW        = device === "tablet" ? 834 : 390;
  const _baseH        = device === "tablet" ? 1194 : 844;
  const iframeW       = (device === "tablet" || device === "phone") ? (rotated ? _baseH : _baseW) : (device === "laptop" ? 1280 : 0);
  const iframeH       = (device === "tablet" || device === "phone") ? (rotated ? _baseW : _baseH) : 0;
  const hasDeviceFrame = device === "tablet" || device === "phone";
  const deviceLabel   = device === "laptop" ? "1280px"
    : device === "tablet" ? (rotated ? "1194 × 834" : "834 × 1194")
    : device === "phone"  ? (rotated ? "844 × 390"  : "390 × 844")
    : "";

  // Publish button label
  const publishLabel = publishing
    ? (isPublished ? "Updating…" : "Publishing…")
    : !isPublished
    ? t("website.publish")
    : draftDiffers ? "Update Site" : "Published ↗";

  // ── Loading skeleton ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] animate-pulse">
        <div className="flex items-center justify-between pb-4 shrink-0">
          <div>
            <div className="h-6 w-40 bg-[#E5E7EB] rounded-lg" />
            <div className="h-3 w-64 bg-[#F3F4F6] rounded mt-1.5" />
          </div>
          <div className="h-9 w-28 bg-[#E5E7EB] rounded-xl" />
        </div>
        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
          <div className="hidden md:block w-[152px] bg-white border border-[#EBEBEB] rounded-xl shrink-0" />
          <div className="w-full md:w-[320px] bg-white border border-[#E5E7EB] rounded-2xl shrink-0" />
          <div className="hidden md:block flex-1 bg-white border border-[#E5E7EB] rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">

      {/* Header — FIX 6: title is always "Website Builder" (was showing the
          active site's own name instead, which meant the page's identity
          changed depending on which site was selected). A real status
          badge sits next to it instead. */}
      <div className="flex items-center justify-between pb-4 shrink-0 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#111111] dark:text-white">
              {t("website.title")}
            </h1>
            {built && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide ${
                isPublished
                  ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                  : "bg-[#F3F4F6] dark:bg-[#1E1E24] text-[#6B7280] dark:text-[#9CA3AF]"
              }`}>
                {isPublished ? "PUBLISHED" : "DRAFT"}
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">{t("website.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Site name + dropdown (only a real dropdown when there's more
              than one site to switch between) -- reuses the same
              handleSwitchProject the sidebar already uses, not a
              duplicate switching implementation. */}
          {built && projects.length > 0 && (
            <div className="relative">
              <button
                onClick={() => projects.length > 1 && setShowToolbarSiteMenu((v) => !v)}
                className={`hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#E5E7EB] bg-white dark:bg-[#17171C] transition-colors ${projects.length > 1 ? "hover:border-[#D1D5DB] dark:hover:border-[#3A3A44] cursor-pointer" : "cursor-default"}`}
              >
                <span className="max-w-[140px] truncate">{siteName || "Untitled"}</span>
                {projects.length > 1 && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`shrink-0 transition-transform ${showToolbarSiteMenu ? "rotate-180" : ""}`}>
                    <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              {showToolbarSiteMenu && projects.length > 1 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowToolbarSiteMenu(false)} />
                  <div className="absolute right-0 top-[calc(100%+4px)] z-50 bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-lg shadow-xl py-1 w-48 max-h-64 overflow-y-auto">
                    {projects.map((p) => (
                      <button key={p.id}
                        onClick={() => { setShowToolbarSiteMenu(false); handleSwitchProject(p); }}
                        className={`w-full text-left px-3 py-2 text-xs truncate transition-colors ${p.id === websiteId ? "text-[#FF6B35] font-semibold" : "text-[#374151] dark:text-[#E5E7EB] hover:bg-[#F9FAFB] dark:hover:bg-[#17171C]"}`}>
                        {p.name || "Untitled"}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {projects.length > 0 && (
            <span className="hidden md:block text-[13px] text-[#9CA3AF] font-medium">
              {projects.length}/{websiteLimit} site{websiteLimit !== 1 ? "s" : ""}
            </span>
          )}

          {/* Mobile tab toggle */}
          <div className="flex md:hidden gap-1 bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl p-1">
            {(["chat", "preview"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${activeTab === tab ? "bg-[#FF6B35] text-white" : "text-[#6B7280] dark:text-[#9CA3AF]"}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* New Website button — visible on mobile only; desktop uses the sidebar.
              FIX: had no dark: variants at all -- the hover state
              (hover:text-[#374151], a dark slate meant for light
              backgrounds) went nearly invisible against a dark background. */}
          {built && (
            <button onClick={handleNewWebsite}
              className="md:hidden text-xs font-semibold px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#374151] dark:hover:text-white hover:border-[#374151] dark:hover:border-[#4B5563] transition-colors">
              New Website
            </button>
          )}

          {/* FIX 3: the standalone "Edit site" pill was a duplicate
              affordance -- the toolbar already has the site-name dropdown
              right next to it, and the chat panel (this button's only
              effect) is always visible on desktop anyway. Removed to match
              the reference: title+badge on the left, one site dropdown +
              one Publish button on the right, nothing else. On mobile,
              reaching the chat panel is still one tap away via the
              chat/preview tab toggle below. */}

          {/* Publish button + panel */}
          <div className="relative" ref={publishBtnRef}>
            <button
              onClick={handleTogglePanel}
              disabled={!built || publishing}
              className="text-xs font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: "var(--vp-color)" }}>
              {publishLabel}
            </button>

            {showPublishPanel && built && (
              <>
                {/* Mobile backdrop */}
                <div className="fixed inset-0 z-40 md:hidden bg-black/20" onClick={() => setShowPublishPanel(false)} />
                <PublishPanel
                  isPublished={isPublished} publishedUrl={publishedUrl} visitCount={visitCount}
                  siteName={siteName} setSiteName={setSiteName}
                  siteSlug={siteSlug} setSiteSlug={setSiteSlug}
                  savedSlug={savedSlug} setSavedSlug={setSavedSlug}
                  slugError={slugError} setSlugError={setSlugError}
                  settingsError={settingsError} setSettingsError={setSettingsError}
                  savingSettings={savingSettings} setSavingSettings={setSavingSettings}
                  websiteId={websiteId}
                  customDomain={customDomain} setCustomDomain={setCustomDomain}
                  domainStatus={domainStatus} setDomainStatus={setDomainStatus}
                  domainInput={domainInput} setDomainInput={setDomainInput}
                  domainError={domainError} setDomainError={setDomainError}
                  connectingDomain={connectingDomain} setConnectingDomain={setConnectingDomain}
                  checkingDomain={checkingDomain} setCheckingDomain={setCheckingDomain}
                  removingDomain={removingDomain} setRemovingDomain={setRemovingDomain}
                  draftDiffers={draftDiffers} publishing={publishing}
                  hasDraft={built && html.length > 50}
                  hasContactInfo={specHasContactInfo}
                  onPublish={handleDoPublish}
                  onClose={() => setShowPublishPanel(false)}
                  setPublishedUrl={setPublishedUrl}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main layout: sidebar + chat + preview */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">

        {/* SIDEBAR: Sites list (desktop only) — one row per site, Lovable-style */}
        <div
          className="hidden md:flex flex-col bg-white dark:bg-[#17171C] border-r border-[#EBEBEB] dark:border-[#2A2A32] overflow-hidden shrink-0 relative"
          style={{ width: sidebarWidth }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-2.5 pt-2.5 pb-1.5 shrink-0">
            <span className="text-[9px] font-bold text-[#BBBBBB] uppercase tracking-widest">Sites</span>
            <button onClick={handleNewWebsite} title="New website"
              className="w-5 h-5 flex items-center justify-center rounded-md text-[#BBBBBB] hover:text-[#374151] dark:hover:text-[#E5E7EB] hover:bg-[#F3F4F6] dark:hover:bg-[#1E1E24] transition-colors">
              <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Scrollable site list — one row per site */}
          <div className="flex-1 overflow-y-auto">

            {/* Site rows */}
            {projects.map((p) => {
              const isActive   = p.id === websiteId;
              const isRenaming = renamingId === p.id;
              const menuOpen   = menuOpenId === p.id;
              return (
                <div
                  key={p.id}
                  className={`group relative flex items-center transition-colors hover:bg-[#F5F5F5] dark:hover:bg-[#1E1E24] ${
                    isActive ? "border-l-2 border-[#FF6B35] bg-[#FFF8F6] dark:bg-[#2A1A14]" : "border-l-2 border-transparent"
                  }`}
                  style={{ minHeight: 34 }}
                >
                  {isRenaming ? (
                    <div className="flex-1 px-2 py-1">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")  handleSaveRename(p.id, renameValue);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onBlur={() => handleSaveRename(p.id, renameValue)}
                        className="w-full text-[11px] px-1.5 py-0.5 border border-[#FF6B35] rounded outline-none bg-white dark:bg-[#1E1E24] text-[#111111] dark:text-white"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSwitchProject(p)}
                      className="flex-1 text-left pl-2.5 pr-1 py-1.5 flex flex-col justify-center min-w-0"
                    >
                      <span className={`text-[13px] leading-tight truncate ${
                        isActive ? "font-semibold text-[#111111] dark:text-white" : "font-medium text-[#374151] dark:text-[#9CA3AF]"
                      }`}>
                        {p.name || "Untitled"}
                      </span>
                      {p.updated_at && (
                        <span className="text-[11px] text-[#9CA3AF] leading-tight mt-0.5">
                          {timeAgo(p.updated_at)}
                        </span>
                      )}
                    </button>
                  )}

                  {/* ⋯ menu trigger — position is captured on click; dropdown renders fixed at page level */}
                  {!isRenaming && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (menuOpenId === p.id) {
                          setMenuOpenId(null); setMenuPos(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                          setMenuOpenId(p.id);
                        }
                      }}
                      className="shrink-0 w-5 h-5 mr-1 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded hover:bg-[#E5E7EB] dark:hover:bg-[#2A2A32] transition-all text-[#9CA3AF] hover:text-[#374151] dark:hover:text-white"
                    >
                      <svg width="10" height="3" viewBox="0 0 16 4" fill="currentColor">
                        <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="14" cy="2" r="1.5"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}

            {projects.length === 0 && (
              <div className="px-3 py-5 text-center">
                <p className="text-[10px] text-[#BBBBBB] dark:text-[#555]">No sites yet</p>
              </div>
            )}
          </div>

          {/* Drag-to-resize handle */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 flex items-center justify-center group/handle"
          >
            <div className="w-px h-10 bg-transparent group-hover/handle:bg-[#FF6B35]/40 transition-colors rounded-full" />
          </div>
        </div>

        {/* LEFT: Chat -- FIX 2 (round F): hidden entirely (all breakpoints,
            not just mobile) while Analytics is open, so the Analytics tab
            actually goes full-width instead of sharing the row with a
            still-visible chat panel on desktop. Only a className toggle --
            no chat state is ever torn down, so "← Chat" restores chat +
            preview exactly as they were. */}
        <div
          ref={chatPanelRef}
          className={`${showAnalyticsPanel ? "hidden" : `${activeTab === "preview" ? "hidden" : "flex"} md:flex`} w-full flex-col bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-2xl overflow-hidden shrink-0 relative`}
          style={typeof window !== "undefined" && window.innerWidth >= 768 && !showAnalyticsPanel ? { width: chatWidth } : undefined}
        >

          {/* FIX 6: "Build with AI" subheading -- confirmed missing
              entirely from the real page (only ever existed in the
              reference/demo), added once here above the chat panel. */}
          {!showVersionsPanel && !showAnalyticsPanel && (
            <div className="px-4 pt-3.5 pb-1 shrink-0">
              <p className="text-sm font-bold text-[#111111] dark:text-white">Build with AI</p>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">Chat to customize your site</p>
            </div>
          )}

          {/* Panel tab toggles — Chat / Versions / Analytics */}
          {built && (
            <div className="flex items-center justify-between px-4 pt-2.5 pb-0 shrink-0">
              {(showVersionsPanel || showAnalyticsPanel) ? (
                <button
                  onClick={() => { setShowVersionsPanel(false); setShowAnalyticsPanel(false); }}
                  className="flex items-center gap-1 text-[10px] font-semibold text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#E5E7EB] transition-colors px-2 py-1 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#1E1E24]"
                >
                  ← Chat
                </button>
              ) : <div />}
              {!showVersionsPanel && !showAnalyticsPanel && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setShowVersionsPanel(true); setShowAnalyticsPanel(false); }}
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#E5E7EB] transition-colors px-2 py-1 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#1E1E24]"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {versions.length > 0 ? `Versions (${versions.length})` : "History"}
                  </button>
                  {isPublished && websiteId && (
                    <button
                      onClick={() => { setShowAnalyticsPanel(true); setShowVersionsPanel(false); setActiveTab("preview"); loadAnalytics(); loadWebsiteAiConfig(); }}
                      className="flex items-center gap-1.5 text-[10px] font-semibold text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#E5E7EB] transition-colors px-2 py-1 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#1E1E24]"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 20V10M12 20V4M6 20v-6"/>
                      </svg>
                      Analytics
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {showVersionsPanel ? (
            /* ── Versions panel ──────────────────────────────────────────── */
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-[9px] font-bold text-[#BBBBBB] uppercase tracking-widest mb-2 px-1">Version History</p>
              {versions.length === 0 ? (
                <p className="text-[11px] text-[#9CA3AF] text-center py-8">No versions yet.</p>
              ) : (
                versions.slice().reverse().map((v, i) => (
                  <div
                    key={v.id}
                    onClick={() => { handlePreviewVersion(v); setShowVersionsPanel(false); }}
                    className={`flex items-start gap-3 bg-white dark:bg-[#1E1E24] border rounded-xl p-3 transition-colors cursor-pointer ${
                      previewingVersion === v.id
                        ? "border-[#FF6B35]/50 bg-[#FFF8F6] dark:bg-[#2A1A14]"
                        : "border-[#E5E7EB] dark:border-[#2A2A32] hover:border-[#FF6B35]/30 hover:bg-[#FFF8F6] dark:hover:bg-[#2A1A14]"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${v.type === "publish" ? "bg-green-100" : "bg-[#F3F4F6]"}`}>
                      {v.type === "publish" ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="3 9 21 9"/></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[#111111] dark:text-white truncate">
                        {i === 0 ? "Current draft" : (v.type === "publish" ? `Published ${timeAgo(v.created_at)}` : v.label)}
                      </p>
                      {v.type !== "publish" && (
                        <p className="text-[10px] text-[#9CA3AF] mt-0.5">{timeAgo(v.created_at)}</p>
                      )}
                    </div>
                    {i === 0 ? (
                      <span className="text-[10px] font-medium text-[#9CA3AF] shrink-0 mt-0.5">Current</span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRestoreConfirmTarget(v);
                        }}
                        disabled={restoringVersion === v.id}
                        className="text-[10px] font-semibold text-[#FF6B35] hover:opacity-80 disabled:opacity-40 shrink-0 mt-0.5"
                      >
                        {restoringVersion === v.id ? "…" : "Restore"}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* ── Chat messages ───────────────────────────────────────────── */
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.map((msg, i) => {
                // Session separator — "New website" divider
                if (msg.isSeparator) {
                  return (
                    <div key={i} className="flex items-center gap-3 py-1">
                      <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-[#2A2A32]" />
                      <span className="text-[10px] font-semibold text-[#9CA3AF] shrink-0 px-2 py-1 bg-[#F9FAFB] dark:bg-[#1E1E24] rounded-full border border-[#E5E7EB] dark:border-[#2A2A32]">
                        New website
                      </span>
                      <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-[#2A2A32]" />
                    </div>
                  );
                }

                // Version role is not rendered in the chat feed
                if (msg.role === "version") return null;

                return (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "ai" && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5"
                        style={{ background: "var(--vela-gradient)" }}>
                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                          <path d="M2 3L7 11L12 3" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#FF6B35] text-white rounded-tr-sm"
                        : msg.isError
                        ? "bg-red-50 dark:bg-red-950/40 text-[#991B1B] dark:text-red-400 rounded-tl-sm border border-red-100 dark:border-red-900/50"
                        : "bg-[#F9FAFB] dark:bg-[#1E1E24] text-[#111111] dark:text-[#E5E7EB] rounded-tl-sm border border-[#F3F4F6] dark:border-[#2A2A32]"
                    } ${msg.isBuilding ? "animate-pulse" : ""}`}>
                      {msg.isBuilding ? (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
                          <span className="text-[#6B7280] dark:text-[#9CA3AF]">{msg.content}</span>
                        </div>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.images && msg.images.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {msg.images.map((src, idx) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={idx} src={src} alt="" className="w-14 h-14 rounded-lg object-cover border border-white/30" />
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Language picker — only for fresh (not-yet-built) sessions */}
          {!built && msgs.filter((m) => m.role === "user").length === 0 && !siteLanguage && (
            <div className="px-4 pb-2">
              <p className="text-[10px] text-[#9CA3AF] mb-2">Choose language</p>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button key={lang} onClick={() => handleSelectLanguage(lang)}
                    className="text-[10px] px-2.5 py-1.5 bg-[#F3F4F6] dark:bg-[#1E1E24] text-[#374151] dark:text-[#9CA3AF] rounded-lg hover:bg-[#FF6B35]/10 hover:text-[#FF6B35] transition-colors font-medium">
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI assistant toggle — only for fresh sessions, after language is picked */}
          {!built && msgs.filter((m) => m.role === "user").length === 0 && !!siteLanguage && !embedAssistantChosen && (
            <div className="px-4 pb-2">
              <p className="text-[10px] text-[#9CA3AF] mb-2">Add your AI assistant to this website?</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => handleSelectEmbedAssistant(true)}
                  className="text-[10px] px-2.5 py-1.5 bg-[#F3F4F6] dark:bg-[#1E1E24] text-[#374151] dark:text-[#9CA3AF] rounded-lg hover:bg-[#FF6B35]/10 hover:text-[#FF6B35] transition-colors font-medium">
                  Yes, add it
                </button>
                <button onClick={() => handleSelectEmbedAssistant(false)}
                  className="text-[10px] px-2.5 py-1.5 bg-[#F3F4F6] dark:bg-[#1E1E24] text-[#374151] dark:text-[#9CA3AF] rounded-lg hover:bg-[#FF6B35]/10 hover:text-[#FF6B35] transition-colors font-medium">
                  Not now
                </button>
              </div>
            </div>
          )}

          {/* Quick-start suggestions — only after language + AI assistant choice, before first user message */}
          {msgs.filter((m) => m.role === "user").length === 0 && !!siteLanguage && embedAssistantChosen && (
            <div className="px-4 pb-2">
              <p className="text-[10px] text-[#9CA3AF] mb-2">{t("website.quickStarts")}</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => setInput(s)}
                    className="text-[10px] px-2.5 py-1.5 bg-[#F3F4F6] dark:bg-[#1E1E24] text-[#374151] dark:text-[#9CA3AF] rounded-lg hover:bg-[#FF6B35]/10 hover:text-[#FF6B35] transition-colors text-left">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Real, specific error when a pasted/attached image is rejected
              (wrong format or too large) -- FIX 3 (round G), matches
              VelaAssistant's equivalent banner. */}
          {attachError && (
            <div className="mx-3 mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40">
              <p className="text-[11px] text-[#991B1B] dark:text-red-400 flex-1">{attachError}</p>
              <button onClick={() => setAttachError(null)} className="text-[#991B1B] dark:text-red-400 hover:opacity-70 shrink-0" aria-label="Dismiss">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          )}

          {/* Attached image thumbnails */}
          {attachedImages.length > 0 && (
            <div className="px-3 pt-2 flex flex-wrap gap-2">
              {attachedImages.map((img, idx) => (
                <div key={idx} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt="" className="w-12 h-12 rounded-lg object-cover border border-[#E5E7EB]" />
                  <button onClick={() => setAttachedImages((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#374151] text-white rounded-full flex items-center justify-center text-[9px] font-bold leading-none">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="p-3 border-t border-[#F3F4F6] dark:border-[#2A2A32]">
            <div className="flex items-end gap-2 bg-[#F9FAFB] dark:bg-[#1E1E24] rounded-xl px-3 py-2.5 border border-[#E5E7EB] dark:border-[#2A2A32] focus-within:border-[#FF6B35]/50 transition-colors">
              <button type="button" onClick={() => fileInputRef.current?.click()}
                disabled={building || attachedImages.length >= MAX_ATTACH} title="Attach image"
                className="shrink-0 text-[#9CA3AF] hover:text-[#FF6B35] transition-colors disabled:opacity-40 pb-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" multiple className="hidden" onChange={handleFileSelect} />
              <textarea ref={chatInputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} onPaste={handleChatPaste}
                placeholder={built ? "What would you like to change?" : "Tell me about your business…"}
                rows={1} disabled={building}
                className="flex-1 bg-transparent text-xs text-[#111111] dark:text-[#E5E7EB] placeholder:text-[#9CA3AF] resize-none focus:outline-none min-h-[20px] max-h-[80px] disabled:opacity-60"
                style={{ lineHeight: "1.5" }}
              />
              <button onClick={handleSend} disabled={(!input.trim() && attachedImages.length === 0) || building}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 disabled:opacity-40 transition-opacity hover:opacity-90"
                style={{ background: "var(--vp-color)" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1.5 10.5l9-4.5-9-4.5v3.5l6 1-6 1V10.5z" fill="white"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Chat drag-to-resize handle */}
          <div
            onMouseDown={handleChatResizeMouseDown}
            className="hidden md:flex absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 items-center justify-center group/chat-handle"
          >
            <div className="w-px h-10 bg-transparent group-hover/chat-handle:bg-[#FF6B35]/40 transition-colors rounded-full" />
          </div>
        </div>

        {/* RIGHT: Preview / Code */}
        <div className={`${activeTab === "chat" ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden min-h-0 md:min-w-[400px]`}>
          {/* Top bar */}
          <div className="flex items-center justify-between mb-3 shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isPublished ? "bg-green-400" : built ? "bg-yellow-400 animate-pulse" : "bg-[#9CA3AF]"}`} />
              <p className="text-xs font-medium text-[#6B7280]">
                {previewVersionHtml ? "Previewing version. Not your draft" :
                 isPublished ? "Live" : built ? t("website.livePreview") : t("website.previewEmpty")}
              </p>
              {previewVersionHtml && (
                <button onClick={() => setPreviewVersionHtml(null)}
                  className="text-[10px] text-[#FF6B35] font-semibold hover:opacity-80">
                  Back to draft
                </button>
              )}
            </div>
            {built && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Preview / Code toggle — Settings and History removed */}
                <div className="flex items-center gap-1 bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl p-1">
                  {(["preview", "code"] as const).map((mode) => (
                    <button key={mode} onClick={() => { setViewMode(mode); if (previewVersionHtml && mode !== "preview") setPreviewVersionHtml(null); }}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${viewMode === mode ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111]" : "text-[#6B7280] hover:text-[#111111] dark:hover:text-white"}`}>
                      {mode === "code" ? "</>" : "Preview"}
                    </button>
                  ))}
                </div>
                {viewMode === "preview" && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Edit mode toggle — hidden when previewing a version or during generation */}
                    {!previewVersionHtml && (
                      <>
                        <button
                          onClick={handleToggleEditMode}
                          disabled={building || !built}
                          title={editMode ? "Exit edit mode" : "Click any text on the preview to edit it"}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-40 ${
                            editMode
                              ? "bg-[#FF6B35] text-white"
                              : "bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] text-[#6B7280] hover:text-[#111111] dark:hover:text-white"
                          }`}>
                          {editMode ? "Done" : "Edit"}
                        </button>
                        {editMode && undoStack.length > 0 && (
                          <button onClick={handleUndo} title="Undo last edit"
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] text-[#6B7280] hover:text-[#111111] dark:hover:text-white transition-colors">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7v6h6"/><path d="M3 13C5.5 9 9.5 6 14 6a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-6.5-2.7"/></svg>
                          </button>
                        )}
                        {editMode && editSpec?.designDNA?.palette && (
                          <div className="relative">
                            <button onClick={() => setShowColorPanel((p) => !p)} title="Edit colours"
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${showColorPanel ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111]" : "bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] text-[#6B7280] hover:text-[#111111] dark:hover:text-white"}`}>
                              Colors
                            </button>
                            {showColorPanel && (
                              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl shadow-lg p-3 space-y-2 z-50 min-w-[148px]">
                                {(["accent","bg","text","muted"] as const).filter((k) => (editSpec.designDNA!.palette as Record<string,string>)[k]).map((k) => (
                                  <div key={k} className="flex items-center gap-2">
                                    <input type="color" value={(editSpec.designDNA!.palette as Record<string,string>)[k]}
                                      onChange={(e) => handlePaletteChange(k, e.target.value)}
                                      className="w-7 h-7 rounded cursor-pointer border-0 p-0.5 bg-transparent" />
                                    <span className="text-[10px] text-[#6B7280] capitalize">{k}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {editSaving && (
                          <span className="text-[9px] text-[#9CA3AF] tabular-nums hidden sm:block">Saving…</span>
                        )}
                      </>
                    )}
                    {/* 4-device selector */}
                    <div className="flex items-center gap-0.5 bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl p-1">
                      {(["desktop", "laptop", "tablet", "phone"] as DevicePreset[]).map((d) => (
                        <button key={d} onClick={() => { setDevice(d); setRotated(false); }}
                          title={d.charAt(0).toUpperCase() + d.slice(1)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${device === d ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111]" : "text-[#6B7280] hover:text-[#111111] dark:hover:text-white"}`}>
                          {d === "desktop" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>}
                          {d === "laptop"  && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M1 21h22"/></svg>}
                          {d === "tablet"  && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/></svg>}
                          {d === "phone"   && <svg width="11" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/></svg>}
                        </button>
                      ))}
                    </div>
                    {/* Active width label */}
                    {deviceLabel && (
                      <span className="text-[9px] font-mono text-[#9CA3AF] tabular-nums select-none hidden sm:block">
                        {deviceLabel}
                      </span>
                    )}
                    {/* Rotate — tablet and phone only */}
                    {(device === "tablet" || device === "phone") && (
                      <button onClick={() => setRotated((r) => !r)} title="Rotate"
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] text-[#6B7280] hover:text-[#111111] dark:hover:text-white transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/></svg>
                      </button>
                    )}
                    {/* Open in new tab */}
                    <button onClick={handleOpenInNewTab} title="Open in new tab"
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] text-[#6B7280] hover:text-[#111111] dark:hover:text-white transition-colors">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Browser chrome + content */}
          <div className="bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0">
            {/* Chrome bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F3F4F6] dark:border-[#2A2A32] shrink-0 bg-[#F9FAFB] dark:bg-[#1E1E24]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <span className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-lg px-3 py-1 text-[11px] text-[#9CA3AF] font-mono truncate">
                  {publishedUrl ? `${origin}${publishedUrl}` : "yoursite.vela.ai"}
                </div>
              </div>
            </div>

            {/* Content area */}
            {building ? (
              <div className="flex-1 overflow-hidden bg-[#F9FAFB] dark:bg-[#101014] flex flex-col items-center justify-center gap-4 min-h-0">
                <div className="w-10 h-10 rounded-full border-[3px] border-[#FF6B35] border-t-transparent animate-spin" />
                <div className="space-y-1 text-center">
                  <p className="text-sm font-semibold text-[#111111] dark:text-white">{t("website.building")}</p>
                  <p className="text-xs text-[#6B7280]">Generating design, real photos, and booking flow…</p>
                </div>
              </div>

            ) : !built ? (
              <div className="flex-1 overflow-hidden bg-[#F9FAFB] dark:bg-[#101014] flex items-center justify-center min-h-0">
                <div className="text-center space-y-3 max-w-xs p-4">
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[#E5E7EB] flex items-center justify-center mx-auto">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="3" width="20" height="15" rx="2" stroke="#9CA3AF" strokeWidth="1.5"/>
                      <path d="M8 21h8M12 18v3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-[#374151] dark:text-[#9CA3AF]">Your website preview</p>
                  <p className="text-xs text-[#9CA3AF]">Describe your business in the chat. I&apos;ll build a premium site with real photos in seconds</p>
                </div>
              </div>

            ) : viewMode === "code" ? (
              <div className="flex-1 overflow-hidden min-h-0 relative">
                <button onClick={copyCode}
                  className="absolute top-3 right-3 z-10 text-[10px] px-3 py-1.5 bg-[#374151] text-[#D1D5DB] rounded-lg hover:bg-[#4B5563] transition-colors font-semibold">
                  {codeCopied ? "Copied!" : "Copy Code"}
                </button>
                <pre className="w-full h-full overflow-auto bg-[#1E1E1E] text-[#D4D4D4] text-[11px] font-mono p-4 leading-relaxed whitespace-pre break-normal">
                  {html}
                </pre>
              </div>

            ) : showAnalyticsPanel ? (
              /* ── Analytics — FIX 7 (round I): tightened to match the main
                 Analytics page's actual density (confirmed via live DOM
                 inspection: rounded-xl, p-4, text-2xl values, text-[11px]
                 labels) -- round H's pass over-corrected toward "bigger" and
                 ended up feeling oversized/empty instead of information-
                 dense. Same content as round H (no rings, full-width chart,
                 Website AI config), just sized like the rest of the app
                 instead of inflated. ─────────────────────────────────── */
              <div className="flex-1 overflow-y-auto bg-[#F9FAFB] dark:bg-[#101014]">
                <div className="w-full p-4 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <button
                      onClick={() => { setShowAnalyticsPanel(false); setActiveTab("chat"); }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111111] dark:hover:text-white transition-colors px-2 py-1 -ml-2 rounded-lg hover:bg-white dark:hover:bg-[#1E1E24]"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2.5L3 6l4.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Back to editor
                    </button>
                    <button onClick={loadAnalytics} disabled={analyticsLoading}
                      className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] bg-white dark:bg-[#17171C] text-[#6B7280] dark:text-[#9CA3AF] hover:border-[#FF6B35]/40 hover:text-[#FF6B35] disabled:opacity-40 transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={analyticsLoading ? "animate-spin" : ""}><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                      {analyticsLoading ? "Refreshing…" : "Refresh"}
                    </button>
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-[#111111] dark:text-white">Analytics</h2>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{siteName || "Your site"}</p>
                  </div>

                  {!isPublished ? (
                    <div className="text-center py-10 space-y-1.5 bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" className="mx-auto"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                      <p className="text-sm font-semibold text-[#374151] dark:text-[#9CA3AF]">Publish your site to start collecting analytics</p>
                    </div>
                  ) : analyticsLoading ? (
                    <div className="flex items-center justify-center py-10 bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl">
                      <div className="w-7 h-7 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
                    </div>
                  ) : !analyticsData ? (
                    <p className="text-sm text-[#9CA3AF] text-center py-10 bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl">Could not load analytics.</p>
                  ) : (() => {
                    const hasDeviceData = (["desktop", "mobile", "tablet"] as const).some((dev) => analyticsData.deviceSplit[dev] > 0);
                    return (
                      <>
                        {analyticsData.totalVisits === 0 && (
                          <div className="text-center py-6 space-y-1 bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl">
                            <p className="text-sm font-semibold text-[#374151] dark:text-[#9CA3AF]">No visits yet</p>
                            <p className="text-xs text-[#9CA3AF]">Share your site link to start seeing traffic. The numbers below will fill in as visits come in.</p>
                          </div>
                        )}

                        {/* FIX 7: density matched to Analytics' own KPI cards
                            exactly -- rounded-xl, p-4, text-2xl. */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {([
                            { label: "Total visits",    value: analyticsData.totalVisits    },
                            { label: "Unique visitors", value: analyticsData.uniqueVisitors },
                            { label: "Last 7 days",     value: analyticsData.last7Days      },
                            { label: "Last 30 days",    value: analyticsData.last30Days     },
                          ] as { label: string; value: number }[]).map(({ label, value }) => (
                            <div key={label} className="bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl p-4">
                              <p className="text-2xl font-bold text-[#111111] dark:text-white tabular-nums leading-none">{value.toLocaleString()}</p>
                              <p className="text-[11px] text-[#9CA3AF] mt-1">{label}</p>
                            </div>
                          ))}
                        </div>

                        {/* FIX 7: chart card matched to Analytics' own chart
                            card density (p-4, text-sm header) -- still
                            full-width and still the tallest element on the
                            page (it's the actual content), just not padded
                            like a hero banner. */}
                        <div className="bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-bold text-[#111111] dark:text-white">Daily visits · last 30 days</p>
                            {hasDeviceData && (
                              <div className="hidden sm:flex items-center gap-3">
                                {(["desktop", "mobile", "tablet"] as const).filter((dev) => analyticsData.deviceSplit[dev] > 0).map((dev) => (
                                  <span key={dev} className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] capitalize">
                                    {dev} <span className="font-semibold text-[#111111] dark:text-white">{analyticsData.deviceSplit[dev]}%</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <WebsiteVisitsChart data={analyticsData.dailyVisits} height={180} />
                          <div className="flex justify-between mt-1 pt-2 border-t border-[#F3F4F6] dark:border-[#2A2A32]">
                            <span className="text-[10px] text-[#9CA3AF]">{analyticsData.dailyVisits[0]?.date.slice(5)}</span>
                            <span className="text-[10px] text-[#9CA3AF]">Today</span>
                          </div>
                          {hasDeviceData && (
                            <div className="flex sm:hidden items-center gap-3 mt-2 pt-2 border-t border-[#F3F4F6] dark:border-[#2A2A32]">
                              {(["desktop", "mobile", "tablet"] as const).filter((dev) => analyticsData.deviceSplit[dev] > 0).map((dev) => (
                                <span key={dev} className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] capitalize">
                                  {dev} <span className="font-semibold text-[#111111] dark:text-white">{analyticsData.deviceSplit[dev]}%</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  {/* FIX 3 (round H) / FIX 7 (round I): real Website-channel
                      AI config, same component/mechanism as Instagram/
                      WhatsApp's Manage modal, scoped to channel="website"
                      here -- density matched to the rest of this panel. */}
                  {isPublished && (
                    <div className="bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl p-4">
                      <p className="text-sm font-bold text-[#111111] dark:text-white mb-0.5">Website chat AI settings</p>
                      <p className="text-[11px] text-[#9CA3AF] mb-3">Controls how Vela AI responds to visitors chatting on this site.</p>
                      <ChannelAiConfigFields
                        loading={websiteAiCfgLoading}
                        tone={websiteAiTone}
                        language={websiteAiLanguage}
                        saving={websiteAiCfgSaving}
                        saved={websiteAiCfgSaved}
                        onToneChange={setWebsiteAiTone}
                        onLanguageChange={setWebsiteAiLanguage}
                        onSave={saveWebsiteAiConfig}
                      />
                    </div>
                  )}
                </div>
              </div>

            ) : device === "desktop" ? (
              /* Desktop — full pane width */
              <div className="flex-1 min-h-0 flex overflow-hidden">
                <iframe
                  key={previewHtml}
                  srcDoc={iframeSrc}
                  title="Website preview"
                  className="bg-white w-full h-full"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
                />
              </div>
            ) : hasDeviceFrame ? (
              /* Tablet / Phone — fixed size, device frame, centered on neutral bg */
              <div className="flex-1 min-h-0 overflow-auto bg-[#E8E8EC] dark:bg-[#101014] flex justify-center items-start p-6">
                <div
                  className="shrink-0 rounded-[28px] border-[3px] border-[#C7C7CC] dark:border-[#3A3A42] overflow-hidden shadow-xl"
                  style={{ width: iframeW, height: iframeH }}
                >
                  <iframe
                    key={`${previewHtml.length}-${iframeW}-${iframeH}`}
                    srcDoc={iframeSrc}
                    title="Website preview"
                    style={{ width: iframeW, height: iframeH, display: "block" }}
                    className="bg-white"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
                  />
                </div>
              </div>
            ) : (
              /* Laptop — 1280px wide, scrollable horizontally, no frame */
              <div className="flex-1 min-h-0 overflow-auto bg-[#E8E8EC] dark:bg-[#101014] flex justify-center items-start p-4">
                <iframe
                  key={`${previewHtml.length}-${iframeW}`}
                  srcDoc={iframeSrc}
                  title="Website preview"
                  style={{ width: iframeW, minHeight: "100%", height: "100%", display: "block" }}
                  className="bg-white shrink-0"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transparent backdrop — clicking outside the dropdown closes it.
          Rendered BELOW the dropdown (z-199) so dropdown buttons receive clicks first. */}
      {menuOpenId !== null && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 199 }}
          onClick={() => { setMenuOpenId(null); setMenuPos(null); }}
        />
      )}

      {/* ⋯ project context menu — fixed position above backdrop so it escapes sidebar overflow:hidden */}
      {menuOpenId !== null && menuPos !== null && (() => {
        const mp = projects.find((proj) => proj.id === menuOpenId);
        if (!mp) return null;
        return (
          <div
            style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 200 }}
            className="bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-lg shadow-xl py-1 w-28"
          >
            <button
              onClick={() => { setMenuOpenId(null); setMenuPos(null); handleSwitchProject(mp); }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-[#374151] dark:text-[#E5E7EB] hover:bg-[#F9FAFB] dark:hover:bg-[#17171C]">
              Edit site
            </button>
            <button
              onClick={() => { setMenuPos(null); handleStartRename(mp); }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-[#374151] dark:text-[#E5E7EB] hover:bg-[#F9FAFB] dark:hover:bg-[#17171C]">
              Rename
            </button>
            <button
              onClick={() => { setMenuPos(null); handleDeleteProject(mp); }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30">
              Delete
            </button>
          </div>
        );
      })()}

      {/* New Website Confirmation Modal */}
      {showNewWebsiteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-[#17171C] rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-[#111111] dark:text-white">Start a new website?</h2>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
              Your current project will be saved in the sidebar. You can switch back anytime.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setShowNewWebsiteModal(false)}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#E5E7EB] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1E24] transition-colors">
                Cancel
              </button>
              <button
                onClick={handleConfirmNewWebsite}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity"
                style={{ background: "var(--vp-color)" }}>
                New Website
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Site Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-[#17171C] rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-[#111111] dark:text-white">
              Delete &ldquo;{deleteTarget.name ?? "this site"}&rdquo;?
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
              Its published page will go offline. This cannot be undone.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#E5E7EB] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1E24] transition-colors">
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl text-white bg-red-600 hover:bg-red-700 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Version Confirmation Modal */}
      {restoreConfirmTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-[#17171C] rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-[#111111] dark:text-white">Restore this version?</h2>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
              Restore this version? Your current draft will be replaced by the version from {new Date(restoreConfirmTarget.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} on {new Date(restoreConfirmTarget.created_at).toLocaleDateString()}. You can restore a newer version afterwards.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setRestoreConfirmTarget(null)}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#E5E7EB] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1E24] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  handleRestoreVersion(restoreConfirmTarget);
                  setShowVersionsPanel(false);
                  setRestoreConfirmTarget(null);
                }}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity"
                style={{ background: "var(--vp-color)" }}>
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Edit Modal */}
      {imgEditTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => { setImgEditTarget(null); setImgSearchQuery(""); }}>
          <div className="bg-white dark:bg-[#17171C] rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-[#111111] dark:text-white">Replace image</h2>
            {imgEditTarget.src && (
              <img src={imgEditTarget.src} alt="" className="w-full h-32 object-cover rounded-lg" />
            )}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Search Unsplash</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imgSearchQuery}
                  onChange={(e) => setImgSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && imgSearchQuery.trim()) void handleImageReplace(imgEditTarget.websiteId, imgEditTarget.vs, imgEditTarget.imgIdx, { query: imgSearchQuery.trim() }); }}
                  placeholder="e.g. coffee shop interior"
                  className="flex-1 text-sm border border-[#E5E7EB] dark:border-[#2A2A32] rounded-lg px-3 py-2 bg-white dark:bg-[#111111] text-[#111111] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/40"
                />
                <button
                  onClick={() => { if (imgSearchQuery.trim()) void handleImageReplace(imgEditTarget.websiteId, imgEditTarget.vs, imgEditTarget.imgIdx, { query: imgSearchQuery.trim() }); }}
                  disabled={imgSearching || !imgSearchQuery.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                  style={{ background: "var(--vp-color)" }}>
                  {imgSearching ? "…" : "Search"}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <span className="block w-full text-center text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#E5E7EB] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1E24] transition-colors">
                  Upload photo
                </span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === "string") {
                        void handleImageReplace(imgEditTarget.websiteId, imgEditTarget.vs, imgEditTarget.imgIdx, { imageData: reader.result });
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              <button
                onClick={() => void handleImageReplace(imgEditTarget.websiteId, imgEditTarget.vs, imgEditTarget.imgIdx, { remove: true })}
                disabled={imgSearching}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#2A2A32] text-[#6B7280] hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-40">
                Remove
              </button>
            </div>
            <button onClick={() => { setImgEditTarget(null); setImgSearchQuery(""); }}
              className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#E5E7EB] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1E24] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
