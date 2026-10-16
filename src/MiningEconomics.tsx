import React, {useMemo, useState} from 'react'
import {Activity, ArrowRight, ChartNoAxesCombined, Coins, Database, Factory, Pickaxe} from 'lucide-react'
import {Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts'
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
export default function MiningEconomics({context,onContext,onNavigate}:{context:DecisionContext;onContext:(c:DecisionContext)=>void;onNavigate:(page:string)=>void}){
 const [overrides,setOverrides]=useState<Record<string,Assumptions>>({})
 const target=targets.find(t=>t.id===context.targetId)??targets[0]
 const a=overrides[target.id]??initial
 const update=(key:keyof Assumptions,value:number)=>setOverrides(s=>({...s,[target.id]:{...a,[key]:value}}))
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
  const points=Array.from({length:81},(_,i)=>{const grade=i*.025;return {grade:+grade.toFixed(3),tonnage:+tonnesAt(grade,volume,mult).toFixed(2)}})
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
 return <div className="me-root">
  <div className="me-title"><div><span>MODULE 03 · GATE 3 · PRE-FEASIBILITY SCREENING</span><h1>Mining Economics Engine</h1><p>Explore how price, recovery and operating costs shift the economic cut-off grade.</p></div><strong>ILLUSTRATIVE MODEL</strong></div>
  <div className="sg-context"><label>Target<select value={context.targetId} onChange={e=>onContext({...context,targetId:e.target.value})}>{targets.map(t=><option key={t.id} value={t.id}>{t.id} · {t.name}</option>)}</select></label><label>Scenario<select value={context.scenario} onChange={e=>onContext({...context,scenario:e.target.value as Scenario})}><option value="conservative">Conservative</option><option value="base">Base</option><option value="optimistic">Optimistic</option></select></label><span>Example assumes copper economics even for non-copper targets</span></div>
  <div className="me-kpis"><div><small>Mid OPEX cut-off</small><strong>{analysis.scenarios[1].cutoff.toFixed(2)}% Cu</strong><span>Simplified break-even grade</span></div><div><small>Stripping ratio</small><strong>{a.strip.toFixed(1)} : 1</strong><span>Input assumption (not pit-optimized)</span></div><div><small>All-in operating proxy</small><strong>{usd(analysis.totalCost)}/t</strong><span>Processing + ore mining + waste cost</span></div><div><small>Break-even copper price</small><strong>{usd(analysis.breakEvenPrice)}/t</strong><span>At illustrative 0.84% Cu head grade</span></div></div>
  <div className="me-layout">
   <section className="me-panel"><h2><Coins size={20}/> Economic Inputs</h2><p>Change assumptions to recalculate the curve and scenarios.</p><div className="me-sliders">{sliders.map(([key,label,min,max,step,unit])=><label key={key}><span><b>{label}</b><strong>{a[key].toLocaleString('en-US')}{unit==='%'?'%':' '+unit}</strong></span><input type="range" min={min} max={max} step={step} value={a[key]} onChange={e=>update(key,Number(e.target.value))}/></label>)}</div><div className="me-detail">Selected: <b>{target.name}</b><small>All inputs are temporary browser-state assumptions, not imported costs.</small></div></section>
   <section className="me-panel me-main-chart"><h2><ChartNoAxesCombined size={20}/> Grade–Tonnage Economic Curve</h2><p>Decreasing synthetic tonnage with increasing copper grade; dashed markers show cost-driven cut-offs.</p><div className="me-chart-wrap"><ResponsiveContainer width="100%" height={360}><AreaChart data={analysis.points} margin={{top:24,right:32,left:8,bottom:22}}><defs><linearGradient id="me-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d59b71" stopOpacity={.78}/><stop offset="100%" stopColor="#d59b71" stopOpacity={.08}/></linearGradient></defs><CartesianGrid stroke="#36546b" strokeDasharray="3 5"/><XAxis type="number" dataKey="grade" domain={[0,2]} tick={{fill:'#b6cddd',fontSize:12}} stroke="#6a9dbb" label={{value:'Grade (% Cu)',position:'insideBottom',offset:-10,fill:'#e3eff8'}}/><YAxis tick={{fill:'#b6cddd',fontSize:12}} stroke="#6a9dbb" label={{value:'Tonnage (Mt)',angle:-90,position:'insideLeft',fill:'#e3eff8'}}/><Tooltip contentStyle={{background:'#142b3c',border:'1px solid #577d98',color:'#ecf6fe'}} formatter={(v:any)=>[Number(v).toFixed(2)+' Mt','Material above grade']}/><Area type="monotone" dataKey="tonnage" stroke="#e9b28c" strokeWidth={3} fill="url(#me-area)" isAnimationActive={false}/>{analysis.scenarios.map(c=><ReferenceLine key={c.name} x={clamp(c.cutoff,0,2)} stroke={c.color} strokeDasharray="6 5" strokeWidth={2} label={{value:c.name,position:'insideTop',fill:c.color,fontSize:11}}/>)}</AreaChart></ResponsiveContainer></div><div className="me-scenario-cards">{analysis.scenarios.map(c=><div key={c.name}><span style={{color:c.color}}>{c.name}</span><strong>{c.cutoff.toFixed(3)}% Cu</strong><small>{c.tonnage.toFixed(1)} Mt conceptual tonnage above cut-off</small></div>)}</div></section>
   <section className="me-panel"><h2><Activity size={20}/> Computational Outputs</h2><div className="me-results"><div><span>Revenue per ore tonne</span><b>{usd(analysis.revenuePerOreTonne)}</b></div><div><span>Cost per ore tonne</span><b>{usd(analysis.totalCost)}</b></div><div><span>Contribution per tonne</span><b>{usd(analysis.contribution)}</b></div><div><span>Annual contribution proxy</span><b>{analysis.annualCashProxy.toFixed(1)} $M/year</b></div><div><span>CAPEX assumption</span><b>{usd(a.capex)}M</b></div></div><p>Calculation: cut-off (%) = 100 × operating cost ($/t ore) ÷ (recovery fraction × copper price $/t Cu). This ignores royalties, taxes, dilution, payability and several other modifying factors.</p></section>
   <section className="me-panel"><h2><Factory size={20}/> Planning & Design Enablers</h2><p>Supporting views and commercial tools (not connected).</p><button className="me-link" onClick={()=>onNavigate('subsurface')}><Pickaxe size={17}/> 3D Subsurface <ArrowRight size={15}/></button><button className="me-link" onClick={()=>onNavigate('operations')}><Activity size={17}/> Daily Operations <ArrowRight size={15}/></button><button className="me-link" onClick={()=>onNavigate('executive')}><Database size={17}/> Executive Portfolio <ArrowRight size={15}/></button><div className="me-vendors"><b>Potential integrations · not connected</b><span>Micromine Alastri / Spry</span><span>Datamine planning tools</span><span>Micromine Beyond</span></div><button className="me-export" onClick={exportData}>Export illustrative economics JSON</button></section>
  </div><div className="me-warning">DEMONSTRATION ONLY — Synthetic grade–tonnage envelope; not a block-model-derived grade–tonnage curve, pit optimization, feasibility study, project valuation or investment recommendation. Costs and stripping ratio are entered assumptions, not calculated from a mine design.</div>
 </div>
}
