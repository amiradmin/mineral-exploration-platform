import React from 'react'
import { Activity, ArrowRight, BarChart3, CircleDollarSign, Compass, FlaskConical, Globe2, ShieldAlert, TrendingUp, Pickaxe, Layers, CheckCircle2 } from 'lucide-react'
import './StageGate.css'

export type DecisionModuleId = 'exploration-evaluator' | 'reserve-simulator' | 'economics-engine' | 'risk-scenarios' | 'financial-valuator' | 'esg-governance'
export const decisionModules = [
 { id:'exploration-evaluator', name:'Exploration Evaluator', gate:'Gate 1', phase:'Screening & Targets', icon:Compass, summary:'Screen prospects and prioritize geological targets', kpis:[['Screened prospects','24'],['Priority targets','7'],['Evidence coverage','93%']], signals:['Geology, geochemistry and geophysics evidence fusion','Target ranking and drill-ready screening criteria','Go / Hold / Reject target recommendations'], dependencies:['GIS Exploration Map','Target Intelligence','AI Prospectivity'] },
 { id:'reserve-simulator', name:'Reserve Simulator', gate:'Gate 2', phase:'Advanced Drilling', icon:Layers, summary:'Explore resource potential and drilling uncertainty', kpis:[['Simulated volume','18.4 Mm³'],['Scenario grade','0.84% Cu'],['Drillholes modelled','126']], signals:['Drillhole coverage and interpreted ore geometry','Grade-tonnage sensitivity scenarios','Resource confidence gaps and proposed infill drilling'], dependencies:['Drillhole Manager','3D Subsurface','Data QA / QC'] },
 { id:'economics-engine', name:'Mining Economics Engine', gate:'Gate 3', phase:'Pre-Feasibility', icon:CircleDollarSign, summary:'Test operating assumptions and preliminary viability', kpis:[['Demo unit cost','$41/t'],['Modelled recovery','87%'],['Scenario margin','23%']], signals:['Mining and processing cost assumptions','Commodity price and recovery sensitivity','Pre-feasibility economic screening'], dependencies:['Reserve Simulator','Risk & Scenario Analyzer'] },
 { id:'risk-scenarios', name:'Risk & Scenario Analyzer', gate:'Gates 3–4', phase:'Risk Assessment', icon:ShieldAlert, summary:'Stress-test outcomes against key uncertainties', kpis:[['Scenario cases','12'],['Critical risks','3'],['Sensitivity drivers','5']], signals:['Low / Base / High scenario comparison','Geological, technical and market uncertainty','Risk register with mitigation ownership'], dependencies:['Mining Economics Engine','Financial Valuator'] },
 { id:'financial-valuator', name:'Financial Valuator', gate:'Gate 4', phase:'Bankable Feasibility', icon:TrendingUp, summary:'Compare discounted project cash-flow scenarios', kpis:[['Illustrative NPV','$128M'],['Illustrative IRR','19.6%'],['Payback','5.2 yr']], signals:['NPV, IRR and annual cash-flow scenarios','Capital requirements and payback sensitivity','Investment readiness and assumptions audit'], dependencies:['Mining Economics Engine','Risk & Scenario Analyzer'] },
 { id:'esg-governance', name:'ESG & Governance Tracker', gate:'Continuous', phase:'Across All Gates', icon:Globe2, summary:'Maintain ESG evidence and auditability throughout the lifecycle', kpis:[['Open ESG actions','8'],['Permits reviewed','11/14'],['Evidence completeness','82%']], signals:['Permitting, water, land and community obligations','Decision records and governance sign-offs','Continuous audit trail and stage-gate controls'], dependencies:['All gates','Data QA / QC'] },
] as const

