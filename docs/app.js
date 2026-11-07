'use strict';
// 填入课程页面创建的六位公开项目码；绝不能填写下载密钥。
const PROJECT = '36UUQV';
const API='https://attention-lab-production.up.railway.app/api/hw2/submit';
const VERSION='3.0-space-rescue-15min';
const $=id=>document.getElementById(id), main=$('main');
const names={visual_search:'物资搜救',flanker:'编队驾驶'};
let S=null, current=null, pendingResponse=null, paused=false, held=new Set(), lastBackupError=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){if(!S)return;try{localStorage.setItem('attention_last_session',JSON.stringify(S));}catch{lastBackupError=true;}}
function download(data,name,type='application/json'){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),5000);}
function backup(){download(JSON.stringify(S,null,2),`attention_${S.participant}_${S.id}.json`);}
function csv(){const rows=Object.entries(S.data).flatMap(([experiment,rr])=>rr.map(r=>({participant:S.participant,experiment,...r})));const keys=[...new Set(rows.flatMap(Object.keys))];const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';download('\ufeff'+[keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(cell).join(',')).join('\r\n'),`attention_${S.participant}.csv`,'text/csv;charset=utf-8');}
const shipArt='<svg class="ship-art" viewBox="0 0 240 180" aria-hidden="true"><ellipse cx="120" cy="149" rx="79" ry="12" fill="currentColor" opacity=".12"/><path d="M120 16 151 91 205 133 145 122 120 143 95 122 35 133 89 91Z" fill="#d7e7ed" stroke="currentColor" stroke-width="3"/><path d="m120 35 18 58-18 20-18-20Z" fill="currentColor"/><path d="m105 134 15 33 15-33" fill="#f3b865"/><path d="M58 129h30m64 0h30" stroke="#132838" stroke-width="4"/></svg>';
function missionHUD(exp,index,total){const stage=Math.min(4,Math.floor(index/(total/4))+1);return `<div class="mission-hud"><span>${exp==='visual_search'?'货舱扫描':'安全航线'} · ${stage} / 4</span><span>${index} / ${total} 已完成</span></div>`;}
function summaryCard(){const rows=Object.values(S.data).flat().filter(r=>!r.interrupted&&!r.visibility_lost),correct=rows.filter(r=>r.correct).length;return `<div class="mission-summary">${shipArt}<div><span class="eyebrow">MISSION LOG</span><h2>飞行记录已保存</h2><p>完成 ${S.data.visual_search.length+S.data.flanker.length} / 280 次任务<br>有效作答准确率 ${rows.length?Math.round(100*correct/rows.length)+'%':'暂无'} · 用时 ${Math.round(((S.end||Date.now())-S.start)/1000)} 秒</p><p class="quiet">进度按完成次数计算，不按速度或正确率奖励。</p></div></div>`;}
function landing(){main.innerHTML=`<div class="space-hero"><div><span class="eyebrow">RESCUE PROTOCOL / 07</span><h1>太空救援<br><em>航向，由你决定。</em></h1><p class="lead">空间站正在等待救援。搜集氧气与能源，驾驶飞船穿过编队。你的导航员会提供线索，但并非每次都指对方向。</p></div>${shipArt}</div><span class="pill">约 11–13 分钟 · 最长 15 分钟</span><div class="cards"><section class="card"><div class="number">MISSION A / SALVAGE</div><b>回收救援物资</b><p>识别红色氧气罐与能源芯片。持续标记与闪现标记都可能指错货舱。</p><span class="quiet">160 次正式试次 · 16 次练习</span></section><section class="card"><div class="number">MISSION B / FLIGHT</div><b>驾驶中央飞船</b><p>跟随中央飞船的箭头方向，忽略两旁的编队。留意驾驶舱的提醒。</p><span class="quiet">120 次正式试次 · 12 次练习</span></section></div><div class="panel"><h2>登记你的救援任务</h2><label>选择飞船配色（不改变实验图形）<br><select id="shipcolor"><option value="cyan">极光 · 青色</option><option value="gold">曙光 · 金色</option><option value="violet">星云 · 紫色</option></select></label><div class="row"><label>匿名编号<br><input id="pid" placeholder="例如 P01" pattern="P[0-9]+" maxlength="8"></label><label>公开项目码<br><input id="project" maxlength="6" placeholder="六位项目码" value="${esc(PROJECT)}"></label><label>参与模式<br><select id="mode"><option value="test">测试 / 预试（不计正式人数）</option><option value="formal">正式实验</option></select></label></div><p class="quiet">使用研究者分配的唯一编号，不填写姓名或学号。测试模式未填项目码时仅保存在本机。请使用电脑、实体键盘和 100% 浏览器缩放。</p><button id="enter">阅读参与说明 →</button><p id="error" class="error"></p></div><div id="recovery"></div>`;
$('enter').onclick=()=>{const pid=$('pid').value.trim().toUpperCase(),project=$('project').value.trim().toUpperCase(),mode=$('mode').value;if(!/^P[0-9]{1,6}$/.test(pid)||+pid.slice(1)<1){$('error').textContent='请填写研究者分配的编号，如 P01。';return;}if((project&&!/^[A-Z0-9]{6}$/.test(project))||(mode==='formal'&&!project)){$('error').textContent='正式实验需要真实的六位公开项目码。';return;}if(innerWidth<760||innerHeight<650){$('error').textContent='请使用电脑并扩大窗口（至少 760 × 650），浏览器缩放设为 100%。';return;}
const shipColor=$('shipcolor').value;document.body.dataset.ship=shipColor;const group=(+pid.slice(1)-1)%4+1,seed=crypto.getRandomValues(new Uint32Array(1))[0];S={id:crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+seed,participant:pid,project,mode,group,seed,ship_color:shipColor,version:VERSION,start:Date.now(),consent:false,ended:false,data:{visual_search:[],flanker:[]},practice:{visual_search:[],flanker:[]},uploads:{},completed:{},order:group%2?['visual_search','flanker']:['flanker','visual_search']};consent();};
try{const old=JSON.parse(localStorage.getItem('attention_last_session'));if(old){$('recovery').innerHTML='<p class="quiet">本机有上一次参与的数据备份。</p><button id="recover" class="secondary">下载上次备份</button>';$('recover').onclick=()=>download(JSON.stringify(old,null,2),`attention_backup_${old.participant}.json`);}}catch{}}
function consent(){main.innerHTML=`<div class="panel"><span class="eyebrow">BEFORE YOU BEGIN</span><h2>参与说明</h2><p>本实验用于工程心理学课程作业，记录匿名编号、按键、反应时间及正确性。填写项目码后，正式试次数据会上传到课程后台，供课程研究分析和教师评阅；练习保留在本机备份中。请勿提供真实身份信息。</p><p>全程最长 15 分钟，计时已开始。你可以随时退出，退出不会带来处罚。请保持窗口在前台，使用 F / J 作答；每项任务会重新显示按键规则。</p><label><input type="checkbox" id="agree">我已阅读并自愿参与，能看清图形与颜色，正在使用电脑和实体键盘。</label><button id="consent">同意并开始练习</button><button id="decline" class="secondary">不参加</button></div>`;$('consent').onclick=()=>{if(!$('agree').checked)return;S.consent=true;save();run();};$('decline').onclick=()=>{S=null;landing();};}
function mapText(exp){if(exp==='flanker')return ['← 向左','向右 →'];const labels=['圆形 · 氧气','三角形 · 能源'];return S.group<=2?labels:labels.slice().reverse();}
async function gate(title,body,button='继续',delay=0){if(S.ended)return false;main.innerHTML=`<div class="panel"><h2>${title}</h2>${body}<button id="go" ${delay?'disabled':''}>${button}</button><button class="secondary" id="quit">退出实验</button></div>`;let allowed=Date.now()+delay;return new Promise(resolve=>{const timer=setInterval(()=>{if(S.ended){clearInterval(timer);resolve(false);return;}if(Date.now()>=allowed&&$('go')){$('go').disabled=false;$('go').textContent=button;}},100);$('go').onclick=()=>{clearInterval(timer);resolve(true);};$('quit').onclick=()=>{clearInterval(timer);finish('withdrawn');resolve(false);};});}
let resumeRest=null;
async function startScreen(title,body){return restScreen(0,{title,body});}
async function restScreen(delay=3000,content=null){
 if(S.ended)return false;
 main.innerHTML=`<section class="rest-screen" aria-label="${content?'实验开始准备':'区块间休息'}"><div class="panel rest-panel ${content?'start-panel':''}"><span class="eyebrow">${content?'GET READY':'TAKE A BREAK'}</span><h2>${content?esc(content.title):'休息一下'}</h2>${content?content.body:'<p>放松眼睛和双手。准备好后，按空格键继续。</p>'}<div id="restcount" class="rest-count" aria-live="polite"></div><p id="resthint" class="quiet"></p><button id="restquit" class="secondary">退出实验</button></div></section>`;
 $('restquit').onclick=()=>finish('withdrawn');
 const allowed=Date.now()+delay;
 let requested=false;
 resumeRest=()=>{if(Date.now()>=allowed&&!document.hidden&&document.hasFocus())requested=true;};
 try{
 while(!S.ended){
  while(!requested&&!S.ended){
   const left=Math.max(0,Math.ceil((allowed-Date.now())/1000));
   $('restcount').textContent=left?String(left):'空格';
   $('resthint').textContent=left?'休息结束后可按空格继续':'读完并准备好后，按空格键开始 3 秒倒计时';
   await sleep(50);
  }
  if(S.ended)return false;
  requested=false;paused=false;resumeRest=null;
  let interrupted=false;
  for(let n=3;n>=1;n--){
   if(S.ended)return false;
   $('restcount').textContent=String(n);$('resthint').textContent='手指放在 F 和 J 上；看到目标后再按键';
   const until=performance.now()+1000;
   while(performance.now()<until&&!S.ended){
    if(paused||document.hidden||!document.hasFocus()){interrupted=true;break;}
    await sleep(25);
   }
   if(interrupted)break;
  }
  if(S.ended)return false;
  if(!interrupted)return true; // next trial starts with its normal fixation, then cue and stimulus
  resumeRest=()=>{if(!document.hidden&&document.hasFocus())requested=true;};
 }
 return false;
 }finally{resumeRest=null;}
}
function taskUI(exp,phase,index,total){const m=mapText(exp);main.innerHTML=`<div class="task"><span class="eyebrow">${phase==='practice'?'练习 / PRACTICE':'正式 / EXPERIMENT'}</span><h2>${names[exp]}</h2>${phase==='practice'?`<p>训练 ${index+1} / ${total}</p>`:missionHUD(exp,index,total)}<div class="progress"><div style="width:${100*index/total}%"></div></div><canvas id="canvas" width="640" height="480" aria-label="实验刺激区域"></canvas><div class="mapping"><span><kbd>F</kbd> ${m[0]}</span><span><kbd>J</kbd> ${m[1]}</span></div><p class="quiet" id="trialnote">看清后尽快按 F 或 J，按一次就松开。</p><button id="exit" class="secondary">退出实验</button></div>`;$('exit').onclick=()=>finish('withdrawn');}
function draw(t,exp,stage){const c=$('canvas');if(!c)return;const x=c.getContext('2d');x.clearRect(0,0,640,480);x.fillStyle='#f0f1ed';x.fillRect(0,0,640,480);if(stage==='fix'){x.textBaseline='alphabetic';x.fillStyle='#203a39';x.font='24px monospace';x.textAlign='center';x.fillText('+',320,248);return;}if(stage==='blank')return;
if(exp==='visual_search'){
for(let side=0;side<2;side++){const active=t.cue_mode!=='none'&&(stage==='cue'||t.cue_mode==='persistent')&&((t.cue_side==='left')===(side===0));x.strokeStyle=active?'#354b44':'#bfc8bf';x.lineWidth=active?3:1;x.strokeRect(side*320+12,24,296,432);}if(stage==='cue')return;
for(const item of t.layout_code.split(';')){const [s,kind]=item.split(':'),slot=+s,side=slot>=8?1:0,local=slot%8,cx=side?420+Math.floor(local/4)*100:120+Math.floor(local/4)*100,cy=90+(local%4)*100;x.fillStyle=kind==='B'||kind==='V'?'#2269B0':'#C43C39';if(kind==='R')x.fillRect(cx-17,cy-17,34,34);else if(kind==='V'||(kind==='T'&&t.target_shape==='triangle')){x.beginPath();x.moveTo(cx,cy-19);x.lineTo(cx-19,cy+16);x.lineTo(cx+19,cy+16);x.closePath();x.fill();}else{x.beginPath();x.arc(cx,cy,17,0,Math.PI*2);x.fill();}}}

else{if(stage==='cue'){x.fillStyle='#354b44';x.font='24px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(t.warning_text,320,240);return;}x.fillStyle='#171d1a';x.font='32px monospace';x.textAlign='center';x.textBaseline='middle';for(let i=0;i<5;i++){const cx=320+(i-2)*42,dir=t.stimulus[i]==='←'?-1:1;x.strokeStyle='#171d1a';x.lineWidth=3;x.beginPath();x.moveTo(cx-dir*13,240);x.lineTo(cx+dir*13,240);x.moveTo(cx+dir*3,230);x.lineTo(cx+dir*13,240);x.lineTo(cx+dir*3,250);x.stroke();}}}

function framePaint(fn){return new Promise(resolve=>requestAnimationFrame(()=>{if(S.ended)return resolve(null);fn();resolve(performance.now());}));}
async function trial(t,exp,phase,index,round){while(held.size&&!S.ended)await sleep(20);if(S.ended)return null;taskUI(exp,phase,index,phase==='practice'?LabDesign.practiceTotal(exp):LabDesign.total(exp));current={visibility_lost:false,abort:null};draw(t,exp,'fix');await sleep(300);if(S.ended)return null;const cueOnset=await framePaint(()=>draw(t,exp,'cue'));await sleep(exp==='visual_search'?300:600);if(S.ended)return null;
const onset=await framePaint(()=>draw(t,exp,'stim'));if(onset===null)return null;
const response=await new Promise(resolve=>{const duration=exp==='visual_search'?3000:2000;const timer=setTimeout(()=>done({key:'',at:null,timeout:true}),duration);function done(v){clearTimeout(timer);pendingResponse=null;resolve(v);}pendingResponse=(key)=>done({key,at:performance.now(),timeout:false});current.abort=()=>done({key:'',at:null,timeout:false,interrupted:true});if(S.ended)current.abort();});
const row={...t,stage:phase==='formal'?Math.floor(index/(LabDesign.total(exp)/4))+1:0,ship_color:S.ship_color||'cyan',cue_onset_perf_ms:cueOnset,cue_duration_ms:onset-cueOnset,trial_index:index+1,phase,practice_round:round,design_version:VERSION,seed:S.seed,order_group:S.group,key_mapping:mapText(exp).join('/'),correct_key:LabDesign.key(t,exp,S.group),response_key:response.key,correct:response.key===LabDesign.key(t,exp,S.group),rt_ms:response.at===null?null:Math.round((response.at-onset)*1000)/1000,timeout:response.timeout,visibility_lost:current.visibility_lost,onset_perf_ms:onset,response_perf_ms:response.at,interrupted:!!response.interrupted,session_id:S.id,session_incomplete:!!S.ended};current=null;
(phase==='practice'?S.practice:S.data)[exp].push(row);save();if(S.ended)return row;draw(t,exp,'blank');if(phase==='practice'||response.timeout){const ctx=$('canvas').getContext('2d');ctx.fillStyle='#354b44';ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText(response.timeout?'未及时作答':row.correct?'正确':'按键不正确，请检查下方规则',320,240);}await sleep(phase==='practice'?400:200);return row;}
function keyGuide(exp){const m=mapText(exp);return `<div class="key-guide"><span><kbd>F</kbd> ${m[0]}</span><span><kbd>J</kbd> ${m[1]}</span></div>`;}
function instructions(exp){return exp==='visual_search'?`
<div class="instruction-body">
<p class="instruction-goal">搜集救援物资：圆形是氧气，三角形是能源。</p>
<div class="target-examples" aria-label="两种目标：红色圆形、红色三角形"><span><i class="example-circle"></i>氧气罐 · 圆形</span><span><i class="example-triangle"></i>能源芯片 · 三角形</span></div>
<ol class="instruction-steps"><li><strong>找红色目标。</strong>每题只有一个红色圆形或红色三角形。</li><li><strong>忽略干扰。</strong>红色正方形、所有蓝色图形都不用管。</li><li><strong>按形状选键。</strong>看清后尽快按 F 或 J，按一次就松开。</li></ol>
<div class="instruction-note"><strong>导航员的粗边框标记不一定正确。</strong><br>大约每 3 次提示中，2 次指对、1 次指错。框内找不到，就看另一边。<br>边框有时会消失；没有粗边框时，查看两边。</div>
</div>`:`
<div class="instruction-body">
<p class="instruction-goal">跟随中央飞船：左箭头按 F，右箭头按 J。</p>
<div class="flanker-example" aria-label="示例：中央箭头向左"><span>→ → </span><strong>←</strong><span> → →</span></div>
<p class="example-caption">上图中央向左，按 F。两旁的箭头不用跟随。</p>
<div class="instruction-note"><strong>驾驶舱会提前显示一条消息：</strong><dl class="cue-glossary"><dt>准备驾驶</dt><dd>等箭头出现，再作答。</dd><dt>看中央船</dt><dd>提醒你只看正中间。</dd><dt>编队同向</dt><dd>两旁箭头会与中央方向一样。</dd><dt>编队反向</dt><dd>两旁箭头会与中央方向相反。</dd></dl></div>
<p><strong>消息不会告诉你中央向左还是向右。</strong>看到中央箭头后再按键，按一次就松开。</p>
</div>`;}
async function run(){try{for(const exp of S.order){if(S.ended)break;const m=mapText(exp),body=instructions(exp);
if(!await startScreen(names[exp]+' · 练习',body+keyGuide(exp)+`<p class="practice-note">先练习 ${LabDesign.practiceTotal(exp)} 题，答对至少 ${LabDesign.pass(exp)} 题后进入正式实验。</p>`))break;
let passed=false;for(let round=1;round<=2;round++){const list=LabDesign.plan(exp,S.seed+round+(exp==='flanker'?1000:0),true);let hits=0;for(let i=0;i<list.length&&!S.ended;i++){if(!await ready())break;const row=await trial(list[i],exp,'practice',i,round);if(row&&row.correct&&!row.visibility_lost)hits++;}if(S.ended)break;if(hits>=LabDesign.pass(exp)){passed=true;break;}if(round===1&&!await startScreen('再熟悉一下按键',`<p>刚才答对了 ${hits} / ${LabDesign.practiceTotal(exp)} 题。再练习一轮，熟悉下面的按键。</p>`+keyGuide(exp)))break;}
if(S.ended)break;if(!passed){S.completed[exp]='practice_failed';save();if(!await gate('本项练习结束','<p>这项任务暂不进入正式实验。我们将继续下一步。</p>'))break;continue;}
if(!await startScreen('练习完成 · 准备正式实验',`<p class="instruction-goal">${exp==='visual_search'?'判断红色目标：圆形还是三角形？':'驾驶中央飞船：向左还是向右？'}</p>`+keyGuide(exp)+`<p>共 ${LabDesign.total(exp)} 题，分四关完成，每关之间可短暂休息。<br>接下来不再提示对错。请先看清，再尽快按键。</p>`))break;
const list=LabDesign.plan(exp,S.seed+(exp==='flanker'?1000:0));for(let i=0;i<list.length&&!S.ended;i++){if(i>0&&i%(LabDesign.total(exp)/4)===0&&!await restScreen(3000,{title:`${exp==='visual_search'?'货舱':'航段'} ${i/(LabDesign.total(exp)/4)} / 4 已完成`,body:`<p class="instruction-goal">${exp==='visual_search'?'物资回收记录已更新':'航线记录已更新'}</p><p>已完成 ${i} / ${LabDesign.total(exp)} 次任务。放松双手，准备好后按空格继续。</p>`}))break;if(!await ready())break;await trial(list[i],exp,'formal',i,0);}
if(!S.ended){S.completed[exp]='complete';save();void upload(exp);}}
if(!S.ended)finish('finished');}catch(e){console.error(e);finish('program_error');}}
async function ready(){if(S.ended)return false;if(paused||document.hidden||!document.hasFocus()){if(!await gate('实验已暂停','<p>刚才窗口失去焦点，相关试次已标记。请返回实验窗口并准备好。总时限仍在计时。</p>','我已准备好'))return false;paused=false;}while(held.size&&!S.ended)await sleep(20);return !S.ended;}
function finish(reason){if(!S||S.ended)return;S.ended=true;S.end=Date.now();S.reason=reason;if(current&&current.abort)current.abort();setTimeout(()=>{for(const exp of S.order){if(!S.completed[exp])S.completed[exp]='incomplete';for(const row of S.data[exp])row.session_incomplete=S.completed[exp]!=='complete';}save();endUI();for(const exp of S.order)if(S.data[exp].length&&!S.uploads[exp])void upload(exp);},0);}
function endUI(){main.innerHTML=`<span class="eyebrow">THANK YOU</span><h1>${S.reason==='finished'?'任务结束，感谢指挥。':S.reason==='time_limit'?'已到 15 分钟，感谢参与。':'本次参与已结束。'}</h1><p>已保存 ${S.data.visual_search.length} 次搜索、${S.data.flanker.length} 次 Flanker 正式记录。未完成的任务会明确标记，不作为完整样本。</p>${summaryCard()}<div class="panel"><h2>任务记录与备份</h2><p>请核对下面的上传状态。保留一份本地备份，可避免网络问题造成数据丢失。</p><button id="json">下载完整 JSON 备份</button><button id="csv" class="secondary">下载正式试次 CSV</button><div id="uploads"></div><p class="quiet">${lastBackupError?'浏览器未能持久保存，请务必下载备份。':'本机保留最近一次参与备份。'} 练习数据不会上传。退出前请确认上传状态或下载备份。</p></div>`;$('json').onclick=backup;$('csv').onclick=csv;renderUploads();}
function renderUploads(){const el=$('uploads');if(!el)return;el.innerHTML=S.order.map(exp=>{const u=S.uploads[exp]||{state:'未上传'},retry=u.state==='failed';return `<div class="upload"><b>${names[exp]}</b> · ${esc(S.completed[exp]||'未完成')}<p>${esc(u.message||u.state)}</p>${u.warnings?'<pre>'+esc(JSON.stringify(u.warnings,null,2))+'</pre>':''}${retry?`<button class="secondary" data-retry="${exp}">核对后台后重试</button>`:''}</div>`;}).join('');el.querySelectorAll('[data-retry]').forEach(b=>b.onclick=()=>{if(confirm('网络错误可能发生在后台已保存之后。请先核对课程后台，确认没有该会话记录再重试，以免重复。'))upload(b.dataset.retry,true);});}
async function upload(exp,retry=false){if(!S.consent||!S.data[exp].length)return;const existing=S.uploads[exp];if(existing&&(!retry||existing.state!=='failed'))return;if(!S.project){S.uploads[exp]={state:'local',message:'未配置项目码：仅本地保存，请下载备份。'};save();renderUploads();return;}
const payload={project:S.project,experiment:(S.mode==='test'?'test_':'')+(exp==='visual_search'?'space_search_v3':'space_flanker_v3'),condition:'mixed',participant:S.participant,trials:S.data[exp],meta:{ua:navigator.userAgent.slice(0,80),w:innerWidth,h:innerHeight,session_id:S.id,design_version:VERSION,complete:S.completed[exp]==='complete'}};const body=JSON.stringify(payload);S.uploads[exp]={state:'uploading',message:'正在上传…'};save();renderUploads();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
try{if(new Blob([body]).size>256*1024)throw new Error('数据超过接口大小限制，请下载备份。');const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body,signal:controller.signal});const r=await res.json();if(!res.ok||!r.ok)throw new Error(r.msg||`接口返回 ${res.status}`);S.uploads[exp]={state:'success',message:`已提交 · 记录编号 ${r.record_id??'请在课程后台核对'}`,record_id:r.record_id,warnings:r.warning_details||r.warnings};}catch(e){S.uploads[exp]={state:'failed',message:'上传未确认成功：'+e.message+'。数据已留在本地，请下载备份并核对后台。'};}finally{clearTimeout(timer);save();renderUploads();}}
window.addEventListener('keydown',e=>{if(e.code==='Space'&&main.querySelector('.rest-screen')){e.preventDefault();if(!e.repeat&&resumeRest)resumeRest();return;}if(!['KeyF','KeyJ'].includes(e.code))return;if(e.target.matches('input,select,textarea'))return;e.preventDefault();if(e.repeat||held.has(e.code))return;held.add(e.code);if(pendingResponse)pendingResponse(e.code==='KeyF'?'f':'j');});
window.addEventListener('keyup',e=>held.delete(e.code));
function lost(){if(!S||S.ended)return;held.clear();paused=true;if(current){current.visibility_lost=true;if(current.abort)current.abort();}}
window.addEventListener('blur',lost);document.addEventListener('visibilitychange',()=>{if(document.hidden)lost();});
window.addEventListener('beforeunload',e=>{if(S&&S.consent&&!S.ended){save();e.preventDefault();e.returnValue='';}});
setInterval(()=>{if(!S||S.ended)return;const remaining=900-Math.floor((Date.now()-S.start)/1000);$('status').textContent=`${S.mode==='test'?'测试模式':'正式实验'} · ${S.participant}`;if(remaining<=0){if(S.consent)finish('time_limit');else{S=null;landing();}}},100);
landing();
