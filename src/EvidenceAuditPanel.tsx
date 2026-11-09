import React, {useEffect, useState} from 'react'
import {Activity, CheckCircle2, Database, FileCheck2, GitBranch, LockKeyhole, RefreshCw, ShieldAlert} from 'lucide-react'
import './EvidenceAuditPanel.css'

type Provenance = {
  source_connection_id:number
  software_key:string
  snapshot_id:number
  dataset:string
  snapshot_sha256:string
  rule_id:number
  rule_version:number
  factor:string
  metric:string
  observed_value:number
  normalized_score:number
  weighted_score:number
  frozen_rule:{rationale:string;input_min:number;input_max:number;weight:number;is_demonstration:boolean}
}
type Run={
  id:number
  target_id:string
  algorithm_version:string
  status:'demo'|'incomplete'|'pending'|'approved'
  created_at:string
  approved_at:string|null
  approved_by:number|null
  parameters:{algorithm:string;aggregate:string;missing_factors:string[];missing_inputs:Array<{reason:string;rule_id:number}>}
  outputs:Record<string,number>
  provenance:Provenance[]
  content_sha256:string
  decision_grade:boolean
}
const factorLabels=['P_Source','P_Pathway','P_Trap','P_Timing'] as const
const pretty=(date:string)=>new Date(date).toLocaleString()

