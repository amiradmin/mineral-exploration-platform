import React, {useMemo, useState} from 'react'
import {Activity, ArrowRight, Play, Fingerprint, FlaskConical, CheckCircle2} from 'lucide-react'
import {Line, LineChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts'
import {targets} from './mockData'
import type {DecisionContext,Scenario} from './decisionPipeline'
import './MiningEconomics.css'

type Assumptions={cost:number;recovery:number;price:number;mining:number;strip:number;capex:number;annualOre:number}
const initial:Assumptions={cost:41,recovery:87,price:9200,mining:2.5,strip:2.8,capex:450,annualOre:4}
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v))
const scenarioMultiplier:Record<Scenario,number>={conservative:.85,base:1,optimistic:1.15}
const usd=(x:number)=>'$'+x.toLocaleString('en-US',{maximumFractionDigits:1})
// Copper example: 1 tonne of ore at 1% Cu contains 10 kg Cu.
// USD/t ore = grade(%) * 0.01 * recovery * price(USD/t metal).
export function gradeCutoff(cost:number,recoveryPercent:number,price:number){
 return 100*cost/((recoveryPercent/100)*price)
}
const tonnesAt=(cutoff:number,volume:number,scale:number)=>{
 // Synthetic monotonically decreasing grade–tonnage envelope; NOT based on block assays.
 const ratio=clamp(cutoff/.84,.01,10)
 return volume/(1+Math.pow(ratio/scale,2.7))
}

