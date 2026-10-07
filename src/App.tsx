import { useState } from 'react'
import { BarChart3, CircleDollarSign, Database, Globe2, Layers3, Map, Mountain, Radar, Search, ShieldCheck, Sparkles, Target } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cashflow, risk, stageGates, targets } from './mockData'

type Page='dashboard'|'exploration'|'targets'|'gates'|'economics'|'risk'

const nav=[
{id:'dashboard',label:'Executive Dashboard',icon:BarChart3},
{id:'exploration',label:'Exploration Map',icon:Map},
{id:'targets',label:'Target Evaluation',icon:Target},
{id:'gates',label:'Stage-Gate',icon:Layers3},
{id:'economics',label:'Economics',icon:CircleDollarSign},
{id:'risk',label:'Risk & ESG',icon:ShieldCheck},
] as const

export default function App(){
 const [page,setPage]=useState<Page>('dashboard')
 const [selected,setSelected]=useState(targets[0])
 return <div className="app">
  <aside className="sidebar">
   <div className="brand"><div className="logo"><Mountain size={24}/></div><div><b>GeoMine AI</b><span>Exploration Intelligence</span></div></div>
   <nav>{nav.map(n=>{const Icon=n.icon;return <button key={n.id} className={page===n.id?'nav active':'nav'} onClick={()=>setPage(n.id as Page)}><Icon size={18}/><span>{n.label}</span></button>})}</nav>
   <div className="ai-card"><Sparkles size={20}/><div><b>AI Prospectivity</b><span>Multi-source scoring engine</span></div></div>
  </aside>
  <main>
   <header><div className="search"><Search size={16}/><input placeholder="Search projects, targets, regions..."/></div><div className="live"><i/> Demo data live</div><div className="avatar">GA</div></header>
   <div className="content">
    {page==='dashboard'&&<Dashboard openTarget={(t)=>{setSelected(t);setPage('targets')}}/>}
    {page==='exploration'&&<Exploration selected={selected} setSelected={setSelected}/>}
    {page==='targets'&&<Targets selected={selected} setSelected={setSelected}/>}
    {page==='gates'&&<Gates/>}
    {page==='economics'&&<Economics/>}
    {page==='risk'&&<Risk/>}
   </div>
  </main>
 </div>
}

function Title({eyebrow,title,sub}:{eyebrow:string,title:string,sub:string}){return <div className="title"><div><small>{eyebrow}</small><h1>{title}</h1><p>{sub}</p></div><button className="primary"><Sparkles size={16}/> Generate AI Brief</button></div>}
function PanelTitle({title,sub}:{title:string,sub:string}){return <div className="panel-title"><div><h3>{title}</h3><p>{sub}</p></div></div>}
function Kpi({label,value,note,icon}:{label:string,value:string,note:string,icon:any}){return <div className="kpi"><div className="kpi-icon">{icon}</div><div><span>{label}</span><b>{value}</b><small>{note}</small></div></div>}

function Dashboard({openTarget}:{openTarget:(t:any)=>void}){
 return <><Title eyebrow="PORTFOLIO OVERVIEW" title="Mineral Exploration Command Center" sub="A data-driven view of targets, decision gates and project economics."/>
 <div className="kpis">
  <Kpi label="Active Targets" value="24" note="+6 this quarter" icon={<Target/>}/>
  <Kpi label="High Priority" value="2" note="AI score ≥ 70" icon={<Sparkles/>}/>
  <Kpi label="Average PoS" value="61%" note="+8.4% after review" icon={<Radar/>}/>
  <Kpi label="Portfolio EMV" value="$28.4M" note="Risk adjusted" icon={<CircleDollarSign/>}/>
 </div>
 <div className="grid two">
  <section className="panel"><PanelTitle title="AI Prospectivity Map" sub="Regional target intelligence"/><MapPanel onSelect={openTarget}/></section>
  <section className="panel"><PanelTitle title="Top Ranked Targets" sub="Prioritized by AI score"/><div className="target-list">{targets.map(t=><button className="target-row" key={t.id} onClick={()=>openTarget(t)}><span className={'badge '+t.decision.toLowerCase()}>{t.aiScore}</span><div><b>{t.name}</b><small>{t.id} · {t.commodity}</small></div><div className="pos"><b>{t.pos}%</b><small>PoS</small></div></button>)}</div></section>
 </div>
 <div className="grid two lower">
  <section className="panel"><PanelTitle title="Stage-Gate Progress" sub="Decision maturity"/><GateStrip/></section>
  <section className="panel"><PanelTitle title="Decision Intelligence" sub="Current recommendation"/><div className="recommend"><Sparkles/><div><b>Advance North Copper Belt to field validation</b><p>Strong structural alignment and geochemical signatures raise confidence to 68% PoS.</p></div></div></section>
 </div></>
}

