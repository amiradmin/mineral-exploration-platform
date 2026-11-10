import {useCallback,useEffect,useState} from 'react'
import {AlertTriangle,ArrowRight,BookOpen,CheckCircle2,Clock3,Download,FileText,Layers3,RefreshCw,Scale,ShieldAlert,ShieldCheck,TrendingUp} from 'lucide-react'
import {useAuth} from './auth'
import {targets} from './mockData'
import type {DecisionContext} from './decisionPipeline'
import './ExecutiveDecisionDashboard.css'
type ModuleRoute='exploration-evaluator'|'reserve-simulator'|'economics-engine'|'risk-scenarios'|'financial-valuator'|'esg-governance'|'legal-commercial'
type Brief={
 generated_at:string
 target:{id:string;name:string;commodity:string;stage:string;priority:string}
 programs:{id:number;name:string}[];selected_program_id:number|null;selected_program_name:string|null
 recommendation:'GO_RECORDED'|'HOLD'|'REVIEW';recommendation_rationale:string;decision_is_formal:boolean;fid_eligible:boolean
 blockers:{code:string;message:string;target_id:string|null;module:ModuleRoute}[]
 evidence:{phase:string;data_scale_eligible:boolean;sample_count:number|null;drillholes:number|null;map_scale:string|null;qaqc_approved:boolean;cp_approved:boolean;
  engineering:Record<string,{state:string;updated_at:string|null}>;financial:Record<string,{state:string;updated_at:string|null}>;risk:Record<string,{state:string;updated_at:string|null}>;
  legal:{state:string;record_id:number|null;updated_at:string|null;risk_count:number}}
 financial_summary:{npv_m:null;irr_pct:null;payback_years:null;status:string;latest_scenario:{id:number;illustrative:boolean;created_at:string}|null}
 key_risks:{id:string|number;type:string;title:string;rationale:string;gate:number;module:ModuleRoute}[]
 committee_memo:{id:number;gate:number;body:string;signed_by_id:number|null;signed_at:string|null;signature_type:string|null}|null
 formal_gates:{gate:number;outcome:string;created_at:string|null;decision_id:number|null}[]
 decision_history:{id:number;gate:number;outcome:string;rationale:string;actor:string;created_at:string;policy_version:string}[]
 committee_decisions:{id:number;gate:number;outcome:string;created_at:string}[]
 next_action:string;limitations:string[]
}
const status=(value:string)=>value==='reviewed'||value==='verified'?'Reviewed':value==='pending'||value==='draft'?'Pending review':value==='missing'?'Not recorded':value.replaceAll('_',' ')
const time=(value:string|null)=>value?new Date(value).toLocaleString():'Not recorded'
const display=(value:number|null,unit='')=>value===null?'Not verified':value.toLocaleString()+unit
const moduleName:Record<ModuleRoute,string>={
 'exploration-evaluator':'Exploration / Committee','reserve-simulator':'Reserve & Sampling',
 'economics-engine':'Mining Economics','risk-scenarios':'Risk Analyzer','financial-valuator':'Financial Valuator',
 'esg-governance':'ESG Governance','legal-commercial':'Legal & Commercial'
}
const categories=[
 {name:'Engineering design',key:'engineering',route:'economics-engine' as ModuleRoute,entries:[['alastri','Alastri pit design'],['datamine','Datamine mining schedule'],['rocscience','Rocscience slope review']]},
 {name:'Financial sources',key:'financial',route:'financial-valuator' as ModuleRoute,entries:[['minetrust','MineTrust LOM'],['erp_epc','ERP / EPC capital']]},
 {name:'Risk intelligence',key:'risk',route:'risk-scenarios' as ModuleRoute,entries:[['geotech','Slope / seepage'],['pitram','Fleet reliability'],['market','Commodity history']]}
] as const
export default function ExecutiveDecisionDashboard({context,onContext,onNavigate}:{context:DecisionContext;onContext:(next:DecisionContext)=>void;onNavigate:(page:ModuleRoute)=>void}){
 const {apiFetch}=useAuth()
 const [brief,setBrief]=useState<Brief|null>(null)
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(false)
 const [requestedProgram,setRequestedProgram]=useState<number|null>(null)
 const [revision,setRevision]=useState(0)
 const [showHistory,setShowHistory]=useState(false)
 const targetId=context.targetId
 const load=useCallback(async(signal:AbortSignal)=>{
  const query=requestedProgram===null?'':'?program_id='+requestedProgram
  const response=await apiFetch('/api/targets/'+encodeURIComponent(targetId)+'/executive-brief/'+query,{signal,cache:'no-store'})
  const payload=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(payload.detail||'Executive briefing unavailable ('+response.status+').')
  if(!signal.aborted)setBrief(payload)
 },[apiFetch,targetId,requestedProgram])
 useEffect(()=>{
  const controller=new AbortController()
  setError('');setBrief(null);setLoading(true)
  void load(controller.signal).catch(e=>{if(!controller.signal.aborted)setError(String(e))}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>controller.abort()
 },[load,revision])
 const recommendation=brief?.recommendation
 const severity=recommendation==='GO_RECORDED'?'go':recommendation==='REVIEW'?'review':'hold'
 const exportBrief=()=>{
  if(!brief)return
  const report=[
   '# Executive investment decision brief',
   'Target: '+brief.target.id+' — '+brief.target.name,
   'Program: '+(brief.selected_program_name||'Not linked'),
   'Generated: '+brief.generated_at,
   'Investment status: '+brief.recommendation,
   'Rationale: '+brief.recommendation_rationale,
   'FID evidence check: '+(brief.fid_eligible?'Passed implemented checks':'Blocked'),
   '',
   '## Required actions',...brief.blockers.map(b=>'- '+b.message+' ('+moduleName[b.module]+')'),
   '',
   '## Critical risks',...brief.key_risks.map(r=>'- '+r.title+' — '+r.rationale),
   '',
   '## Financial assurance',brief.financial_summary.status,
   '',
   '## Formal decisions',...brief.decision_history.map(d=>'- Gate '+d.gate+' '+d.outcome+'; '+d.created_at+'; '+d.actor+': '+d.rationale),
   '',
   '## Committee memo',brief.committee_memo?.body||'No signed committee memo recorded.',
   '',
   '## Governance limits',...brief.limitations.map(l=>'- '+l)
  ].join('\n')
  const blob=new Blob([report],{type:'text/markdown;charset=utf-8'})
  const url=URL.createObjectURL(blob)
  const link=document.createElement('a');link.href=url;link.download='board-decision-'+targetId+'.md';link.click();URL.revokeObjectURL(url)
 }
 return <section className="ed-board" aria-label="Executive investment decision dashboard">
  <div className="ed-heading">
   <div><small>BOARD OF DIRECTORS · INVESTMENT COMMITTEE</small><h2>Executive Decision Cockpit</h2><p>Decision-first briefing using recorded evidence and governance actions—not presentation estimates.</p></div>
   <div className="ed-top-actions"><button onClick={()=>setRevision(n=>n+1)} disabled={loading}><RefreshCw size={15}/> Refresh</button><button disabled={!brief} onClick={exportBrief}><Download size={15}/> Export board brief</button></div>
  </div>
  <div className="ed-selector">
   <label>Project / target<select value={targetId} onChange={e=>{setRequestedProgram(null);onContext({...context,targetId:e.target.value})}}>{targets.map(t=><option key={t.id} value={t.id}>{t.id} · {t.name}</option>)}</select></label>
   <label>Investment program<select disabled={!brief?.programs.length} value={brief?.selected_program_id??''} onChange={e=>setRequestedProgram(Number(e.target.value))}>{brief?.programs.length?brief.programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>):<option value="">No linked program</option>}</select></label>
   <span>Evidence snapshot: {brief?time(brief.generated_at):loading?'Updating…':'Unavailable'}</span>
  </div>
  {error&&<div className="ed-error" role="alert"><ShieldAlert size={17}/><div><strong>Executive data unavailable</strong><p>{error}. No investment recommendation will be inferred while the backend is unavailable.</p></div></div>}
  {loading&&<div className="ed-loading" role="status">Retrieving committee and investment records…</div>}
  {brief&&<>
   <div className={'ed-decision ed-'+severity}>
    <div className="ed-decision-copy"><small>RECOMMENDATION TO THE BOARD</small><div className="ed-verdict">{recommendation==='GO_RECORDED'?'GO — RECORDED':recommendation==='HOLD'?'HOLD':'REVIEW'}</div><p>{brief.recommendation_rationale}</p><span>{brief.decision_is_formal?'Formal recorded decision; evidence must remain current':'Advisory status — not an investment authorization'}</span></div>
    <div className="ed-decision-side"><div><strong>{brief.blockers.length}</strong><span>Unmet FID checks</span></div><div><strong>{brief.key_risks.length}</strong><span>Open flags / legal risks</span></div><div><strong>{brief.decision_history.length}</strong><span>Recent recorded decisions</span></div></div>
   </div>
   <div className="ed-kpis">
    <article><small>Exploration maturity</small><strong>{brief.evidence.phase.replaceAll('_',' ')}</strong><span>Map: {brief.evidence.map_scale||'Not recorded'}</span></article>
    <article><small>Sampling evidence</small><strong>{display(brief.evidence.sample_count)}</strong><span>Assayed samples · {display(brief.evidence.drillholes)} drillholes</span></article>
    <article><small>QA/QC &amp; CP sign-off</small><strong>{brief.evidence.qaqc_approved&&brief.evidence.cp_approved?'Both recorded':'Incomplete'}</strong><span>QA/QC {brief.evidence.qaqc_approved?'✓':'pending'} · CP {brief.evidence.cp_approved?'✓':'pending'}</span></article>
    <article><small>Validated financial NPV / IRR</small><strong>Not available</strong><span>Scenario values are not board-certified project economics</span></article>
   </div>
   <div className="ed-flow">
    <div className="ed-section-title"><h3>Four-gate decision track</h3><span>Formal program approvals, not hypothetical UI decisions</span></div>
    <div className="ed-gates">{brief.formal_gates.map(g=><article key={g.gate} className={g.outcome==='GO'?'ed-gate-go':g.outcome==='HOLD'?'ed-gate-hold':'ed-gate-neutral'}>
     <small>GATE {g.gate}</small><strong>{['Screening','Drilling & resource','Pre-feasibility','FID'][g.gate-1]}</strong><b>{g.outcome==='NOT_RECORDED'?'Not recorded':g.outcome}</b><span>{g.created_at?time(g.created_at):'Awaiting formal decision'}</span>
    </article>)}</div>
   </div>
   <div className="ed-duo">
    <section className="ed-card ed-blockers">
     <div className="ed-section-title"><h3><AlertTriangle size={17}/> Investment blockers &amp; required actions</h3><span>{brief.blockers.length} items</span></div>
     {brief.blockers.length? <div className="ed-blocker-list">{brief.blockers.slice(0,12).map((b,i)=><div key={b.code+'-'+i}><span className="ed-blocker-mark"><ShieldAlert size={16}/></span><div><strong>{b.message}</strong><small>{moduleName[b.module]}{b.target_id?' · '+b.target_id:''}</small></div><button onClick={()=>onNavigate(b.module)}>Resolve <ArrowRight size={13}/></button></div>)}</div>:<div className="ed-empty"><CheckCircle2 size={18}/> No blockers in the currently implemented FID policy. Independent board and legal review may still be required.</div>}
     {brief.blockers.length>12&&<small>Additional blockers: {brief.blockers.length-12}; review the Mining Economics readiness checklist.</small>}
    </section>
    <section className="ed-card">
     <div className="ed-section-title"><h3><ShieldAlert size={17}/> Critical risks &amp; opportunities</h3><span>{brief.key_risks.length} recorded</span></div>
     {brief.key_risks.length?<div className="ed-risk-list">{brief.key_risks.slice(0,6).map((risk,i)=><article key={risk.id+'-'+i} className={risk.type==='catalyst'?'ed-catalyst':'ed-critical'}>
      <div><small>{risk.type.replaceAll('_',' ').toUpperCase()} · Gate {risk.gate}</small><button onClick={()=>onNavigate(risk.module)}>Inspect <ArrowRight size={13}/></button></div><strong>{risk.title}</strong><p>{risk.rationale}</p>
     </article>)}</div>:<div className="ed-empty">No open expert flags or recognized high/medium contract findings. This is not a declaration of zero project risk.</div>}
    </section>
   </div>
   <div className="ed-duo">
    <section className="ed-card">
     <div className="ed-section-title"><h3><Layers3 size={17}/> Technical evidence readiness</h3><span>Source metadata and reviewer status</span></div>
     <div className="ed-source-grid">{categories.map(group=><div key={group.key} className="ed-source-group"><div className="ed-source-head"><b>{group.name}</b><button onClick={()=>onNavigate(group.route)}>Open <ArrowRight size={13}/></button></div>{group.entries.map(([key,label])=>{const entry=brief.evidence[group.key][key];return <div key={key} className="ed-source-row"><span>{label}</span><span className={'ed-source-state ed-state-'+(entry?.state||'missing')}>{status(entry?.state||'missing')}</span></div>})}</div>)}</div>
     <div className="ed-legal"><Scale size={17}/><div><strong>Legal contract review</strong><small>{status(brief.evidence.legal.state)} · {brief.evidence.legal.risk_count} flagged clauses</small></div><button onClick={()=>onNavigate('legal-commercial')}>Open hub <ArrowRight size={13}/></button></div>
    </section>
    <section className="ed-card">
     <div className="ed-section-title"><h3><BookOpen size={17}/> Executive committee memorandum</h3><span>{brief.committee_memo?'Signed record':'Awaiting signed record'}</span></div>
     {brief.committee_memo?<div className="ed-memo"><p>{brief.committee_memo.body}</p><small>Gate {brief.committee_memo.gate} · Signed {time(brief.committee_memo.signed_at)} · Authenticated attestation (not a PKI signature)</small></div>:<div className="ed-empty">No signed executive committee memo is recorded for this target. The technical committee should prepare and review one before the investment meeting.</div>}
     <button className="ed-link" onClick={()=>onNavigate('exploration-evaluator')}><FileText size={16}/> Open Expert Committee &amp; Peer Review <ArrowRight size={14}/></button>
     <div className="ed-next"><small>RECOMMENDED NEXT ACTION</small><p>{brief.next_action}</p></div>
    </section>
   </div>
   <section className="ed-card ed-history">
    <div className="ed-section-title"><h3><Clock3 size={17}/> Board decision history</h3><button onClick={()=>setShowHistory(v=>!v)}>{showHistory?'Hide':'Show'} audit history</button></div>
    {showHistory&&(brief.decision_history.length?<div className="ed-history-rows">{brief.decision_history.map(d=><article key={d.id}><span>{time(d.created_at)}</span><b>Gate {d.gate} · {d.outcome}</b><span>{d.actor}</span><p>{d.rationale}</p></article>)}</div>:<p>No formal program gate decisions have been recorded.</p>)}
   </section>
   <div className="ed-disclaimer"><ShieldCheck size={16}/><div><b>Decision assurance</b><p>{brief.limitations.join(' ')}</p></div></div>
  </>}
 </section>
}
