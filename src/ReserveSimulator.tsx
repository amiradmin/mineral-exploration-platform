import React, {useMemo, useState} from 'react'
import {ArrowRight, CheckCircle2, Database, RotateCcw, ZoomIn, ZoomOut, ShieldCheck, Lock, Box, SlidersHorizontal} from 'lucide-react'
import {targets, drillholes} from './mockData'
import type {DecisionContext, Scenario} from './decisionPipeline'
import './ReserveSimulator.css'

type Inputs={holes:number;variability:number;continuity:number;density:number;cutoff:number}
const initial:Inputs={holes:18,variability:25,continuity:75,density:2.7,cutoff:.45}
const scenarioScale:Record<Scenario,number>={conservative:.88,base:1,optimistic:1.12}
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n))
const fmt=(n:number)=>n.toFixed(2)
const colors=['#60efb4','#66e6ef','#f1d078']

function Orebody({holes,continuity,cutoff}:{holes:number;continuity:number;cutoff:number}){
 const [turn,setTurn]=useState(0)
 const [zoom,setZoom]=useState(1)
 const blocks=useMemo(()=>Array.from({length:240},(_,i)=>{
  const x=i%12,y=Math.floor(i/12)%10,z=Math.floor(i/120)
  const ridge=4.7+2*Math.sin(x*.56)+1.1*Math.cos(y*.7)
  const grade=clamp(.62+.26*Math.sin(x*.92+y*.45)-Math.abs(y-ridge)*.075+continuity/600,0,1.5)
  return {x,y,z,grade}
 }).filter(b=>b.grade>=cutoff),[continuity,cutoff])
 return <div className="rs-ore-scene">
  <svg viewBox="0 0 520 360" className="rs-ore-svg" role="img" aria-label="Rotatable isometric block model; block visibility depends on cut-off grade">
   <defs><linearGradient id="rs-ore-blue" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#4cbaff"/><stop offset="1" stopColor="#143f8e"/></linearGradient><linearGradient id="rs-ore-hot" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff29a"/><stop offset=".5" stopColor="#fd7945"/><stop offset="1" stopColor="#a82957"/></linearGradient></defs>
   <g transform={`translate(260 182) scale(${zoom}) rotate(${turn}) translate(-260 -182)`}>
    <g fill="none" stroke="#8ca5b2" strokeWidth="1" opacity=".6"><path d="M95 120 285 43 449 121 258 202Z M95 120V263L258 342 449 263V121 M258 202V342 M285 43V180"/></g>
    {blocks.sort((a,b)=>a.x+a.y-b.x-b.y).map((b,i)=>{
     const x=139+(b.x-b.y)*11.2,y=121+(b.x+b.y)*5.4-b.z*10
     const fill=b.grade>.9?'url(#rs-ore-hot)':b.grade>.7?'#f08067':'url(#rs-ore-blue)'
     return <g key={i} opacity=".79"><path d={`M${x} ${y}l11 -5 11 5 -11 5Z`} fill={fill} stroke="#6ac7ea" strokeOpacity=".14"/><path d={`M${x} ${y}l11 5v10l-11 -5Z`} fill={fill} opacity=".65"/><path d={`M${x+11} ${y+5}l11 -5v10l-11 5Z`} fill={fill} opacity=".45"/></g>
    })}
    {Array.from({length:Math.min(holes,40)},(_,i)=>{const x=140+(i*29)%235,y=75+(i*37)%125;return <g key={i}><path d={`M${x} ${y}l11 93`} stroke="#76ffec" strokeWidth="1.3" opacity=".8"/><circle cx={x} cy={y} r="2.3" fill="#84fbea"/></g>})}
   </g>
  </svg>
  <div className="rs-viewer-controls"><button onClick={()=>setTurn(v=>v+15)}><RotateCcw size={13}/> Rotate</button><button onClick={()=>setZoom(v=>clamp(v+.12,.7,1.55))}><ZoomIn size={13}/> Zoom</button><button onClick={()=>setZoom(v=>clamp(v-.12,.7,1.55))}><ZoomOut size={13}/></button><span>Interactive blocks</span></div>
 </div>
}
function Distribution({values}:{values:number[]}){
 const low=values[0],mid=values[1],high=values[2],max=high*1.3
 const x=(v:number)=>34+v/max*365
 const points=(shift:number)=>Array.from({length:101},(_,i)=>{const v=i/100*max;return `${x(v)},${162-139/(1+Math.exp(-(v-mid*shift)/(Math.max(1,mid*.22))))}`}).join(' ')
 return <svg viewBox="0 0 425 195" className="rs-distribution" role="img" aria-label="Conceptual cumulative scenarios and adjustable value markers">
  {[0,1,2,3,4].map(i=><g key={i} stroke="#35485a" strokeWidth=".7"><path d={`M34 ${23+i*35}H402`}/><path d={`M${34+i*92} 18V163`}/></g>)}
  <polyline points={points(.72)} fill="none" stroke="#5ae1ec" strokeWidth="2"/><polyline points={points(1)} fill="none" stroke="#60edba" strokeWidth="2"/><polyline points={points(1.28)} fill="none" stroke="#f5d479" strokeWidth="2"/>
  {[low,mid,high].map((v,i)=><g key={i}><line x1={x(v)} y1="18" x2={x(v)} y2="164" stroke={colors[i]} strokeDasharray="3 4" opacity=".8"/><circle cx={x(v)} cy={53+i*22} r="4" fill={colors[i]}/><rect x={x(v)-16} y={37+i*22} width="32" height="14" rx="4" fill={colors[i]}/><text x={x(v)} y={47+i*22} fontSize="9" textAnchor="middle" fill="#081925">{['P95','P50','P10'][i]}</text></g>)}
  <path d="M34 18V164H402" stroke="#708695" fill="none"/><text x="225" y="188" textAnchor="middle" fontSize="10" fill="#b2c5ce">Volume (Mm³)</text>
 </svg>
}
function MiniCurve({mode,cutoff,variability}:{mode:'grade'|'metal';cutoff:number;variability:number}){
 const samples=Array.from({length:60},(_,i)=>{const t=i/59;const y=mode==='grade'?clamp(1-t*.78+Math.sin(t*4)*.06+(variability-25)/300,0,1):Math.exp(-4.3*t*t);return [9+t*174,78-y*63]})
 return <div className="rs-mini"><div>{mode==='grade'?'Grade vs. Tonnage':'Metal Content vs. Cut-off Grade'}</div><svg viewBox="0 0 195 94" role="img" aria-label={mode==='grade'?'Grade tonnage curve':'Contained metal sensitivity'}>
  {[25,45,65].map(y=><path key={y} d={`M9 ${y}H185`} stroke="#334453" strokeWidth=".6"/>)}<path d="M9 9V79H185" fill="none" stroke="#718694"/>
  <polyline points={samples.map(([x,y])=>`${x},${y}`).join(' ')} fill="none" stroke={mode==='grade'?'#63edb6':'#f4d076'} strokeWidth="2"/>
  <path d={`M${9+(cutoff-0.2)/.9*174} 9V79`} stroke="#b4dce1" strokeDasharray="3 3"/>
 </svg></div>
}
export default function ReserveSimulator({context,onContext,onNavigate}:{context:DecisionContext;onContext:(v:DecisionContext)=>void;onNavigate:(v:string)=>void}){
 const [perTarget,setPerTarget]=useState<Record<string,Inputs>>({})
 const [geoSigned,setGeoSigned]=useState(false)
 const [qaSigned,setQaSigned]=useState(false)
 const [reviewNote,setReviewNote]=useState('')
 const target=targets.find(t=>t.id===context.targetId)??targets[0]
 const input=perTarget[target.id]??initial
 const change=(key:keyof Inputs,n:number)=>{setPerTarget(prev=>({...prev,[target.id]:{...input,[key]:n}}));setGeoSigned(false);setQaSigned(false);setReviewNote('')}
 const estimates=useMemo(()=>{
  const center=14.53*target.aiScore/92*scenarioScale[context.scenario]*(0.74+input.continuity/290)*(0.8+input.holes/90)*(1-(input.cutoff-.45)*.3)
  const spread=clamp(.27+input.variability/100+(30-input.holes)/150,.22,.73)
  const volumes=[center*(1-spread),center,center*(1+spread)]
  const grades=[.71,.74,.77].map(g=>g*(1+(input.cutoff-.45)*.27))
  return volumes.map((volume,i)=>({label:['P95','P50','P10'][i],volume,tonnes:volume*input.density,grade:grades[i]}))
 },[input,target,context.scenario])
 const confidence=clamp(91+(input.holes-18)*.36-(input.variability-25)*.18+(input.continuity-75)*.12,55,99)
 const pass=geoSigned&&qaSigned
 const controls=[{key:'holes' as const,label:'Drillholes',min:4,max:40,step:1,unit:''},{key:'variability' as const,label:'Grade variability',min:5,max:60,step:1,unit:'%'},{key:'continuity' as const,label:'Orebody continuity',min:35,max:95,step:1,unit:'%'},{key:'density' as const,label:'Bulk density',min:1.8,max:4,step:.05,unit:' t/m³'},{key:'cutoff' as const,label:'Cut-off grade',min:.2,max:1.1,step:.05,unit:'% Cu'}]
 const exportData=()=>{const blob=new Blob([JSON.stringify({target:target.id,scenario:context.scenario,input,estimates,confidence,reviewNote},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='gate2-'+target.id+'.json';a.click();URL.revokeObjectURL(u)}
 return <div className="rs-gate">
  <div className="rs-head"><div className="rs-brand"><span>✦</span><b>Data Mine</b></div><span>Target: <b>{target.id} {target.name}</b></span><span className="rs-status">GATE 2: <b>{pass?'READY FOR REVIEW':'PENDING SIGN-OFF'}</b></span><label className="rs-scenario">Scenario <select value={context.scenario} onChange={e=>{onContext({...context,scenario:e.target.value as Scenario});setGeoSigned(false);setQaSigned(false);setReviewNote('')}}><option value="conservative">Conservative</option><option value="base">Base</option><option value="optimistic">Optimistic</option></select></label></div>
  <div className="rs-sync-line"><div className="rs-sync"><strong>Data Sync</strong>{['Leapfrog Edge','Micromine Origin','Studio Geo'].map(v=><span key={v}><i/>{v}</span>)}</div><div className="rs-confidence"><div className="rs-ring" style={{background:`conic-gradient(#48ebc9 ${confidence}%,#233e46 0)`}}><i/></div><div><b>Data Confidence Index: {confidence.toFixed(0)}% DCI</b></div></div></div>
  <div className="rs-kpis">{estimates.map((r,i)=><div key={r.label} className={'rs-reserve rs-reserve-'+i}><div className="rs-reserve-top"><strong>{['◕','◉','▲'][i]} {r.label} ({['Low case','Median case','High case'][i]})</strong><span>◇</span></div><div className="rs-volume">{fmt(r.volume)} Mm³</div><div className="rs-mass">({fmt(r.tonnes)} Mt @ {fmt(r.grade)}% Cu)</div><div className="rs-reserve-foot">{['High confidence scenario','Base case','Upside potential'][i]}</div></div>)}</div>
  <div className="rs-workspace"><section className="rs-panel rs-params"><div className="rs-panel-label">DRILLHOLE PARAMETERS</div>{controls.map(c=><label className="rs-slider" key={c.key}><div>{c.label}<span>{Number(input[c.key].toFixed(2))}{c.unit}</span></div><input type="range" min={c.min} max={c.max} step={c.step} value={input[c.key]} onChange={e=>change(c.key,Number(e.target.value))}/></label>)}<div className="rs-quick-links"><button onClick={()=>onNavigate('drillholes')}>Drillhole Manager <ArrowRight size={13}/></button><button onClick={()=>onNavigate('qaqc')}>QA/QC workspace <ArrowRight size={13}/></button></div><small>{drillholes.length} drillhole records</small></section>
   <section className="rs-panel rs-model"><div className="rs-panel-label">EMBEDDED OREBODY BLOCK MODEL VIEWER <Box size={14}/></div><Orebody holes={input.holes} continuity={input.continuity} cutoff={input.cutoff}/></section>
   <section className="rs-panel rs-analytics"><div className="rs-panel-label">PROBABILISTIC RESERVE DISTRIBUTION &amp; SENSITIVITY</div><Distribution values={estimates.map(x=>x.volume)}/><div className="rs-mini-grid"><MiniCurve mode="grade" cutoff={input.cutoff} variability={input.variability}/><MiniCurve mode="metal" cutoff={input.cutoff} variability={input.variability}/></div><div className="rs-analytics-note">Scenario envelope only · not statistically calibrated quantiles</div></section></div>
  <div className="rs-bottom"><div className="rs-signoff"><strong>Digital sign-off</strong><label><input type="checkbox" checked={geoSigned} onChange={e=>{setGeoSigned(e.target.checked);setReviewNote('')}}/><span>Chief Geologist <small>{geoSigned?'Acknowledged':'Awaiting review'}</small></span></label><label><input type="checkbox" checked={qaSigned} onChange={e=>{setQaSigned(e.target.checked);setReviewNote('')}}/><span>QA/QC Lead <small>{qaSigned?'Acknowledged':'Awaiting review'}</small></span></label></div><button className="rs-approve" disabled={!pass} onClick={()=>setReviewNote('Gate 3 review prepared.')} >{pass?'[ Prepare Gate 3 Review ]':'[ Awaiting sign-offs ]'} <ArrowRight size={18}/></button></div>
  {reviewNote&&<div className="rs-review-note" role="status">{reviewNote} <button onClick={exportData}>Export review JSON</button></div>}

 </div>
}
