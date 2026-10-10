const fs=require('fs');global.window={};eval(fs.readFileSync('data.embed.js','utf8'));const D=window.SOS_DATA;
const FAST={torto:'fast_stim',panico:'fast_panic',realidade:'fast_realidade',trava:'fast_trava',falar:'fast_ground'};
const LABEL={torto:'Bateu Forte · Usei algo',panico:'Pânico · Ansiedade',realidade:'Onde eu tô? · Irrealidade',trava:'Paranoia · Medo constante',falar:'Solidão · Desespero',samu:'Resgate · Urgência',cssrs:'Triagem C-SSRS (oculta)'};
const ORDER=['torto','panico','realidade','trava','falar','samu','cssrs'];
const clean=s=>String(s||'').replace(/\*\*|__|_/g,'').replace(/\n+/g,' ').replace(/"/g,"'").replace(/[<>]/g,'').replace(/[#;]/g,'').replace(/\s+/g,' ').trim();
const cut=(s,n)=>{s=clean(s);return s.length>n?s.slice(0,n-1)+'…':s};
const reach=(f)=>{const N=f.nodes,seen=new Set(),q=[f.start];while(q.length){const x=q.shift();if(seen.has(x)||!N[x])continue;seen.add(x);const n=N[x];(n.choices||[]).forEach(c=>q.push(c.to));['autoTo','allDoneTo','stayTo'].forEach(k=>n[k]&&q.push(n[k]))}return seen};
function flowChart(fk,{full=true}={}){const f=D[fk],N=f.nodes,p=fk+'_';const R=reach(f);if(FAST[fk]){/*fast lane*/const add=[FAST[fk]];while(add.length){const x=add.shift();if(R.has(x)||!N[x])continue;R.add(x);const n=N[x];(n.choices||[]).forEach(c=>add.push(c.to));['autoTo','allDoneTo','stayTo'].forEach(k=>n[k]&&add.push(n[k]))}}
 let L=[];const T=full?70:40;
 for(const [id,n] of Object.entries(N)){const nid=p+id;let body=`<b>${id}</b><br/>${cut(n.text,T)}`;
  if(n.type==='task')body+='<br/>☐ '+(n.tasks||[]).map(t=>cut(t.label,34)+(t.variant&&t.variant!=='default'?' ⟨'+t.variant+'⟩':'')).join('<br/>☐ ');
  if(n.type==='action')body+='<br/>'+(n.actions||[]).map(a=>'📞 '+cut(a.label,32)).join('<br/>');
  if(n.type==='redirect')body+='<br/>↪ '+cut(n.suggestion,40);
  const shape={choice:['{"','"}'],info:['("','")'],task:['[["','"]]'],action:['{{"','"}}'],redirect:['[/"','"/]']}[n.type]||['["','"]'];
  if(n.isDone)shape.splice(0,2,'(["','"])');
  L.push(`  ${nid}${shape[0]}${body}${shape[1]}`);
  const cls=[n.type];if(!R.has(id))cls.push('orphan');if(n.isDone)cls.push('endn');if(n.locked||n.riskOnEnter)cls.push('risk');
  L.push(`  class ${nid} ${cls.join(',')}`);
 }
 for(const [id,n] of Object.entries(N)){const a=p+id;const tgt=t=>t==='done'?'EXIT':(N[t]?p+t:(t.startsWith('redirect_')&&D[t.slice(9)]?'FLOW_'+t.slice(9):'BROKEN_'+t));
  (n.choices||[]).forEach(c=>L.push(`  ${a} -->|"${cut(c.label,38)}${c.riskLevel?' ⚠'+c.riskLevel:''}"| ${tgt(c.to)}`));
  if(n.autoTo)L.push(`  ${a} -.->|continuar| ${tgt(n.autoTo)}`);
  if(n.allDoneTo)L.push(`  ${a} ==>|"${cut(n.doneText||'m_next',26)}"| ${tgt(n.allDoneTo)}`);
  if(n.stayTo)L.push(`  ${a} -->|ficar aqui| ${tgt(n.stayTo)}`);
  if(n.redirectFlow)L.push(`  ${a} -->|"ir para ${n.redirectFlow}"| FLOW_${n.redirectFlow}`);
 }
 if(FAST[fk])L.push(`  ${p}a1 -. "⚡ preciso de algo agora" .-> ${p}${FAST[fk]}`);
 return L;}
const style=`  classDef choice fill:#1b1030,stroke:#a855f7,color:#eee
  classDef info fill:#0f1a24,stroke:#38bdf8,color:#ddd
  classDef task fill:#0f2419,stroke:#34d399,color:#ddd
  classDef action fill:#2a0f12,stroke:#ef4444,color:#fff,stroke-width:2px
  classDef redirect fill:#241a0a,stroke:#f59e0b,color:#eee
  classDef endn fill:#111,stroke:#fff,color:#fff,stroke-width:3px
  classDef orphan stroke-dasharray:6 4,opacity:0.55
  classDef risk stroke:#ff0055,stroke-width:4px
  classDef ext fill:#333,stroke:#999,color:#fff`;
let md='';
// overview
let O=['flowchart TD','  HOME(["🏠 Home · Orb respiração 4-2-6 + 6 opções"])'];
ORDER.forEach(fk=>{const f=D[fk];O.push(`  ${fk}["${LABEL[fk]}<br/>${Object.keys(f.nodes).length} nós · start=${f.start}"]`);if(fk!=='cssrs')O.push(`  HOME --> ${fk}`)});
ORDER.forEach(fk=>{const N=D[fk].nodes;const seen=new Set();for(const [id,n] of Object.entries(N)){const t=n.redirectFlow;if(t&&!seen.has(t)){seen.add(t);O.push(`  ${fk} -->|"${id}"| ${t}`)}}});
O.push('  EXIT(["recolher · fico por perto (fecha sheet)"])');ORDER.forEach(fk=>O.push(`  ${fk} -.-> EXIT`));
O.push('  EXIT -.-> HOME');
md+='## 0. Visão geral (Home → fluxos → redirecionamentos)\n\n```mermaid\n'+O.join('\n')+'\n```\n\n';
ORDER.forEach((fk,i)=>{const L=['flowchart TD'];L.push(`  START(["▶ ${LABEL[fk]}"]) --> ${fk}_${D[fk].start}`);L.push(...flowChart(fk));
 const ext=new Set(L.join('\n').match(/FLOW_\w+|BROKEN_\w+|EXIT/g)||[]);ext.forEach(e=>L.push(`  ${e}(["${e==='EXIT'?'fecha · volta à Home':e.replace('FLOW_','→ fluxo ').replace('BROKEN_','❌ quebrado: ')}"])`,`  class ${e} ext`));
 L.push(style);
 md+=`## ${i+1}. ${LABEL[fk]} (\`${fk}\`)\n\n\`\`\`mermaid\n${L.join('\n')}\n\`\`\`\n\n`;
 fs.writeFileSync(`${process.argv[2]}/flow_${fk}.mmd`,L.join('\n'));
});
fs.writeFileSync(process.argv[2]+'/flows.md',md);fs.writeFileSync(process.argv[2]+'/overview.mmd',O.join('\n'));
console.log('ok',md.length);
