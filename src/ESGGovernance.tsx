import React,{useMemo,useState} from 'react'
import {ArrowRight,ClipboardCheck,Database,Droplets,Leaf,ShieldCheck} from 'lucide-react'
import {targets} from './mockData'
import type {DecisionContext,Scenario} from './decisionPipeline'
import './ESGGovernance.css'
type ESGInputs={carbon:number;water:number;incidents:number;hours:number;community:number;permits:number;permitTotal:number;tailings:number}
const baseline:ESGInputs={carbon:43,water:2.8,incidents:3,hours:620000,community:72,permits:11,permitTotal:14,tailings:58}
const scenarioAdjust:Record<Scenario,number>={conservative:-8,base:0,optimistic:7}
const bound=(n:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,n))
function Radar({values}:{values:number[]}){
 const cx=250,cy=250,r=153
 const labels=['Carbon\nFootprint','Water\nUsage','Tailings\nRisk','Safety\nIncidents','Social\nLicense']
 const xy=(i:number,scale:number)=>{const a=-Math.PI/2+i*2*Math.PI/5;return [cx+Math.cos(a)*r*scale,cy+Math.sin(a)*r*scale]}
 const poly=(v:number[])=>v.map((s,i)=>xy(i,s/100).map(n=>n.toFixed(1)).join(',')).join(' ')
 return <svg viewBox="0 0 500 500" role="img" aria-label="ESG radar chart with five normalized performance dimensions and continuous green audit cycle" className="esg-radar">
 <defs><radialGradient id="esg-radar-bg"><stop stopColor="#254a52"/><stop offset="1" stopColor="#101f30"/></radialGradient><linearGradient id="esg-fill" x1="0" x2="1"><stop stopColor="#3ed8a8" stopOpacity=".62"/><stop offset="1" stopColor="#6ce3bc" stopOpacity=".3"/></linearGradient><filter id="esg-soft"><feGaussianBlur stdDeviation="2"/></filter></defs>
 <circle cx={cx} cy={cy} r="215" fill="url(#esg-radar-bg)" fillOpacity=".65"/>
 <circle cx={cx} cy={cy} r="205" fill="none" stroke="#6ce2b3" strokeWidth="3" strokeDasharray="365 24" transform="rotate(-89 250 250)"/>
 <path d="M252 45l15 10-17 10z M455 256l-10 15-10-17z M239 454l-14-10 16-10z" fill="#80e8bb"/>
 {[.25,.5,.75,1].map(t=><polygon key={t} points={poly([t*100,t*100,t*100,t*100,t*100])} fill="none" stroke="#5e9c9a" strokeWidth="1.5" opacity=".65"/>)}
 {Array.from({length:5},(_,i)=>{const [x,y]=xy(i,1);return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#588c9d" strokeWidth="1.5"/>})}
 <polygon points={poly(values)} fill="url(#esg-fill)" stroke="#70e2ad" strokeWidth="3"/>
 {values.map((s,i)=>{const [x,y]=xy(i,s/100);return <circle key={i} cx={x} cy={y} r="4" fill="#b1fcd0"/>})}
 {labels.map((v,i)=>{const [x,y]=xy(i,1.19);return <text x={x} y={y} key={i} textAnchor="middle" fontSize="17" fill="#e3f6f2" fontWeight="600">{v.split('\n').map((line,j)=><tspan key={j} x={x} dy={j?19:0}>{line}</tspan>)}</text>})}
 <text x={cx} y={cy-8} textAnchor="middle" fill="#ddfff0" fontWeight="700" fontSize="14">ESG PROFILE</text><text x={cx} y={cy+13} textAnchor="middle" fill="#a4cebf" fontSize="11">Synthetic normalized scores</text>
 </svg>
}
export default function ESGGovernance({context,onContext,onNavigate}:{context:DecisionContext;onContext:(v:DecisionContext)=>void;onNavigate:(v:string)=>void}){
 const [overrides,setOverrides]=useState<Record<string,ESGInputs>>({})
 const [actions,setActions]=useState<Record<string,boolean>>({})
 const target=targets.find(t=>t.id===context.targetId)??targets[0]
 const a=overrides[target.id]??baseline
 const update=(k:keyof ESGInputs,v:number)=>setOverrides(s=>({...s,[target.id]:{...a,[k]:v}}))
 const data=useMemo(()=>{
  const adj=scenarioAdjust[context.scenario]
  // Lower footprint, water, incident and tailings exposure are represented as higher *illustrative* scores.
  const scores=[bound(100-a.carbon+adj,0,100),bound(100-a.water*15+adj,0,100),bound(100-a.tailings+adj,0,100),bound(100-a.incidents*14+adj,0,100),bound(a.community+adj,0,100)]
  const trifr=a.hours>0?a.incidents*1e6/a.hours:0
  const permits=a.permitTotal>0?a.permits/a.permitTotal*100:0
  const mean=scores.reduce((x,y)=>x+y,0)/5
  const audit=bound((mean+permits)/2,0,100)
  const slo=bound(a.community,0,100)
  return {scores,trifr,permits,audit,slo}
 },[a,context.scenario])
 const tasks=['Verify local permit status','Review water monitoring evidence','Investigate open safety actions','Refresh community engagement log']
 const exportJSON=()=>{const blob=new Blob([JSON.stringify({disclaimer:'Synthetic ESG presentation data. No regulatory audit or compliance verification.',target:target.id,scenario:context.scenario,inputs:a,indicators:data,actions:tasks.map(t=>({task:t,completed:!!actions[target.id+':'+t]}))},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='esg-governance-demo-'+target.id+'.json';link.click();URL.revokeObjectURL(url)}
 const inputs:[keyof ESGInputs,string,number,number,number,string][]=[['carbon','Carbon intensity',0,100,1,'t CO₂e / kt (demo)'],['water','Water intensity',0,6,.1,'m³/t (demo)'],['incidents','Recordable incidents',0,20,1,'cases'],['hours','Hours worked',10000,2000000,10000,'hours'],['community','Community engagement index',0,100,1,'/100'],['tailings','Tailings exposure proxy',0,100,1,'/100'],['permits','Permits reviewed',0,a.permitTotal,1,'permits']]
 return <div className="esg-root">
  <div className="esg-heading"><div><span>MODULE 06 · CONTINUOUS GOVERNANCE · ALL GATES</span><h1>Continuous ESG & Governance Tracker</h1><p>Environmental, safety and social indicators with a continuous audit perspective.</p></div><b>SIMULATED · NOT CERTIFIED</b></div>
  <div className="sg-context"><label>Target<select value={context.targetId} onChange={e=>onContext({...context,targetId:e.target.value})}>{targets.map(t=><option key={t.id} value={t.id}>{t.id} · {t.name}</option>)}</select></label><label>Scenario<select value={context.scenario} onChange={e=>onContext({...context,scenario:e.target.value as Scenario})}><option value="conservative">Conservative</option><option value="base">Base</option><option value="optimistic">Optimistic</option></select></label><span>ESG oversight spans every Stage-Gate</span></div>
  <div className="esg-kpis"><div><small>Social license proxy</small><strong>{data.slo.toFixed(0)}/100</strong><span>Subjective engagement input</span></div><div><small>TRIFR illustration</small><strong>{data.trifr.toFixed(2)}</strong><span>Recordable incidents per million hours</span></div><div><small>Permits reviewed</small><strong>{a.permits} / {a.permitTotal}</strong><span>{data.permits.toFixed(0)}% reviewed, not approved</span></div><div><small>Composite dashboard score</small><strong>{data.audit.toFixed(0)}/100</strong><span>Unvalidated aggregate proxy</span></div></div>
  <div className="esg-grid">
   <section className="esg-panel"><h2><Droplets size={18}/> Environmental & Social Inputs</h2><p>Adjust synthetic operational measurements and see the dashboard recalculate.</p>{inputs.map(([key,label,min,max,step,unit])=><label key={key} className="esg-slider"><span><b>{label}</b><strong>{a[key].toLocaleString('en-US')} {unit}</strong></span><input min={min} max={max} step={step} value={a[key]} type="range" onChange={e=>update(key,Number(e.target.value))}/></label>)}<small>These are illustrative user inputs without live sensors, permits, or incident reporting feeds.</small></section>
   <section className="esg-panel esg-chart"><h2><Leaf size={19}/> Continuous ESG Audit</h2><p>Five normalized dimensions; higher scores indicate better demonstration performance.</p><Radar values={data.scores}/><div className="esg-legend"><span>● Synthetic performance index</span><span>◯ Continuous monitoring lifecycle</span></div></section>
   <section className="esg-panel"><h2><ShieldCheck size={19}/> Computational Outputs</h2><div className="esg-metrics">{[['Carbon performance',data.scores[0]],['Water performance',data.scores[1]],['Tailings exposure management',data.scores[2]],['Safety performance',data.scores[3]],['Social license proxy',data.scores[4]]].map(([k,v])=><div key={String(k)}><span>{k}</span><b>{Number(v).toFixed(0)}/100</b><i><em style={{width:Number(v)+'%'}}/></i></div>)}</div><h3>Continuous audit checklist</h3>{tasks.map(t=><label className="esg-action" key={t}><input type="checkbox" checked={!!actions[target.id+':'+t]} onChange={e=>setActions(x=>({...x,[target.id+':'+t]:e.target.checked}))}/>{t}</label>)}</section>
   <section className="esg-panel"><h2><Database size={19}/> Technology Enablers</h2><p>Existing internal navigation; external products are reference examples only.</p>{[['Data QA / QC','qaqc'],['Daily Operations','operations'],['Executive Portfolio','executive'],['GIS Exploration Map','map']].map(([label,page])=><button key={page} className="esg-link" onClick={()=>onNavigate(page)}>{label}<ArrowRight size={15}/></button>)}<div className="esg-vendors"><b>Not connected</b><span>Seequent GeoStudio & PLAXIS</span><span>Datamine Sustainability Suite</span></div><h3>Executive value</h3><p>Visualize emerging risks, review evidence gaps, and prepare transparent governance conversations without representing these inputs as verified compliance data.</p><button className="esg-export" onClick={exportJSON}><ClipboardCheck size={16}/> Export ESG demonstration snapshot</button></section>
  </div><div className="esg-warning">DEMONSTRATION ONLY — All indicators are synthetic or user-entered, including the SLO proxy, TRIFR example, tailings exposure score and permit review count. They are not verified safety statistics, regulatory compliance statuses, engineering risk evaluations or independently assured ESG reports. Actions are stored only in current browser state.</div>
 </div>
}
