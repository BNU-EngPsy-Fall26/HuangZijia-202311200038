"""Rebuild class-reference display from aggregate files (no raw records).
Run from project root: python3 analysis/build_comparison.py
Primary analysis must first be generated with analyze_snapshot.py.
"""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
a=json.loads((root/'results/analysis.json').read_text())['scenarios']['adjusted']['flanker']
c=json.loads((root/'results/class-reference.json').read_text())
ours={}
for key,label in [('neutral|congruent','congruent'),('neutral|incongruent','incongruent')]:
 v=next(v for v in a['conditions'] if v['key']==key)
 ours[label]={'mean_rt':v['mean_rt']['mean'],'err':1-v['accuracy']['mean'],'median_rt':v['rt']['mean']}
snapshot={'generated_at':c['retrieved_at'],'ours':ours,'class':c['flanker'],'n':a['n']}
(root/'model/comparison-data.js').write_text('window.CLASS_COMPARISON = '+json.dumps(snapshot,ensure_ascii=False)+';\n')
print('Updated class comparison from frozen aggregate analysis.')
