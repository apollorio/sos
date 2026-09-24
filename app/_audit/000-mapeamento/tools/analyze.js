const fs=require('fs');global.window={};eval(fs.readFileSync('data.embed.js','utf8'));const D=window.SOS_DATA;
const FAST={torto:'fast_stim',panico:'fast_panic',realidade:'fast_realidade',trava:'fast_trava',falar:'fast_ground'};
const flows=Object.keys(D).filter(k=>D[k].nodes);
const rep=[];const log=s=>rep.push(s);
const allKeys=new Set();const usedProps=new Set();
for(const fk of flows){const f=D[fk];const N=f.nodes;
 const edges=[];
 for(const [id,n] of Object.entries(N)){Object.keys(n).forEach(k=>usedProps.add(n.type+'.'+k));
  (n.choices||[]).forEach(c=>{edges.push([id,c.to,'choice',c]);Object.keys(c).forEach(k=>usedProps.add('choice.'+k))});
  ['autoTo','allDoneTo','stayTo'].forEach(k=>n[k]&&edges.push([id,n[k],k]));
  if(n.redirectFlow)edges.push([id,'FLOW:'+n.redirectFlow,'switch']);
  (n.tasks||[]).forEach(t=>Object.keys(t).forEach(k=>usedProps.add('task.'+k)));
  (n.actions||[]).forEach(a=>Object.keys(a).forEach(k=>usedProps.add('action.'+k)));
 }
 if(FAST[fk])edges.push(['a1',FAST[fk],'fastlane']);
 // broken
 for(const [a,b,k] of edges){ if(b.startsWith('FLOW:')){if(!D[b.slice(5)])log(`BROKEN_FLOW ${fk}.${a} -> ${b}`);continue}
   if(b==='done')continue; if(!N[b]){ const r=b.startsWith('redirect_')&&D[b.slice(9)]; log(`${r?'IMPLICIT_SWITCH':'BROKEN'} ${fk}.${a} -[${k}]-> ${b}`);} }
 // dead ends
 for(const [id,n] of Object.entries(N)){
  const out=edges.filter(e=>e[0]===id);
  if(n.type==='task'&&!n.doneText)log(`TASK_NO_CONTINUE ${fk}.${id} (allDoneTo=${n.allDoneTo})`);
  if(n.type==='task'&&n.doneText&&!n.allDoneTo)log(`TASK_DEFAULT_m_next ${fk}.${id}`);
  if(!out.length&&!n.isDone)log(`DEAD_END ${fk}.${id} [${n.type}]`);
  if(n.isDone)log(`END ${fk}.${id} [${n.type}]`);
  if(n.riskOnEnter)log(`RISK_ON_ENTER ${fk}.${id} = ${n.riskOnEnter}`);
  if(n.locked)log(`LOCKED ${fk}.${id}`);
  (n.choices||[]).forEach(c=>c.riskLevel&&log(`RISK_CHOICE ${fk}.${id} "${c.label}" = ${c.riskLevel}`));
  (n.tasks||[]).forEach(t=>t.variant&&t.variant!=='default'&&log(`VARIANT ${fk}.${id}.${t.id} = ${t.variant} ${t.mediaSrc||t.href||t.breathPattern||t.whatsappTemplate||''}`));
  (n.actions||[]).forEach(a=>log(`ACTION ${fk}.${id} ${a.variant||''} ${a.href||a.whatsappTemplate||''} "${a.label}"`));
 }
 // reachability
 const seen=new Set();const q=[f.start];while(q.length){const x=q.shift();if(seen.has(x)||!N[x])continue;seen.add(x);edges.filter(e=>e[0]===x).forEach(e=>q.push(e[1]))}
 Object.keys(N).filter(k=>!seen.has(k)).forEach(k=>log(`UNREACHABLE ${fk}.${k}`));
 // shortest path start->first tel action / end
 log(`FLOW ${fk}: nodes=${Object.keys(N).length} edges=${edges.length} start=${f.start}`);
}
// cross-flow entry into cssrs
for(const fk of flows)for(const [id,n] of Object.entries(D[fk].nodes)){ if(n.redirectFlow==='cssrs')log(`ENTRY_CSSRS from ${fk}.${id}`); (n.choices||[]).forEach(c=>c.to==='redirect_cssrs'&&log(`ENTRY_CSSRS(choice) ${fk}.${id}`)); }
log('PROPS '+[...usedProps].sort().join(', '));
console.log(rep.join('\n'));
