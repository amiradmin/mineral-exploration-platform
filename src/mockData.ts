export const targets=[
{id:'T-001',name:'North Copper Belt',commodity:'Cu',aiScore:87,pos:68,emv:9.5,decision:'GO',x:66,y:30},
{id:'T-002',name:'Central Porphyry',commodity:'Cu-Au',aiScore:74,pos:59,emv:6.2,decision:'GO',x:43,y:47},
{id:'T-003',name:'West Anomaly',commodity:'Au',aiScore:52,pos:41,emv:2.8,decision:'HOLD',x:28,y:63},
{id:'T-004',name:'South Ridge',commodity:'Fe',aiScore:31,pos:24,emv:-0.6,decision:'REJECT',x:74,y:70}]
export const stageGates=[
{gate:'Gate 1',title:'Screening & Targets',status:'Complete'},
{gate:'Gate 2',title:'Advanced Drilling',status:'Complete'},
{gate:'Gate 3',title:'Pre-Feasibility',status:'Active'},
{gate:'Gate 4',title:'Bankable FS',status:'Pending'}]
export const cashflow=[{year:'Y0',value:-18},{year:'Y1',value:-8},{year:'Y2',value:13},{year:'Y3',value:25},{year:'Y4',value:31},{year:'Y5',value:34}]
export const risk=[{name:'Metal Price',value:92},{name:'Recovery',value:75},{name:'CAPEX',value:63},{name:'OPEX',value:49},{name:'FX',value:34}]