import React, {useMemo, useState} from 'react'
import {Activity, ArrowRight, BarChart3, Database, ShieldAlert} from 'lucide-react'
import {Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts'
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
 const target=targets.find(t=>t.id===context.targetId)??targets[0]
 const input=values[target.id]??base
 const update=(key:keyof Inputs,v:number)=>setValues(p=>({...p,[target.id]:{...input,[key]:v}}))
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
 const exportJson=()=>{const blob=new Blob([JSON.stringify({disclaimer:'Synthetic deterministic one-period sensitivity demonstration, not a probabilistic risk model',target:target.id,scenario:context.scenario,inputs:input,outputs:output},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='risk-scenarios-'+target.id+'.json';link.click();URL.revokeObjectURL(url)}
 const controls:[keyof Inputs,string,number,number,number,string][]=[['price','Commodity price',4000,16000,100,'$/t Cu'],['inflation','Annual inflation',0,20,.5,'%'],['fx','FX cost multiplier',.5,2,.05,'×'],['capex','CAPEX',50,1500,10,'$M'],['opex','OPEX',10,120,1,'$/t ore'],['recovery','Plant recovery',45,98,1,'%']]
 const tornado=output.sensitivity.map(x=>({name:x.label,down:+x.down.toFixed(2),up:+x.up.toFixed(2)}))
 return <div className="rk-root">
  <div className="rk-heading"><div><span>MODULE 04 · GATES 3 & 4 · RISK ASSESSMENT</span><h1>Risk & Scenario Analyzer</h1><p>Understand the sensitivity of an illustrative mining outcome to economic and operating uncertainty.</p></div><strong>DEMO · NO LIVE DATA</strong></div>
  <div className="sg-context"><label>Target<select value={context.targetId} onChange={e=>onContext({...context,targetId:e.target.value})}>{targets.map(t=><option key={t.id} value={t.id}>{t.id} · {t.name}</option>)}</select></label><label>Scenario<select value={context.scenario} onChange={e=>onContext({...context,scenario:e.target.value as Scenario})}><option value="conservative">Conservative</option><option value="base">Base</option><option value="optimistic">Optimistic</option></select></label><span>Shared target and scenario context</span></div>
  <div className="rk-metrics"><div><small>Baseline scenario proxy</small><strong>{usd(output.baseline)}</strong><span>One-period contribution after illustrative CAPEX</span></div><div><small>Largest sensitivity</small><strong>{output.sensitivity[0].label}</strong><span>{usd(output.sensitivity[0].span)} low-to-high swing</span></div><div><small>Matrix range</small><strong>{usd(Math.min(...output.matrix.map(v=>v.value)))} – {usd(Math.max(...output.matrix.map(v=>v.value)))}</strong><span>Commodity price × capital cost</span></div></div>
  <div className="rk-grid">
   <section className="rk-panel"><h2><ShieldAlert size={19}/> Risk Inputs</h2><p>Stress-test commodity price, inflation, exchange costs, capital and operating conditions.</p>{controls.map(([key,label,min,max,step,unit])=><label className="rk-slider" key={key}><span><b>{label}</b><strong>{input[key].toLocaleString('en-US')}{unit==='%'?'%':' '+unit}</strong></span><input type="range" value={input[key]} min={min} max={max} step={step} onChange={e=>update(key,Number(e.target.value))}/></label>)}<small className="rk-muted">Stress ranges: price ±20%, inflation ±4 points, FX ±15%, CAPEX ±25%, OPEX ±20%, recovery ±8 points.</small></section>
   <section className="rk-panel"><h2><BarChart3 size={19}/> Tornado Chart: Outcome Sensitivity</h2><p>Impact on the baseline, in $M. Negative changes extend left, positive changes right.</p><div className="rk-chart"><ResponsiveContainer width="100%" height={440}><BarChart layout="vertical" data={tornado} margin={{top:10,right:22,bottom:12,left:8}} stackOffset="sign"><CartesianGrid stroke="#3c5970" strokeDasharray="3 5"/><XAxis type="number" tick={{fill:'#b8cede',fontSize:11}} stroke="#6386a0" unit="M"/><YAxis type="category" dataKey="name" width={102} tick={{fill:'#d6e5f0',fontSize:11}} stroke="#6386a0"/><Tooltip contentStyle={{background:'#142c3d',border:'1px solid #6084a2'}} formatter={(v:any)=>usd(Number(v))}/><ReferenceLine x={0} stroke="#bbd8e9" strokeWidth={2}/><Bar dataKey="down" name="Downside" fill="#6b91ae" stackId="a" isAnimationActive={false}/><Bar dataKey="up" name="Upside" fill="#d7a27d" stackId="a" isAnimationActive={false}/></BarChart></ResponsiveContainer></div><div className="rk-legend"><span>■ Downside</span><span>■ Upside</span></div></section>
   <section className="rk-panel"><h2>Two-Way Sensitivity Matrix</h2><p>Scenario outcomes at high/low commodity prices and high/low CAPEX assumptions.</p><div className="rk-matrix">{output.matrix.map((item,i)=><div className={item.value>=0?'rk-positive':'rk-negative'} key={item.name}><small>{item.name}</small><strong>{usd(item.value)}</strong><span>{i===0?'Price +15% / CAPEX −20%':i===1?'Price +15% / CAPEX +20%':i===2?'Price −15% / CAPEX −20%':'Price −15% / CAPEX +20%'}</span></div>)}</div><div className="rk-footnote">Comparison uses one-period deterministic assumptions, not probabilities, forecasts or investment IRR.</div></section>
   <section className="rk-panel"><h2><Database size={19}/> Executive Value & Integrations</h2><p>Explore trade-offs before committing to a fixed plan. The links below open existing application workspaces.</p>{[['Mining Economics Engine','economics-engine'],['Executive Portfolio','executive'],['Daily Operations','operations'],['Data QA / QC','qaqc']].map(([name,page])=><button className="rk-link" key={name} onClick={()=>onNavigate(page)}>{name}<ArrowRight size={15}/></button>)}<div className="rk-vendors"><b>Potential external tools · not connected</b><span>Seequent ecosystem</span><span>Micromine Pitram</span></div><button className="rk-export" onClick={exportJson}><Activity size={16}/> Export scenario JSON</button></section>
  </div><div className="rk-warning">DEMONSTRATION ONLY. All values use synthetic targets and a deliberately simplified copper-only, single-period calculation. Tornado bars and the matrix are deterministic sensitivity tests, not Monte Carlo results, probabilistic profit forecasts or a bankable pre-feasibility analysis.</div>
 </div>
}
