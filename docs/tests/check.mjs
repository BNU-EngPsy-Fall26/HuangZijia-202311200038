import fs from 'node:fs';
import { Blob } from 'node:buffer';
import { performance } from 'node:perf_hooks';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const base=new URL('../',import.meta.url);
const design=fs.readFileSync(new URL('design.js',base),'utf8');
const app=fs.readFileSync(new URL('app.js',base),'utf8');
new vm.Script(app);new vm.Script(design);
const d={};vm.createContext(d);vm.runInContext(design,d);
for(let seed=1;seed<=50;seed++)for(const exp of ['visual_search','flanker']){
 const rows=d.LabDesign.plan(exp,seed),count={},sides={};
 assert.equal(rows.length,exp==='visual_search'?160:120);
 assert.equal(d.LabDesign.plan(exp,seed,true).length,exp==='visual_search'?16:12);
 for(const r of rows){const k=exp==='visual_search'?[r.cue_mode,r.validity,r.target_shape].join('|'):[r.warning_type,r.congruency,r.target_direction].join('|');count[k]=(count[k]||0)+1;
 if(exp==='visual_search'){const items=r.layout_code.split(';').map(i=>i.split(':'));assert.equal(items.length,16);assert.equal(new Set(items.map(i=>i[0])).size,16);assert.equal(items.filter(i=>i[1]==='T').length,1);assert.equal(items.filter(i=>i[1]==='R').length,7);assert.equal(items.filter(i=>i[1]==='B').length,4);assert.equal(items.filter(i=>i[1]==='V').length,4);assert.equal(r.target_slot<8,r.target_side==='left');if(r.validity==='valid')assert.equal(r.target_side,r.cue_side);if(r.validity==='invalid')assert.notEqual(r.target_side,r.cue_side);if(r.validity==='neutral')assert.equal(r.cue_side,'none');sides[k]??={left:0,right:0};sides[k][r.target_side]++;}
 else {assert.equal(r.stimulus[2],r.target_direction==='left'?'←':'→');assert.equal(r.stimulus[0]===r.stimulus[2],r.congruency==='congruent');assert.equal(r.warning_text.length,4);if(r.warning_type==='predictive')assert.equal(r.warning_text,r.congruency==='congruent'?'编队同向':'编队反向');}
 for(let g=1;g<=4;g++)assert.equal(d.LabDesign.key(r,exp,g),(exp==='flanker'?r.target_direction==='left':g<=2?r.target_shape==='circle':r.target_shape==='triangle')?'f':'j');
 }
 assert.equal(Object.keys(count).length,exp==='visual_search'?10:12);
 for(const [k,n] of Object.entries(count))assert.equal(n,exp==='flanker'||k.includes('invalid')?10:20);
 for(const side of Object.values(sides))assert.equal(side.left,side.right);
 for(let b=1;b<=2;b++)assert.equal(rows.filter(r=>r.block===b).length,exp==='visual_search'?80:60);
 for(const mode of ['persistent','brief'])if(exp==='visual_search'){assert.equal(rows.filter(r=>r.cue_mode===mode&&r.validity==='valid').length,40);assert.equal(rows.filter(r=>r.cue_mode===mode&&r.validity==='invalid').length,20);}
 assert.equal(JSON.stringify(rows),JSON.stringify(d.LabDesign.plan(exp,seed)));
}
// Minimal DOM substitute tests application logic without opening a browser or sending data.
const elements=new Map();const drawCalls=[];const canvas=new Proxy({},{get:(obj,key)=>key in obj?obj[key]:(...args)=>drawCalls.push([key,...args])});function element(id){if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',value:'',checked:false,disabled:false,getContext:()=>canvas,querySelectorAll:()=>[]});return elements.get(id);}
let fetches=[],mode='success',storage={};const c={console,Blob,AbortController,performance,Date,Math,Set,JSON,Promise,Uint32Array,crypto:{getRandomValues:a=>(a[0]=123,a),randomUUID:()=> 'test-session'},innerWidth:1100,innerHeight:900,navigator:{userAgent:'unit-test'},document:{getElementById:element,hidden:false,hasFocus:()=>true,addEventListener:()=>{}},localStorage:{setItem:(k,v)=>storage[k]=v,getItem:k=>storage[k]||null},setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},requestAnimationFrame:fn=>setTimeout(fn,0),addEventListener:()=>{},fetch:async(url,options)=>{fetches.push({url,body:JSON.parse(options.body)});if(mode==='failure')throw Error('network unavailable');return {ok:true,json:async()=>({ok:true,record_id:42,warnings:['test warning']})};}};c.window=c;vm.createContext(c);vm.runInContext(design,c);vm.runInContext(app,c);
vm.runInContext(`S={id:'unit-test',participant:'P01',project:'TEST01',mode:'test',group:1,seed:1,consent:true,ended:false,data:{visual_search:LabDesign.plan('visual_search',1),flanker:[]},practice:{visual_search:[],flanker:[]},uploads:{},completed:{visual_search:'complete'},order:['visual_search','flanker']}`,c);
await vm.runInContext("upload('visual_search')",c);assert.equal(fetches.length,1);assert.equal(fetches[0].body.experiment,'test_space_search_v3');assert.equal(fetches[0].body.trials.length,160);assert.equal(vm.runInContext('S.uploads.visual_search.state',c),'success');assert.equal(new Blob([JSON.stringify(fetches[0].body)]).size<256*1024,true);
await vm.runInContext("upload('visual_search')",c);assert.equal(fetches.length,1);
mode='failure';vm.runInContext('S.uploads={}',c);await vm.runInContext("upload('visual_search')",c);assert.equal(vm.runInContext('S.uploads.visual_search.state',c),'failed');
vm.runInContext("S.project='';S.uploads={}",c);await vm.runInContext("upload('visual_search')",c);assert.equal(vm.runInContext('S.uploads.visual_search.state',c),'local');
// A real timed trial in the DOM substitute: proper response and persisted row.
vm.runInContext("S.data.visual_search=[];S.project='';taskUI('visual_search','formal',0,192)",c);
const trialPromise=vm.runInContext("trial(LabDesign.plan('visual_search',1)[0],'visual_search','formal',0,0)",c);
await new Promise(r=>setTimeout(r,850));vm.runInContext("if(pendingResponse)pendingResponse(LabDesign.key(LabDesign.plan('visual_search',1)[0],'visual_search',1))",c);
const row=await trialPromise;assert.equal(row.correct,true);assert(row.rt_ms>0);assert.equal(vm.runInContext('S.data.visual_search.length',c),1);assert(Object.keys(row).length<=40);
console.log('PASS: syntax; 50 seeds; all condition quotas, positions and targets; mocked upload success/failure/duplicate guard; local mode; timed response and persistence. No real upload performed.');
vm.runInContext("S.data.flanker=[];S.ended=false;S.completed={visual_search:'complete'}",c);
const interrupted=vm.runInContext("trial(LabDesign.plan('flanker',1)[0],'flanker','formal',0,0)",c);
await new Promise(r=>setTimeout(r,1100));vm.runInContext("finish('time_limit')",c);const stopped=await interrupted;await new Promise(r=>setTimeout(r,25));assert.equal(stopped.interrupted,true);assert.equal(vm.runInContext('S.completed.flanker',c),'incomplete');assert.equal(vm.runInContext('S.data.flanker[0].session_incomplete',c),true);assert.equal(vm.runInContext('S.completed.visual_search',c),'complete');console.log('PASS: limit interrupts active trial, preserves partial data, retains completed experiment.');

