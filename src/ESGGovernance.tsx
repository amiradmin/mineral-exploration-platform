import React,{useMemo,useState} from 'react'
import {targets} from './mockData'
import type {DecisionContext,Scenario} from './decisionPipeline'
import './ESGGovernance.css'
type ESGInputs={carbon:number;water:number;incidents:number;hours:number;community:number;permits:number;permitTotal:number;tailings:number}
const baseline:ESGInputs={carbon:43,water:2.8,incidents:3,hours:620000,community:85,permits:12,permitTotal:14,tailings:58}
const scenarioAdjust:Record<Scenario,number>={conservative:-8,base:0,optimistic:7}
const bound=(n:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,n))
function Radar({values}:{values:number[]}){
 const cx=270,cy=238,r=180
 const labels=[['Carbon Footprint',270,27],['Water',490,196],['Stewardship',490,216],['Workplace',422,431],['Safety',422,451],['Tailings',118,431],['Governance',118,451],['Community',53,196],['Relations',53,216]]
 const xy=(i:number,v:number)=>{const a=-Math.PI/2+i*2*Math.PI/5;return [cx+Math.cos(a)*r*v,cy+Math.sin(a)*r*v]}
 const poly=(v:number[])=>v.map((n,i)=>xy(i,n/100).join(',')).join(' ')
 const reference=[88,90,87,92,88],budget=[61,65,62,68,67]
 return <svg viewBox="0 0 540 475" className="esg-ref-radar" role="img" aria-label="Five-axis radar comparing adjustable synthetic ESG performance against illustrative reference and baseline">
 <defs><radialGradient id="esg-radar-core"><stop stopColor="#24f19e" stopOpacity=".35"/><stop offset="1" stopColor="#0b202c" stopOpacity="0"/></radialGradient><filter id="esg-radar-glow"><feGaussianBlur stdDeviation="5"/></filter></defs>
 <circle cx={cx} cy={cy} r="205" fill="url(#esg-radar-core)"/><circle cx={cx} cy={cy} r="199" stroke="#23565c" strokeDasharray="6 17" strokeWidth="2" fill="none" opacity=".35"/>
 {[20,40,60,80,100].map(v=><polygon key={v} points={poly([v,v,v,v,v])} fill="none" stroke="#3a7778" strokeWidth="1.2" opacity=".55"/>)}
 {Array.from({length:5},(_,i)=>{const [x,y]=xy(i,1);return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#439a90" opacity=".65"/>})}
 <polygon points={poly(reference)} fill="#41e87c" fillOpacity=".09" stroke="#52ee95" strokeWidth="3" filter="url(#esg-radar-glow)" opacity=".6"/><polygon points={poly(reference)} fill="#41e87c" fillOpacity=".09" stroke="#52ee95" strokeWidth="2.5"/>
 <polygon points={poly(values)} fill="#3eeac7" fillOpacity=".18" stroke="#37ddfc" strokeWidth="3" filter="url(#esg-radar-glow)" opacity=".6"/><polygon points={poly(values)} fill="#3eeac7" fillOpacity=".18" stroke="#37ddfc" strokeWidth="3"/>
 <polygon points={poly(budget)} fill="none" stroke="#52f28f" strokeWidth="2.5"/>
 {reference.map((v,i)=>{const [x,y]=xy(i,v/100);return <circle key={i} cx={x} cy={y} r="7" fill="#40e990" stroke="#92ffc7" strokeWidth="1.4"/>})}
 {values.map((v,i)=>{const [x,y]=xy(i,v/100);return <circle key={i} cx={x} cy={y} r="6" fill="#32d7fd" stroke="#8cfcff" strokeWidth="1.4"/>})}
 {labels.map(([label,x,y],i)=><text key={i} x={x} y={y} textAnchor="middle" fill="#74def0" fontSize="17">{label}</text>)}
 <circle cx={cx} cy={cy} r="20" fill="#24d97b" stroke="#63ffad" strokeWidth="2" filter="url(#esg-radar-glow)"/>
 <circle cx={cx} cy={cy} r="17" fill="#1dba7a" stroke="#70ffad" strokeWidth="2"/>
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
 return <div className="esg-ref">
 <div className="esg-ref-head"><div><h1>Module 6: Continuous ESG Tracker</h1><span>Sarcheshmeh Copper Mine · {target.id}</span></div></div>
 <div className="esg-sensor-ticks" aria-hidden="true"><i/></div>
 <div className="esg-sensors"><strong>LIVE SENSOR INTEGRATION:</strong><span>⚙ &nbsp; Datamine Sustainability Suite</span><span>⌁ &nbsp; Micromine Pitram Safety</span><span>♧ &nbsp; Environmental IoT Sensors (Air, Water, Soil, Noise)</span><b>Not connected · Demo</b></div>
 <div className="esg-sensor-ticks lower" aria-hidden="true"><i/></div>
 <div className="esg-ref-kpis">
  <div className="esg-green"><strong>{data.audit.toFixed(0)}<small>/100</small></strong><span>Composite ESG Score</span><i>↗</i></div>
  <div className="esg-blue"><strong>{data.slo.toFixed(0)}<small>/100</small></strong><span>Social License Index (SLO)</span><i>⬡</i></div>
  <div className="esg-lime"><strong>{data.trifr.toFixed(2)}</strong><span>Safety Rate (TRIFR)</span><i>◴</i></div>
  <div className="esg-gold"><strong>{a.permits}<small>/{a.permitTotal} ({data.permits.toFixed(0)}%)</small></strong><span>Permits Reviewed (demo)</span><i>▤</i></div>
 </div>
 <div className="esg-ref-workspace">
  <section className="esg-ref-environment"><h2>ENVIRONMENTAL<br/>METRICS</h2>
   <div className="esg-ref-measure"><div className="esg-measure-icon esg-carbon-icon">▥</div><div><span>Carbon Intensity:</span><strong>{a.carbon} t CO₂e/kt</strong></div><span className="esg-small-icon">☁<em>↘</em></span><input aria-label="Carbon intensity" type="range" min="0" max="100" value={a.carbon} onChange={e=>update('carbon',Number(e.target.value))}/></div>
   <div className="esg-ref-measure"><div className="esg-measure-icon">♧</div><div><span>Water Intensity:</span><strong>{a.water.toFixed(1)} m³/t</strong></div><span className="esg-small-icon">◕</span><input aria-label="Water intensity" type="range" min="0" max="6" step=".1" value={a.water} onChange={e=>update('water',Number(e.target.value))}/></div>
   <div className="esg-ref-measure"><div className="esg-measure-icon">♧</div><div><span>Community Engagement Index:</span><strong>{a.community}/100</strong></div><span className="esg-small-icon">☺</span><input aria-label="Community engagement" type="range" min="0" max="100" value={a.community} onChange={e=>update('community',Number(e.target.value))}/></div>
  </section>
  <section className="esg-ref-chart"><Radar values={[data.scores[0],data.scores[1],data.scores[3],data.scores[2],data.scores[4]]}/><div className="esg-chart-legend"><span>● Current synthetic ESG score</span><span>● Illustrative reference</span></div></section>
 </div>
 <div className="esg-ref-footer"><div className="esg-officers">{['ESG Officer','HSE Director'].map((role,i)=><label key={role}><span className="esg-officer-icon">{i?'♙':'♧'}</span><span>{role}:<small>Demo acknowledgement</small></span><input type="checkbox" checked={!!actions[target.id+':'+role]} onChange={e=>setActions(p=>({...p,[target.id+':'+role]:e.target.checked}))}/></label>)}</div><button className="esg-maintain" onClick={()=>{const complete=['ESG Officer','HSE Director'].every(role=>actions[target.id+':'+role]);setActions(p=>({...p,[target.id+':lastReviewed']:true}));if(!complete){window.alert('Demo review requires both ESG Officer and HSE Director acknowledgements.')}else{window.alert('Demo SLO review recorded locally. No regulatory approval issued.')}}}>⚙ &nbsp; MAINTAIN CONTINUOUS<br/> SLO APPROVAL</button></div>
 <details className="esg-extra-controls"><summary>Additional ESG controls and audit checklist</summary><label>Target <select value={context.targetId} onChange={e=>onContext({...context,targetId:e.target.value})}>{targets.map(t=><option key={t.id} value={t.id}>{t.id} · {t.name}</option>)}</select></label><label>Scenario <select value={context.scenario} onChange={e=>onContext({...context,scenario:e.target.value as Scenario})}><option value="conservative">Conservative</option><option value="base">Base</option><option value="optimistic">Optimistic</option></select></label><label>Incidents <input type="range" min="0" max="20" value={a.incidents} onChange={e=>update('incidents',Number(e.target.value))}/>{a.incidents}</label><label>Tailings exposure <input type="range" min="0" max="100" value={a.tailings} onChange={e=>update('tailings',Number(e.target.value))}/>{a.tailings}</label><label>Permits reviewed <input type="range" min="0" max={a.permitTotal} value={a.permits} onChange={e=>update('permits',Number(e.target.value))}/>{a.permits}</label>{tasks.map(t=><label key={t}><input type="checkbox" checked={!!actions[target.id+':'+t]} onChange={e=>setActions(p=>({...p,[target.id+':'+t]:e.target.checked}))}/>{t}</label>)}<button onClick={exportJSON}>Export ESG demo snapshot</button></details>
 <p className="esg-ref-disclaimer">SYNTHETIC PRESENTATION · No live sensor data, verified permits, actual governance compliance or legal approvals. Indicators and acknowledgements are demonstration-only.</p>
 </div>
}
