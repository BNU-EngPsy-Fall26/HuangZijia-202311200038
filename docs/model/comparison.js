'use strict';
const d=window.CLASS_COMPARISON,f=x=>x.toFixed(1);
document.getElementById('stamp').textContent=`读取时间：${d.generated_at}；本项目 ${d.n} 人，全班键盘汇总 ${d.class.n} 份。`;
const rows=[['本项目（调整口径）',d.ours],['全班键盘',d.class.conds]].map(([label,v])=>`<tr><td>${label}</td><td>${f(v.congruent.mean_rt)}</td><td>${f(v.incongruent.mean_rt)}</td><td>${f(v.incongruent.mean_rt-v.congruent.mean_rt)}</td><td>${f(v.congruent.err*100)}% / ${f(v.incongruent.err*100)}%</td></tr>`).join('');
document.getElementById('comparison').innerHTML=`<table><thead><tr><th>来源</th><th>一致RT ms</th><th>不一致RT ms</th><th>干扰 ms</th><th>一致/不一致错误率</th></tr></thead><tbody>${rows}</tbody></table>`;
document.getElementById('primary').textContent=`本项目预定中位数口径中性干扰为 ${f(d.ours.incongruent.median_rt-d.ours.congruent.median_rt)} ms；与此处均值口径不同，不能混写。`;
