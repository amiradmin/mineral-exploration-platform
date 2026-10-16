import React,{useMemo,useState} from 'react'
import {ArrowRight,Coins,Database,TrendingUp} from 'lucide-react'
import {targets} from './mockData'
import type {DecisionContext,Scenario} from './decisionPipeline'
import './FinancialValuator.css'
type Inputs={capex:number;opex:number;wacc:number;life:number;start:number;revenue:number;sustaining:number;tax:number}
const defaults:Inputs={capex:950,opex:170,wacc:10,life:11,start:5,revenue:390,sustaining:24,tax:25}
const scenarioFactor:Record<Scenario,number>={conservative:.82,base:1,optimistic:1.18}
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x))
const money=(x:number)=> (x<0?'−':'')+'$'+Math.abs(x).toFixed(1)+'M'
function model(input:Inputs,scenario:Scenario,targetFactor:number){
 const years=Math.max(input.start+input.life-1,15)
 const flows=Array.from({length:years},(_,i)=>{
  const year=i+1
  const construction=year<input.start
  const startupCost=construction?-input.capex/(input.start-1):0
  const gross=construction?0:input.revenue*scenarioFactor[scenario]*targetFactor
  const opex=construction?0:input.opex
  const sustaining=construction?0:input.sustaining
  const beforeTax=gross-opex-sustaining
  const tax=construction?0:Math.max(0,beforeTax)*input.tax/100
  const cash=startupCost+beforeTax-tax
  return {year,cash}
 })
 let accumulated=0
 const points=flows.map(x=>{const before=accumulated;accumulated+=x.cash;return {...x,cumulative:accumulated,previous:before}})
 const npv=points.reduce((sum,x)=>sum+x.cash/Math.pow(1+input.wacc/100,x.year),0)
 const npvAt=(rate:number)=>points.reduce((sum,x)=>sum+x.cash/Math.pow(1+rate,x.year),0)
 // Bisection only when a conventional positive discount-rate IRR is bracketed.
 let irr:number|null=null
 if(npvAt(0)>=0&&npvAt(10)<0){let l=0,h=10;for(let i=0;i<100;i++){const m=(l+h)/2;if(npvAt(m)>0)l=m;else h=m}irr=(l+h)/2*100}
 let payback:number|null=null
 for(const x of points){if(x.previous<0&&x.cumulative>=0&&x.cash>0){payback=x.year-1+(-x.previous/x.cash);break}}
 return {points,npv,irr,payback,total:accumulated}
}
function CashChart({points,start}:{points:ReturnType<typeof model>['points'];start:number}){
 const w=920,h=490,left=65,right=35,top=52,bottom=58
 const cum=points.map(p=>p.cumulative)
 const values=[...points.map(p=>p.cash),...cum,0]
 const lo=Math.min(...values),hi=Math.max(...values)
 const pad=(hi-lo)*.10||1
 const min=lo-pad,max=hi+pad
 const y=(v:number)=>top+(max-v)/(max-min)*(h-top-bottom)
 const step=(w-left-right)/points.length
 const x=(idx:number)=>left+step*(idx+.5)
 const zero=y(0)
 const line=points.map((p,i)=>(i===0?'M':'L')+x(i).toFixed(1)+' '+y(p.cumulative).toFixed(1)).join(' ')
 return <svg viewBox={`0 0 ${w} ${h}`} className="fv-chart-svg" role="img" aria-label="Annual negative CAPEX bars, positive copper operating cash flow bars and cumulative cash flow line">
 <defs><linearGradient id="fv-positive" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#80513f"/><stop offset=".5" stopColor="#eab48b"/><stop offset="1" stopColor="#b77856"/></linearGradient><linearGradient id="fv-negative" x1="0" y1="0" x2="1"><stop stopColor="#8c424b"/><stop offset=".55" stopColor="#e0828a"/><stop offset="1" stopColor="#a85661"/></linearGradient><filter id="fv-glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
 {Array.from({length:6},(_,i)=>{const value=min+(max-min)*i/5;return <g key={i}><line x1={left} x2={w-right} y1={y(value)} y2={y(value)} stroke="#607d96" opacity=".24"/><text x={left-10} y={y(value)+4} fill="#a5bbcb" fontSize="12" textAnchor="end">{value.toFixed(0)}</text></g>})}
 <line x1={left} y1={zero} x2={w-right} y2={zero} stroke="#a3c4d7" strokeWidth="2"/>
 {points.map((p,i)=>{const yy=y(p.cash);return <g key={p.year}><rect x={x(i)-step*.34} y={Math.min(yy,zero)} width={step*.68} height={Math.max(1,Math.abs(yy-zero))} rx="1" fill={p.cash<0?'url(#fv-negative)':'url(#fv-positive)'} stroke={p.cash<0?'#ef9a9a':'#f2c8a0'} strokeOpacity=".45"/><text x={x(i)} y={h-30} fontSize="13" fill="#d4e0e9" textAnchor="middle">Y{p.year}</text></g>})}
 <line x1={left+step*(start-1)} x2={left+step*(start-1)} y1={top} y2={h-bottom} stroke="#9ed4f7" strokeDasharray="8 7" opacity=".85"/>
 <text x={clamp(left+step*(start-1)+9,left+10,w-185)} y={top+24} fill="#d6eafb" fontSize="16">Production Start</text>
 <path d={line} stroke="#83c1ec" strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round" filter="url(#fv-glow)"/>
 <text x={left+18} y={zero+24} fill="#f5b6b8" fontSize="17">CAPEX Outflow</text><text x={w-right-172} y={zero-20} fill="#eec19a" fontSize="17">LOM Cash Flow</text><text x={w/2} y={h-5} fontSize="16" textAnchor="middle" fill="#bfd9e7">Years</text>
 <text x={14} y={h/2} fontSize="14" fill="#bed3df" textAnchor="middle" transform={`rotate(-90 14 ${h/2})`}>Cash flow ($M)</text>
 </svg>
}
export default function FinancialValuator({context,onContext,onNavigate}:{context:DecisionContext;onContext:(c:DecisionContext)=>void;onNavigate:(page:string)=>void}){
 const [all,setAll]=useState<Record<string,Inputs>>({})
 const target=targets.find(t=>t.id===context.targetId)??targets[0]
 const inputs=all[target.id]??defaults
 const update=(key:keyof Inputs,v:number)=>setAll(a=>({...a,[target.id]:{...inputs,[key]:v}}))
 const projection=useMemo(()=>model(inputs,context.scenario,target.aiScore/92),[inputs,context.scenario,target.aiScore])
 const fields:[keyof Inputs,string,number,number,number,string][]=[['capex','Setup CAPEX',100,3000,25,'$M'],['opex','Annual operating costs',20,600,10,'$M/y'],['wacc','Discount rate (WACC proxy)',2,25,.5,'%'],['life','Mine production years',3,20,1,'years'],['start','Production begins in',2,8,1,'year'],['revenue','Annual gross revenue',50,1000,10,'$M/y'],['sustaining','Sustaining CAPEX',0,100,5,'$M/y'],['tax','Simplified tax rate',0,40,1,'%']]
 const exportReport=()=>{const obj={disclaimer:'Synthetic illustrative DCF, not lender-grade valuation',target:target.id,scenario:context.scenario,inputs,projection};const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const el=document.createElement('a');el.href=url;el.download='financial-valuation-demo-'+target.id+'.json';el.click();URL.revokeObjectURL(url)}
 return <div className="fv-root"><div className="fv-head"><div><span>MODULE 05 · GATE 4 · FINANCIAL VALUATION</span><h1>Financial Valuator</h1><p>Illustrative mine-life cash-flow analysis with traceable financial inputs.</p></div><b>DEMONSTRATION ONLY</b></div>
 <div className="sg-context"><label>Target<select value={context.targetId} onChange={e=>onContext({...context,targetId:e.target.value})}>{targets.map(t=><option key={t.id} value={t.id}>{t.id} · {t.name}</option>)}</select></label><label>Scenario<select value={context.scenario} onChange={e=>onContext({...context,scenario:e.target.value as Scenario})}><option value="conservative">Conservative</option><option value="base">Base</option><option value="optimistic">Optimistic</option></select></label><span>Shared selection · economic inputs local to this demo workspace</span></div>
 <div className="fv-kpis"><div><small>Discounted NPV proxy</small><strong>{money(projection.npv)}</strong><span>At {inputs.wacc}% assumed discount rate</span></div><div><small>IRR proxy</small><strong>{projection.irr===null?'N/A':projection.irr.toFixed(1)+'%'}</strong><span>Calculated where conventional root exists</span></div><div><small>Capital payback</small><strong>{projection.payback===null?'Not reached':projection.payback.toFixed(1)+' years'}</strong><span>Undiscounted cumulative crossing</span></div><div><small>Final cumulative cash flow</small><strong>{money(projection.total)}</strong><span>Undiscounted · illustrative</span></div></div>
 <div className="fv-layout"><section className="fv-panel"><h2><Coins size={19}/> Valuation Inputs</h2><p>Adjust assumptions to update the annual cash flow chart.</p>{fields.map(([key,label,min,max,step,unit])=><label className="fv-control" key={key}><span><b>{label}</b><strong>{inputs[key].toLocaleString('en-US')} {unit}</strong></span><input type="range" min={min} max={max} step={step} value={inputs[key]} onChange={e=>update(key,Number(e.target.value))}/></label>)}</section>
 <section className="fv-panel fv-chart-panel"><h2>Annual Cash Flow</h2><p>Construction outflows (red) · Operating cash flow (copper) · Cumulative cash flow (blue)</p><CashChart points={projection.points} start={inputs.start}/><div className="fv-key"><span>■ CAPEX outflow</span><span>■ Operating cash flow</span><span>━ Cumulative cash flow</span></div></section>
 <section className="fv-panel"><h2><TrendingUp size={19}/> Computation & Audit</h2><p>Year-by-year cash flow drives the discounted valuation and payback estimates.</p><div className="fv-formula"><b>NPV</b><span>Σ Cash Flowₜ / (1 + r)ᵗ</span><b>IRR</b><span>Discount rate at which NPV = 0</span><b>Payback</b><span>First nonnegative cumulative cash-flow crossing</span></div><button className="fv-button" onClick={exportReport}>Export assumptions & annual cash flows</button></section>
 <section className="fv-panel"><h2><Database size={19}/> Executive Value</h2><p>A financial narrative for review, not a financing approval or investment recommendation.</p><div className="fv-audit"><span>Model status <b>Illustrative</b></span><span>Data provenance <b>Synthetic</b></span><span>Independent engineering <b>Not performed</b></span></div>{[['Mining Economics Engine','economics-engine'],['Risk & Scenario Analyzer','risk-scenarios'],['Executive Portfolio','executive']].map(([name,page])=><button className="fv-button" key={page} onClick={()=>onNavigate(page)}>{name}<ArrowRight size={15}/></button>)}</section></div>
 <div className="fv-warning">SIMULATED DEMONSTRATION — Revenue and expenditure schedules are user-adjusted assumptions, not linked to a validated mine plan, reserve declaration, commissioning schedule, taxes, financing structure, royalties or real engineering costs. The NPV and IRR calculations are mathematical outputs of this simplified cash-flow model, not a bankable feasibility valuation.</div></div>
}
