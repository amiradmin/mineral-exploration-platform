import React,{useMemo,useState} from 'react'
import {ArrowRight, CheckCircle2, Database, ShieldCheck, Radio} from 'lucide-react'
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
 const w=790,h=365,l=56,r=19,t=24,b=49,pw=w-l-r,ph=h-t-b
 const vals=[0,...points.flatMap(v=>[v.cash,v.cumulative])]
 const min=Math.min(-50,...vals),max=Math.max(120,...vals)
 const y=(v:number)=>t+(max-v)/(max-min)*ph
 const x=(i:number)=>l+(i+.5)*pw/points.length
 const zero=y(0),line=points.map((p,i)=>(i===0?'M':'L')+x(i).toFixed(1)+','+y(p.cumulative).toFixed(1)).join(' ')
 return <svg viewBox={`0 0 ${w} ${h}`} className="fv-reference-chart" role="img" aria-label="Annual operating cash flows in green, construction capital outflows in red, cumulative discounted cash flow proxy in cyan">
 <defs><linearGradient id="fv-green" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#16f58c" stopOpacity=".9"/><stop offset="1" stopColor="#0a5d54" stopOpacity=".18"/></linearGradient><linearGradient id="fv-red" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e63e57" stopOpacity=".2"/><stop offset="1" stopColor="#ff5266" stopOpacity=".8"/></linearGradient><filter id="fv-halo"><feGaussianBlur stdDeviation="4"/></filter></defs>
 <rect x={l} y={t} width={pw} height={ph} fill="#101931"/>
 {Array.from({length:7},(_,i)=>{const v=min+(max-min)*i/6;return <g key={i}><line x1={l} x2={w-r} y1={y(v)} y2={y(v)} stroke="#415382" strokeWidth=".8"/><text x={l-7} y={y(v)+4} fill="#b4cbe0" fontSize="12" textAnchor="end">{'$'+Math.round(v)}</text></g>})}
 {points.map((p,i)=><line key={'v'+i} x1={x(i)} x2={x(i)} y1={t} y2={h-b} stroke="#354b77" strokeWidth=".7"/>)}
 <line x1={l} x2={w-r} y1={zero} y2={zero} stroke="#51d6c2" strokeWidth="1.5"/>
 {points.map((p,i)=>{const yy=y(p.cash),negative=p.cash<0;return <g key={p.year}><rect x={x(i)-pw/points.length*.34} y={Math.min(yy,zero)} width={pw/points.length*.68} height={Math.max(2,Math.abs(yy-zero))} stroke={negative?'#fa6374':'#22f7a2'} strokeWidth="2" fill={negative?'url(#fv-red)':'url(#fv-green)'} filter="url(#fv-halo)" opacity=".65"/><rect x={x(i)-pw/points.length*.34} y={Math.min(yy,zero)} width={pw/points.length*.68} height={Math.max(2,Math.abs(yy-zero))} stroke={negative?'#fa6374':'#22f7a2'} strokeWidth="2" fill={negative?'url(#fv-red)':'url(#fv-green)'}/><text x={x(i)} y={h-28} textAnchor="middle" fontSize="12" fill="#b3c7df">{p.year}</text></g>})}
 <path d={line} stroke="#45dfff" strokeWidth="4" fill="none" filter="url(#fv-halo)" opacity=".8"/><path d={line} stroke="#54dcff" strokeWidth="2.6" fill="none"/>
 <path d={`M${l} ${h-23}h${Math.max(0,(start-1)*pw/points.length)}`} fill="none" stroke="#fd6476" strokeWidth="2"/><path d={`M${l+Math.max(0,(start-1)*pw/points.length)} ${h-23}H${w-r}`} fill="none" stroke="#5ae9ac" strokeWidth="2"/>
 <text x={l+Math.max(25,(start-1)*pw/points.length/2)} y={h-8} textAnchor="middle" fill="#ff8a93" fontSize="13">Construction Years</text><text x={l+Math.max(0,(start-1)*pw/points.length)+(w-r-l-Math.max(0,(start-1)*pw/points.length))/2} y={h-8} textAnchor="middle" fill="#4ee9a3" fontSize="13">Operational Years</text>
 <text x="14" y="174" transform="rotate(-90 14 174)" fill="#c1d6e5" fontSize="13">Cash Flow ($M)</text>
 </svg>
}
export default function FinancialValuator({context,onContext,onNavigate}:{context:DecisionContext;onContext:(c:DecisionContext)=>void;onNavigate:(page:string)=>void}){
 const [all,setAll]=useState<Record<string,Inputs>>({})
 const [section,setSection]=useState('Executive KPI')
 const [signed,setSigned]=useState([false,false,false])
 const [notice,setNotice]=useState('')
 const target=targets.find(t=>t.id===context.targetId)??targets[0]
 const inputs=all[target.id]??defaults
 const update=(key:keyof Inputs,v:number)=>{setAll(old=>({...old,[target.id]:{...inputs,[key]:v}}));setSigned([false,false,false]);setNotice('')}
 const projection=useMemo(()=>model(inputs,context.scenario,target.aiScore/92),[inputs,context.scenario,target.aiScore])
 const exportReport=()=>{const blob=new Blob([JSON.stringify({target:target.id,inputs,scenario:context.scenario,projection},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='financial-gate4.json';a.click();URL.revokeObjectURL(url)}
 const controls=[{key:'capex' as const,label:'Setup CAPEX',min:100,max:1800,step:25,unit:'M'},{key:'opex' as const,label:'Annual OPEX',min:20,max:500,step:10,unit:'M'},{key:'wacc' as const,label:'Discount Rate',min:2,max:25,step:.5,unit:'%'},{key:'life' as const,label:'Mine Life',min:3,max:20,step:1,unit:' Years'}]
 const revenue=inputs.revenue*scenarioFactor[context.scenario]*target.aiScore/92
 const approved=signed.every(Boolean)
 return <div className="fv-financial fv-reference-layout">
 <header className="fv-refhead"><h1><span className="fv-title-accent">╏</span> Module 5: Financial Valuator</h1><label>◎ Target: <select value={context.targetId} onChange={e=>{onContext({...context,targetId:e.target.value});setSigned([false,false,false])}}>{targets.map(t=><option key={t.id} value={t.id}>{t.id} {t.name}</option>)}</select></label><div className="fv-fid-status">GATE 4 FID STATUS: <b>{approved?'ACKNOWLEDGED':'AWAITING REVIEW'}</b></div></header>
 <div className="fv-content"><aside className="fv-sidebar"><div className="fv-sidebar-head">Navigation</div>{['Executive KPI','Pillars','Annual Scores','Executive Report'].map(n=><button className={section===n?'active':''} onClick={()=>setSection(n)} key={n}>{n}</button>)}<div className="fv-side-controls"><h2>Financial Sliders</h2>{controls.map(c=><label key={c.key}><span>{c.label}: <b>{c.unit==='%'?inputs[c.key]+'%':c.unit===' Years'?inputs[c.key]+' Years':'$'+inputs[c.key].toLocaleString('en-US')+c.unit}</b></span><input aria-label={c.label} type="range" min={c.min} max={c.max} step={c.step} value={inputs[c.key]} onChange={e=>update(c.key,Number(e.target.value))}/></label>)}<label className="fv-scenario">Scenario<select value={context.scenario} onChange={e=>{onContext({...context,scenario:e.target.value as Scenario});setSigned([false,false,false])}}><option value="conservative">Conservative</option><option value="base">Base</option><option value="optimistic">Optimistic</option></select></label></div></aside>
 <main className="fv-financial-main"><div className="fv-sync"><Radio size={17}/> Data Integrations: <span><Database size={16}/> Datamine MineTrust </span><span>⌁ Micromine Alastri </span><span><ShieldCheck size={16}/> Financial Model Audit </span></div>
 <div className="fv-neon-kpis"><div className="cyan fv-shaped"><strong>{money(projection.npv)}</strong><small>Discounted NPV ({inputs.wacc}% WACC)</small></div><div className="gold fv-shaped"><strong>{projection.irr===null?'N/A':projection.irr.toFixed(1)+'%'}</strong><small>IRR</small></div><div className="green fv-shaped"><strong>{projection.payback===null?'Not reached':projection.payback.toFixed(1)+' Years'}</strong><small>Capital Payback</small></div><div className="blue fv-shaped"><strong>{money(revenue)+'/yr'}</strong><small>Annual Gross Revenue</small></div></div>
 <div className="fv-hero-chart"><div className="fv-chart-topline" aria-hidden="true"/><CashChart points={projection.points} start={inputs.start}/></div>
 <footer className="fv-final-row"><div className="fv-signatures">{['CFO','CEO','Board Chairman'].map((role,i)=><label key={role}><span className="fv-sign-icon">{['▤','♙','♧'][i]}</span><input type="checkbox" checked={signed[i]} onChange={e=>setSigned(a=>a.map((v,j)=>j===i?e.target.checked:v))}/><span>{role}</span></label>)}</div><button className="fv-fid-button" disabled={!approved} onClick={()=>setNotice('Investment decision review prepared.')}>FINAL INVESTMENT DECISION (FID) <ArrowRight size={19}/></button></footer>
 {section!=='Executive KPI'&&<p className="fv-section-hint">{section} selected · use the financial sliders to update the cash flow.</p>}
 {notice&&<div className="fv-decision-note" role="status">{notice}<button onClick={exportReport}>Export financial JSON</button></div>}
 </main></div>
 </div>
}
