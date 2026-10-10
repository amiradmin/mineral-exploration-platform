import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, CheckCircle2, ClipboardList, FlaskConical, HardHat, Layers, PackageCheck, Target, Truck } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/** Fictitious operational records for a frontend-only presentation. */
const programs = [
 {id:'Central Porphyry',commodity:'Cu-Mo',rigs:2,planned:360,actual:318,logged:286,cores:96.4,samples:84,pending:43,cost:72,targets:3},
 {id:'Northern Gold',commodity:'Au',rigs:1,planned:180,actual:152,logged:143,cores:93.2,samples:59,pending:27,cost:81,targets:2},
 {id:'Eastern Skarn',commodity:'Fe-Cu',rigs:1,planned:125,actual:92,logged:80,cores:91.6,samples:38,pending:19,cost:88,targets:1},
]
const assays=[
 {id:'LAB-1042',project:'Central Porphyry',batch:'CU-081',samples:42,due:'2026-10-09',status:'Overdue',qa:'Pending'},
 {id:'LAB-1043',project:'Northern Gold',batch:'AU-044',samples:27,due:'2026-10-11',status:'In laboratory',qa:'Pending'},
 {id:'LAB-1044',project:'Eastern Skarn',batch:'FE-026',samples:19,due:'2026-10-12',status:'In laboratory',qa:'Pending'},
 {id:'LAB-1039',project:'Central Porphyry',batch:'CU-079',samples:36,due:'2026-10-07',status:'Received',qa:'Review'},
 {id:'LAB-1036',project:'Northern Gold',batch:'AU-041',samples:31,due:'2026-10-06',status:'Validated',qa:'Passed'},
]
const issues=[
 {id:'QC-128',project:'Central Porphyry',category:'Duplicate pair outside tolerance',severity:'High',owner:'QA/QC Geologist',status:'Open'},
 {id:'QC-127',project:'Eastern Skarn',category:'Missing collar coordinate verification',severity:'High',owner:'GIS Specialist',status:'Review'},
 {id:'QC-124',project:'Northern Gold',category:'Blank sample above action limit',severity:'Medium',owner:'Laboratory Liaison',status:'Open'},
 {id:'QC-122',project:'Central Porphyry',category:'Overlapping lithology intervals',severity:'Medium',owner:'Logging Geologist',status:'Resolved'},
]
const tasks=[
 {name:'Verify CU-081 chain of custody',team:'Sample control',project:'Central Porphyry',priority:'Urgent',done:false},
 {name:'Complete DH-023 lithology logging',team:'Field geology',project:'Central Porphyry',priority:'High',done:false},
 {name:'Review blank contamination alert',team:'QA/QC',project:'Northern Gold',priority:'High',done:false},
 {name:'Reconcile DH-026 planned vs actual depth',team:'Drilling supervisor',project:'Eastern Skarn',priority:'Normal',done:false},
 {name:'Upload structural mapping traverse',team:'GIS',project:'Northern Gold',priority:'Normal',done:true},
]
const shifts=[
 {day:'04 Oct',plan:89,actual:80},{day:'05 Oct',plan:95,actual:90},{day:'06 Oct',plan:98,actual:88},
 {day:'07 Oct',plan:93,actual:82},{day:'08 Oct',plan:97,actual:93},{day:'09 Oct',plan:96,actual:84},
 {day:'10 Oct',plan:97,actual:91},
]