vm.runInContext('S.ended=false',c);
for(const mode of ['brief','persistent']){
 const t=d.LabDesign.plan('visual_search',1).find(r=>r.cue_mode===mode&&r.validity==='valid');c.testTrial=t;
 vm.runInContext("draw(testTrial,'visual_search','cue')",c);assert.equal(canvas.lineWidth,t.cue_side==='right'?3:1);
 vm.runInContext("draw(testTrial,'visual_search','stim')",c);assert.equal(canvas.lineWidth,mode==='persistent'&&t.cue_side==='right'?3:1);
}
const words=drawCalls.filter(x=>x[0]==='fillText').map(x=>x[1]);assert(drawCalls.some(x=>x[0]==='arc'));assert(drawCalls.some(x=>x[0]==='lineTo'));
assert(words.some(w=>['准备驾驶','看中央船','编队同向','编队反向'].includes(w)));
console.log('PASS: v2 cue timing stages, search shapes, and Flanker warning rendering commands.');

for(const exp of ['visual_search','flanker']){
 const prototype={cue_onset_perf_ms:1000,cue_duration_ms:600,trial_index:1,phase:'formal',practice_round:0,design_version:'3.0-space-rescue-15min',stage:1,ship_color:'cyan',seed:4294967295,order_group:4,key_mapping:'H/S',correct_key:'f',response_key:'j',correct:false,rt_ms:1234.567,timeout:false,visibility_lost:false,onset_perf_ms:100000.123456,response_perf_ms:101234.123456,interrupted:false,session_id:'00000000-0000-0000-0000-000000000000',session_incomplete:false};
 const trials=d.LabDesign.plan(exp,1).map(t=>({...t,...prototype}));assert(trials.every(t=>Object.keys(t).length<=40));const bytes=new Blob([JSON.stringify({project:'36UUQV',experiment:exp,participant:'P01',trials})]).size;assert(bytes<256*1024);console.log(`${exp}: ${trials.length} rows, ${Object.keys(trials[0]).length} fields, ${bytes} bytes.`);
}
vm.runInContext('S.ended=false;paused=false',c);
const restStart=performance.now();const resting=vm.runInContext('restScreen(0)',c);
assert(element('main').innerHTML.includes('rest-screen'));
vm.runInContext('resumeRest()',c);
await new Promise(r=>setTimeout(r,100));assert.equal(element('restcount').textContent,'3');
assert.equal(await resting,true);assert(performance.now()-restStart>=3000);assert.equal(vm.runInContext('resumeRest',c),null);
const canceledRest=vm.runInContext('restScreen(0)',c);vm.runInContext('S.ended=true',c);assert.equal(await canceledRest,false);
console.log('PASS: centered rest screen markup, space-resume handler, full 3-second countdown, and stop during rest.');
vm.runInContext('S.ended=false;paused=false',c);
const starting=vm.runInContext("startScreen('练习开始','<p>F=H，J=S</p>')",c);
assert(element('main').innerHTML.includes('start-panel'));assert(element('main').innerHTML.includes('F=H，J=S'));
assert.equal(element('restcount').textContent,'空格');
vm.runInContext('resumeRest()',c);await new Promise(r=>setTimeout(r,100));assert.equal(element('restcount').textContent,'3');
assert.equal(await starting,true);
assert(app.includes("startScreen(names[exp]+' · 练习'"));assert(app.includes("startScreen('再熟悉一下按键'"));assert(app.includes("startScreen('练习完成 · 准备正式实验'"));
console.log('PASS: practice/retry/formal use shared centered start flow with no rest delay and a 3-second countdown.');

