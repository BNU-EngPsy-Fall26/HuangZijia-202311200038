"""Reproduce aggregate analysis: python3 analysis/analyze_snapshot.py PRIVATE_INPUT OUTPUT_JSON.
Private input: records with participant/session, trials, complete, exception flags.
Never publish private input. Requires Python 3 and numpy. No network requests.
"""
import json,sys,itertools,hashlib
from pathlib import Path
import numpy as np
SEED=20261107
SKEYS=['none|neutral','persistent|valid','persistent|invalid','brief|valid','brief|invalid']
FKEYS=[a+'|'+b for a in ['neutral','general','predictive'] for b in ['congruent','incongruent']]
def stat(values, test=False):
 a=np.array(values,dtype=float);n=len(a)
 if not n:return {'n':0,'mean':None,'ci':None}
 rng=np.random.default_rng(SEED);boots=a[rng.integers(0,n,(10000,n))].mean(axis=1)
 out={'n':n,'mean':float(a.mean()),'ci':[float(x) for x in np.quantile(boots,[.025,.975])],'sd':float(a.std(ddof=1)) if n>1 else None}
 if test:
  signs=np.array(list(itertools.product([-1,1],repeat=n)));null=(signs*a).mean(axis=1)
  out['p']=float(np.mean(np.abs(null)>=abs(a.mean())-1e-10))
 return out
def metrics(v,search):
 if search:
  n,pv,pi,bv,bi=v
  return {'S-H1':pi-bi,'S-H2':(pi-pv)-(bi-bv),'persistent_benefit':n-pv,'persistent_cost':pi-n,'brief_benefit':n-bv,'brief_cost':bi-n,'validity':((pi-pv)+(bi-bv))/2}
 nc,ni,gc,gi,pc,pi=v
 return {'F-H2':(gi-gc)-(pi-pc),'F-H1':ni-nc,'general_interference':gi-gc,'predictive_interference':pi-pc,'general_reduction':(ni-nc)-(gi-gc),'predictive_reduction':(ni-nc)-(pi-pc)}
def prepare(r):
 search='search' in r['experiment'];rows=r['trials'];threshold=200 if search else 150
 clean=[t for t in rows if not t['visibility_lost'] and not t['interrupted']]
 valid=[t for t in clean if t['correct'] and not t['timeout'] and isinstance(t['rt_ms'],(int,float)) and t['rt_ms']>=threshold]
 bad=sum(t['visibility_lost'] or t['interrupted'] or (isinstance(t['rt_ms'],(int,float)) and t['rt_ms']<threshold) for t in rows)
 accuracy=sum(t['correct'] and not t['timeout'] for t in clean)/len(clean) if clean else 0
 keys=SKEYS if search else FKEYS;ids=['circle','triangle'] if search else ['left','right'];fields=['cue_mode','validity','target_shape'] if search else ['warning_type','congruency','target_direction']
 values={m:[] for m in ['rt','mean_rt','accuracy','timeout']};counts=[]
 for key in keys:
  sub={m:[] for m in values}
  for identity in ids:
   match=lambda t: '|'.join(str(t[f]) for f in fields[:2])==key and t[fields[2]]==identity
   vv=[t['rt_ms'] for t in valid if match(t)];cc=[t for t in clean if match(t)]
   counts.append(len(vv));sub['rt'].append(float(np.median(vv)) if vv else None);sub['mean_rt'].append(float(np.mean(vv)) if vv else None)
   sub['accuracy'].append(sum(t['correct'] and not t['timeout'] for t in cc)/len(cc) if cc else None)
   sub['timeout'].append(sum(t['timeout'] for t in cc)/len(cc) if cc else None)
  for m in values:values[m].append(float(np.mean(sub[m])) if None not in sub[m] else None)
 complete=r['complete'] and len(rows)==(160 if search else 120) and not any(t['session_incomplete'] for t in rows)
 return dict(r,search=search,values=values,counts=counts,base=bool(complete and accuracy>=.7 and bad/len(rows)<=.2),complete=complete,bad=bad,valid_n=len(valid),accuracy=accuracy)
def analyze(source):
 rr=[prepare(r) for r in source['records']];out={'as_of':source['as_of'],'seed':SEED,'bootstrap_resamples':10000,'input_sha256':source['input_sha256'],'scope':source['scope'],'scenarios':{}}
 for name,limit,exceptions in [('adjusted',5,True),('original_cells',6,True),('no_mode_exceptions',5,False),('strict',6,False)]:
  scenario={}
  for search,task in [(True,'search'),(False,'flanker')]:
   candidates=[r for r in rr if r['search']==search];pool=[r for r in candidates if exceptions or not r['exception']]
   included=[r for r in pool if r['base'] and min(r['counts'])>=(6 if search else limit)]
   assert len({r['participant'] for r in included})==len(included)
   conditions=[]
   for i,k in enumerate(SKEYS if search else FKEYS):
    conditions.append({'key':k,**{m:stat([r['values'][m][i] for r in included]) for m in ['rt','mean_rt','accuracy','timeout']}})
   effects={};error_effects={}
   if included:
    for k in metrics(included[0]['values']['rt'],search):effects[k]=stat([metrics(r['values']['rt'],search)[k] for r in included],test=k in ['S-H1','F-H2'])
    for k in metrics(included[0]['values']['rt'],search):error_effects[k]=stat([metrics([100*(1-a) for a in r['values']['accuracy']],search)[k] for r in included])
   scenario[task]={'n':len(included),'conditions':conditions,'effects':effects,'error_effects_pp':error_effects,'flow':{'candidates':len(candidates),'mode_excluded':len(candidates)-len(pool),'incomplete':sum(not r['complete'] for r in pool),'overall_quality':sum(r['complete'] and not r['base'] for r in pool),'sparse':sum(r['base'] and min(r['counts'])<(6 if search else limit) for r in pool)},'valid_correct_trials':sum(r['valid_n'] for r in included),'min_cell':min(min(r['counts']) for r in included) if included else None,'order_groups':{str(g):sum(int(r['trials'][0]['order_group'])==g for r in included) for g in range(1,5)}}
  ps=[scenario['search']['effects']['S-H1']['p'],scenario['flanker']['effects']['F-H2']['p']];order=np.argsort(ps);adjusted=[None,None];running=0
  for rank,i in enumerate(order):running=max(running,min(1,ps[i]*(2-rank)));adjusted[i]=running
  for task,k,p in [('search','S-H1',adjusted[0]),('flanker','F-H2',adjusted[1])]:scenario[task]['effects'][k]['p_holm']=float(p)
  out['scenarios'][name]=scenario
 return out
if __name__=='__main__':
 source=json.loads(Path(sys.argv[1]).read_text());out=analyze(source);Path(sys.argv[2]).write_text(json.dumps(out,ensure_ascii=False,indent=2))
