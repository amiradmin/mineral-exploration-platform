import React, {useMemo, useState} from 'react'
import {CheckCircle2, Database, ExternalLink, GitBranch, Settings2, ShieldCheck, SlidersHorizontal, ThumbsDown, ThumbsUp, TrendingUp} from 'lucide-react'
import {targets} from './mockData'
import type {DecisionContext, Scenario} from './decisionPipeline'
import './ExplorationEvaluator.css'

type Factors = [number,number,number,number]
const defaults:Factors=[75,82,68,90]
const labels=[['SOURCE','Source Rock Potential'],['PATHWAY','Migration Pathway Integrity'],['TRAP','Trap Seal Capacity'],['TIMING','Accumulation Timing']] as const
const scenarios:Record<Scenario,number>={conservative:.85,base:1,optimistic:1.1}
const clamp=(v:number)=>Math.max(0,Math.min(100,v))
const currency=(v:number)=>`${v<0?'-':'+'}$${Math.abs(v).toFixed(2)}M`

function Scatter({index,title}:{index:number,title:string}){
 const points=Array.from({length:125},(_,i)=>{
  const a=((i*73+index*41)%101)/101, b=((i*47+index*29)%97)/97
  return {x:12+a*90,y:83-(index%3===2?.65*a+.35*b:.56*a+.44*b)*67,high:a>.71&&b>.38,low:a<.3}
 })
 return <svg viewBox="0 0 115 100" role="img" aria-label={title+' sample anomaly scatter plot'}>
  <defs><linearGradient id={'zone-'+index} x1="0" y1="1" x2="1" y2="0"><stop stopColor="#14d8e0" stopOpacity=".04"/><stop offset=".6" stopColor="#22bcbd" stopOpacity=".16"/><stop offset="1" stopColor="#ffcb4b" stopOpacity=".32"/></linearGradient></defs>
  {[20,40,60,80].map(v=><path key={v} d={`M${v} 8V89 M8 ${v}H108`} stroke="#3c5566" strokeWidth=".5"/>)}
  <path d={`M8 ${77-index%3*7} Q40 ${23+index*2} 108 12 V89 H8Z`} fill={`url(#zone-${index})`}/>
  <path d={`M8 ${77-index%3*7} Q40 ${23+index*2} 108 12`} stroke="#4ce7d4" strokeWidth=".8" fill="none"/>
  {points.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={p.high?1.15:.8} fill={p.high?'#ffcc4e':p.low?'#19dbed':'#70e8dc'} opacity={.45+(i%4)*.14}/>)}
  <path d="M8 8V89H108" stroke="#71899b" strokeWidth=".7" fill="none"/>
 </svg>
}
function Tree({success,emv,budget}:{success:number,emv:number,budget:number}){
 const pct=(success*100).toFixed(2)+'%'
 const nodes=[{y:46,title:'TECHNICAL SUCCESS',amount:currency(emv),color:'#2bebac',mark:'↗'},{y:138,title:'ECONOMIC VIABILITY',amount:currency(emv),color:'#2bebac',mark:'$'},{y:226,title:'GEOLOGICAL RISK',amount:'-$'+budget.toFixed(2)+'M',color:'#ff827b',mark:'!'},{y:313,title:'EXECUTION RISK',amount:'-$'+budget.toFixed(2)+'M',color:'#ff827b',mark:'×'}]
 return <svg className="ee-tree-svg" viewBox="0 0 535 350" role="img" aria-label={`Illustrative probability tree, success ${pct}`}>
  <defs><filter id="gate-glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <path d="M45 176 C103 176 114 91 179 91 M45 176 C103 176 114 264 179 264" stroke="#5bdab9" strokeWidth="1.8" fill="none"/>
  <path d="M194 91 C265 91 265 46 334 46 M194 91 C265 91 265 138 334 138" stroke="#32e8ae" strokeWidth="1.5" fill="none"/>
  <path d="M194 264 C265 264 265 226 334 226 M194 264 C265 264 265 313 334 313" stroke="#ef786f" strokeWidth="1.5" fill="none"/>
  <circle cx="45" cy="176" r="21" fill="#253c4a" stroke="#bfd7db"/><text x="45" y="183" fontSize="22" textAnchor="middle" fill="#fff">◎</text>
  <text x="45" y="216" textAnchor="middle" fill="#e5f7fb" fontSize="10" fontWeight="bold">EXPLORATION</text><text x="45" y="228" textAnchor="middle" fill="#e5f7fb" fontSize="10">GATE 1</text>
  {[{y:91,color:'#1eeaa9',title:'SUCCESS',value:pct,mark:'+'},{y:264,color:'#fa786d',title:'FAILURE',value:(100-success*100).toFixed(2)+'%',mark:'−'}].map(n=><g key={n.title} textAnchor="middle"><circle cx="181" cy={n.y} r="22" fill="#13333c" stroke={n.color} strokeWidth="2" filter="url(#gate-glow)"/><text x="181" y={n.y+9} fill={n.color} fontSize="30" fontWeight="bold">{n.mark}</text><text x="181" y={n.y+43} fill="#f1fbff" fontSize="13" fontWeight="bold">{n.title}</text><text x="181" y={n.y+58} fill={n.color} fontSize="12">{n.value}</text></g>)}
  {nodes.map(n=><g key={n.title}><circle cx="350" cy={n.y} r="18" fill="#193340" stroke={n.color}/><text x="350" y={n.y+6} textAnchor="middle" fill={n.color} fontSize="21">{n.mark}</text><text x="377" y={n.y-8} fill="#eaf5fa" fontSize="11" fontWeight="bold">{n.title}</text><text x="377" y={n.y+8} fill={n.color} fontSize="12" fontWeight="bold">{n.amount}</text><path d={`M377 ${n.y+15}H513`} stroke={n.color} opacity=".7"/><circle cx="513" cy={n.y+15} r="6" fill={n.color} filter="url(#gate-glow)"/></g>)}
 </svg>
}

