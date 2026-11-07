/* v2: reproducible fixed-quota schedules. No dependencies or network access. */
(function(root){
'use strict';
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function shuffle(a,r){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function plan(exp,seed,practice=false){const r=rng(seed),out=[];const blocks=practice?1:2;
for(let b=0;b<blocks;b++){let rows=[];
if(exp==='visual_search'){
 for(const cue_mode of ['none','persistent','brief'])for(const validity of cue_mode==='none'?['neutral']:['valid','invalid'])for(const target_shape of ['circle','triangle']){
 const count=practice?(validity==='invalid'?1:2):(validity==='invalid'?5:10);
 for(let k=0;k<count;k++){
 const target_side=(b*count+k)%2===0?'left':'right';const target_slot=(target_side==='left'?0:8)+Math.floor(r()*8);
 const cue_side=validity==='neutral'?'none':validity==='valid'?target_side:target_side==='left'?'right':'left';
 const kinds=shuffle([...Array(7).fill('R'),...Array(4).fill('B'),...Array(4).fill('V')],r);
 const layout=Array.from({length:16},(_,slot)=>({slot,kind:slot===target_slot?'T':kinds.pop()}));
 rows.push({block:b+1,cue_mode,validity,target_shape,target_side,cue_side,target_slot,set_size:16,layout_code:layout.map(x=>`${x.slot}:${x.kind}`).join(';')});
 }}
}else{
 for(const warning_type of ['neutral','general','predictive'])for(const congruency of ['congruent','incongruent'])for(const target_direction of ['left','right'])for(let k=0;k<(practice?1:5);k++){
 const arrow=target_direction==='left'?'←':'→';const f=congruency==='congruent'?arrow:target_direction==='left'?'→':'←';
 rows.push({block:b+1,warning_type,congruency,target_direction,warning_text:warning_type==='neutral'?'准备驾驶':warning_type==='general'?'看中央船':congruency==='congruent'?'编队同向':'编队反向',stimulus:f+f+arrow+f+f});
 }}out.push(...shuffle(rows,r));}return out;}
function key(t,exp,group){if(exp==='flanker')return t.target_direction==='left'?'f':'j';const first=t.target_shape==='circle';return(group<=2?first:!first)?'f':'j';}
root.LabDesign={rng,shuffle,plan,key,total:exp=>exp==='visual_search'?160:120,practiceTotal:exp=>exp==='visual_search'?16:12,pass:exp=>exp==='visual_search'?13:10};
})(typeof window==='undefined'?globalThis:window);
