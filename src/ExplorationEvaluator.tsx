import React, {useMemo, useState} from 'react'
import { Activity, ArrowRight, Database, GitBranch2, Layers, Map, ShieldAlert, Target, Wallet } from 'lucide-react'
import {targets} from './mockData'
import type { DecisionContext, Scenario } from './decisionPipeline'
import './ExplorationEvaluator.css'

const factorLabels=[
 ['Mineralizing source','Evidence for a viable source of metals and heat'],
 ['Fluid pathways','Structures and permeability transporting mineralizing fluids'],
 ['Deposition conditions','Traps and chemical/physical conditions for ore deposition'],
 ['Timing & preservation','Relative timing of mineralization and later preservation'],
] as const
const scenarioValues:Record<Scenario,number>={conservative:.85,base:1,optimistic:1.1}
const money=(v:number)=> (v<0?'−':'')+'$'+Math.abs(v).toFixed(1)+'M'
const bound=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v))
type FactorValues=[number,number,number,number]
export default function ExplorationEvaluator({context,onContext,onNavigate}:{context:DecisionContext;onContext:(c:DecisionContext)=>void;onNavigate:(page:string)=>void}){
 const target=targets.find(t=>t.id===context.targetId)??targets[0]
 const [factorOverrides,setFactorOverrides]=useState<Record<string,FactorValues>>({})
 const [budgets,setBudgets]=useState<Record<string,number>>({})
 const [values,setValues]=useState<Record<string,number>>({})
 const [months,setMonths]=useState<Record<string,number>>({})
 const factors=factorOverrides[target.id]??[.78,.72,.68,.81]
 const budget=budgets[target.id]??2.4
 const upside=values[target.id]??18
 const timeline=months[target.id]??18
 const result=useMemo(()=>{
  // Independent multiplication is an illustrative elicitation framework only.
  // These are user-assigned hypothetical factor weights, NOT calibrated geological probabilities.
  const nominal=factors.reduce((a,b)=>a*b,1)
  const score=bound(nominal*scenarioValues[context.scenario],0,1)
  const discount=1/Math.pow(1.1,timeline/12)
  const successValue=upside*discount
  const emv=score*successValue-budget
  const risk=1-score
  const isHighValue=emv>=2
  const isHighRisk=risk>=.70
  const quadrant=isHighRisk?(isHighValue?'Strategic Bet':'Deprioritize'):(isHighValue?'Transformational':'Quick Win')
  const verdict=emv<0?'HOLD':isHighRisk?'REVIEW':'GO'
  return {score,emv,risk,quadrant,verdict,successValue,discount}
 },[factors,budget,upside,timeline,context.scenario])
 const updateFactor=(idx:number,v:number)=>{
  const next=[...factors] as FactorValues
  next[idx]=v/100
  setFactorOverrides(x=>({...x,[target.id]:next}))
 }
 const exportReport=()=>{
  const report={disclaimer:'FICTIONAL demonstration, uncalibrated subjective factor inputs, not investment guidance or geological probability',target:target.id,scenario:context.scenario,factors:Object.fromEntries(factorLabels.map(([label],i)=>[label,factors[i]])),budgetMillionsUSD:budget,illustrativeSuccessValueMillionsUSD:upside,timelineMonths:timeline,results:result}
  const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a');a.href=url;a.download='exploration-evaluator-'+target.id+'.json';a.click();URL.revokeObjectURL(url)
 }
 return <div className="ee">
  <div className="ee-heading"><div><span className="sg-eyebrow">MODULE 01 · GATE 1 · SCREENING & TARGETS</span><h1>Exploration Evaluator</h1><p>Connect subsurface evidence, hypothetical budgets and decision scenarios in one review workspace.</p></div><span className="sg-demo">UNCALIBRATED · DEMO ONLY</span></div>
  <div className="sg-context"><label>Target<select value={context.targetId} onChange={e=>onContext({...context,targetId:e.target.value})}>{targets.map(t=><option key={t.id} value={t.id}>{t.id} · {t.name}</option>)}</select></label><label>Scenario<select value={context.scenario} onChange={e=>onContext({...context,scenario:e.target.value as Scenario})}><option value="conservative">Conservative</option><option value="base">Base</option><option value="optimistic">Optimistic</option></select></label><span>Selections are shared with the other five modules.</span></div>
  <div className="ee-kpis"><div><span>Assumption product (PoS proxy)</span><strong>{(result.score*100).toFixed(1)}%</strong><small>Not a calibrated probability of discovery</small></div><div><span>Illustrative EMV</span><strong>{money(result.emv)}</strong><small>Scenario expectation less exploration budget</small></div><div><span>Geological uncertainty proxy</span><strong>{(result.risk*100).toFixed(1)}%</strong><small>1 − assumption product</small></div><div><span>Screening suggestion</span><strong>{result.verdict}</strong><small>Heuristic · requires expert review</small></div></div>
  <div className="ee-columns">
   <section className="ee-panel"><h2><Layers size={19}/> Inputs: Subsurface Reality</h2><p className="ee-muted">Adjust four conceptual mineral-system factors (unvalidated subjective confidence).</p>
    <div className="ee-inputs">{factorLabels.map(([label,desc],i)=><label key={label}><span><b>{label}</b><strong>{(factors[i]*100).toFixed(0)}%</strong></span><small>{desc}</small><input type="range" min="5" max="100" step="1" value={Math.round(factors[i]*100)} onChange={e=>updateFactor(i,Number(e.target.value))}/></label>)}</div>
    <div className="ee-number-grid"><label><Wallet size={15}/> Exploration budget ($M)<input type="number" min="0" max="10000" step=".1" value={budget} onChange={e=>setBudgets(x=>({...x,[target.id]:bound(Number(e.target.value)||0,0,10000)}))}/></label><label>Success case value ($M)<input type="number" min="0" max="100000" step=".5" value={upside} onChange={e=>setValues(x=>({...x,[target.id]:bound(Number(e.target.value)||0,0,100000)}))}/></label><label>Timeline (months)<input type="number" min="1" max="240" step="1" value={timeline} onChange={e=>setMonths(x=>({...x,[target.id]:bound(Number(e.target.value)||1,1,240)}))}/></label></div>
    <div className="ee-evidence"><b>Existing target evidence</b>{target.evidence.map(x=><span key={x}>• {x}</span>)}<button onClick={()=>onNavigate('targets')}>Open target intelligence <ArrowRight size={14}/></button></div>
   </section>
   <section className="ee-panel ee-compute"><h2><GitBranch2 size={19}/> Computational Outputs</h2><p className="ee-muted">Transparent illustration of the concept in your reference diagram.</p>
     <div className="ee-tree"><div><span>4 geological assumptions</span><strong>{factors.map(x=>(x*100).toFixed(0)+'%').join(' × ')}</strong></div><div className="ee-tree-arrow">↓</div><div><span>Joint assumption index · scenario adjustment</span><strong>{(result.score*100).toFixed(1)}%</strong></div><div className="ee-tree-split"><div><b>Illustrative success</b><strong>{(result.score*100).toFixed(1)}%</strong><small>Value after discount: {money(result.successValue)}</small></div><div><b>Illustrative failure</b><strong>{(result.risk*100).toFixed(1)}%</strong><small>Success value: $0M</small></div></div><div className="ee-emv"><span>Expected monetary value (simplified)</span><strong>{money(result.emv)}</strong><small>Assumption index × discounted success value − exploration budget</small></div></div>
    <h3>Risk vs Expected Value</h3><div className="ee-matrix" role="img" aria-label={'Decision quadrant: '+result.quadrant}><div>Quick Win<small>Low risk · Low EMV</small></div><div>Transformational<small>Low risk · High EMV</small></div><div>Deprioritize<small>High risk · Low EMV</small></div><div>Strategic Bet<small>High risk · High EMV</small></div><i style={{left:(result.emv>=2?'75%':'25%'),top:(result.risk>=.70?'75%':'25%')}} title={target.name+' · '+result.quadrant}/></div><div className="ee-matrix-caption">Current quadrant: <strong>{result.quadrant}</strong> · Thresholds: risk 70%, EMV $2M</div>
   </section>
   <section className="ee-panel"><h2><Database size={19}/> Technology & Data Enablers</h2><p className="ee-muted">Internal workspaces are navigable. Third-party systems below are reference integrations, not connected services.</p>
    <div className="ee-integrations"><button onClick={()=>onNavigate('map')}><Map size={19}/><span><b>GIS Exploration Map</b><small>Evidence layers and exploration targets</small></span><ArrowRight size={15}/></button><button onClick={()=>onNavigate('geoscience')}><Activity size={19}/><span><b>Geochemistry & Geophysics</b><small>Surface anomalies and survey coverage</small></span><ArrowRight size={15}/></button><button onClick={()=>onNavigate('qaqc')}><ShieldAlert size={19}/><span><b>Data QA / QC</b><small>Review provenance and data completeness</small></span><ArrowRight size={15}/></button><button onClick={()=>onNavigate('ai')}><Target size={19}/><span><b>AI Prospectivity</b><small>Separate ranking score · not a PoS estimate</small></span><ArrowRight size={15}/></button></div>
    <h3>Potential external integration</h3><div className="ee-vendors"><span>Seequent Target / Oasis montaj <small>Not connected</small></span><span>Micromine Geobank <small>Not connected</small></span><span>Datamine Discover <small>Not connected</small></span></div><button className="ee-export" onClick={exportReport}>Export assumptions & decision JSON</button>
   </section>
  </div><div className="ee-warning">DEMONSTRATION ONLY · Mineral-system factors are not independent calibrated probabilities. The calculated product, risk index, EMV, quadrant and GO/HOLD/REVIEW suggestion are hypothetical teaching aids. They must not drive actual exploration, resource classification or investment decisions.</div>
 </div>
}
