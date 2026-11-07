'use strict';
const data = window.COMPARISON_DATA;
const el = id => document.getElementById(id);
const fmt = n => n.toFixed(1);
const ours = data.ours, cls = data.class.conditions;
const delta = (v, k) => v.incongruent[k] - v.congruent[k];
el('stamp').textContent = `快照生成：${data.generated_at.replace('T',' ')}（中国标准时间）。数据仅代表本次读取。`;
el('ourN').textContent = `${data.counts.included} 人`;
el('classN').textContent = `${data.class.n} 份`;
el('searchN').textContent = `视觉搜索接口已有 ${data.search_available_n} 份键盘样本；“都有 16 项”不足以使两种判断任务可比。`;
el('flow').textContent = `项目接口共 ${data.counts.records_total} 条上传记录，其中当前正式 Flanker ${data.counts.formal_flanker} 条 → 不完整 ${data.counts.incomplete} 条 → 重复 ${data.counts.duplicate} 条 → 总体质量不达标 ${data.counts.quality} 条 → 细分单元有效数不足 ${data.counts.sparse_cells} 条 → 本次纳入 ${data.counts.included} 人。`;
el('primary').textContent = `既定主要分析仍采用中位数，不因全班接口改写：本项目一致 ${fmt(ours.congruent.median_rt)} ms，不一致 ${fmt(ours.incongruent.median_rt)} ms，干扰效应 ${fmt(delta(ours,'median_rt'))} ms。以上图表采用均值，只用于探索性参照。`;
for(const [label,v] of [['本项目 · 准备驾驶',ours],['全班 · 无文字预警',cls]]){
 const tr=document.createElement('tr');
 for(const s of [label,fmt(v.congruent.mean_rt)+' ms',fmt(v.incongruent.mean_rt)+' ms',fmt(delta(v,'mean_rt'))+' ms',fmt(v.congruent.err*100)+'% / '+fmt(v.incongruent.err*100)+'%']){const td=document.createElement('td');td.textContent=s;tr.append(td);}el('values').append(tr);
}
function draw(){
 const m=el('metric').value, unit=m==='err'?'%':'ms';
 const rows=[];
 for(const [name,v,color] of [['本项目',ours,'#79ded5'],['全班',cls,'#efc47a']]){
  if(m==='interference') rows.push([name,delta(v,'mean_rt'),color]);
  else for(const [c,label] of [['congruent','一致'],['incongruent','不一致']])rows.push([name+' · '+label,v[c][m]*(m==='err'?100:1),color]);
 }
 const svg=el('chart'); svg.replaceChildren();
 function node(tag,attrs,text){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;svg.append(e);return e;}
 node('title',{},'描述性比较；各柱为组水平汇总，不表示显著差异');
 const lo=Math.min(0,...rows.map(r=>r[1])),hi=Math.max(1,...rows.map(r=>r[1]))*1.15, x=v=>185+(v-lo)/(hi-lo)*490;
 node('line',{x1:x(0),x2:x(0),y1:20,y2:275,stroke:'#90a4b9'});
 rows.forEach(([name,val,color],i)=>{let y=35+i*57;node('text',{x:10,y:y+23,fill:'#e4eef8','font-size':17},name);node('rect',{x:Math.min(x(0),x(val)),y,width:Math.abs(x(val)-x(0)),height:34,fill:color,rx:3});node('text',{x:Math.max(x(0),x(val))+10,y:y+23,fill:'#e4eef8','font-size':17},fmt(val)+' '+unit);});
 node('text',{x:x(0),y:305,fill:'#bfcede','font-size':15},'0');
 el('reading').textContent=m==='interference'?`本项目均值干扰效应为 ${fmt(delta(ours,'mean_rt'))} ms，全班为 ${fmt(delta(cls,'mean_rt'))} ms。两者均表现为不一致更慢；差值的大小不能归因于我们的预警设计。`:m==='err'?'准确率与速度需要一起看。样本小、每条件试次数不同，错误率可能随少数反应明显变化；0% 不代表没有潜在错误。':'两组均值均为不一致条件较慢。本项目的绝对 RT 较低，但这可能与按键、准备时间、设备和样本构成有关，不能解释为改进成功。';
}
el('metric').addEventListener('change',draw);draw();