function MapPanel({onSelect}:{onSelect?:(t:any)=>void}){return <div className="mapbox"><div className="contour c1"/><div className="contour c2"/><div className="fault f1"/><div className="fault f2"/>{targets.map(t=><button key={t.id} onClick={()=>onSelect?.(t)} className={'pin '+t.decision.toLowerCase()} style={{left:t.x+'%',top:t.y+'%'}}>{t.aiScore}</button>)}<div className="legend"><b>AI Prospectivity</b><div/><span>Low <em>High</em></span></div><span className="region r1">Northern Belt</span><span className="region r2">Central Block</span></div>}

function Exploration({selected,setSelected}:{selected:any,setSelected:(x:any)=>void}){
 const layers=['Geology','Faults & Structures','Geochemistry','Magnetic Anomaly','Remote Sensing','Known Mines','AI Prospectivity']
 return <><Title eyebrow="GEOSPATIAL INTELLIGENCE" title="Exploration Map" sub="Overlay geological evidence and AI prospectivity to discover priority targets."/>
 <div className="explore">
  <section className="panel layers"><PanelTitle title="Evidence Layers" sub="Inputs to the scoring engine"/>{layers.map(l=><label key={l}><input defaultChecked type="checkbox"/><span>{l}</span></label>)}</section>
  <section className="panel"><MapPanel onSelect={setSelected}/></section>
  <section className="panel inspector"><span className="tag">{selected.id}</span><h2>{selected.name}</h2><p>{selected.commodity} exploration target</p><Score label="AI Prospectivity" value={selected.aiScore}/><Score label="Geological PoS" value={selected.pos}/><div className="decision"><span>Recommendation</span><b className={selected.decision.toLowerCase()}>{selected.decision}</b></div></section>
 </div></>
}

function Score({label,value}:{label:string,value:number}){return <div className="scoreline"><div><span>{label}</span><b>{value}%</b></div><div className="bar"><i style={{width:value+'%'}}/></div></div>}

function Targets({selected,setSelected}:{selected:any,setSelected:(x:any)=>void}){
 const factors=[['Source',91],['Migration Path',78],['Trap / Structure',88],['Timing',76],['Geochemistry',84],['Remote Sensing',72]]
 return <><Title eyebrow="EXPLORATION EVALUATOR" title="Target Evaluation" sub="Rank anomalies using geological evidence, PoS and expected monetary value."/>
 <div className="tabs">{targets.map(t=><button key={t.id} className={selected.id===t.id?'active':''} onClick={()=>setSelected(t)}>{t.id}</button>)}</div>
 <div className="grid three">
  <section className="panel bigmetric"><span>Composite AI Score</span><b>{selected.aiScore}</b><small className={selected.decision.toLowerCase()}>{selected.decision}</small><p>{selected.name} · {selected.commodity}</p></section>
  <section className="panel metric"><span>Geological PoS</span><b>{selected.pos}%</b><p>Probability of successful discovery</p></section>
  <section className="panel metric"><span>Expected Monetary Value</span><b>{'$'}{selected.emv}M</b><p>Risk-adjusted exploration value</p></section>
 </div>
 <div className="grid two lower">
  <section className="panel"><PanelTitle title="Geological Evidence" sub="Four-factor model + data signals"/>{factors.map(([l,v])=><Score key={String(l)} label={String(l)} value={Number(v)}/>)}</section>
  <section className="panel"><PanelTitle title="AI Rationale" sub="Decision trace"/><div className="recommend"><Sparkles/><p>The target shows strong structural convergence with coincident geochemical anomalies. Magnetic signature supports a buried intrusive source. Remote sensing contributes moderate confidence.</p></div><div className="mini"><div><span>Confidence</span><b>High</b></div><div><span>Completeness</span><b>86%</b></div><div><span>Next action</span><b>Field validation</b></div></div></section>
 </div></>
}