export default function EvidenceAuditPanel({targetId}:{targetId:string}){
  const [runs,setRuns]=useState<Run[]>([])
  const [expanded,setExpanded]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [selected,setSelected]=useState<number|null>(null)
  const shown=runs.find(item=>item.id===selected)??runs[0]??null
  const fetchRuns=async(signal?:AbortSignal)=>{
    const response=await fetch('/api/targets/'+encodeURIComponent(targetId)+'/evidence-evaluations/',{
      credentials:'same-origin',cache:'no-store',signal,
    })
    if(!response.ok)throw new Error('Unable to load evaluation provenance (HTTP '+response.status+').')
    const body:{results:Run[]}=await response.json()
    if(!signal?.aborted){setRuns(body.results);setError('')}
  }
  useEffect(()=>{
    const controller=new AbortController()
    setRuns([]);setSelected(null)
    void fetchRuns(controller.signal).catch(err=>{if(!controller.signal.aborted)setError(String(err))})
    const timer=window.setInterval(()=>{if(!document.hidden)void fetchRuns(controller.signal).catch(err=>{if(!controller.signal.aborted)setError(String(err))})},30_000)
    return ()=>{controller.abort();window.clearInterval(timer)}
  },[targetId])
  const act=async(path:string)=>{
    setBusy(true);setError('')
    try{
      const csrf=document.cookie.split('; ').find(item=>item.startsWith('csrftoken='))?.split('=')[1]??''
      const response=await fetch(path,{method:'POST',credentials:'same-origin',headers:csrf?{'X-CSRFToken':decodeURIComponent(csrf)}:{}})
      if(!response.ok){
        const body=await response.json().catch(()=>null)
        throw new Error(typeof body?.detail==='string'?body.detail:'Request rejected (HTTP '+response.status+').')
      }
      await fetchRuns()
    }catch(err){setError(err instanceof Error?err.message:'Action failed')}
    finally{setBusy(false)}
  }
  return <section className="ee-panel ee-audit" aria-label="Evidence calculation and audit trail">
    <div className="ee-audit-title">
      <div><GitBranch size={18}/><div><strong>EVIDENCE → FACTOR CALCULATION & AUDIT</strong><small>Server-owned results · frozen rules · source snapshot provenance</small></div></div>
      <div><button type="button" onClick={()=>setExpanded(v=>!v)}>{expanded?'Collapse':'Expand'}</button></div>
    </div>
    {expanded&&<>
      <div className="ee-audit-actions">
        <p><ShieldAlert size={14}/> Calculated values are separate from Gate 1 presentation sliders and do not change the probability of success automatically.</p>
        <button type="button" disabled={busy} onClick={()=>act('/api/targets/'+encodeURIComponent(targetId)+'/evidence-evaluations/')}><Activity size={14}/> Run evaluation (data steward)</button>
        <button type="button" disabled={busy} onClick={()=>{setBusy(true);void fetchRuns().catch(err=>setError(String(err))).finally(()=>setBusy(false))}}><RefreshCw size={14}/> Refresh</button>
      </div>
      {error&&<p className="ee-audit-error" role="alert">{error}</p>}
      {runs.length===0?<div className="ee-audit-empty"><Database size={20}/> No persisted evidence evaluations yet. The GIS simulator will create demonstration runs after new GeoJSON snapshots arrive, or an authorized data steward can request one.</div>:<>
        <div className="ee-audit-summary">
          <div className="ee-audit-runs"><label>Evaluation run</label><select value={shown?.id??''} onChange={e=>setSelected(Number(e.target.value))}>{runs.map(run=><option key={run.id} value={run.id}>#{run.id} · {pretty(run.created_at)} · {run.status}</option>)}</select></div>
          <div><small>Approval status</small><strong className={'ee-audit-status ee-audit-'+shown?.status}>{shown?.status.toUpperCase()}</strong></div>
          <div><small>Algorithm version</small><strong>{shown?.algorithm_version}</strong></div>
          <div><small>SHA-256 fingerprint</small><code title={shown?.content_sha256}>{shown?.content_sha256.slice(0,18)}…</code></div>
          <div><small>Decision grade</small><strong>{shown?.decision_grade?<><CheckCircle2 size={14}/> Approved</>:<><LockKeyhole size={14}/> NOT APPROVED</>}</strong></div>
        </div>
        {shown&&<>
          <div className="ee-audit-factors">
            {factorLabels.map(factor=><div key={factor}><small>{factor}</small><strong>{typeof shown.outputs[factor]==='number'?shown.outputs[factor].toFixed(2)+' / 100':'No qualified input'}</strong></div>)}
          </div>
          <div className="ee-audit-info">Missing factors: {shown.parameters.missing_factors.join(', ')||'None'} · Missing rule inputs: {shown.parameters.missing_inputs.length} · Aggregation: {shown.parameters.aggregate}</div>
          <div className="ee-audit-lineage">
            <strong>Recorded source → evidence → factor links</strong>
            {shown.provenance.length===0?<p>No valid numeric rule inputs were found.</p>:<div className="ee-audit-scroll"><table><thead><tr><th>Source</th><th>Snapshot</th><th>Input metric</th><th>Value</th><th>Rule / version</th><th>Factor</th><th>Score</th><th>Frozen parameters</th></tr></thead><tbody>{shown.provenance.map(item=><tr key={item.rule_id}><td>{item.software_key}</td><td>#{item.snapshot_id} <small>{item.dataset}</small></td><td>{item.metric}</td><td>{item.observed_value}</td><td>#{item.rule_id} / v{item.rule_version}</td><td>{item.factor}</td><td>{item.normalized_score.toFixed(2)}</td><td><code>{JSON.stringify(item.frozen_rule)}</code></td></tr>)}</tbody></table></div>}
          </div>
          <div className="ee-audit-footer">
            <span>Run #{shown.id} · {pretty(shown.created_at)} {shown.approved_at?'· Approved '+pretty(shown.approved_at):''}</span>
            {shown.status==='pending'&&<button type="button" disabled={busy} onClick={()=>act('/api/targets/'+encodeURIComponent(targetId)+'/evidence-evaluations/'+shown.id+'/approve/')}><FileCheck2 size={14}/> Approve (competent person)</button>}
            {shown.status==='demo'&&<span className="ee-audit-demo">SYNTHETIC / ILLUSTRATIVE — approval prohibited</span>}
          </div>
        </>}
      </>}
    </>}
  </section>
}