const f=(n:number,digits=0)=>n.toLocaleString('en-US',{maximumFractionDigits:digits})
function Metric({icon,label,value,unit,sub,tone='green'}:{icon:React.ReactNode,label:string,value:string,unit?:string,sub:string,tone?:string}){
 return <div className="ops-metric">
   <span className={'ops-metric-icon '+tone}>{icon}</span>
   <div className="ops-metric-label">{label}</div>
   <div className="ops-metric-number">{value}<small>{unit}</small></div>
   <div className="ops-metric-sub">{sub}</div>
 </div>
}
const badge=(status:string)=>'ops-chip '+(/Overdue|Urgent|High|Open/.test(status)?'danger':/Review|Pending|In laboratory/.test(status)?'warn':'ok')
export default function Operations(){
 const [project,setProject]=useState('All projects')
 const [tab,setTab]=useState<'laboratory'|'quality'|'tasks'>('laboratory')
 const [done,setDone]=useState<string[]>([])
 const [find,setFind]=useState('')
 const filtered=useMemo(()=>programs.filter(p=>project==='All projects'||p.id===project),[project])
 const sum=(key:'planned'|'actual'|'logged'|'samples'|'pending'|'rigs')=>filtered.reduce((a,p)=>a+p[key],0)
 const plan=sum('planned'),actual=sum('actual'),logged=sum('logged'),samples=sum('samples'),pending=sum('pending')
 const quality=filtered.reduce((a,p)=>a+p.cores*p.actual,0)/(actual||1)
 const backlog=assays.filter(a=>(project==='All projects'||a.project===project)&&a.status!=='Validated')
 const activeIssues=issues.filter(i=>(project==='All projects'||i.project===project)&&i.status!=='Resolved')
 const visibleTasks=tasks.filter(t=>(project==='All projects'||t.project===project)&&!done.includes(t.name))
 const rows=(tab==='laboratory'?assays:tab==='quality'?issues:tasks).filter(row=>(project==='All projects'||row.project===project)&&JSON.stringify(row).toLowerCase().includes(find.toLowerCase()))
 const exportCsv=()=>{
   const quote=(x:unknown)=>'"'+String(x??'').replace(/"/g,'""')+'"'
   const head=rows.length?Object.keys(rows[0]):[]
   const csv=[head.map(quote).join(','),...rows.map(r=>head.map(k=>quote((r as unknown as Record<string,unknown>)[k])).join(','))].join('\r\n')
   const u=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}))
   const a=document.createElement('a');a.href=u;a.download='exploration-demo-'+tab+'.csv';a.click();URL.revokeObjectURL(u)
 }
 return <div className="ops">
  <div className="ops-topline">
    <div><span className="ops-eyebrow">FIELD OPERATIONS / DAILY CONTROL</span><h1>Exploration Operations</h1><p>Drilling · core logging · samples · laboratory turnaround · data integrity</p></div>
    <div className="ops-tools"><label htmlFor="ops-project">Exploration program</label><select id="ops-project" value={project} onChange={e=>setProject(e.target.value)}><option>All projects</option>{programs.map(p=><option key={p.id}>{p.id}</option>)}</select></div>
  </div>
  <div className="ops-demo-note"><AlertTriangle size={15}/> <b>SIMULATED OPERATIONS — 10 OCT 2026</b> All activities, costs, assays and dates are fictional. Numbers are examples, not live project telemetry.</div>
  <div className="ops-metrics">
    <Metric icon={<HardHat size={18}/>} label="Drilling completed" value={f(actual)} unit="m" sub={f(actual/plan*100,1)+'% of '+f(plan)+' m scheduled'}/>
    <Metric icon={<Layers size={18}/>} label="Geological logging" value={f(logged/actual*100,1)} unit="%" sub={f(logged)+' / '+f(actual)+' m logged'} tone="blue"/>
    <Metric icon={<PackageCheck size={18}/>} label="Field samples" value={f(samples)} sub="Collected in the demo shift" tone="purple"/>
    <Metric icon={<FlaskConical size={18}/>} label="Assays awaiting results" value={f(pending)} sub={backlog.length+' batches not yet validated'} tone="amber"/>
    <Metric icon={<CheckCircle2 size={18}/>} label="Core recovery" value={f(quality,1)} unit="%" sub="Metres-weighted campaign average" tone="blue"/>
    <Metric icon={<AlertTriangle size={18}/>} label="Open QA/QC issues" value={f(activeIssues.length)} sub="Exceptions requiring owner review" tone="red"/>
  </div>
  <div className="ops-row">
    <section className="panel ops-chart-panel">
      <div className="ops-section-head"><div><h2>Drilling performance</h2><p>Last seven illustrative shifts · metres drilled</p></div><span className="ops-chip ok">Daily target vs actual</span></div>
      <div className="ops-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={shifts} barGap={3}><CartesianGrid stroke="#244137" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="day" tick={{fill:'#a1b8ae',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#a1b8ae',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#10231c',border:'1px solid #315444',color:'#f3fff9'}}/><Bar dataKey="plan" name="Planned m" fill="#617d72" radius={[4,4,0,0]}/><Bar dataKey="actual" name="Actual m" fill="#65d7a6" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
    </section>
    <section className="panel ops-chart-panel">
      <div className="ops-section-head"><div><h2>Program execution</h2><p>Selected project drilling and cost utilisation</p></div><Target size={19} color="#65d7a6"/></div>
      {filtered.map(p=><div className="ops-program" key={p.id}><div className="ops-program-line"><b>{p.id}</b><span>{p.commodity} · {p.rigs} rig{p.rigs!==1?'s':''}</span></div><div className="ops-progress"><i style={{width:(p.actual/p.planned*100)+'%'}}/></div><div className="ops-progress-meta"><span>{p.actual} / {p.planned} m drilled</span><span>{p.cost}% budget used</span></div></div>)}
      <p className="ops-footnote">Budget utilisation is a sample percentage, not a currency ledger.</p>
    </section>
  </div>
  <div className="ops-row ops-lower">
    <section className="panel ops-queue">
      <div className="ops-section-head"><div><h2>Operational registers</h2><p>Search, filter and export exploration records</p></div><button className="ops-export" onClick={exportCsv}>Export {tab} CSV <ArrowUpRight size={15}/></button></div>
      <div className="ops-tabs">{([['laboratory','Lab batches'],['quality','QA/QC exceptions'],['tasks','Daily actions']] as const).map(([id,label])=><button key={id} className={tab===id?'selected':''} onClick={()=>{setTab(id);setFind('')}}>{label}</button>)}</div>
      <input className="ops-search" value={find} onChange={e=>setFind(e.target.value)} placeholder={'Search '+tab+' records…'} aria-label="Search operational records"/>
      <div className="ops-table-scroll">
      {tab==='laboratory'?<table className="ops-table"><thead><tr><th>Batch</th><th>Program</th><th>Samples</th><th>Due</th><th>Lab status</th><th>QA/QC</th></tr></thead><tbody>{(rows as typeof assays).map(r=><tr key={r.id}><td><b>{r.batch}</b><small>{r.id}</small></td><td>{r.project}</td><td>{r.samples}</td><td>{r.due}</td><td><span className={badge(r.status)}>{r.status}</span></td><td><span className={badge(r.qa)}>{r.qa}</span></td></tr>)}</tbody></table>:
        tab==='quality'?<table className="ops-table"><thead><tr><th>Issue</th><th>Finding</th><th>Program</th><th>Owner</th><th>Severity</th><th>Status</th></tr></thead><tbody>{(rows as typeof issues).map(r=><tr key={r.id}><td><b>{r.id}</b></td><td>{r.category}</td><td>{r.project}</td><td>{r.owner}</td><td><span className={badge(r.severity)}>{r.severity}</span></td><td>{r.status}</td></tr>)}</tbody></table>:
        <table className="ops-table"><thead><tr><th>Task</th><th>Program</th><th>Team</th><th>Priority</th><th>Demo completion</th></tr></thead><tbody>{(rows as typeof tasks).map(r=><tr key={r.name}><td>{r.name}</td><td>{r.project}</td><td>{r.team}</td><td><span className={badge(r.priority)}>{r.priority}</span></td><td><label className="ops-checkbox"><input type="checkbox" checked={r.done||done.includes(r.name)} disabled={r.done} onChange={e=>setDone(current=>e.target.checked?[...current,r.name]:current.filter(x=>x!==r.name))}/>{r.done||done.includes(r.name)?'Complete':'Mark done'}</label></td></tr>)}</tbody></table>}
      {rows.length===0&&<div className="ops-empty">No records match your filters.</div>}
      </div>
    </section>
    <section className="panel ops-attention">
      <div className="ops-section-head"><div><h2>Action required</h2><p>Operational handoff queue</p></div><ClipboardList size={19} color="#65d7a6"/></div>
      {visibleTasks.length?visibleTasks.map(t=><div className="ops-task" key={t.name}><span className={badge(t.priority)}>{t.priority}</span><strong>{t.name}</strong><small>{t.team} · {t.project}</small><button onClick={()=>setDone(current=>[...current,t.name])}>Mark complete <CheckCircle2 size={14}/></button></div>):<p className="ops-footnote">All sample tasks are complete for this filter.</p>}
      <div className="ops-hand-off"><Truck size={18}/><div><b>Next shift handoff</b><p>Check laboratory turnaround, unresolved QA/QC, and daily drill metres before approving new target work.</p></div></div>
    </section>
  </div>
 </div>
}