function GateStrip(){return <div className="gates">{stageGates.map((g,i)=><div className={'gate '+g.status.toLowerCase()} key={g.gate}><i>{i+1}</i><b>{g.gate}</b><span>{g.title}</span><small>{g.status}</small></div>)}</div>}
function Gates(){return <><Title eyebrow="DECISION GOVERNANCE" title="Stage-Gate Pipeline" sub="Advance opportunities only when technical and economic evidence supports the decision."/><section className="panel gate-panel"><GateStrip/></section><div className="grid two lower"><section className="panel"><PanelTitle title="Current Gate Review" sub="Gate 3 · Pre-Feasibility"/>{['Resource confidence above threshold','Metallurgical recovery validated','Preliminary mine plan available','Economic sensitivity complete'].map((x,i)=><div className="check" key={x}><b>{i<3?'✓':'○'}</b>{x}</div>)}</section><section className="panel"><PanelTitle title="Decision" sub="Recommendation"/><div className="recommend"><Radar/><div><b>Conditional GO</b><p>Proceed after completing economic sensitivity and validating the downside commodity-price scenario.</p></div></div></section></div></>}

function Economics(){return <><Title eyebrow="MINING ECONOMICS ENGINE" title="Project Economics" sub="Translate geological opportunity into investment-grade indicators."/><div className="kpis"><Kpi label="NPV" value="$86M" note="@ 10% discount rate" icon={<CircleDollarSign/>}/><Kpi label="IRR" value="28%" note="After tax" icon={<Radar/>}/><Kpi label="Payback" value="3.4 yr" note="From production start" icon={<Database/>}/><Kpi label="Cut-off Grade" value="0.31%" note="Cu equivalent" icon={<Target/>}/></div><div className="grid econ"><section className="panel chart"><PanelTitle title="Annual Cash Flow" sub="USD millions"/><ResponsiveContainer width="100%" height={290}><BarChart data={cashflow}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="year"/><YAxis/><Tooltip/><Bar dataKey="value" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></section><section className="panel"><PanelTitle title="Core Assumptions" sub="Pre-feasibility inputs"/>{[['Metal price','$9,800/t'],['Recovery','87%'],['OPEX','$42/t'],['CAPEX','$126M'],['Mine life','14 years']].map(([a,b])=><div className="assumption" key={a}><span>{a}</span><b>{b}</b></div>)}</section></div></>}

function Risk(){return <><Title eyebrow="RISK · SCENARIO · ESG" title="Risk & Sustainability" sub="Understand value drivers, downside exposure and sustainability indicators."/><div className="grid econ"><section className="panel chart"><PanelTitle title="Sensitivity Tornado" sub="Relative impact on project NPV"/><ResponsiveContainer width="100%" height={300}><BarChart data={risk} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number"/><YAxis dataKey="name" type="category" width={90}/><Tooltip/><Bar dataKey="value" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer></section><section className="panel"><PanelTitle title="ESG Snapshot" sub="Continuous audit"/><div className="esg"><div><Globe2/><span>Carbon intensity</span><b>Low</b></div><div><Radar/><span>TRIFR</span><b>0.84</b></div><div><ShieldCheck/><span>SLO</span><b>Stable</b></div><div><Database/><span>Water recycle</span><b>71%</b></div></div></section></div></>}
