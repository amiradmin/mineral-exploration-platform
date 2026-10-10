import React, { useMemo, useState } from 'react'
import {
  Activity, BarChart3, Beaker, Bot, Boxes, CircleDot, Database, FlaskConical,
  Layers3, Map, Mountain, Orbit, Radar, Search, Settings2, ShieldCheck, Sparkles,
  Target, Waves
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { drillholes, elements, evidenceFactors, targets } from './mockData'

type Page='overview'|'map'|'targets'|'drillholes'|'subsurface'|'geoscience'|'ai'|'qaqc'

const nav=[
  {id:'overview',label:'Exploration Overview',icon:BarChart3},
  {id:'map',label:'GIS Exploration Map',icon:Map},
  {id:'targets',label:'Target Intelligence',icon:Target},
  {id:'drillholes',label:'Drillhole Manager',icon:CircleDot},
  {id:'subsurface',label:'3D Subsurface',icon:Boxes},
  {id:'geoscience',label:'Geochem & Geophysics',icon:Waves},
  {id:'ai',label:'AI Prospectivity',icon:Sparkles},
  {id:'qaqc',label:'Data QA / QC',icon:ShieldCheck},
] as const

export default function App(){
  const [page,setPage]=useState<Page>('overview')
  const [selected,setSelected]=useState(targets[0])
  const [assistantOpen,setAssistantOpen]=useState(false)
  const [query,setQuery]=useState('')
  const [notice,setNotice]=useState('')
  const matches=targets.filter(t=>`${t.id} ${t.name} ${t.commodity} ${t.deposit}`.toLowerCase().includes(query.trim().toLowerCase()))
  const exportDemo=(brief=false)=>{const body=brief?`# TerraScope demonstration brief\n\nSIMULATED DATA — DO NOT USE FOR EXPLORATION DECISIONS\n\n${targets.map(t=>`${t.id} ${t.name}: ${t.aiScore}/100, ${t.action}`).join('\n')}\n\nNo live model or real survey data connected.`:JSON.stringify({demo:true,targets,drillholes,elements},null,2);const blob=new Blob([body],{type:brief?'text/markdown':'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=brief?'terrascope-demo-brief.md':'terrascope-demo-snapshot.json';a.click();URL.revokeObjectURL(url);setNotice(brief?'Demo brief downloaded':'Demo snapshot exported')}

  return <div className="app">
    <aside className="sidebar">
      <div className="brand">
        <div className="logo"><Mountain size={24}/></div>
        <div><b>TerraScope AI</b><span>Mineral Exploration Platform</span></div>
      </div>

      <div className="nav-group-label">COMMAND CENTER</div>
      <nav>{nav.map(n=>{const Icon=n.icon;return <button key={n.id} className={page===n.id?'nav active':'nav'} onClick={()=>setPage(n.id as Page)}><Icon size={17}/><span>{n.label}</span></button>})}</nav>

      <div className="sidebar-foot">
        <div className="system-card">
          <div className="system-head"><Activity size={15}/><b>Exploration Engine</b><span>ONLINE</span></div>
          <small>Presentation mode · sample datasets</small>
          <div className="system-line"><i style={{width:'92%'}}/></div>
        </div>
      </div>
    </aside>

    <main>
      <header>
        <div className="search search-wrapper"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search target ID, name or commodity..." aria-label="Search targets"/>{query&&<div className="search-results">{matches.length?matches.map(t=><button key={t.id} onClick={()=>{setSelected(t);setPage("targets");setQuery("")}}>{t.id} · {t.name} ({t.commodity})</button>):<span>No demo targets found</span>}</div>}</div>
        <div className="project-pill"><span>PROJECT</span><b>Central Tethyan Belt</b></div>
        <div className="live"><i/> DEMO DATA</div>
        <button className="icon-btn" onClick={()=>setAssistantOpen(!assistantOpen)}><Bot size={17}/></button>
        <div className="avatar">GA</div>
      </header>

      <div className="demo-banner"><b>DEMONSTRATION DATA</b> All maps, drillhole results, model scores and recommendations are illustrative. No live GIS, backend or trained AI model is connected.</div>
      {notice&&<div className="toast" role="status">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
      <div className="content" onClick={e=>{const btn=(e.target as HTMLElement).closest("button");if(btn?.dataset.action==="export")exportDemo();if(btn?.dataset.action==="brief")exportDemo(true)}}>
        {page==='overview'&&<Overview openTarget={(t)=>{setSelected(t);setPage('targets')}}/>}
        {page==='map'&&<ExplorationMap selected={selected} setSelected={setSelected}/>}
        {page==='targets'&&<TargetIntelligence selected={selected} setSelected={setSelected}/>}
        {page==='drillholes'&&<DrillholeManager/>}
        {page==='subsurface'&&<Subsurface/>}
        {page==='geoscience'&&<Geoscience/>}
        {page==='ai'&&<AIProspectivity selected={selected}/>}
        {page==='qaqc'&&<QAQC/>}
      </div>
    </main>

    {assistantOpen&&<AssistantPanel close={()=>setAssistantOpen(false)}/>}
  </div>
}

function Title({eyebrow,title,sub,actions=true}:{eyebrow:string,title:string,sub:string,actions?:boolean}){
  return <div className="title">
    <div><small>{eyebrow}</small><h1>{title}</h1><p>{sub}</p></div>
    {actions&&<div className="title-actions"><button className="secondary" data-action="export"><Database size={15}/> Export Demo Snapshot</button><button className="primary" data-action="brief"><Sparkles size={15}/> Generate Demo Brief</button></div>}
  </div>
}

function PanelTitle({title,sub,action}:{title:string,sub:string,action?:React.ReactNode}){
  return <div className="panel-title"><div><h3>{title}</h3><p>{sub}</p></div>{action}</div>
}

function Kpi({label,value,note,icon}:{label:string,value:string,note:string,icon:any}){
  return <div className="kpi"><div className="kpi-icon">{icon}</div><div><span>{label}</span><b>{value}</b><small>{note}</small></div></div>
}

function Overview({openTarget}:{openTarget:(t:any)=>void}){
  return <>
    <Title eyebrow="EXPLORATION COMMAND CENTER" title="Mineral Exploration Intelligence" sub="Integrated geological, geochemical, geophysical and drilling intelligence for target generation."/>
    <div className="kpis">
      <Kpi label="Exploration Area" value="2,480 km²" note="3 active licenses" icon={<Map/>}/>
      <Kpi label="Priority Targets" value="7" note="24 total ranked targets" icon={<Target/>}/>
      <Kpi label="Drillholes" value="126" note="31.4 km drilled" icon={<CircleDot/>}/>
      <Kpi label="Data Quality" value="96.8%" note="QA/QC validated" icon={<ShieldCheck/>}/>
    </div>

    <div className="grid hero-grid">
      <section className="panel map-panel"><PanelTitle title="Integrated Prospectivity Map" sub="Geology · structures · geochemistry · geophysics · AI"/><MapPanel onSelect={openTarget}/></section>
      <section className="panel">
        <PanelTitle title="Priority Targets" sub="Ranked by multi-source evidence"/>
        <div className="target-list">{targets.slice(0,5).map(t=><button className="target-row" key={t.id} onClick={()=>openTarget(t)}>
          <span className={'rank '+t.priority.toLowerCase()}>{t.aiScore}</span>
          <div><b>{t.name}</b><small>{t.id} · {t.commodity} · {t.stage}</small></div>
          <div className="pos"><b>{t.confidence}%</b><small>confidence</small></div>
        </button>)}</div>
      </section>
    </div>

    <div className="grid dashboard-lower">
      <section className="panel">
        <PanelTitle title="Exploration Pipeline" sub="Current program maturity"/>
        <div className="pipeline">
          {[
            ['Regional Screening',100],['Target Generation',82],['Field Mapping',71],['Sampling',64],['Geophysics',52],['Drilling',31]
          ].map(([name,val])=><div className="pipeline-row" key={String(name)}><span>{name}</span><div><i style={{width:val+'%'}}/></div><b>{val}%</b></div>)}
        </div>
      </section>
      <section className="panel">
        <PanelTitle title="Latest Exploration Signals" sub="Automatically surfaced from synchronized datasets"/>
        <div className="signal-list">
          <Signal icon={<Radar/>} title="Magnetic anomaly strengthened" text="North Ridge residual magnetic response aligns with the interpreted intrusive contact." tag="+12 score"/>
          <Signal icon={<FlaskConical/>} title="Cu anomaly cluster confirmed" text="Six adjacent soil samples exceed the project P95 copper threshold." tag="High"/>
          <Signal icon={<Orbit/>} title="Structural intersection detected" text="Two regional fault splays converge beneath Target T-001." tag="AI"/>
        </div>
      </section>
      <section className="panel health-panel">
        <PanelTitle title="Data Coverage" sub="Project-wide completeness"/>
        <Donut value={93}/>
        <div className="coverage-grid"><span>Geology <b>98%</b></span><span>Geochem <b>94%</b></span><span>Geophysics <b>91%</b></span><span>Drilling <b>88%</b></span></div>
      </section>
    </div>
  </>
}

function Signal({icon,title,text,tag}:{icon:any,title:string,text:string,tag:string}){
 return <div className="signal"><div className="signal-icon">{icon}</div><div><b>{title}</b><p>{text}</p></div><span>{tag}</span></div>
}

function MapPanel({onSelect,layers}:{onSelect?:(t:any)=>void,layers?:Record<string,boolean>}){
  return <div className="mapbox">
    <div className="terrain terrain-a"/><div className="terrain terrain-b"/><div className="terrain terrain-c"/>
    {layers?.Geology!==false&&<><div className="geo-unit unit-a"/><div className="geo-unit unit-b"/></>}
    {layers?.Structures!==false&&<><div className="fault f1"/><div className="fault f2"/><div className="fault f3"/></>}
    {layers?.Magnetics!==false&&<><div className="magnetic m1"/><div className="magnetic m2"/></>}
    {layers?.Prospectivity!==false&&targets.map(t=><button key={t.id} onClick={()=>onSelect?.(t)} className={'pin '+t.priority.toLowerCase()} style={{left:t.x+'%',top:t.y+'%'}}><span>{t.aiScore}</span><small>{t.id}</small></button>)}
    <div className="north">N<div>↑</div></div>
    <div className="scale">0 <i/> 10 km</div>
    <div className="legend">
      <b>AI Prospectivity</b>
      <div className="heat"/>
      <span>Low <em>Moderate</em><strong>Very high</strong></span>
      <small><i className="fault-key"/> interpreted fault &nbsp; <i className="sample-key"/> anomaly</small>
    </div>
    <span className="region r1">Northern Structural Corridor</span>
    <span className="region r2">Central Intrusive Complex</span>
  </div>
}

function ExplorationMap({selected,setSelected}:{selected:any,setSelected:(x:any)=>void}){
 const [layers,setLayers]=useState<Record<string,boolean>>({Geology:true,Structures:true,Geochemistry:true,Magnetics:true,Radiometrics:false,RemoteSensing:true,Drillholes:true,Prospectivity:true})
 const layerList=[
   ['Geology',Layers3],['Structures',Orbit],['Geochemistry',FlaskConical],['Magnetics',Radar],['Radiometrics',Activity],['RemoteSensing',Map],['Drillholes',CircleDot],['Prospectivity',Sparkles]
 ] as const
 return <>
  <Title eyebrow="GEOSPATIAL INTELLIGENCE" title="GIS Exploration Map" sub="Fuse regional geology, structures, surface geochemistry, geophysics, remote sensing and drilling."/>
  <div className="explore">
    <section className="panel layers">
      <PanelTitle title="Map Layers" sub="Evidence stack"/>
      {layerList.map(([label,Icon])=><label key={label}><input checked={layers[label]} onChange={()=>setLayers({...layers,[label]:!layers[label]})} type="checkbox"/><Icon size={14}/><span>{label}</span></label>)}
      <div className="layer-foot"><Settings2 size={14}/><span>Layer opacity & symbology</span></div>
    </section>
    <section className="panel map-workspace"><MapPanel onSelect={setSelected} layers={layers}/><p className="map-layer-note">Schematic overlays only. Other GIS layers require real geospatial datasets.</p></section>
    <section className="panel inspector">
      <span className={'priority-label '+selected.priority.toLowerCase()}>{selected.priority} PRIORITY</span>
      <h2>{selected.name}</h2><p>{selected.id} · {selected.commodity} target</p>
      <Score label="AI Prospectivity" value={selected.aiScore}/>
      <Score label="Model Confidence" value={selected.confidence}/>
      <Score label="Data Completeness" value={selected.completeness}/>
      <div className="insight-box"><Sparkles size={15}/><div><b>Why this target?</b><p>{selected.rationale}</p></div></div>
      <div className="decision"><span>Recommended action</span><b>{selected.action}</b></div>
    </section>
  </div>
 </>
}

function Score({label,value}:{label:string,value:number}){
 return <div className="scoreline"><div><span>{label}</span><b>{value}%</b></div><div className="bar"><i style={{width:value+'%'}}/></div></div>
}

function TargetIntelligence({selected,setSelected}:{selected:any,setSelected:(x:any)=>void}){
 return <>
  <Title eyebrow="TARGET GENERATION & RANKING" title="Target Intelligence" sub="Explainable ranking based on geology, structure, geochemistry, geophysics and remote sensing."/>
  <div className="target-tabs">{targets.map(t=><button key={t.id} className={selected.id===t.id?'active':''} onClick={()=>setSelected(t)}><b>{t.id}</b><span>{t.name}</span><em>{t.aiScore}</em></button>)}</div>
  <div className="grid target-summary">
    <section className="panel big-score"><span>COMPOSITE PROSPECTIVITY</span><b>{selected.aiScore}</b><small>/100</small><div className={'priority-label '+selected.priority.toLowerCase()}>{selected.priority} PRIORITY</div></section>
    <section className="panel target-detail"><span>Target</span><h2>{selected.name}</h2><p>{selected.commodity} · {selected.deposit}</p><div><small>Stage</small><b>{selected.stage}</b></div><div><small>Next Action</small><b>{selected.action}</b></div></section>
    <section className="panel confidence-card"><span>MODEL CONFIDENCE</span><Donut value={selected.confidence}/><p>{selected.completeness}% data completeness</p></section>
  </div>
  <div className="grid two lower">
    <section className="panel"><PanelTitle title="Evidence Contribution" sub="Contribution to composite prospectivity score"/>
      {evidenceFactors.map((f,i)=><div className="factor" key={f.label}><span><i>{i+1}</i>{f.label}</span><div><i style={{width:Math.min(100,f.value + (selected.aiScore-75)/3)+'%'}}/></div><b>{f.value}%</b></div>)}
    </section>
    <section className="panel"><PanelTitle title="AI Geological Rationale" sub="Traceable decision explanation"/>
      <div className="ai-rationale"><Sparkles/><p>{selected.rationale}</p></div>
      <div className="evidence-chips">{selected.evidence.map((x:string)=><span key={x}>✓ {x}</span>)}</div>
      <div className="recommendation-card"><span>RECOMMENDATION</span><b>{selected.action}</b><p>Advance only after confirming the listed field evidence and maintaining QA/QC thresholds.</p></div>
    </section>
  </div>
 </>
}

function DrillholeManager(){
 return <>
  <Title eyebrow="DRILLING PROGRAM" title="Drillhole Manager" sub="Monitor planned and completed holes, depth, intercepts, lithology and assay highlights."/>
  <div className="kpis">
    <Kpi label="Total Drillholes" value="126" note="82 completed" icon={<CircleDot/>}/>
    <Kpi label="Total Metres" value="31.4 km" note="+2.8 km this campaign" icon={<Activity/>}/>
    <Kpi label="Best Cu Intercept" value="24 m @ 1.8%" note="DH-021" icon={<FlaskConical/>}/>
    <Kpi label="Core Recovery" value="97.2%" note="Campaign average" icon={<ShieldCheck/>}/>
  </div>
  <div className="grid drill-grid">
    <section className="panel"><PanelTitle title="Drill Program" sub="Current campaign status"/>
      <div className="drill-table table-head"><span>Hole ID</span><span>Depth</span><span>Az / Dip</span><span>Status</span><span>Best Intercept</span></div>
      {drillholes.map(h=><div className="drill-table" key={h.id}><b>{h.id}</b><span>{h.depth} m</span><span>{h.azimuth}° / {h.dip}°</span><span><i className={'status-dot '+h.status.toLowerCase().replace(' ','-')}/>{h.status}</span><strong>{h.intercept}</strong></div>)}
    </section>
    <section className="panel drill-profile"><PanelTitle title="DH-021 Downhole Profile" sub="Lithology and copper assay"/>
      <div className="hole-scale">{[0,100,200,300,400].map(x=><span key={x}>{x}m</span>)}</div>
      <div className="hole-track">
        <div className="lith basalt" style={{height:'25%'}}>Basalt</div>
        <div className="lith diorite" style={{height:'40%'}}>Diorite</div>
        <div className="lith altered" style={{height:'35%'}}>Altered intrusive</div>
        <div className="ore-zone" style={{top:'58%',height:'12%'}}><b>1.8% Cu</b><span>24 m</span></div>
      </div>
    </section>
  </div>
 </>
}

function Subsurface(){
 const [view,setView]=useState('Perspective')
 return <>
  <Title eyebrow="SUBSURFACE INTERPRETATION" title="3D Geological Model" sub="Visualize terrain, interpreted lithologies, structures, target volumes and drillhole traces."/>
  <section className="panel model-panel">
    <div className="model-toolbar">{["Perspective","Sections","Ore Shells","Drillholes","Faults"].map(x=><button key={x} onClick={()=>setView(x)} className={view===x?"active":""}>{x}</button>)}</div>
    <div className={"model-3d model-view-"+view.toLowerCase().replace(" ","-")}>
      <div className="strata s1"/><div className="strata s2"/><div className="strata s3"/>
      <div className="orebody o1"/><div className="orebody o2"/>
      {[18,31,45,57,69,81].map((x,i)=><div className="drill-line" key={x} style={{left:x+'%',height:(46+i%3*10)+'%',transform:`rotate(${-12+i*3}deg)`}}><i/></div>)}
      <div className="model-caption"><b>Central Intrusive Complex</b><span>Interpreted porphyry system · looking NE</span></div>
    </div>
    <div className="model-legend"><span><i className="lg1"/> Volcanics</span><span><i className="lg2"/> Intrusive</span><span><i className="lg3"/> Alteration shell</span><span><i className="lg4"/> High-grade target</span></div>
  </section>
 </>
}

function Geoscience(){
 const [element,setElement]=useState('Cu')
 const activeElement=elements.find(e=>e.symbol===element) || elements[0]
 const chart=useMemo(()=>elements.map(e=>({name:e.symbol,value:e.anomalies})),[])
 return <>
  <Title eyebrow="MULTI-DOMAIN GEOSCIENCE" title="Geochemistry & Geophysics" sub="Identify anomalous populations and spatial coincidence across exploration datasets."/>
  <div className="element-tabs">{elements.map(e=><button key={e.symbol} className={e.symbol===element?'active':''} onClick={()=>setElement(e.symbol)}><b>{e.symbol}</b><span>{e.name}</span></button>)}</div>
  <div className="grid geo-grid">
    <section className="panel chart"><PanelTitle title="Anomaly Counts by Element" sub="Samples above project P95"/>
      <ResponsiveContainer width="100%" height={290}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
    </section>
    <section className="panel"><PanelTitle title={`${activeElement.name} (illustrative distribution)`} sub="Synthetic histogram · not actual laboratory assays"/>
      <div className="stats-grid"><div><span>P50</span><b>86 ppm</b></div><div><span>P90</span><b>241 ppm</b></div><div><span>P95</span><b>418 ppm</b></div><div><span>Max</span><b>2,940 ppm</b></div></div>
      <div className="histogram">{[22,28,31,38,45,65,88,70,48,29,18,11].map((v,i)=><i key={i} style={{height:v+'%'}}/>)}</div>
      <small className="chart-note">{activeElement.symbol}: {activeElement.anomalies} simulated anomalies. Percentiles are illustrative copper placeholders.</small>
    </section>
    <section className="panel geophys-card"><PanelTitle title="Geophysical Coverage" sub="Processed survey products"/>
      {['Total Magnetic Intensity','Residual Magnetics','Analytic Signal','Gravity Bouguer','Radiometric K/Th/U'].map((x,i)=><div className="survey-row" key={x}><span>{x}</span><div><i style={{width:(96-i*5)+'%'}}/></div><b>{96-i*5}%</b></div>)}
    </section>
  </div>
 </>
}

function AIProspectivity({selected}:{selected:any}){
 return <>
  <Title eyebrow="EXPLAINABLE GEOAI" title="AI Prospectivity" sub="Transparent evidence fusion for target ranking, anomaly detection and next-action recommendation."/>
  <div className="grid ai-grid">
    <section className="panel ai-hero"><div><span>MODEL</span><b>Prospectivity Fusion v2.4</b><p>Combines spatial evidence from geology, structures, geochemistry, magnetics, remote sensing and drilling.</p></div><div className="model-ready"><i/>DEMO ONLY</div></section>
    <section className="panel"><PanelTitle title="Selected Target" sub={selected.id}/><h2>{selected.name}</h2><div className="huge-score">{selected.aiScore}</div><p className="muted">Prospectivity score</p></section>
  </div>
  <div className="grid two lower">
    <section className="panel"><PanelTitle title="Feature Attribution" sub="Why the model ranked this target highly"/>
      {[
        ['Structural intersection',34],['Cu geochemical anomaly',27],['Magnetic anomaly',21],['Alteration signature',11],['Favorable lithology',7]
      ].map(([n,v])=><div className="attribution" key={String(n)}><span>{n}</span><div><i style={{width:(Number(v)*2.5)+'%'}}/></div><b>{v}%</b></div>)}
    </section>
    <section className="panel"><PanelTitle title="GeoAI Recommendation" sub="Suggested next technical action"/><div className="copilot-answer"><Bot/><div><b>Advance T-001 to drill targeting.</b><p>Prioritize an oriented drilling fence across the interpreted fault intersection. Before collar finalization, acquire infill IP/resistivity and confirm the surface Cu-Mo anomaly with duplicate sampling.</p></div></div><div className="prompt-box">Ask GeoAI about this target...<Sparkles size={15}/></div></section>
  </div>
 </>
}

function QAQC(){
 const items=[['Collar coordinates',100,'Passed'],['Downhole survey',98,'Passed'],['Assay intervals',95,'Review'],['Sample IDs',99,'Passed'],['Lithology intervals',94,'Review'],['Core recovery',97,'Passed']]
 return <>
  <Title eyebrow="DATA GOVERNANCE" title="Exploration Data QA / QC" sub="Validate drillhole, assay, sampling and spatial data before interpretation and AI scoring."/>
  <div className="kpis"><Kpi label="Overall Quality" value="96.8%" note="Project validation score" icon={<ShieldCheck/>}/><Kpi label="Critical Errors" value="0" note="No blocking issues" icon={<Activity/>}/><Kpi label="Warnings" value="7" note="Awaiting review" icon={<Radar/>}/><Kpi label="Validated Records" value="48,216" note="Across 8 datasets" icon={<Database/>}/></div>
  <div className="grid two lower">
    <section className="panel"><PanelTitle title="Validation Domains" sub="Automated rule checks"/>
      {items.map(([n,v,s])=><div className="qaqc-row" key={String(n)}><span>{n}</span><div><i style={{width:v+'%'}}/></div><b>{v}%</b><em className={s==='Passed'?'passed':'review'}>{s}</em></div>)}
    </section>
    <section className="panel"><PanelTitle title="Open Data Issues" sub="Non-blocking exceptions"/>
      {['3 duplicate sample identifiers','2 overlapping lithology intervals','1 missing downhole survey station','1 coordinate outside license boundary'].map((x,i)=><div className="issue-row" key={x}><span>{i+1}</span><div><b>{x}</b><small>{i<2?'Assay / geology import':'Spatial validation'}</small></div><em>Review</em></div>)}
    </section>
  </div>
 </>
}

function Donut({value}:{value:number}){return <div className="donut" style={{background:`conic-gradient(var(--accent) ${value*3.6}deg,#173028 0)`}}><div><b>{value}%</b><span>complete</span></div></div>}

function AssistantPanel({close}:{close:()=>void}){
 return <aside className="assistant">
  <div className="assistant-head"><div><Sparkles/><span><b>GeoAI Copilot</b><small>Exploration assistant</small></span></div><button onClick={close}>×</button></div>
  <div className="assistant-body">
    <div className="user-msg">Why is North Ridge ranked high?</div>
    <div className="ai-msg"><b>North Ridge is supported by four coincident evidence groups.</b><p>The strongest contributors are the structural intersection, Cu-Mo geochemical anomaly and residual magnetic response. Hydrothermal alteration and favorable intrusive lithology add secondary support.</p><div className="ai-list"><span>34% Structural control</span><span>27% Geochemistry</span><span>21% Magnetics</span><span>18% Other evidence</span></div></div>
  </div>
  <div className="assistant-input">Ask about targets, datasets or drilling...<button><Sparkles size={14}/></button></div>
 </aside>
}