function ReferenceCurve({points,focus,onSelect}:{points:{grade:number;tonnage:number;netValue:number;cashFlow:number}[];focus:number;onSelect:(grade:number)=>void}){
 const width=610,height=328,left=47,right=17,top=15,bottom=38
 const pw=width-left-right,ph=height-top-bottom
 const px=(x:number)=>left+(x-.1)/1.9*pw
 const py=(y:number)=>top+(500-y)/500*ph
 const nearest=points.reduce((p,c)=>Math.abs(c.grade-focus)<Math.abs(p.grade-focus)?c:p,points[0])
 const path=(key:'tonnage'|'netValue'|'cashFlow')=>points.filter(p=>p.grade>=.1).map((p,i)=>(i?'L':'M')+px(p.grade).toFixed(1)+' '+py(Math.max(0,Math.min(500,p[key]))).toFixed(1)).join(' ')
 const selectedX=px(Math.max(.1,Math.min(2,focus)))
 const labelX=Math.min(selectedX+20,width-160)
 return <svg className="me-reference-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Interactive grade tonnage economic sensitivity chart; click a grade to inspect it" onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();const v=(e.clientX-rect.left)/rect.width*width;onSelect(Math.round(Math.max(.1,Math.min(2,.1+(v-left)/pw*1.9))*1000)/1000)}}>
  <defs><linearGradient id="me-cutoff-band" x1="0" x2="1"><stop stopColor="#62ebc5" stopOpacity=".08"/><stop offset=".5" stopColor="#b0fff5" stopOpacity=".48"/><stop offset="1" stopColor="#62ebc5" stopOpacity=".08"/></linearGradient><filter id="me-chart-glow"><feGaussianBlur stdDeviation="2"/></filter></defs>
  <rect x={left} y={top} width={pw} height={ph} fill="#0b1e2c"/>
  {Array.from({length:20},(_,i)=><line key={'v'+i} x1={left+i*pw/19} y1={top} x2={left+i*pw/19} y2={top+ph} stroke="#34556a" strokeWidth=".65"/>)}
  {Array.from({length:6},(_,i)=><g key={'h'+i}><line x1={left} y1={top+i*ph/5} x2={left+pw} y2={top+i*ph/5} stroke="#34556a" strokeWidth=".8"/><text x={left-12} y={top+i*ph/5+4} fontSize="10" textAnchor="end" fill="#b7cbd8">{500-i*100}</text></g>)}
  {Array.from({length:20},(_,i)=><text key={'t'+i} x={left+i*pw/19} y={top+ph+19} textAnchor="middle" fill="#a9c2cf" fontSize="9">{(.1+i*.1).toFixed(1)}%</text>)}
  <text x="13" y="164" transform="rotate(-90 13 164)" textAnchor="middle" fill="#bfd2dc" fontSize="11">NET VALUE ($ Millions)</text>
  <text x={left+pw/2} y={height-5} textAnchor="middle" fill="#c0d6e2" fontWeight="bold" fontSize="11">CUT-OFF GRADE (% Cu)</text>
  <rect x={selectedX-8} y={top} width="16" height={ph} fill="url(#me-cutoff-band)" stroke="#78d4b8" strokeOpacity=".65"/>
  <path d={path('tonnage')} fill="none" stroke="#49b9f7" strokeWidth="2.5" filter="url(#me-chart-glow)" opacity=".65"/><path d={path('tonnage')} fill="none" stroke="#49b9f7" strokeWidth="2.3"/>
  <path d={path('netValue')} fill="none" stroke="#5aeda0" strokeWidth="2.5" filter="url(#me-chart-glow)" opacity=".65"/><path d={path('netValue')} fill="none" stroke="#5aeda0" strokeWidth="2.3"/>
  <path d={path('cashFlow')} fill="none" stroke="#c67aef" strokeWidth="2.4"/>
  {(['tonnage','netValue','cashFlow'] as const).map((key,i)=><circle key={key} cx={selectedX} cy={py(Math.max(0,Math.min(500,nearest[key])))} r="5" fill={['#49b9f7','#5aeda0','#c67aef'][i]} stroke="#d9ffef" strokeWidth="1.7"/>)}
  <g transform={`translate(${labelX} ${top+12})`}><rect width="137" height="78" rx="6" fill="#1c3040" stroke="#547486"/><text x="8" y="15" fill="#c8dce6" fontSize="10">Cu Cut-Off: <tspan fill="#5bee9f" fontWeight="bold">{focus.toFixed(3)}%</tspan></text><text x="8" y="33" fill="#c8dce6" fontSize="10">Net Value: <tspan fill="#5bee9f" fontWeight="bold">${nearest.netValue.toFixed(1)}M</tspan></text><text x="8" y="51" fill="#c8dce6" fontSize="10">Tonnage: <tspan fill="#83cfff">{nearest.tonnage.toFixed(1)}Mt</tspan></text><text x="8" y="69" fill="#c8dce6" fontSize="10">Cash Flow: <tspan fill="#d68bf9">${nearest.cashFlow.toFixed(1)}M</tspan></text></g>
 </svg>
}
export default function MiningEconomics({context,onContext,onNavigate}:{context:DecisionContext;onContext:(c:DecisionContext)=>void;onNavigate:(page:string)=>void}){
 const [overrides,setOverrides]=useState<Record<string,Assumptions>>({})
 const [selectedGrade,setSelectedGrade]=useState<number|null>(null)
 const [engineer,setEngineer]=useState(false)
 const [metallurgist,setMetallurgist]=useState(false)
 const [simulated,setSimulated]=useState(false)
 const [notice,setNotice]=useState('')
 const [riskAdjustment,setRiskAdjustment]=useState(false)
 const [scenarioMode,setScenarioMode]=useState<'scenario'|'drift'|'recovery'>('scenario')
 const target=targets.find(t=>t.id===context.targetId)??targets[0]
 const a=overrides[target.id]??initial
 const update=(key:keyof Assumptions,value:number)=>{setOverrides(s=>({...s,[target.id]:{...a,[key]:value}}));setSimulated(false);setEngineer(false);setMetallurgist(false)}
 const analysis=useMemo(()=>{
  const mult=scenarioMultiplier[context.scenario]
  const totalCost=a.cost+a.mining*(1+a.strip)
  const price=a.price*mult
  const opex=[{name:'Low OPEX',factor:.75,color:'#e5b086'},{name:'Mid OPEX',factor:1,color:'#8bdaf9'},{name:'High OPEX',factor:1.25,color:'#d58d69'}]
  const volume=48.7*(target.aiScore/92)
  const scenarios=opex.map(s=>{
   const cutoff=gradeCutoff(totalCost*s.factor,a.recovery,price)
   const tonnage=tonnesAt(cutoff,volume,mult)
   return {...s,cutoff,tonnage}
  })
  const revenuePerOreTonne=.01*.84*(a.recovery/100)*price
  const contribution=revenuePerOreTonne-totalCost
  // Single-year gross scenario proxy, not discounted cash flow or project NPV.
  const annualCashProxy=contribution*a.annualOre
  const breakEvenPrice=totalCost/(.01*.84*(a.recovery/100))
  const points=Array.from({length:81},(_,i)=>{const grade=i*.025;const tonnage=tonnesAt(grade,volume,mult);const margin=grade*.01*(a.recovery/100)*price-totalCost;const plateau=1-Math.exp(-grade*2.3);return {grade:+grade.toFixed(3),tonnage:+(tonnage*9*plateau).toFixed(2),netValue:+(Math.max(0,400*Math.exp(-Math.pow((grade-(.64+(price-9200)/30000))/.69,2))*(a.recovery/87)*(41/a.cost))).toFixed(2),cashFlow:+(Math.max(0,72*Math.exp(-Math.pow((grade-.72)/1.03,2))*(a.recovery/87))).toFixed(2)}})
  return {scenarios,points,totalCost,price,revenuePerOreTonne,contribution,annualCashProxy,breakEvenPrice,volume}
 },[a,target,context.scenario])
 const exportData=()=>{
  const obj={disclaimer:'Demonstration only. Synthetic grade-tonnage curve, copper-only simplified cutoff, not a mine schedule or pre-feasibility study.',target:target.id,scenario:context.scenario,assumptions:a,results:analysis}
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'})
  const url=URL.createObjectURL(blob);const el=document.createElement('a');el.href=url;el.download='economics-demo-'+target.id+'.json';el.click();URL.revokeObjectURL(url)
 }
 const sliders:[keyof Assumptions,string,number,number,number,string][]=[
  ['cost','Processing OPEX',10,120,1,'$/t ore'],['mining','Ore mining cost',0,20,.5,'$/t ore'],
  ['strip','Waste-to-ore stripping ratio',0,12,.1,':1'],['recovery','Plant recovery',45,98,1,'%'],
  ['price','Copper price',4000,16000,100,'$/t Cu'],['annualOre','Annual ore throughput',.5,15,.5,'Mt/y'],
  ['capex','Illustrative CAPEX',50,2000,10,'$M']
 ]

 const cutoff=analysis.scenarios[1].cutoff
 const focus=clamp(selectedGrade??cutoff,0,2)
 const current=analysis.points.reduce((p,c)=>Math.abs(c.grade-focus)<Math.abs(p.grade-focus)?c:p,analysis.points[0])
 const economicControls: [keyof Assumptions,string,number,number,number,string][] = [
  ['cost','PROCESSING OPEX ($/t)',10,120,1,'$'],
  ['mining','ORE MINING COST ($/t)',0,20,.5,'$'],
  ['strip','STRIPPING RATIO',0,12,.1,':1'],
  ['recovery','DYNAMIC RECOVERY (%)',45,98,1,'%'],
  ['price','COPPER PRICE ($/t)',4000,16000,100,'$']
 ]
 const eligible=engineer&&metallurgist&&simulated
 return <div className="me-gate">
  <div className="me-ribbon">Module 3: Mining Economics Engine (Gate 3: Pre-Feasibility Screening)</div>
  <div className="me-topline"><label>Target: <select value={context.targetId} onChange={e=>{onContext({...context,targetId:e.target.value});setEngineer(false);setMetallurgist(false);setSimulated(false)}}>{targets.map(t=><option value={t.id} key={t.id}>{t.id} {t.name}</option>)}</select></label><div className="me-status"><CheckCircle2 size={18}/> GATE 3: {eligible?'DEMO READY':'REVIEW REQUIRED'}</div></div>
  <div className="me-connections"><span><Activity size={16}/> MICROMINE ALASTRI: <b>DEMO</b></span><span>♧ DATAMINE STRATEGIC PLANNERS: <b>DEMO</b></span><span>⚙ GEOMETALLURGY QA/QC: <b>89% DEMO DCI</b><small>(Flotation/Leaching Tests: simulated)</small><i/></span></div>
  <div className="me-workspace">
   <section className="me-section me-parameters"><h2>ECONOMIC INPUT PARAMETERS &amp; SLIDERS</h2>{economicControls.map(([key,label,min,max,step,unit])=><label className="me-control" key={key}><div><b>{label}</b><strong>{unit===' min={min} max={max} step={step} value={a[key]} onChange={e=>update(key,Number(e.target.value))}/>{key==='recovery'?<span className="me-slider-detail">◉ &nbsp;⌁</span>:key==='strip'?<span className="me-slider-detail">Range &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Dilution</span>:null}</label>)}</section>
   <section className="me-section me-charts"><h2>GRADE-TONNAGE ECONOMIC SENSITIVITY CURVE</h2><div className="me-legends"><span style={{color:'#53c6ff'}}>━ TONNAGE (Mt)</span><span style={{color:'#61ee9c'}}>━ NET VALUE ($M)</span><span style={{color:'#ca83ef'}}>━ CASH FLOW ($M)</span></div><div className="me-chart-frame"><ReferenceCurve points={analysis.points} focus={focus} onSelect={setSelectedGrade}/></div><div className="me-values">Cu Cut-Off: <b>{focus.toFixed(3)}%</b> · Tonnage: <b>{current.tonnage.toFixed(1)} Mt</b> · Net Value: <b>{usd(current.netValue)}M</b></div><div className="me-tools"><div className="me-scenario-selector"><strong>SCENARIO ANALYSIS</strong>{([['scenario','Scenario analysis'],['drift','Dynamic recovery'],['recovery','Risk-adjusted proxy']] as const).map(([value,label])=><label key={value}><input type="radio" name="me-simulation-mode" checked={scenarioMode===value} onChange={()=>setScenarioMode(value)}/>{label}</label>)}<select value={context.scenario} onChange={e=>{onContext({...context,scenario:e.target.value as Scenario});setSimulated(false)}}><option value="conservative">Conservative</option><option value="base">Base</option><option value="optimistic">Optimistic</option></select></div><div className="me-risk-selector"><strong>RISK ADJUSTMENTS</strong><label><input type="checkbox" checked={riskAdjustment} onChange={e=>setRiskAdjustment(e.target.checked)}/> Enable visual risk overlay</label><small>Demo setting · no impact on estimates</small></div><button onClick={()=>{setSimulated(true);setNotice('Synthetic sensitivity recalculated for presentation.')}}><Play size={14}/> RUN SIMULATION</button></div></section>
   <section className="me-section me-summary"><h2>EXECUTIVE KPI SUMMARY</h2><div className="me-exec green"><b>CUT-OFF GRADE</b><strong>{cutoff.toFixed(3)}%</strong><svg viewBox="0 0 130 35" aria-hidden="true"><path d="M1 31 20 23 35 27 51 13 69 19 85 5 104 11 128 2"/></svg><span>Cu (Copper)</span><button onClick={()=>setNotice('Simplified break-even cut-off derived from operating cost, recovery and copper price.')}>View Details</button></div><div className="me-exec amber"><b>ALL-IN OPERATING PROXY ($/t)</b><strong>{usd(analysis.totalCost)}</strong><svg viewBox="0 0 130 35" aria-hidden="true"><path d="M1 3 20 13 35 11 51 23 69 19 85 28 104 26 128 33"/></svg><span>Vs. illustrative operating budget</span><button onClick={()=>setNotice('Processing + ore mining × (1 + stripping ratio).')}>View Details</button></div><div className="me-exec blue"><b>ANNUAL CONTRIBUTION ($/yr)</b><strong>{usd(analysis.annualCashProxy)}M</strong><svg viewBox="0 0 130 35" aria-hidden="true"><path d="M1 33 20 21 35 26 51 10 69 16 85 5 104 11 128 1"/></svg><span>PROJECTED CONTRIBUTION PROXY</span><button onClick={()=>setNotice('Before taxes, royalties, CAPEX and financing; not net revenue.')}>View Details</button></div></section>
  </div>
  <div className="me-approval"><label><Fingerprint size={27}/> CHIEF MINING ENGINEER SIGN-OFF <input type="checkbox" checked={engineer} onChange={e=>setEngineer(e.target.checked)}/> <span>{engineer?'Demo acknowledged':'Awaiting review'}</span></label><button disabled={!eligible} onClick={()=>setNotice('Gate 4 transfer is a preview only; no actual approval or state transfer occurred.')}>APPROVE &amp; TRANSFER TO GATE 4 <ArrowRight size={20}/></button><label><FlaskConical size={27}/> METALLURGIST SIGN-OFF <input type="checkbox" checked={metallurgist} onChange={e=>setMetallurgist(e.target.checked)}/> <span>{metallurgist?'Demo acknowledged':'Awaiting review'}</span></label></div>
  {notice&&<div className="me-notice" role="status">{notice}<button onClick={exportData}>Export JSON</button></div>}
  <p className="me-caution">DEMO ONLY · Synthetic grade-tonnage and economics, not a feasibility study. External tools are not connected and sign-offs are not real approvals. Chart click selects a cut-off grade; all input sliders update the curves and KPIs.</p>
 </div>
}
?usd(a[key]):a[key].toLocaleString('en-US')+unit}{key==='cost'||key==='mining'||key==='price'?<span className="me-trend-arrow">↗</span>:null}</strong></div>{key==='strip'?<div className="me-stripping-detail"><span>▥ Range</span><span>▥ Dil</span><span>◩ rock</span></div>:null}{key==='price'?<div className="me-small-wave">⌁⌁⌁⌁</div>:null}<input type="range" min={min} max={max} step={step} value={a[key]} onChange={e=>update(key,Number(e.target.value))}/></label>)}</section>
   <section className="me-section me-charts"><h2>GRADE-TONNAGE ECONOMIC SENSITIVITY CURVE</h2><div className="me-legends"><span style={{color:'#53c6ff'}}>━ TONNAGE (Mt)</span><span style={{color:'#61ee9c'}}>━ NET VALUE ($M)</span><span style={{color:'#ca83ef'}}>━ CASH FLOW ($M)</span></div><div className="me-chart-frame"><ReferenceCurve points={analysis.points} focus={focus} onSelect={setSelectedGrade}/></div><div className="me-values">Cu Cut-Off: <b>{focus.toFixed(3)}%</b> · Tonnage: <b>{current.tonnage.toFixed(1)} Mt</b> · Net Value: <b>{usd(current.netValue)}M</b></div><div className="me-tools"><div className="me-scenario-selector"><strong>SCENARIO ANALYSIS</strong>{([['scenario','Scenario analysis'],['drift','Dynamic recovery'],['recovery','Risk-adjusted proxy']] as const).map(([value,label])=><label key={value}><input type="radio" name="me-simulation-mode" checked={scenarioMode===value} onChange={()=>setScenarioMode(value)}/>{label}</label>)}<select value={context.scenario} onChange={e=>{onContext({...context,scenario:e.target.value as Scenario});setSimulated(false)}}><option value="conservative">Conservative</option><option value="base">Base</option><option value="optimistic">Optimistic</option></select></div><div className="me-risk-selector"><strong>RISK ADJUSTMENTS</strong><label><input type="checkbox" checked={riskAdjustment} onChange={e=>setRiskAdjustment(e.target.checked)}/> Enable visual risk overlay</label><small>Demo setting · no impact on estimates</small></div><button onClick={()=>{setSimulated(true);setNotice('Synthetic sensitivity recalculated for presentation.')}}><Play size={14}/> RUN SIMULATION</button></div></section>
   <section className="me-section me-summary"><h2>EXECUTIVE KPI SUMMARY</h2><div className="me-exec green"><b>CUT-OFF GRADE</b><strong>{cutoff.toFixed(3)}%</strong><svg viewBox="0 0 130 35" aria-hidden="true"><path d="M1 31 20 23 35 27 51 13 69 19 85 5 104 11 128 2"/></svg><span>Cu (Copper)</span><button onClick={()=>setNotice('Simplified break-even cut-off derived from operating cost, recovery and copper price.')}>View Details</button></div><div className="me-exec amber"><b>ALL-IN OPERATING PROXY ($/t)</b><strong>{usd(analysis.totalCost)}</strong><svg viewBox="0 0 130 35" aria-hidden="true"><path d="M1 3 20 13 35 11 51 23 69 19 85 28 104 26 128 33"/></svg><span>Vs. illustrative operating budget</span><button onClick={()=>setNotice('Processing + ore mining × (1 + stripping ratio).')}>View Details</button></div><div className="me-exec blue"><b>ANNUAL CONTRIBUTION ($/yr)</b><strong>{usd(analysis.annualCashProxy)}M</strong><svg viewBox="0 0 130 35" aria-hidden="true"><path d="M1 33 20 21 35 26 51 10 69 16 85 5 104 11 128 1"/></svg><span>PROJECTED CONTRIBUTION PROXY</span><button onClick={()=>setNotice('Before taxes, royalties, CAPEX and financing; not net revenue.')}>View Details</button></div></section>
  </div>
  <div className="me-approval"><label><Fingerprint size={27}/> CHIEF MINING ENGINEER SIGN-OFF <input type="checkbox" checked={engineer} onChange={e=>setEngineer(e.target.checked)}/> <span>{engineer?'Demo acknowledged':'Awaiting review'}</span></label><button disabled={!eligible} onClick={()=>setNotice('Gate 4 transfer is a preview only; no actual approval or state transfer occurred.')}>APPROVE &amp; TRANSFER TO GATE 4 <ArrowRight size={20}/></button><label><FlaskConical size={27}/> METALLURGIST SIGN-OFF <input type="checkbox" checked={metallurgist} onChange={e=>setMetallurgist(e.target.checked)}/> <span>{metallurgist?'Demo acknowledged':'Awaiting review'}</span></label></div>
  {notice&&<div className="me-notice" role="status">{notice}<button onClick={exportData}>Export JSON</button></div>}
  <p className="me-caution">DEMO ONLY · Synthetic grade-tonnage and economics, not a feasibility study. External tools are not connected and sign-offs are not real approvals. Chart click selects a cut-off grade; all input sliders update the curves and KPIs.</p>
 </div>
}
