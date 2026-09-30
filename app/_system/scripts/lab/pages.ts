/**
 * BETA LAB PAGES — static, self-contained pt-BR pages under app/lab/. No network, no login, no analytics:
 * feedback lives in the viewer's own browser until they download it as a file and send it themselves.
 */
import type { LabFacts, Mission, ReviewSection } from "./model";

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

const CSS = `
:root{--bg:#f6f7f9;--fg:#0b0d10;--muted:#4a5561;--card:#fff;--line:#dde3ea;--accent:#0a5cb8;--p0:#c4000f;--ok:#1a7f37;--mid:#8a5a00;--soft:#eef2f6}
@media (prefers-color-scheme:dark){:root{--bg:#0b0d10;--fg:#f4f6f8;--muted:#9aa4ae;--card:#151a20;--line:#26303a;--accent:#64b5ff;--p0:#ff5a4f;--ok:#3ddc6e;--mid:#ffcc4d;--soft:#1f2730}}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:900px;margin:0 auto;padding:16px 16px 120px}
a{color:var(--accent)}
.top{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:baseline;justify-content:space-between;padding:8px 0 4px}
.top a{font-size:15px}
h1{font-size:28px;line-height:1.2;margin:8px 0}
h2{font-size:21px;line-height:1.3;margin:28px 0 8px}
h3{font-size:17px;margin:0}
.lead{color:var(--muted);margin:0 0 16px}
.box{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:12px 0}
.safety{border-left:6px solid var(--p0)}
.safety strong{color:var(--p0)}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.tile{display:block;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;color:inherit;text-decoration:none}
.tile strong{display:block;font-size:18px;margin-bottom:4px;color:var(--accent)}
.tile span{color:var(--muted);font-size:15px}
.meta{color:var(--muted);font-size:13px;word-break:break-all}
.badge{display:inline-block;font-size:12px;padding:2px 8px;border-radius:999px;background:var(--soft);color:var(--muted);margin-left:6px;vertical-align:middle}
.badge.p0{background:var(--p0);color:#fff;margin-left:0}
.item{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:12px 0}
.item.done{border-left:6px solid var(--ok)}
.item.changed{border-left:6px solid var(--mid)}
dl{display:grid;grid-template-columns:minmax(120px,190px) 1fr;gap:6px 14px;margin:12px 0}
dt{color:var(--muted);font-size:14px}
dd{margin:0}
@media (max-width:560px){dl{grid-template-columns:1fr}dt{margin-top:6px}}
fieldset{border:0;padding:0;margin:10px 0 0;display:flex;flex-wrap:wrap;gap:8px}
legend{font-size:14px;color:var(--muted);margin-bottom:4px;width:100%}
label.opt{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:6px 12px;cursor:pointer;background:var(--bg)}
label.opt:has(input:checked){border-color:var(--accent);outline:2px solid var(--accent)}
textarea,input[type=text],select{width:100%;font:inherit;color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:8px 10px}
textarea{min-height:64px;margin-top:10px}
.who{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.who label{font-size:14px;color:var(--muted)}
ol.steps{padding-left:22px}
ol.steps li{margin:10px 0}
.see{display:block;color:var(--muted);font-size:15px;margin-top:2px}
.see q{color:var(--fg);quotes:none}
.warn{display:block;color:var(--p0);font-size:14px;margin-top:2px}
.bar{position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--line);padding:8px 16px calc(8px + env(safe-area-inset-bottom))}
.bar .in{max-width:900px;margin:0 auto;display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center}
.bar .grow{flex:1 1 100%;font-size:13px;color:var(--muted)}
@media (min-width:640px){.bar .grow{flex-basis:200px}}
.bar button{padding:6px 12px;font-size:15px}
button{font:inherit;border-radius:10px;border:1px solid var(--line);background:var(--soft);color:var(--fg);padding:8px 14px;cursor:pointer}
button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
nav.toc{display:flex;flex-wrap:wrap;gap:6px}
nav.toc a{font-size:14px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:4px 10px;text-decoration:none}
.note{font-size:14px;color:var(--muted)}
.hidden{display:none!important}
@media print{.bar,.no-print,nav.toc{display:none!important}.wrap{padding-bottom:0}.item{break-inside:avoid}}
`;

