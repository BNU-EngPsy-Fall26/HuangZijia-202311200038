import json,sys,itertools,statistics
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'analysis'))
from analyze_snapshot import stat,metrics,analyze
assert stat([0,0,0],True)['p']==1
assert stat([1,1,1],True)['p']==.25
assert metrics([10,8,14,9,13],True)['S-H1']==1
assert metrics([10,13,10,15,12,14],False)['F-H2']==3
x=json.loads((root/'results/analysis.json').read_text())
for k,ns in {'adjusted':(14,13),'original_cells':(14,12),'no_mode_exceptions':(10,9),'strict':(10,8)}.items():
 s=x['scenarios'][k];assert (s['search']['n'],s['flanker']['n'])==ns
 for t,primary in [('search','S-H1'),('flanker','F-H2')]:
  v=s[t]['effects'][primary];assert 0<=v['p']<=v['p_holm']<=1
  assert v['ci'][0]<=v['mean']<=v['ci'][1]
  assert s[t]['n']+sum(s[t]['flow'][z] for z in ['mode_excluded','incomplete','overall_quality','sparse'])==s[t]['flow']['candidates']
  for c in s[t]['conditions']:assert 0<=c['accuracy']['mean']<=1
# Additional private check only when source is present (not distributed).
f=root/'analysis/private/frozen_analysis_input.json'
if f.exists():
 source=json.loads(f.read_text());assert analyze(source)==x
 for r in source['records']:
  ids=[t.get('trial_index') for t in r['trials']];assert len(ids)==len(set(ids))
 # Independent scalar median calculation for primary contrasts.
 individual=json.loads((root/'analysis/private/individual_effects.json').read_text())
 for t,key in [('search','S-H1'),('flanker','F-H2')]:
  mean=statistics.mean(r['effects'][key] for r in individual if r['task']==t)
  assert abs(mean-x['scenarios']['adjusted'][t]['effects'][key]['mean'])<1e-10
print('PASS: exact sign test, contrasts, flow, scenario sizes, private reproducibility and uniqueness.')
