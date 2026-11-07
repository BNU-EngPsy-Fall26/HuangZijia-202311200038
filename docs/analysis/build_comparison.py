"""Generate public aggregate only. Usage: python3 analysis/build_comparison.py /tmp
Inputs: our.json, class-flanker.json, class-search.json (course public API snapshots).
Raw participant/session/trial data must not be committed or packaged.
"""
import json, sys, itertools, statistics as st
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
src=Path(sys.argv[1]); root=Path(__file__).resolve().parents[1]
records=json.loads((src/'our.json').read_text())['records']
cf=json.loads((src/'class-flanker.json').read_text())['data']
cs=json.loads((src/'class-search.json').read_text())['data']
counts={'records_total':len(records),'formal_flanker':0,'incomplete':0,'duplicate':0,'quality':0,'sparse_cells':0,'included':0}
seen_sessions=set(); seen_people=set(); people=[]
keys=list(itertools.product(['neutral','general','predictive'],['congruent','incongruent'],['left','right']))
for r in sorted(records,key=lambda r:(r['created_at'],r['record_id'])):
 if r['experiment']!='space_flanker_v3': continue
 counts['formal_flanker']+=1
 t=r['trials']; session=t[0].get('session_id'); person=r['participant']
 if session in seen_sessions: counts['duplicate']+=1; continue
 seen_sessions.add(session)
 if len(t)!=120 or any(x.get('session_incomplete') for x in t) or any(x.get('phase')!='formal' or x.get('design_version')!='3.0-space-rescue-15min' for x in t): counts['incomplete']+=1; continue
 if person in seen_people: counts['duplicate']+=1; continue
 seen_people.add(person) # first COMPLETE session, never choose the best
 clean=[x for x in t if not x['visibility_lost'] and not x['interrupted']]
 bad=sum(x['visibility_lost'] or x['interrupted'] or (x['rt_ms'] is not None and x['rt_ms']<150) for x in t)
 if not clean or sum(bool(x['correct']) and not x['timeout'] for x in clean)/len(clean)<.7 or bad/len(t)>.2: counts['quality']+=1; continue
 cells={k:[x for x in clean if (x['warning_type'],x['congruency'],x['target_direction'])==k] for k in keys}
 good={k:[x['rt_ms'] for x in cell if x['correct'] and not x['timeout'] and x['rt_ms'] is not None and x['rt_ms']>=150] for k,cell in cells.items()}
 if any(len(v)<6 for v in good.values()): counts['sparse_cells']+=1; continue
 p={}
 for c in ['congruent','incongruent']:
  ks=[('neutral',c,d) for d in ['left','right']]
  p[c]={'mean_rt':st.mean(st.mean(good[k]) for k in ks),'median_rt':st.mean(st.median(good[k]) for k in ks),'err':st.mean(sum(not x['correct'] or x['timeout'] for x in cells[k])/len(cells[k]) for k in ks)}
 people.append(p)
counts['included']=len(people)
ours={c:{m:st.mean(p[c][m] for p in people) if people else None for m in ['mean_rt','median_rt','err']} for c in ['congruent','incongruent']}
# Verify the platform's reported mean and paired interference against its anonymous aggregates.
for c in ours:
 assert abs(st.mean(p['rt'][c] for p in cf['indiv'])-cf['conds'][c]['mean_rt'])<1e-7
assert abs(cf['conds']['incongruent']['mean_rt']-cf['conds']['congruent']['mean_rt']-cf['interference'])<1e-7
snapshot={'generated_at':datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(timespec='seconds'),'project':'36UUQV','counts':counts,'ours':ours,'class':{'n':cf['n'],'conditions':{c:cf['conds'][c] for c in ours},'interference':cf['interference'],'err_effect':cf['err_effect']},'search_available_n':cs['n'],'sources':{'ours':'https://attention-lab-production.up.railway.app/api/hw2/data?project=36UUQV','flanker':'https://attention-lab-production.up.railway.app/api/class/summary?exp=flanker&input=keyboard','search':'https://attention-lab-production.up.railway.app/api/class/summary?exp=search&input=keyboard'}}
(root/'model/comparison-data.js').write_text('window.COMPARISON_DATA = '+json.dumps(snapshot,ensure_ascii=False,indent=2)+';\n')
print(json.dumps(snapshot,ensure_ascii=False,indent=2))