const SAFETY = `<div class="box safety" role="note">
  <p><strong>Versão de teste.</strong> Os textos clínicos ainda não foram aprovados por profissionais de saúde.</p>
  <p>Em uma emergência real, ligue <a href="tel:192">192 (SAMU)</a>. Para apoio emocional, <a href="tel:188">188 (CVV)</a>.</p>
  <p>Durante os testes, o app pode abrir o discador ou o WhatsApp. Cancele: não complete ligações nem envie mensagens.</p>
</div>`;

function page(title: string, body: string, script = ""): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light dark">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
${body}
</div>
${script ? `<script>${script}</script>` : ""}
</body>
</html>
`;
}

const top = (here: string) => `<div class="top no-print"><a href="./">← Laboratório</a><span class="meta">${esc(here)}</span></div>`;
const facts = (f: LabFacts) => `<p class="meta">Registro ${esc(f.registryVersion)} · hash ${esc(f.registryHash)} · motor ${esc(f.bundle)}</p>`;

/** Resets the app's own storage in this browser. Lab-only: the app itself never offers this. */
const RESET_JS = `
async function sosResetApp(out){
  if(!confirm("Apagar os dados do app SOS neste navegador? Feche antes a aba do app.")) return;
  for (const db of ["sos-apollo","sos-apollo-vault"]) {
    await new Promise((r)=>{ try{ const q=indexedDB.deleteDatabase(db); q.onsuccess=q.onerror=q.onblocked=()=>r(); }catch(e){ r(); } });
  }
  if(out) out.textContent="Pronto. Abra o app de novo: ele começa pela primeira pergunta.";
}`;

/* ───────────────────────────── hub ───────────────────────────── */

export function hubPage(f: LabFacts, nMissions: number, nReview: number): string {
  const gate = f.pending
    ? `<p><strong>Versão final: bloqueada.</strong> ${f.pending} ${f.pending === 1 ? "item aguarda" : "itens aguardam"} aprovação clínica. Enquanto isso, o app mostra o aviso de versão beta.</p>
  <details><summary class="note">Detalhes técnicos</summary><ul class="note">${f.pendingItems.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></details>`
    : `<p><strong>Versão final: liberada.</strong> Todos os itens clínicos foram aprovados.</p>`;
  return page("SOS Apollo · Laboratório beta", `
<h1>SOS Apollo · Laboratório beta</h1>
<p class="lead">Área de teste da nova versão do SOS, para um grupo pequeno de testadores e para profissionais de saúde revisarem e aprovarem os textos clínicos.</p>
${SAFETY}
<div class="box">${gate}</div>

<h2>Para quem vai testar</h2>
<div class="grid">
  <a class="tile" href="../"><strong>Abrir o app</strong><span>A versão beta, como uma pessoa usaria. A barra vermelha do 192 fica sempre no topo.</span></a>
  <a class="tile" href="roteiros.html"><strong>Roteiros de teste</strong><span>${nMissions} missões curtas. Cada uma diz o que tocar e o que deve aparecer.</span></a>
  <a class="tile" href="simulador.html"><strong>Simulador com o porquê</strong><span>O mesmo motor, com um painel que mostra por que cada tela apareceu. Não abre o discador.</span></a>
</div>

<h2>Para profissionais de saúde</h2>
<div class="grid">
  <a class="tile" href="revisao.html"><strong>Revisão clínica</strong><span>${nReview} itens: regras de emergência, perguntas, orientações e frases de alerta. Aprove, ajuste ou reprove item por item.</span></a>
  <a class="tile" href="../medico.html?cenario=pista-bala-alcool-azulzinho"><strong>Modo Médico · cenários</strong><span>O resumo de crise para a equipe de saúde (tela e PDF A4), gerado pelo motor a partir de histórias de teste. Troque o cenário no topo da página.</span></a>
  <a class="tile" href="../medico.html"><strong>Modo Médico · ao vivo</strong><span>Abra o app em outra aba, responda algumas telas e veja este resumo se atualizar em tempo real. Tudo fica neste aparelho.</span></a>
  <a class="tile" href="../relatorio.html"><strong>Relatório de Emergência</strong><span>A linha do tempo da crise, na visão da própria pessoa (sem dados de substâncias), com botão de compartilhar.</span></a>
  <a class="tile" href="../legacy.html"><strong>Versão anterior</strong><span>A página que está no ar hoje, para comparar.</span></a>
</div>

<h2>Como mandar o retorno</h2>
<div class="box">
  <p>Nada aqui envia dados. As respostas ficam só neste navegador até você baixar o arquivo de retorno.</p>
  <p>Ao terminar, toque em «Baixar retorno» e envie o arquivo para a equipe pelo mesmo canal em que recebeu o convite.</p>
  <p>Não escreva nomes, telefones ou informações de saúde reais. Isto é uma simulação.</p>
</div>

<h2>Recomeçar do zero</h2>
<div class="box">
  <p class="note">Cada missão começa melhor com o app zerado. Feche a aba do app e toque abaixo.</p>
  <button type="button" onclick="sosResetApp(document.getElementById('reset-out'))">Apagar os dados do app neste navegador</button>
  <p id="reset-out" class="note" role="status"></p>
</div>
${facts(f)}
`, RESET_JS);
}

/* ───────────────────────────── clinical review ───────────────────────────── */

export function reviewPage(f: LabFacts, sections: ReviewSection[]): string {
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  const verdicts = (id: string) => `<fieldset><legend>Parecer</legend>
      <label class="opt"><input type="radio" name="v-${esc(id)}" value="aprovado"> Aprovar</label>
      <label class="opt"><input type="radio" name="v-${esc(id)}" value="ajustes"> Aprovar com ajustes</label>
      <label class="opt"><input type="radio" name="v-${esc(id)}" value="reprovado"> Não aprovar</label>
    </fieldset>
    <textarea name="c-${esc(id)}" aria-label="Comentário ou texto sugerido para ${esc(id)}" placeholder="Comentário ou texto sugerido (opcional)"></textarea>`;
  const body = sections.map((s) => `
<section id="s-${esc(s.id)}">
  <h2>${esc(s.title)}${s.optional ? ' <span class="badge">opcional</span>' : ""}</h2>
  <p class="lead">${esc(s.question)}</p>
  ${s.items.map((it) => `<article class="item" data-id="${esc(it.id)}" data-hash="${esc(it.hash)}" data-optional="${s.optional ? "1" : "0"}">
    <h3>${esc(it.title)} <span class="badge">${esc(it.status)}</span></h3>
    <dl>${it.fields.map((x) => `<dt>${esc(x.label)}</dt><dd>${esc(x.text)}</dd>`).join("")}</dl>
    ${verdicts(it.id)}
    <p class="note changed-note hidden">O texto deste item mudou desde a sua avaliação. Confira de novo.</p>
  </article>`).join("")}
</section>`).join("");
  return page("SOS Apollo · Revisão clínica", `
${top("Revisão clínica")}
<h1>Revisão clínica</h1>
<p class="lead">Cada item abaixo vem direto do motor do app: é exatamente o que ele decide e mostra. Dê um parecer por item. Os itens «opcionais» são só editoriais.</p>
${SAFETY}
<div class="box">
  <p>Os itens marcados como obrigatórios precisam de parecer para liberar a versão final. A liberação também exige o registro da aprovação em <span class="meta">docs/CLINICAL-REVIEW.md</span>, com nome, registro profissional e o hash do registro abaixo.</p>
  <p class="note">Suas respostas ficam salvas só neste navegador. Ao terminar, baixe o arquivo e envie para a equipe.</p>
  <div class="who">
    <div><label for="r-name">Nome</label><input type="text" id="r-name" autocomplete="name"></div>
    <div><label for="r-reg">Registro profissional (CRM, COREN, CRP…)</label><input type="text" id="r-reg"></div>
    <div><label for="r-spec">Especialidade</label><input type="text" id="r-spec"></div>
  </div>
</div>
<nav class="toc no-print" aria-label="Seções">${sections.map((s) => `<a href="#s-${esc(s.id)}">${esc(s.title.split(":")[0]!)}</a>`).join("")}</nav>
<p class="no-print"><label class="opt"><input type="checkbox" id="only-pending"> Mostrar só itens sem parecer</label></p>
${body}
${facts(f)}
<div class="bar"><div class="in">
  <span class="grow" id="progress" role="status">0 de ${total} itens com parecer</span>
  <button type="button" id="copy">Copiar resumo</button>
  <button type="button" onclick="window.print()">Imprimir ou PDF</button>
  <button type="button" class="primary" id="download">Baixar retorno</button>
</div></div>
`, `
const FACTS=${json({ registryHash: f.registryHash, registryVersion: f.registryVersion, bundle: f.bundle, total })};
// Stable key: verdicts survive a rebuild; per-item hashes flag any item whose text changed since.
const KEY="sos-lab-review:v1";
const items=[...document.querySelectorAll("article.item")];
let st={reviewer:{name:"",registration:"",specialty:""},items:{}};
try{ st=Object.assign(st, JSON.parse(localStorage.getItem(KEY)||"{}")); }catch(e){}
const save=()=>{ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(e){} };
const W={aprovado:"aprovado",ajustes:"com ajustes",reprovado:"não aprovado"};
function paint(){
  let n=0;
  for(const el of items){
    const id=el.dataset.id, s=st.items[id];
    const changed=!!(s&&s.hash&&s.hash!==el.dataset.hash);
    const done=!!(s&&s.verdict)&&!changed;
    if(done) n++;
    el.classList.toggle("done",done); el.classList.toggle("changed",changed);
    el.querySelector(".changed-note").classList.toggle("hidden",!changed);
    el.classList.toggle("hidden", document.getElementById("only-pending").checked && done);
  }
  document.getElementById("progress").textContent=n+" de "+FACTS.total+" itens com parecer";
}
for(const el of items){
  const id=el.dataset.id, s=st.items[id];
  if(s){ if(s.verdict){ const r=el.querySelector('input[value="'+s.verdict+'"]'); if(r) r.checked=true; } el.querySelector("textarea").value=s.comment||""; }
  el.addEventListener("input",()=>{
    const v=el.querySelector("input[type=radio]:checked");
    st.items[id]={verdict:v?v.value:"",comment:el.querySelector("textarea").value,hash:el.dataset.hash};
    save(); paint();
  });
}
const who={"r-name":"name","r-reg":"registration","r-spec":"specialty"};
for(const [k,f] of Object.entries(who)){ const el=document.getElementById(k); el.value=st.reviewer[f]||""; el.addEventListener("input",()=>{ st.reviewer[f]=el.value; save(); }); }
document.getElementById("only-pending").addEventListener("change",paint);
function exportData(){
  return {kind:"sos-apollo-clinical-review",version:1,registryHash:FACTS.registryHash,registryVersion:FACTS.registryVersion,bundle:FACTS.bundle,
    exportedAt:new Date().toISOString(),reviewer:st.reviewer,total:FACTS.total,
    items:items.map((el)=>{ const s=st.items[el.dataset.id]||{}; return {id:el.dataset.id,hash:el.dataset.hash,reviewedHash:s.hash||"",
      stale:!!(s.hash&&s.hash!==el.dataset.hash),optional:el.dataset.optional==="1",verdict:s.verdict||"",comment:s.comment||""}; })
      .filter((x)=>x.verdict||x.comment)};
}
function summary(){
  const d=exportData(), c={aprovado:0,ajustes:0,reprovado:0};
  for(const x of d.items) if(c[x.verdict]!==undefined) c[x.verdict]++;
  const lines=["Revisão clínica SOS Apollo (registro "+d.registryHash+")","Revisor(a): "+(d.reviewer.name||"—")+" · "+(d.reviewer.registration||"—"),
    "Aprovados: "+c.aprovado+" · Com ajustes: "+c.ajustes+" · Não aprovados: "+c.reprovado+" · Sem parecer: "+(d.total-c.aprovado-c.ajustes-c.reprovado)];
  const open=d.items.filter((x)=>x.verdict!=="aprovado"||x.comment);
  if(open.length){ lines.push("","Itens com observações:"); for(const x of open) lines.push("- "+x.id+" ("+(W[x.verdict]||"sem parecer")+"): "+(x.comment||"")); }
  return lines.join("\\n");
}
document.getElementById("download").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(exportData(),null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="revisao-clinica-sos-"+FACTS.registryHash+".json"; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});
document.getElementById("copy").addEventListener("click",async()=>{
  const t=summary();
  try{ await navigator.clipboard.writeText(t); document.getElementById("progress").textContent="Resumo copiado."; }
  catch(e){ const ta=document.createElement("textarea"); ta.value=t; document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
});
paint();
`);
}

/* ───────────────────────────── tester missions ───────────────────────────── */

export function missionsPage(f: LabFacts, ms: Mission[]): string {
  const who = (m: Mission) => (m.who === "helper" ? "você ajuda outra pessoa" : "você é a pessoa em crise");
  const body = ms.map((m, i) => `
<article class="item" data-id="${esc(m.scenario)}">
  <h2>Missão ${i + 1} · ${esc(m.title)} <span class="badge">${esc(who(m))}</span> <span class="badge">~${m.minutes} min</span></h2>
  <p>${esc(m.story)}</p>
  <p class="note no-print">Comece com o app zerado. <a href="../" target="_blank" rel="noopener">Abrir o app</a> · <button type="button" onclick="sosResetApp(this.nextElementSibling)">Zerar o app</button><span class="note" role="status"></span></p>
  <ol class="steps">${m.steps.map((s) => `<li>${esc(s.act)}${s.warn ? `<span class="warn">${esc(s.warn)}</span>` : ""}<span class="see">${s.p0 ? '<span class="badge p0">emergência</span> ' : ""}Você deve ver: <q>${esc(s.see)}</q></span></li>`).join("")}</ol>
  <p><strong>O que observar:</strong> ${esc(m.watch)}</p>
  <fieldset><legend>Como foi?</legend>
    <label class="opt"><input type="radio" name="r-${esc(m.scenario)}" value="como_descrito"> Aconteceu como descrito</label>
    <label class="opt"><input type="radio" name="r-${esc(m.scenario)}" value="diferente"> Aconteceu diferente</label>
    <label class="opt"><input type="radio" name="r-${esc(m.scenario)}" value="nao_consegui"> Não consegui fazer</label>
  </fieldset>
  <fieldset><legend>Clareza dos textos (1 = confuso, 5 = muito claro)</legend>
    ${[1, 2, 3, 4, 5].map((n) => `<label class="opt"><input type="radio" name="q-${esc(m.scenario)}" value="${n}"> ${n}</label>`).join("")}
  </fieldset>
  <textarea name="c-${esc(m.scenario)}" aria-label="Comentário sobre a missão ${i + 1}" placeholder="O que chamou atenção? (sem dados pessoais)"></textarea>
</article>`).join("");
  return page("SOS Apollo · Roteiros de teste", `
${top("Roteiros de teste")}
<h1>Roteiros de teste</h1>
<p class="lead">Missões curtas para testar o app como alguém usaria de verdade. Cada passo diz o que tocar e o que deve aparecer. Se aparecer outra coisa, é exatamente isso que queremos saber.</p>
${SAFETY}
<div class="box">
  <p class="note">As respostas ficam só neste navegador. Não escreva nomes, telefones ou informações de saúde reais.</p>
  <div class="who">
    <div><label for="t-nick">Apelido (opcional)</label><input type="text" id="t-nick"></div>
    <div><label for="t-device">Aparelho</label><select id="t-device"><option value="">—</option><option>Android</option><option>iPhone</option><option>Computador</option><option>Outro</option></select></div>
  </div>
</div>
${body}
<section class="item" data-id="geral">
  <h2>No geral</h2>
  <fieldset><legend>Você confiaria neste app numa situação real? (1 = não, 5 = sim)</legend>
    ${[1, 2, 3, 4, 5].map((n) => `<label class="opt"><input type="radio" name="g-trust" value="${n}"> ${n}</label>`).join("")}
  </fieldset>
  <textarea id="g-confused" aria-label="O que mais confundiu" placeholder="O que mais confundiu?"></textarea>
  <textarea id="g-missing" aria-label="O que faltou" placeholder="O que faltou?"></textarea>
</section>
${facts(f)}
<div class="bar"><div class="in">
  <span class="grow" id="progress" role="status">0 de ${ms.length} missões feitas</span>
  <button type="button" id="copy">Copiar resumo</button>
  <button type="button" class="primary" id="download">Baixar retorno</button>
</div></div>
`, RESET_JS + `
const FACTS=${json({ registryHash: f.registryHash, bundle: f.bundle, total: ms.length })};
const KEY="sos-lab-missions:v1";
const arts=[...document.querySelectorAll("article.item")];
let st={nick:"",device:"",missions:{},trust:"",confused:"",missing:""};
try{ st=Object.assign(st, JSON.parse(localStorage.getItem(KEY)||"{}")); }catch(e){}
const save=()=>{ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(e){} };
const val=(root,name)=>{ const r=root.querySelector('input[name="'+name+'"]:checked'); return r?r.value:""; };
function paint(){
  let n=0; for(const el of arts){ const m=st.missions[el.dataset.id]; const d=!!(m&&m.result); if(d) n++; el.classList.toggle("done",d); }
  document.getElementById("progress").textContent=n+" de "+FACTS.total+" missões feitas";
}
for(const el of arts){
  const id=el.dataset.id, m=st.missions[id];
  if(m){ for(const [k,v] of [["r-"+id,m.result],["q-"+id,m.clarity]]){ const r=el.querySelector('input[name="'+k+'"][value="'+v+'"]'); if(r) r.checked=true; } el.querySelector("textarea").value=m.comment||""; }
  el.addEventListener("input",()=>{ st.missions[id]={result:val(el,"r-"+id),clarity:val(el,"q-"+id),comment:el.querySelector("textarea").value}; save(); paint(); });
}
const bind=(id,key)=>{ const el=document.getElementById(id); el.value=st[key]||""; el.addEventListener("input",()=>{ st[key]=el.value; save(); }); el.addEventListener("change",()=>{ st[key]=el.value; save(); }); };
bind("t-nick","nick"); bind("t-device","device"); bind("g-confused","confused"); bind("g-missing","missing");
for(const r of document.querySelectorAll('input[name="g-trust"]')){ if(r.value===st.trust) r.checked=true; r.addEventListener("change",()=>{ st.trust=r.value; save(); }); }
function exportData(){
  return {kind:"sos-apollo-beta-feedback",version:1,registryHash:FACTS.registryHash,bundle:FACTS.bundle,exportedAt:new Date().toISOString(),
    tester:{nick:st.nick,device:st.device},missions:Object.entries(st.missions).map(([id,m])=>({id,...m})),
    general:{trust:st.trust,confused:st.confused,missing:st.missing}};
}
document.getElementById("download").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(exportData(),null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="retorno-beta-sos-"+FACTS.registryHash+".json"; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});
document.getElementById("copy").addEventListener("click",async()=>{
  const d=exportData(), R={como_descrito:"como descrito",diferente:"diferente",nao_consegui:"não consegui"};
  const lines=["Retorno beta SOS Apollo (registro "+d.registryHash+")","Aparelho: "+(d.tester.device||"—")];
  for(const m of d.missions) lines.push("- "+m.id+": "+(R[m.result]||"—")+(m.clarity?" · clareza "+m.clarity:"")+(m.comment?" · "+m.comment:""));
  lines.push("Confiança: "+(d.general.trust||"—"));
  if(d.general.confused) lines.push("Confundiu: "+d.general.confused);
  if(d.general.missing) lines.push("Faltou: "+d.general.missing);
  const t=lines.join("\\n");
  try{ await navigator.clipboard.writeText(t); document.getElementById("progress").textContent="Resumo copiado."; }
  catch(e){ const ta=document.createElement("textarea"); ta.value=t; document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
});
paint();
`);
}
