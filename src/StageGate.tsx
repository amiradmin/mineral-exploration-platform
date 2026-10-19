import React from 'react'
import { Activity, ArrowRight, BarChart3, CircleDollarSign, Compass, FlaskConical, Globe2, ShieldAlert, TrendingUp, Pickaxe, Layers, CheckCircle2 } from 'lucide-react'
import './StageGate.css'
import { createDecisionSnapshot, type DecisionContext, type Scenario } from './decisionPipeline'
import { targets } from './mockData'
import ExplorationEvaluator from './ExplorationEvaluator'
import ReserveSimulator from './ReserveSimulator'
import MiningEconomics from './MiningEconomics'
import RiskScenario from './RiskScenario'
import FinancialValuator from './FinancialValuator'
import ESGGovernance from './ESGGovernance'

export type DecisionModuleId = 'exploration-evaluator' | 'reserve-simulator' | 'economics-engine' | 'risk-scenarios' | 'financial-valuator' | 'esg-governance'
export const decisionModules = [
 { id:'exploration-evaluator', name:'Exploration Evaluator', gate:'Gate 1', phase:'Screening & Targets', icon:Compass, summary:'Screen prospects and prioritize geological targets', kpis:[['Screened prospects','24'],['Priority targets','7'],['Evidence coverage','93%']], signals:['Geology, geochemistry and geophysics evidence fusion','Target ranking and drill-ready screening criteria','Go / Hold / Reject target recommendations'], dependencies:['Geologist Workbench','Exploration Overview','GIS Exploration Map','Target Intelligence','AI Prospectivity','Geochemistry & Geophysics'] },
 { id:'reserve-simulator', name:'Reserve Simulator', gate:'Gate 2', phase:'Advanced Drilling', icon:Layers, summary:'Explore resource potential and drilling uncertainty', kpis:[['Modelled volume','18.4 Mm³'],['Scenario grade','0.84% Cu'],['Drillholes modelled','126']], signals:['Drillhole coverage and interpreted ore geometry','Grade-tonnage sensitivity scenarios','Resource confidence gaps and proposed infill drilling'], dependencies:['Drillhole Manager','3D Subsurface','Daily Operations','Data QA / QC'] },
 { id:'economics-engine', name:'Mining Economics Engine', gate:'Gate 3', phase:'Pre-Feasibility', icon:CircleDollarSign, summary:'Test operating assumptions and preliminary viability', kpis:[['Unit cost','$41/t'],['Modelled recovery','87%'],['Scenario margin','23%']], signals:['Mining and processing cost assumptions','Commodity price and recovery sensitivity','Pre-feasibility economic screening'], dependencies:['Reserve Simulator','Risk & Scenario Analyzer'] },
 { id:'risk-scenarios', name:'Risk & Scenario Analyzer', gate:'Gates 3–4', phase:'Risk Assessment', icon:ShieldAlert, summary:'Stress-test outcomes against key uncertainties', kpis:[['Scenario cases','12'],['Critical risks','3'],['Sensitivity drivers','5']], signals:['Low / Base / High scenario comparison','Geological, technical and market uncertainty','Risk register with mitigation ownership'], dependencies:['Executive Portfolio','Financial Valuator','Data QA / QC'] },
 { id:'financial-valuator', name:'Financial Valuator', gate:'Gate 4', phase:'Bankable Feasibility', icon:TrendingUp, summary:'Compare discounted project cash-flow scenarios', kpis:[['NPV','$128M'],['IRR','19.6%'],['Payback','5.2 yr']], signals:['NPV, IRR and annual cash-flow scenarios','Capital requirements and payback sensitivity','Investment readiness and assumptions audit'], dependencies:['Executive Portfolio','Daily Operations','Risk & Scenario Analyzer'] },
 { id:'esg-governance', name:'ESG & Governance Tracker', gate:'Continuous', phase:'Across All Gates', icon:Globe2, summary:'Maintain ESG evidence and auditability throughout the lifecycle', kpis:[['Open ESG actions','8'],['Permits reviewed','11/14'],['Evidence completeness','82%']], signals:['Permitting, water, land and community obligations','Decision records and governance sign-offs','Continuous audit trail and stage-gate controls'], dependencies:['Daily Operations','Data QA / QC','Executive Portfolio'] },
] as const