assert(app.includes("space_search_v3"));assert(app.includes("space_flanker_v3"));assert(app.includes("LabDesign.total(exp)/4"));
assert.equal(vm.runInContext("mapText('flanker')[0]",c),'← 向左');
assert(vm.runInContext("missionHUD('visual_search',80,160)",c).includes('3 / 4'));
assert.equal(row.stage,1);assert.equal(row.ship_color,'cyan');
console.log('PASS: four-stage mission progress, fixed compatible flight keys, cosmetic color recording, v3 upload names.');

// Post-session report uses the same quality thresholds and is hidden before ending.
vm.runInContext("S.ended=false",c);
assert.equal(vm.runInContext('personalReportHTML()',c),'');assert.equal(vm.runInContext('postExperimentLinks()',c),'');
vm.runInContext(`S.ended=true;S.mode='test';S.participant='TEST';S.completed={visual_search:'complete',flanker:'complete'};for(const exp of ['visual_search','flanker'])S.data[exp]=LabDesign.plan(exp,77).map(r=>({...r,rt_ms:400,correct:true,timeout:false,visibility_lost:false,interrupted:false,session_incomplete:false}));`,c);
assert.equal(vm.runInContext("personalReportData('visual_search').eligible",c),true);
assert.equal(vm.runInContext("personalReportData('flanker').rt",c),400);
assert(vm.runInContext('personalReportHTML()',c).includes('测试模式'));
assert(vm.runInContext('postExperimentLinks()',c).includes('target="_blank"'));
vm.runInContext("S.data.flanker=S.data.flanker.slice(0,3);S.completed.flanker='incomplete'",c);
assert.equal(vm.runInContext("personalReportData('flanker').eligible",c),false);
assert(vm.runInContext('personalReportHTML()',c).includes('未完整完成'));
vm.runInContext("S.data.flanker=[]",c);assert.equal(vm.runInContext("personalReportData('flanker').accuracy",c),null);
console.log('PASS: report quality metrics, empty/partial sessions, test label, and post-session-only links.');
