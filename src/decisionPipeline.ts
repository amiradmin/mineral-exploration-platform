import { targets } from './mockData'

/** Shared, deterministic presentation scenario. No server, resource classification, or live economics. */
export type Scenario = 'conservative' | 'base' | 'optimistic'
export type GateVerdict = 'GO' | 'HOLD' | 'REVIEW'
export interface DecisionContext { targetId: string; scenario: Scenario }
export interface StageRecord { stage: string; label: string; value: string; note: string; verdict: GateVerdict }
export interface DecisionSnapshot { context: DecisionContext; targetName: string; commodity: string; records: StageRecord[]; risk: number; npv: number; irR: number; esg: number }

const cases: Record<Scenario,{grade:number; recovery:number; price:number; cost:number; risk:number}> = {
 conservative:{grade:.8,recovery:.79,price:7800,cost:61,risk:17},
 base:{grade:1,recovery:.86,price:9200,cost:51,risk:9},
 optimistic:{grade:1.12,recovery:.9,price:10600,cost:45,risk:4},
}
const compact=(v:number)=>v.toLocaleString('en-US',{maximumFractionDigits:1})
export function createDecisionSnapshot(context:DecisionContext):DecisionSnapshot {
 const target=targets.find(t=>t.id===context.targetId) ?? targets[0]
 const assumptions=cases[context.scenario]
 const factor=target.aiScore/92
 const grade=.84*assumptions.grade*factor
 const tonnes=18.4e6*2.65*factor
 const containedCu=tonnes*grade/100
 const recoveredCu=containedCu*assumptions.recovery
 const revenue=recoveredCu*assumptions.price
 const operating=tonnes*assumptions.cost
 const capex=920e6
 const margin=(revenue-operating)/Math.max(1,revenue)*100
 // Deliberately simplified one-period discounted scenario proxy; NOT project NPV.
 const npv=(revenue-operating-capex)/1.1/1e6
 const irr=(revenue-operating)/capex*100-100
 const risk=Math.min(100,Math.max(0,100-target.confidence+assumptions.risk))
 const esg=Math.min(100,Math.max(0,target.completeness-8-assumptions.risk/2))
 const gate1:GateVerdict=target.aiScore>=80?'GO':target.aiScore>=70?'REVIEW':'HOLD'
 const gate2:GateVerdict=target.completeness>=85?'GO':'REVIEW'
 const gate3:GateVerdict=margin>=20&&risk<=25?'GO':'REVIEW'
 const gate4:GateVerdict=npv>0&&risk<=20?'GO':'HOLD'
 return {context,targetName:target.name,commodity:target.commodity,risk,npv,irR:irr,esg,records:[
  {stage:'exploration-evaluator',label:'Prospectivity',value:target.aiScore+'/100',note:target.evidence.length+' evidence groups · '+target.action,verdict:gate1},
  {stage:'reserve-simulator',label:'Conceptual mineralized material',value:compact(tonnes/1e6)+' Mt',note:'Illustrative '+grade.toFixed(2)+'% Cu equivalent assumption; NOT a mineral resource or reserve',verdict:gate2},
  {stage:'economics-engine',label:'One-period operating margin',value:margin.toFixed(1)+'%',note:'Illustrative recovered metal '+compact(recoveredCu/1000)+' kt',verdict:gate3},
  {stage:'risk-scenarios',label:'Scenario risk index',value:risk.toFixed(0)+'/100',note:'Heuristic index, not a probabilistic risk model',verdict:risk<=20?'GO':'REVIEW'},
  {stage:'financial-valuator',label:'Discounted scenario proxy',value:(npv>=0?'+':'−')+'$'+compact(Math.abs(npv))+'M',note:'Single-period proxy, not an NPV, IRR or feasibility valuation',verdict:gate4},
  {stage:'esg-governance',label:'Evidence coverage proxy',value:esg.toFixed(0)+'%',note:'Derived demo completeness proxy, not permit or ESG compliance status',verdict:esg>=75?'GO':'REVIEW'}
 ]}
}