export default function ExplorationEvaluator({context,onContext,onNavigate}:{context:DecisionContext;onContext:(c:DecisionContext)=>void;onNavigate:(page:string)=>void}){
 const [factorByTarget,setFactorByTarget]=useState<Record<string,Factors>>({})
 const [checksByTarget,setChecksByTarget]=useState<Record<string,boolean[]>>({})
 const [budget,setBudget]=useState(1.3)
 const [successValue,setSuccessValue]=useState(45.75)
 const [filterValues,setFilterValues]=useState(['Geochemical Anomaly','Geophysical Anomaly','Geophysical Anomaly','Low (Typical Anomaly)'])
 const target=targets.find(t=>t.id===context.targetId)??targets[0]
 const factors=factorByTarget[target.id]??defaults
 const verified=checksByTarget[target.id]??[true,true,true,true]
 const passed=verified.filter(Boolean).length
 const result=useMemo(()=>{
  // Fictional inputs, not independent or calibrated geological probabilities.
  const pos=Math.max(0,Math.min(1,factors.reduce((p,v)=>p*v/100,1)*scenarios[context.scenario]))
  return {pos,emv:pos*successValue-budget}
 },[factors,context.scenario,budget,successValue])
 const updateFactor=(i:number,v:number)=>setFactorByTarget(old=>({...old,[target.id]:factors.map((x,j)=>i===j?clamp(v):x) as Factors}))
 const toggleVerified=(i:number)=>setChecksByTarget(old=>({...old,[target.id]:verified.map((v,j)=>i===j?!v:v)}))
 const exportData=()=>{const blob=new Blob([JSON.stringify({demo:true,warning:'Uncalibrated synthetic demonstration, not geological or financial advice',target:target.name,scenario:context.scenario,factors,verified,posProxy:result.pos,emvMillions:result.emv},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='gate1-demo.json';a.click();URL.revokeObjectURL(url)}
 return <div className="ee-reference">
  <div className="ee-topbar">
   <label className="ee-project-select"><span>PROJECT SELECTOR</span><select value={context.targetId} onChange={e=>onContext({...context,targetId:e.target.value})}>{targets.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label>
   <div className="ee-pass">Pass Gate 1</div>
   <label className="ee-scenario">SCENARIO <select value={context.scenario} onChange={e=>onContext({...context,scenario:e.target.value as Scenario})}><option value="conservative">Conservative</option><option value="base">Base</option><option value="optimistic">Optimistic</option></select></label>
  </div>
  <div className="ee-kpi-grid">
   <section className="ee-panel ee-ingest"><div className="ee-panel-title">DATA INGESTION &amp; QA/QC HUB <button onClick={()=>onNavigate('qaqc')} title="Open QA/QC"><SlidersHorizontal size={16}/></button></div><div className="ee-vendors">{[['S','Seequent'],['M','Micromine'],['D','Datamine']].map(([letter,name])=><div key={name}><b>{letter}</b>{name}<ExternalLink size={13}/></div>)}</div><small>Reference integrations · not connected</small></section>
   <section className="ee-panel ee-stat"><div className="ee-panel-title">DATA CONFIDENCE INDEX (DCI)</div><div className="ee-big">88% <TrendingUp size={22}/></div><small>Illustrative QA/QC index</small></section>
   <section className="ee-panel ee-stat"><div className="ee-panel-title">ADJUSTED PROBABILITY OF SUCCESS (PoS)</div><div className="ee-big">{(result.pos*100).toFixed(2)}% <TrendingUp size={22}/></div><small>Uncalibrated assumption-product proxy</small></section>
   <section className="ee-panel ee-stat ee-emv"><div className="ee-panel-title">EXPECTED MONETARY VALUE (EMV)</div><div className="ee-big">{currency(result.emv)}</div><small>Based on illustrative parameters</small></section>
  </div>
  <div className="ee-main">
   <section className="ee-panel ee-geological"><div className="ee-panel-title">GEOLOGICAL FACTORS</div>
    {labels.map(([heading,title],i)=><div className="ee-factor" key={heading}><div className="ee-factor-heading">{heading}</div><div className="ee-factor-label"><span>{title}</span><b>{factors[i]}%</b></div><input type="range" min="0" max="100" aria-label={title} style={{'--fill':factors[i]+'%'} as React.CSSProperties} value={factors[i]} onChange={e=>updateFactor(i,Number(e.target.value))}/><button onClick={()=>toggleVerified(i)} className={'ee-check '+(verified[i]?'verified':'')}>{verified[i]?'Verified QA/QC':'Needs verification'}</button></div>)}
    <div className="ee-summary"><small>QA/QC SUMMARY</small><div>All Factors Verified ({passed}/4) <CheckCircle2 size={16}/></div><div className="ee-progress"><i style={{width:(passed*25)+'%'}}/></div></div>
   </section>
   <section className="ee-panel ee-probability"><div className="ee-tab">Module 1: Exploration Evaluator (Gate 1)</div><div className="ee-panel-title">PROBABILITY TREE DIAGRAM</div><div className="ee-tags"><span><ThumbsUp size={13}/> Exploration</span><span><ThumbsDown size={13}/> Failure</span></div><Tree success={result.pos} emv={result.emv} budget={budget}/><div className="ee-assumptions"><label>Budget ($M)<input type="number" value={budget} min="0" step=".1" onChange={e=>setBudget(Math.max(0,Number(e.target.value)||0))}/></label><label>Success value ($M)<input type="number" value={successValue} min="0" step=".25" onChange={e=>setSuccessValue(Math.max(0,Number(e.target.value)||0))}/></label></div></section>
   <section className="ee-panel ee-anomalies"><div className="ee-panel-title">MULTI-ANOMALY SCATTER PLOT COMPARISON MATRIX</div><div className="ee-legend"><span><i className="gold"/> High Potential</span><span><i className="cyan"/> Medium Potential</span><span><i className="teal"/> Low Potential</span><span>◇ Risk Areas</span></div><div className="ee-scatter-grid">{['Geochemical Anomaly (ppm)','Geophysical Anomaly (mGal)','Structural Anomaly (Confidence)','Geochemical Anomaly (ppm)','Structural Anomaly (Confidence)','Mineralization Potential (Grade)'].map((title,i)=><div className="ee-scatter" key={i}><Scatter index={i} title={title}/><small>{title}</small></div>)}</div><div className="ee-filters">{['Filters Type','Geophysical Anomaly','Compare Threshold','Threshold'].map((title,i)=><label key={i}>{title}<select value={filterValues[i]} onChange={e=>setFilterValues(v=>v.map((x,j)=>i===j?e.target.value:x))}>{['Geochemical Anomaly','Geophysical Anomaly','Structural Anomaly','Mineralization Potential','Low (Typical Anomaly)','High (Potential Anomaly)'].map(v=><option key={v}>{v}</option>)}</select></label>)}</div></section>
  </div>
  <footer className="ee-footer"><span>DEMO DATA · NOT LIVE &nbsp; | &nbsp; SYSTEM STATUS: <b>ONLINE (PRESENTATION)</b></span><span><button onClick={exportData}><Database size={12}/> Export Gate 1</button> · Synthetic, uncalibrated values; not suitable for real decisions</span></footer>
 </div>
}