export function StageGateDashboard({onOpen}:{onOpen:(id:DecisionModuleId)=>void}){
 return <div className="sg-wrap">
   <div className="sg-heading"><div><span className="sg-eyebrow">EXPLORATION TO INVESTMENT · DECISION INTELLIGENCE</span><h1>Stage-Gate Decision Center</h1><p>Six coordinated modules connect geological evidence to feasibility and financial decisions.</p></div><span className="sg-demo">SIMULATED DEMO DATA</span></div>
   <div className="sg-summary">
      <div><span>Decision modules</span><strong>06</strong><small>Integrated workspaces</small></div>
      <div><span>Stage gates</span><strong>04</strong><small>Screening → Feasibility</small></div>
      <div><span>Portfolio targets</span><strong>24</strong><small>Synthetic target records</small></div>
      <div><span>Audit coverage</span><strong>All gates</strong><small>Continuous ESG tracking</small></div>
   </div>
   <section className="sg-panel"><div className="sg-section-title"><h2>Decision pipeline</h2><p>Review the evidence required before progressing to the next gate.</p></div>
    <div className="sg-pipeline">{[['01','Screening & Targets'],['02','Advanced Drilling'],['03','Pre-Feasibility'],['04','Bankable Feasibility']].map(([gate,label],i)=><div className="sg-gate" key={gate}><span>GATE {gate}</span><strong>{label}</strong><small>{i===0?'Exploration':i===1?'Resource potential':i===2?'Economic viability':'Investment case'}</small>{i<3&&<ArrowRight className="sg-arrow" size={18}/>}</div>)}</div>
   </section>
   <div className="sg-section-title sg-modules-heading"><h2>Six decision-making modules</h2><p>Select any module to review its KPIs, outputs and supporting workspaces.</p></div>
   <div className="sg-grid">{decisionModules.map(m=>{const Icon=m.icon;return <button key={m.id} className="sg-module" onClick={()=>onOpen(m.id)}><div className="sg-module-top"><span className="sg-module-icon"><Icon size={22}/></span><span className="sg-gate-tag">{m.gate}</span></div><h3>{m.name}</h3><p>{m.summary}</p><div className="sg-mini-stats">{m.kpis.slice(0,2).map(([label,value])=><span key={label}><strong>{value}</strong><small>{label}</small></span>)}</div><span className="sg-open">Open decision workspace <ArrowRight size={15}/></span></button>})}</div>
   <div className="sg-continuous"><Globe2 size={19}/><div><strong>Continuous ESG & Governance</strong><p>Risk, permits, community impact and audit evidence remain visible at every stage.</p></div><button onClick={()=>onOpen('esg-governance')}>Review ESG <ArrowRight size={15}/></button></div>
   <p className="sg-disclaimer">Presentation only. Values, estimates, financial returns, stage status and risk measures are fictional; no reserve classification, mine plan, feasibility study or live valuation engine is implemented.</p>
 </div>
}
export function DecisionModulePage({id,onBack,onNavigate}:{id:DecisionModuleId,onBack:()=>void,onNavigate:(page:string)=>void}){
 const m=decisionModules.find(x=>x.id===id)!
 const Icon=m.icon
 const linked:Record<string,string>={'GIS Exploration Map':'map','Target Intelligence':'targets','AI Prospectivity':'ai','Drillhole Manager':'drillholes','3D Subsurface':'subsurface','Data QA / QC':'qaqc'}
 return <div className="sg-wrap"><button className="sg-back" onClick={onBack}>← Decision Center</button><div className="sg-heading"><div><span className="sg-eyebrow">{m.gate.toUpperCase()} · {m.phase.toUpperCase()}</span><h1><Icon size={29}/> {m.name}</h1><p>{m.summary}</p></div><span className="sg-demo">ILLUSTRATIVE WORKSPACE</span></div>
  <div className="sg-summary sg-three">{m.kpis.map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong><small>Scenario / mock data</small></div>)}</div>
  <div className="sg-detail-grid"><section className="sg-panel"><div className="sg-section-title"><h2>Decision outputs</h2><p>Information this module must produce before its gate review</p></div>{m.signals.map((s,i)=><div className="sg-output" key={s}><CheckCircle2 size={19}/><div><strong>{String(i+1).padStart(2,'0')}</strong><span>{s}</span></div></div>)}</section><section className="sg-panel"><div className="sg-section-title"><h2>Supporting workspaces</h2><p>Existing exploration screens and planned dependencies</p></div>{m.dependencies.map(d=><div className="sg-dependency" key={d}><span>{d}</span>{linked[d]?<button onClick={()=>onNavigate(linked[d])}>Open <ArrowRight size={14}/></button>:<small>Planned integration</small>}</div>)}</section></div>
  <div className="sg-notice"><ShieldAlert size={19}/><span>Module design preview only. These KPIs are synthetic placeholders, not outputs of reserve estimation, economic simulation, investment analysis or compliance audits.</span></div>
 </div>
}
