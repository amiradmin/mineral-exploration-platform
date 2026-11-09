import {useCallback,useEffect,useState} from 'react'
import {ClipboardCheck,Flag,FileSignature,ShieldAlert,Users,RefreshCw} from 'lucide-react'
import {useI18n} from './i18n'
import './ExpertCommittee.css'

type Eval = {id:number;status:string;outputs:Record<string,number>}
type Override = {id:number;evaluation_id:number;factor:string;base_score:number;delta_points:number;adjusted_score:number;justification:string;evidence_reference:string;status:string;proposed_by:number;reviewed_by:number|null}
type Flag = {id:number;kind:string;title:string;rationale:string;evidence_reference:string;gate:number;status:string;created_by:number}
type Memo = {id:number;gate:number;version:number;evaluation_id:number;body:string;body_sha256:string;signed_by:number|null;signed_at:string|null;signature_type:string|null}
type Decision = {id:number;gate:number;outcome:string;rationale:string;created_at:string}
type Committee = {target_id:string;roles:string[];latest_evaluation:Eval|null;committee_adjusted_outputs:Record<string,number>;overrides:Override[];flags:Flag[];memos:Memo[];decisions:Decision[];gate_1_blockers:string[]}
const factorKeys=['P_Source','P_Pathway','P_Trap','P_Timing']
const csrf=()=>document.cookie.split('; ').find(s=>s.startsWith('csrftoken='))?.slice(10)??''
const fmt=(n:number)=>n.toFixed(2)
export default function ExpertCommittee({targetId}:{targetId:string}){
 const {t,locale}=useI18n()
 const [expanded,setExpanded]=useState(true)
 const [committee,setCommittee]=useState<Committee|null>(null)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState(false)
 const [factor,setFactor]=useState('P_Pathway')
 const [delta,setDelta]=useState('15')
 const [justification,setJustification]=useState('')
 const [evidence,setEvidence]=useState('')
 const [sha,setSha]=useState('')
 const [flagKind,setFlagKind]=useState('prerequisite')
 const [flagTitle,setFlagTitle]=useState('')
 const [flagReason,setFlagReason]=useState('')
 const [flagEvidence,setFlagEvidence]=useState('')
 const [memoText,setMemoText]=useState('')
 const [attestation,setAttestation]=useState('')
 const [reviewNote,setReviewNote]=useState('')
 const [gateReason,setGateReason]=useState('')
 const base='/api/targets/'+encodeURIComponent(targetId)+'/committee/'
 const load=useCallback(async(signal?:AbortSignal)=>{
  const resp=await fetch(base,{credentials:'same-origin',signal,cache:'no-store'})
  const data=await resp.json()
  if(!resp.ok)throw new Error(data.detail||'Cannot read the committee record.')
  if(!signal?.aborted){setCommittee(data);setError('')}
 },[base])
 useEffect(()=>{
  const controller=new AbortController()
  setCommittee(null);setError('');setMessage('')
  void load(controller.signal).catch(e=>{if(!controller.signal.aborted)setError(String(e.message??e))})
  const interval=window.setInterval(()=>{if(!document.hidden)void load(controller.signal).catch(()=>{})},30000)
  return ()=>{controller.abort();window.clearInterval(interval)}
 },[load])
 const act=async(endpoint:string,payload:Record<string,unknown>)=>{
  setBusy(true);setError('');setMessage('')
  try{
   const resp=await fetch(base+endpoint,{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json',...(csrf()?{'X-CSRFToken':decodeURIComponent(csrf())}:{})},
    body:JSON.stringify(payload)})
   const data=await resp.json()
   if(!resp.ok)throw new Error([data.detail,...(data.blockers??[])].filter(Boolean).join(' · ')||'Action rejected.')
   setMessage(t('Action recorded in the committee audit trail.'))
   await load()
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false)}
 }
 const roles=committee?.roles??[]
 const canPropose=roles.some(role=>['expert','cp','chair'].includes(role))
 const canReview=roles.includes('cp')||roles.includes('chair')
 const canSign=roles.includes('chair')
 const canVote=roles.includes('board')
 const latest=committee?.latest_evaluation
 const recentMemo=committee?.memos.find(m=>m.gate===1)
 const adjusted=latest?.outputs[factor]===undefined?null:latest.outputs[factor]+Number(delta)
 return <section className="ee-panel committee" aria-label="Expert Committee and Peer Review">
  <div className="committee-head"><div><Users size={19}/><div><h2>{t('EXPERT COMMITTEE & PEER REVIEW')}</h2><p>{t('Target-scoped authorization · independent review · recorded decisions')}</p></div></div>
    <button type="button" onClick={()=>setExpanded(v=>!v)}>{t(expanded?'Collapse':'Expand')}</button>
  </div>
  {expanded&&<>
   {error&&<p className="committee-error" role="alert">{error}</p>}
   {message&&<p className="committee-success" role="status">{message}</p>}
   {!committee?<div className="committee-login"><ShieldAlert size={17}/>{t('Committee records are restricted. Sign in to Django and ask an administrator to assign your role for this target.')} <button type="button" onClick={()=>void load().catch(e=>setError(e.message))}><RefreshCw size={14}/>{t('Retry')}</button></div>:<>
    <div className="committee-topline">
      <span>{t('Your roles')}: <strong>{roles.join(', ')}</strong></span>
      <span>{t('Latest evaluation')}: <strong>#{latest?.id??'—'} · {latest?.status??'—'}</strong></span>
      <span>{t('Gate 1 blockers')}: <strong>{committee.gate_1_blockers.length}</strong></span>
      <span>{t('Committee-adjusted outputs')}: <strong>{Object.entries(committee.committee_adjusted_outputs??{}).map(([key,value])=>key+' '+fmt(value)).join(' · ')||'—'}</strong></span>
    </div>
    <div className="committee-grid">
     <article className="committee-card">
      <h3><ClipboardCheck size={16}/>{t('Expert Override Modifier')}</h3>
      <p>{t('Overrides are percentage-point proposals. They never silently change the base evaluation.')}</p>
      {canPropose&&<form onSubmit={e=>{e.preventDefault();void act('overrides/',{factor,delta_points:Number(delta),justification,evidence_reference:evidence,evidence_sha256:sha})}}>
       <label>{t('Evaluation factor')}<select value={factor} onChange={e=>setFactor(e.target.value)}>{factorKeys.map(k=><option key={k} value={k}>{k}</option>)}</select></label>
       <div className="committee-numbers"><span>{t('Base score')}: {latest?.outputs[factor]===undefined?'—':fmt(latest.outputs[factor])}</span><label>{t('Delta (percentage points)')}<input type="number" step=".1" min="-100" max="100" value={delta} onChange={e=>setDelta(e.target.value)}/></label><span>{t('Proposed adjusted score')}: {adjusted===null||!Number.isFinite(adjusted)?'—':fmt(adjusted)}</span></div>
       <label>{t('Justification')}<textarea required minLength={20} maxLength={12000} value={justification} onChange={e=>setJustification(e.target.value)}/></label>
       <label>{t('Evidence reference')}<input required value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="LAB-REPORT-2026-001"/></label>
       <label>{t('Document SHA-256')}<input required pattern="[0-9a-fA-F]{64}" value={sha} onChange={e=>setSha(e.target.value)} placeholder="64 hex characters" dir="ltr"/></label>
       <button disabled={busy||!latest} type="submit">{t('Submit override proposal')}</button>
      </form>}
      <div className="committee-records">{committee.overrides.length===0?<p>{t('No override proposals')}</p>:committee.overrides.map(o=><div className="committee-record" key={o.id}><strong>#{o.id} {o.factor} · {fmt(o.base_score)} → {fmt(o.adjusted_score)}</strong><small>{t(o.status)} · {o.evidence_reference}</small><p>{o.justification}</p>{canReview&&o.status==='proposed'&&<div className="committee-actions"><input aria-label={t('Review note')} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder={t('Review note (20+ characters)')}/><button type="button" disabled={busy} onClick={()=>void act('overrides/'+o.id+'/review/',{decision:'approved',note:reviewNote})}>{t('Approve')}</button><button type="button" disabled={busy} onClick={()=>void act('overrides/'+o.id+'/review/',{decision:'rejected',note:reviewNote})}>{t('Reject')}</button></div>}</div>)}</div>
     </article>
     <article className="committee-card">
      <h3><Flag size={16}/>{t('Strategic Project Flags')}</h3>
      <p>{t('Open fatal flaws and gate prerequisites block GO decisions.')}</p>
      {canPropose&&<form onSubmit={e=>{e.preventDefault();void act('flags/',{kind:flagKind,title:flagTitle,rationale:flagReason,evidence_reference:flagEvidence,gate:1})}}>
       <label>{t('Flag type')}<select value={flagKind} onChange={e=>setFlagKind(e.target.value)}><option value="catalyst">{t('Value Catalyst')}</option><option value="fatal_flaw">{t('Fatal Flaw')}</option><option value="prerequisite">{t('Gate Prerequisite')}</option></select></label>
       <label>{t('Title')}<input required minLength={5} value={flagTitle} onChange={e=>setFlagTitle(e.target.value)}/></label>
       <label>{t('Evidence reference')}<input required value={flagEvidence} onChange={e=>setFlagEvidence(e.target.value)}/></label>
       <label>{t('Rationale')}<textarea required minLength={20} value={flagReason} onChange={e=>setFlagReason(e.target.value)}/></label>
       <button disabled={busy} type="submit">{t('Create strategic flag')}</button>
      </form>}
      <div className="committee-records">{committee.flags.map(f=><div key={f.id} className={'committee-record committee-'+f.kind}><strong>{t(f.kind)} · {f.title}</strong><small>{t(f.status)} · {t('Gate')} {f.gate}</small><p>{f.rationale}</p><small>{f.evidence_reference}</small>{canReview&&f.status==='open'&&<button type="button" disabled={busy} onClick={()=>void act('flags/'+f.id+'/resolve/',{note:reviewNote})}>{t('Resolve with review note')}</button>}</div>)}{committee.flags.length===0&&<p>{t('No project flags')}</p>}</div>
     </article>
     <article className="committee-card committee-memo">
      <h3><FileSignature size={16}/>{t('Executive Committee Memo')}</h3>
      <p>{t('Versioned board communication linked to the latest evaluation. Chair attestation is not a cryptographic digital signature.')}</p>
      {canPropose&&<form onSubmit={e=>{e.preventDefault();void act('memos/',{body:memoText,gate:1})}}>
       <label>{t('Formal committee statement')}<textarea value={memoText} required minLength={60} maxLength={20000} rows={5} onChange={e=>setMemoText(e.target.value)}/></label>
       <button disabled={busy||!latest} type="submit">{t('Create memo version')}</button>
      </form>}
      <div className="committee-records">{committee.memos.map(m=><div key={m.id} className="committee-record"><strong>{t('Memo')} v{m.version} · #{m.evaluation_id}</strong><small>{m.signed_at?t('Signed attestation'):t('Unsigned')} · SHA-256: {m.body_sha256.slice(0,14)}…</small><p>{m.body}</p>{canSign&&!m.signed_at&&<div className="committee-actions"><input value={attestation} onChange={e=>setAttestation(e.target.value)} placeholder={t('Chair attestation (20+ characters)')}/><button disabled={busy} type="button" onClick={()=>void act('memos/'+m.id+'/sign/',{attestation})}>{t('Sign memo')}</button></div>}</div>)}{committee.memos.length===0&&<p>{t('No committee memos')}</p>}</div>
     </article>
    </div>
    <div className="committee-gate">
     <div><h3>{t('Gate 1 decision controls')}</h3><p>{committee.gate_1_blockers.length?committee.gate_1_blockers.join(' · '):t('All listed gate blockers cleared')}</p></div>
     {canVote&&<div className="committee-actions"><input value={gateReason} onChange={e=>setGateReason(e.target.value)} placeholder={t('Board rationale (20+ characters)')}/>{(['GO','HOLD','REVIEW'] as const).map(x=><button type="button" key={x} disabled={busy||(x==='GO'&&committee.gate_1_blockers.length>0)} onClick={()=>void act('gate-decisions/',{gate:1,outcome:x,rationale:gateReason})}>{x}</button>)}</div>}
     <div className="committee-decisions">{committee.decisions.map(d=><span key={d.id}>{d.outcome} · {new Date(d.created_at).toLocaleString(locale)}</span>)}</div>
    </div>
   </>}
  </>}
 </section>
}