function ModuleArtwork({id}:{id:DecisionModuleId}){
 const shared={fill:'none',stroke:'#deb28b',strokeWidth:3,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}
 return <svg className="sg-symbol" viewBox="0 0 90 76" role="img" aria-label={id.replaceAll('-',' ')} xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="sg-copper" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#ffe3ba"/><stop offset=".48" stopColor="#d9a47b"/><stop offset="1" stopColor="#82523e"/></linearGradient><linearGradient id="sg-bronze" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#f7d6a6"/><stop offset="1" stopColor="#926044"/></linearGradient></defs>
  {id==='exploration-evaluator'&&<g {...shared}><path d="M13 55 L56 11" strokeWidth="9" stroke="#463329"/><path d="M13 55 L56 11" strokeWidth="5" stroke="url(#sg-copper)"/><path d="M29 14 Q50 0 75 23 L64 24 Q49 13 35 27 Z" fill="url(#sg-copper)" stroke="#51382f" strokeWidth="2"/><circle cx="58" cy="47" r="16" fill="#142b39" stroke="url(#sg-copper)" strokeWidth="5"/><path d="M69 59l14 14" stroke="url(#sg-copper)" strokeWidth="7"/><path d="M51 47a7 7 0 0 1 7-7" stroke="#a5d6e4" strokeWidth="2"/></g>}
  {id==='reserve-simulator'&&<g stroke="#523c32" strokeWidth="2" strokeLinejoin="round"><path d="M13 47L43 31l33 16-31 18z" fill="url(#sg-bronze)"/><path d="M13 47v14l32 12V65z" fill="#a87656"/><path d="M45 65l31-18v14L45 73z" fill="#d6a17b"/><path d="M43 4l-12 44h24z" fill="#d7a780"/><path d="M43 4v42M34 20h17M31 30h24M28 40h30" fill="none"/><path d="M43 4l-7 9h14z" fill="#ffe5bb"/><circle cx="66" cy="58" r="11" fill="url(#sg-copper)"/><path d="M66 47v22M55 58h22" fill="none"/></g>}
  {id==='economics-engine'&&<g stroke="#45362f" strokeWidth="2.5"><path d="M25 8l5 4 7-1 2 7 6 4-3 7 3 7-7 4-2 7-8-1-6 5-6-6-8-1-1-8-6-5 4-7-2-8 8-2 4-7 7 3z" fill="url(#sg-copper)"/><circle cx="25" cy="28" r="12" fill="#2c3441"/><text x="25" y="35" textAnchor="middle" fontSize="21" fontWeight="bold" fill="#f6c69b" stroke="none">$</text><circle cx="61" cy="46" r="20" fill="url(#sg-copper)"/><circle cx="61" cy="46" r="14" fill="#915d48"/><text x="61" y="54" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#fbd9a5" stroke="none">$</text><path d="M65 7l3 4 6-1 1 6 5 3-3 5 2 6-6 2-3 5-5-3-5 2-3-5-5-2 2-6-3-5 6-3 1-6 6 1z" fill="url(#sg-bronze)" transform="translate(-2 -2) scale(.75)"/><circle cx="47" cy="16" r="5" fill="#263644"/></g>}
  {id==='risk-scenarios'&&<g {...shared}><path d="M10 64H82M14 64V7" stroke="url(#sg-copper)" strokeWidth="4"/><path d="M17 62C29 62 27 16 43 14S57 62 78 62" stroke="url(#sg-copper)" strokeWidth="4"/><path d="M43 14V65" strokeDasharray="3 4" stroke="#75a5bb" strokeWidth="2"/><path d="M64 10l8-6 8 15-6 7H60z" fill="url(#sg-copper)" stroke="#604333"/><path d="M70 12v6M70 22v1" stroke="#46362b" strokeWidth="2"/></g>}
  {id==='financial-valuator'&&<g {...shared}><rect x="7" y="5" width="65" height="57" rx="5" fill="#26333e" stroke="url(#sg-copper)" strokeWidth="4"/><path d="M16 51l14-17 10 7 18-21M50 20h8v9" stroke="url(#sg-copper)" strokeWidth="4"/><path d="M16 17h20M16 24h14" stroke="#d8ab80"/><ellipse cx="68" cy="60" rx="13" ry="5" fill="url(#sg-bronze)" stroke="#523b31"/><path d="M55 60v7c0 7 26 7 26 0v-7" fill="#b98663"/><ellipse cx="68" cy="67" rx="13" ry="5" fill="#d9a57e" stroke="#523b31"/><path d="M48 69v-8c0-5 22-5 22 0v8" fill="#946047"/><ellipse cx="59" cy="61" rx="11" ry="5" fill="#dfb187" stroke="#523b31"/></g>}
  {id==='esg-governance'&&<g {...shared}><circle cx="40" cy="37" r="30" stroke="url(#sg-copper)" strokeWidth="4"/><ellipse cx="40" cy="37" rx="14" ry="30" stroke="url(#sg-copper)" strokeWidth="3"/><path d="M10 37h60M17 19h46M17 55h46M40 7v60" stroke="url(#sg-copper)" strokeWidth="2"/><path d="M46 65Q46 42 82 35Q83 69 58 70Q51 70 46 65Z" fill="#bc9c6c" stroke="#604c35" strokeWidth="2"/><path d="M50 68l24-25M61 56l-1-12M61 56l12 3" stroke="#3b624f" strokeWidth="2"/></g>}
 </svg>
}
export function StageGateDashboard({onOpen,context,onContext}:{onOpen:(id:DecisionModuleId)=>void;context:DecisionContext;onContext:(context:DecisionContext)=>void}){
 const snapshot=createDecisionSnapshot(context)
 const upper=decisionModules.slice(0,3)
 const lower=decisionModules.slice(3)
 const card=(m:typeof decisionModules[number])=>{const Icon=m.icon;return <button type="button" key={m.id} className={'sg-art-card sg-art-'+m.id} onClick={()=>onOpen(m.id)} aria-label={'Open '+m.name}>
  <span className="sg-art-icon"><ModuleArtwork id={m.id}/></span>
  <span className="sg-art-copy"><strong>{m.name}</strong><small>{m.gate === 'Continuous' ? 'Continuous audit across all gates' : m.gate + ': ' + m.phase}</small></span>
  <ArrowRight className="sg-art-card-arrow" size={18}/>
 </button>}
 return <div className="sg-wrap sg-reference">
   <div className="sg-heading"><div><span className="sg-eyebrow">EXPLORATION TO INVESTMENT · DECISION INTELLIGENCE</span><h1>Stage-Gate Decision Center</h1><p>From raw geological evidence to boardroom-ready financial scenarios.</p></div></div>
   <section className="sg-architecture" aria-label="Six module stage-gate decision architecture">
    <div className="sg-art-title"><h2>The 6-Module Stage-Gate Decision Architecture</h2><p>Transforming raw geological inputs into boardroom computational outputs.</p></div>
    <div className="sg-art-top">{upper.map(card)}</div>
    <div className="sg-art-flow">
      <div className="sg-art-raw"><span>Raw<br/>Geological<br/>Inputs</span></div>
      <div className="sg-art-tunnel">
       <div className="sg-art-rays" aria-hidden="true">{Array.from({length:9},(_,i)=><span key={i} style={{top:(12+i*9.5)+'%'}}/>)}</div>
       <div className="sg-art-particles" aria-hidden="true">{Array.from({length:52},(_,i)=><i key={i} style={{left:((i*37)%97)+'%',top:((i*61+11)%90+4)+'%',opacity:.25+(i%5)*.14,transform:'scale('+(.65+(i%4)*.2)+')'}}/>)}</div>
       <div className="sg-art-bar sg-bar-1"><span>Gate 1</span><small>Screening &amp; Targets</small></div>
       <div className="sg-art-bar sg-bar-2"><span>Gate 2</span><small>Advanced Drilling</small></div>
       <div className="sg-art-bar sg-bar-3"><span>Gate 3</span><small>Pre-Feasibility</small></div>
       <div className="sg-art-bar sg-bar-4"><span>Gate 4</span><small>Bankable FS</small></div>
      </div>
      <div className="sg-art-result"><span>Financial<br/>Value</span></div>
    </div>
    <div className="sg-art-bottom">{lower.map(card)}</div>
    <p className="sg-art-hint">Select a module to open its decision workspace. ESG and governance span all four gates.</p>
   </section>
   <div className="sg-context"><label>Target <select value={context.targetId} onChange={e=>onContext({...context,targetId:e.target.value})}>{targets.map(t=><option key={t.id} value={t.id}>{t.id} · {t.name}</option>)}</select></label><label>Scenario <select value={context.scenario} onChange={e=>onContext({...context,scenario:e.target.value as Scenario})}><option value="conservative">Conservative</option><option value="base">Base</option><option value="optimistic">Optimistic</option></select></label><span>Shared inputs across all six modules</span></div>
   <div className="sg-summary">
      <div><span>Decision modules</span><strong>06</strong><small>Connected workspaces</small></div>
      <div><span>Stage gates</span><strong>04</strong><small>Screening to feasibility</small></div>
      <div><span>Portfolio targets</span><strong>24</strong><small>Target records</small></div>
      <div><span>Governance scope</span><strong>All gates</strong><small>Continuous oversight</small></div>
   </div>
   <div className="sg-section-title sg-modules-heading"><h2>Module quick access</h2><p>Detailed indicators and links to existing geoscience workspaces.</p></div>
   <div className="sg-grid">{decisionModules.map(m=>{const Icon=m.icon;return <button key={m.id} className="sg-module" onClick={()=>onOpen(m.id)}><div className="sg-module-top"><span className="sg-module-icon"><Icon size={22}/></span><span className="sg-gate-tag">{m.gate}</span></div><h3>{m.name}</h3><p>{m.summary}</p><div className="sg-mini-stats">{<><span><strong>{snapshot.records.find(r=>r.stage===m.id)?.value}</strong><small>{snapshot.records.find(r=>r.stage===m.id)?.label}</small></span><span><strong>{snapshot.records.find(r=>r.stage===m.id)?.verdict}</strong><small>Gate signal</small></span></>}</div><span className="sg-open">Open decision workspace <ArrowRight size={15}/></span></button>})}</div>

 </div>
}
export function DecisionModulePage({id,onBack,onNavigate,context,onContext}:{id:DecisionModuleId,onBack:()=>void,onNavigate:(page:string)=>void;context:DecisionContext;onContext:(context:DecisionContext)=>void}){
 if(id==='exploration-evaluator')return <ExplorationEvaluator context={context} onContext={onContext} onNavigate={onNavigate}/>
 if(id==='reserve-simulator')return <ReserveSimulator context={context} onContext={onContext} onNavigate={onNavigate}/>
 if(id==='economics-engine')return <MiningEconomics context={context} onContext={onContext} onNavigate={onNavigate}/>
 if(id==='risk-scenarios')return <RiskScenario context={context} onContext={onContext} onNavigate={onNavigate}/>
 if(id==='financial-valuator')return <FinancialValuator context={context} onContext={onContext} onNavigate={onNavigate}/>
 if(id==='esg-governance')return <ESGGovernance context={context} onContext={onContext} onNavigate={onNavigate}/>
 const snapshot=createDecisionSnapshot(context)
 const current=snapshot.records.find(r=>r.stage===id)!
 const m=decisionModules.find(x=>x.id===id)!
 const Icon=m.icon
 const linked:Record<string,string>={'Geologist Workbench':'geologist','Exploration Overview':'overview','Daily Operations':'operations','Executive Portfolio':'executive','Geochemistry & Geophysics':'geoscience','GIS Exploration Map':'map','Target Intelligence':'targets','AI Prospectivity':'ai','Drillhole Manager':'drillholes','3D Subsurface':'subsurface','Data QA / QC':'qaqc'}
 return <div className="sg-wrap"><button className="sg-back" onClick={onBack}>← Decision Center</button><div className="sg-heading"><div><span className="sg-eyebrow">{m.gate.toUpperCase()} · {m.phase.toUpperCase()}</span><h1><Icon size={29}/> {m.name}</h1><p>{m.summary}</p></div></div>
  <div className="sg-context"><label>Target <select value={context.targetId} onChange={e=>onContext({...context,targetId:e.target.value})}>{targets.map(t=><option key={t.id} value={t.id}>{t.id} · {t.name}</option>)}</select></label><label>Scenario <select value={context.scenario} onChange={e=>onContext({...context,scenario:e.target.value as Scenario})}><option value="conservative">Conservative</option><option value="base">Base</option><option value="optimistic">Optimistic</option></select></label><strong>{snapshot.targetName}</strong></div>
  <div className="sg-summary sg-three"><div><span>{current.label}</span><strong>{current.value}</strong><small>{current.note}</small></div><div><span>Gate indication</span><strong>{current.verdict}</strong><small>Review indicator</small></div><div><span>Shared scenario</span><strong>{context.scenario}</strong><small>Inputs are linked across all six modules</small></div></div>
  <div className="sg-detail-grid"><section className="sg-panel"><div className="sg-section-title"><h2>Decision outputs</h2><p>Information this module must produce before its gate review</p></div>{m.signals.map((s,i)=><div className="sg-output" key={s}><CheckCircle2 size={19}/><div><strong>{String(i+1).padStart(2,'0')}</strong><span>{s}</span></div></div>)}</section><section className="sg-panel"><div className="sg-section-title"><h2>Supporting workspaces</h2><p>Existing exploration screens and planned dependencies</p></div>{m.dependencies.map(d=><div className="sg-dependency" key={d}><span>{d}</span>{linked[d]?<button onClick={()=>onNavigate(linked[d])}>Open <ArrowRight size={14}/></button>:<small>Planned integration</small>}</div>)}</section></div>

 </div>
}
