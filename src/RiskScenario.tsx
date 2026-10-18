import React, {useMemo, useState} from 'react'
import {Activity, ArrowRight, CheckCircle2, Play, Radio, RefreshCw, ShieldCheck} from 'lucide-react'

import {targets} from './mockData'
import type {DecisionContext,Scenario} from './decisionPipeline'
import './RiskScenario.css'

type Inputs={price:number;inflation:number;fx:number;capex:number;opex:number;recovery:number}
const base:Inputs={price:9200,inflation:4,fx:1,capex:450,opex:52,recovery:87}
const shock:Record<keyof Inputs,number>={price:.2,inflation:4,fx:.15,capex:.25,opex:.2,recovery:8}
const scenarios:Record<Scenario,number>={conservative:.85,base:1,optimistic:1.15}
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x))
const usd=(n:number)=> (n<0?'−':'')+'$'+Math.abs(n).toFixed(1)+'M'
export default function RiskScenario({context,onContext,onNavigate}:{context:DecisionContext;onContext:(c:DecisionContext)=>void;onNavigate:(p:string)=>void}){
 const [values,setValues]=useState<Record<string,Inputs>>({})
 const [fixedInflation,setFixedInflation]=useState(false)
 const [fixedOpex,setFixedOpex]=useState(false)
 const [riskSign,setRiskSign]=useState(false)
 const [economistSign,setEconomistSign]=useState(false)
 const [runCount,setRunCount]=useState(0)
 const [notice,setNotice]=useState('')
 const target=targets.find(t=>t.id===context.targetId)??targets[0]
 const input=values[target.id]??base
 const update=(key:keyof Inputs,v:number)=>{setValues(p=>({...p,[target.id]:{...input,[key]:v}}));setRunCount(0);setRiskSign(false);setEconomistSign(false)}
 const calc=(i:Inputs,priceFactor=1,capexFactor=1)=>{
  const oreMt=4*(target.aiScore/92)
  const grade=.84
  const metalTonnes=oreMt*1e6*grade/100*i.recovery/100
  const revenue=metalTonnes*i.price*scenarios[context.scenario]*priceFactor/1e6
  const cost=oreMt*i.opex*(1+i.inflation/100)*i.fx
  const capex=i.capex*capexFactor
  // Single-period illustrative contribution AFTER assumed capital; not project NPV/profit.
  return revenue-cost-capex
 }
 const output=useMemo(()=>{
  const baseline=calc(input)
  const sensitivity=[
   {label:'Commodity price',key:'price' as const,low:calc({...input,price:input.price*(1-shock.price)}),high:calc({...input,price:input.price*(1+shock.price)})},
   {label:'Inflation',key:'inflation' as const,low:calc({...input,inflation:Math.max(0,input.inflation-shock.inflation)}),high:calc({...input,inflation:input.inflation+shock.inflation})},
   {label:'FX multiplier',key:'fx' as const,low:calc({...input,fx:input.fx*(1-shock.fx)}),high:calc({...input,fx:input.fx*(1+shock.fx)})},
   {label:'CAPEX',key:'capex' as const,low:calc({...input,capex:input.capex*(1-shock.capex)}),high:calc({...input,capex:input.capex*(1+shock.capex)})},
   {label:'OPEX',key:'opex' as const,low:calc({...input,opex:input.opex*(1-shock.opex)}),high:calc({...input,opex:input.opex*(1+shock.opex)})},
   {label:'Recovery',key:'recovery' as const,low:calc({...input,recovery:clamp(input.recovery-shock.recovery,1,100)}),high:calc({...input,recovery:clamp(input.recovery+shock.recovery,1,100)})}
  ].map(r=>({...r,down:Math.min(r.low,r.high)-baseline,up:Math.max(r.low,r.high)-baseline,span:Math.abs(r.high-r.low)})).sort((a,b)=>b.span-a.span)
  const matrix=[{name:'High price / Low CAPEX',price:1.15,capital:.8},{name:'High price / High CAPEX',price:1.15,capital:1.2},{name:'Low price / Low CAPEX',price:.85,capital:.8},{name:'Low price / High CAPEX',price:.85,capital:1.2}].map(x=>({...x,value:calc(input,x.price,x.capital)}))
  return {baseline,sensitivity,matrix}
 },[input,context.scenario,target.id])

 const sensitivity=output.sensitivity.filter(x=>['Commodity price','Inflation','CAPEX','OPEX'].includes(x.label))
 const maxImpact=Math.max(50,...sensitivity.flatMap(x=>[Math.abs(x.down),Math.abs(x.up)]))
 const severe=output.matrix.filter(x=>x.value<0).length/4*100
 const downside=clamp(severe+Math.max(0,-output.baseline)/Math.max(1,input.capex)*30,0,100)
 const acceptable=downside<25&&output.baseline>0
 const signed=riskSign&&economistSign&&runCount>0
 const exportJson=()=>{const blob=new Blob([JSON.stringify({demo:true,target:target.id,scenario:context.scenario,inputs:input,outputs:output,downsideProxy:downside},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const el=document.createElement('a');el.href=url;el.download='gate4-risk-demo.json';el.click();URL.revokeObjectURL(url)}
 const controlData=[{key:'price' as const,title:'Commodity Price',value:'$'+input.price.toLocaleString('en-US')+'/t',min:7360,max:11040,step:20,note:'±20%'},{key:'inflation' as const,title:'Inflation Rate',value:input.inflation.toFixed(1)+'%',min:0,max:20,step:.5,note:''},{key:'capex' as const,title:'CAPEX',value:'$'+input.capex.toFixed(0)+'M',min:50,max:900,step:10,note:'±25%'},{key:'opex' as const,title:'OPEX',value:'$'+input.opex.toFixed(0)+'/t',min:10,max:120,step:1,note:''}]
 return <div className="rk-reference">
  <header className="rk-head"><h1>Module 4: Risk &amp; Scenario Analyzer (Gates 3 &amp; 4: Risk Assessment)</h1><div className={'rk-gate-status '+(acceptable?'acceptable':'review')}>GATE 3&amp;4 RISK STATUS: <b>{acceptable?'ACCEPTABLE':'REVIEW REQUIRED'}</b></div></header>
  <div className="rk-topstrip"><div className="rk-live"><div className="rk-live-title"><Radio size={21}/> LIVE API<br/>INTEGRATIONS</div><div><RefreshCw size={25} color="#d8b762"/> Seequent GeoStudio <small>Demo · Not connected</small></div><div><Activity size={25} color="#8adc83"/> Micromine Pitram <small>Demo · Not connected</small></div></div><div className="rk-monte"><span>◈</span><div><strong>MONTE CARLO SIMULATION</strong><small>Illustrative risk proxy · No Monte Carlo runs</small></div><CheckCircle2 size={16}/></div></div>
  <div className="rk-two"><section className="rk-refpanel rk-stress"><h2>Stress-Testing Input Controls</h2><label className="rk-target">Target <select value={context.targetId} onChange={e=>onContext({...context,targetId:e.target.value})}>{targets.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>{controlData.map(c=><div className="rk-control" key={c.key}><div className="rk-control-label"><span>{c.title}: <b>{c.value}</b> <em>{c.note}</em></span>{c.key==='inflation'||c.key==='opex'?<label className="rk-fixed">Fixed <input type="checkbox" checked={c.key==='inflation'?fixedInflation:fixedOpex} onChange={e=>c.key==='inflation'?setFixedInflation(e.target.checked):setFixedOpex(e.target.checked)}/></label>:<small>{c.key==='price'?'Range: $7,360–11,040':'Range: $50M–900M'}</small>}</div><input type="range" min={c.min} max={c.max} step={c.step} value={input[c.key]} disabled={c.key==='inflation'?fixedInflation:c.key==='opex'?fixedOpex:false} onChange={e=>update(c.key,Number(e.target.value))}/></div>)}<label className="rk-scenario-switch">Scenario <select value={context.scenario} onChange={e=>{onContext({...context,scenario:e.target.value as Scenario});setRunCount(0)}}><option value="conservative">Conservative</option><option value="base">Base</option><option value="optimistic">Optimistic</option></select></label></section>
  <section className="rk-refpanel rk-insights"><h2>Risk &amp; Scenario Insights</h2><div className="rk-risk-graph"><div className="rk-risk-rows">{sensitivity.map(x=><div className="rk-risk-row" key={x.label}><span>{x.label==='Commodity price'?'Commodity Price':x.label==='CAPEX'?'CAPEX Sensitivity':x.label==='OPEX'?'OPEX Sensitivity':'Inflation'}</span><div className="rk-bar-area"><i className="rk-zero"/><div className="rk-negativebar" style={{width:Math.abs(x.down)/maxImpact*45+'%'}}/><div className="rk-positivebar" style={{width:Math.abs(x.up)/maxImpact*45+'%'}}/></div></div>)}</div><div className="rk-risk-axis"><span>−{maxImpact.toFixed(0)}M</span><span>0</span><span>+{maxImpact.toFixed(0)}M</span></div></div>
  <div className="rk-lower"><div><h3>Scenario Matrix (Value Impact)</h3><div className="rk-scenarios">{output.matrix.map((m,i)=><div key={m.name} className={'rk-scen rk-scen-'+i}><b>{['BEST CASE','BASE CASE','WORST CASE','STRESSED'][i]}</b><small>{m.name}</small><strong>{usd(m.value)}</strong><svg viewBox="0 0 90 28" aria-hidden="true"><path d={i<2?'M2 25 22 18 42 20 62 9 88 3':'M2 5 22 14 42 11 62 20 88 25'} fill="none" stroke="currentColor" strokeWidth="2"/></svg></div>)}</div></div><div className="rk-downside"><h3>Downside Risk Proxy</h3><div className="rk-gauge" style={{background:'conic-gradient(from 235deg,#ff566d 0 '+(downside*.72)+'%,#2d3c57 '+(downside*.72)+'% 72%,transparent 72% 100%)'}}><div><strong>{downside.toFixed(1)}%</strong><span>Negative scenario exposure</span></div></div></div></div></section></div>
  <div className="rk-bottom"><label><span className="rk-avatar">♙</span> Risk Officer <input type="checkbox" checked={riskSign} onChange={e=>setRiskSign(e.target.checked)}/><small>{riskSign?'Demo acknowledged':'Awaiting sign-off'}</small></label><label><span className="rk-avatar">♟</span> Chief Economist <input type="checkbox" checked={economistSign} onChange={e=>setEconomistSign(e.target.checked)}/><small>{economistSign?'Demo acknowledged':'Awaiting sign-off'}</small></label><button disabled={!signed||!acceptable} onClick={()=>setNotice('Financial Gate 4 preview only; no real approval or navigation occurred.')}>Proceed to Financial Gate 4 <ArrowRight size={17}/></button><button className="rk-export-btn" onClick={()=>{setRunCount(c=>c+1);setNotice('Risk scenario recalculated from deterministic assumptions; no Monte Carlo simulation executed.')}}><Play size={14}/> Run Analysis</button></div>
  {notice&&<div className="rk-notice" role="status">{notice} <button onClick={exportJson}>Export JSON</button></div>}
  <footer className="rk-caution">DEMO · Synthetic deterministic sensitivity, not Monte Carlo or verified financial risk. External integrations and sign-offs are not real.</footer>
 </div>
}
