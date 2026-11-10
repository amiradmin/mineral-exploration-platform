import {useEffect,useState} from 'react'
import {useAuth} from './auth'
import './ProgramReadinessChecklist.css'
type ReadinessRecord={exists:boolean;data_status:string;detailed_exploration:boolean;qaqc_approved:boolean;competent_person_approved:boolean}
const names:Record<string,string>={
 evidence_snapshot_missing:'Create the program evidence-readiness record',
 evidence_unverified:'Complete QA/QC and competent-person verification',
 detailed_exploration_required:'Record completed detailed exploration',
 qaqc_approval_required:'Obtain QA/QC reviewer approval',
 competent_person_approval_required:'Obtain competent-person sign-off',
 program_target_data_scale_link_missing:'Associate at least one exploration target with this program',
 data_scale_profile_missing:'Enter sample-support and map-scale evidence',
 detailed_map_scale_required:'Provide detailed map-scale evidence',
 verified_assay_support_required:'Register validated laboratory assays',
 drilling_support_required:'Provide drilling and meterage evidence',
 drill_grid_missing:'Record drillhole spacing',
 core_quality_missing:'Provide recovery and RQD measurements',
 evidence_not_verified:'Have a qualified reviewer validate geological evidence',
 alastri_verified_evidence_missing:'Upload and review Alastri pit-design results',
 datamine_verified_evidence_missing:'Upload and review Datamine LOM schedule',
 rocscience_verified_evidence_missing:'Upload and review Rocscience slope-stability results',
}
export const explainBlocker=(value:string)=>{
 const parts=value.split(':')
 const code=parts[parts.length-1]
 return (parts.length>1?parts[0]+' · ':'')+(names[code]||code.replaceAll('_',' '))
}
export default function ProgramReadinessChecklist({programId,blockers,onUpdated}:{programId:string;blockers:string[];onUpdated:()=>void}){
 const {apiFetch,user}=useAuth()
 const [record,setRecord]=useState<ReadinessRecord|null>(null)
 const [error,setError]=useState('')
 const [rationale,setRationale]=useState('')
 const [detailed,setDetailed]=useState(false)
 const [loading,setLoading]=useState(false)
 const [counter,setCounter]=useState(0)
 const steward=Boolean(user?.is_superuser||user?.memberships?.some(m=>m.role==='data_steward'))
 const cp=Boolean(user?.is_superuser||user?.memberships?.some(m=>m.role==='competent_person'))
 const qaqc=Boolean(user?.is_superuser||user?.memberships?.some(m=>m.role==='qaqc_reviewer'))
 useEffect(()=>{if(!programId)return;let active=true;void apiFetch('/api/programs/'+programId+'/evidence-readiness/').then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.detail);return b}).then(b=>{if(active){setRecord(b);setDetailed(b.detailed_exploration)}}).catch(e=>{if(active)setError(String(e))});return()=>{active=false}},[apiFetch,programId,counter])
 const act=async(action:string)=>{try{setLoading(true);setError('');const res=await apiFetch('/api/programs/'+programId+'/evidence-readiness/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,rationale,detailed_exploration:detailed})});const body=await res.json();if(!res.ok)throw Error(body.detail||JSON.stringify(body));setRecord(body);setCounter(n=>n+1);setRationale('');onUpdated()}catch(e){setError(String(e))}finally{setLoading(false)}}
 const checks=[['Evidence record',record?.exists],['Detailed exploration',record?.detailed_exploration],['QA/QC reviewed',record?.qaqc_approved],['Competent person signed',record?.competent_person_approved],['Attestation verified',record?.data_status==='verified']]
 return <section className="pr-check" aria-label="Investment prerequisite checklist">
  <div className="pr-heading"><h3>Investment authorization checklist</h3><span>{checks.filter(c=>c[1]).length}/{checks.length} program attestations</span></div>
  <div className="pr-checks">{checks.map(([name,passed])=><div key={String(name)} className={passed?'pr-pass':'pr-pending'}><span>{passed?'✓':'○'}</span>{name}</div>)}</div>
  {blockers.length>0&&<details open className="pr-blockers"><summary>{blockers.length} outstanding investment prerequisites</summary><ul>{blockers.map((b,i)=><li key={b+i}>{explainBlocker(b)}</li>)}</ul></details>}
  <details className="pr-actions"><summary>Manage program evidence and expert approvals</summary>
    <p>Program evidence attestation is separate from geological data verification and from engineering export review.</p>
    {steward&&<label><input type="checkbox" checked={detailed} onChange={e=>setDetailed(e.target.checked)}/> Detailed exploration documentation submitted</label>}
    <label>Review justification<textarea value={rationale} onChange={e=>setRationale(e.target.value)} rows={2} placeholder="Record evidence references and reason for this action"/></label>
    <div className="pr-buttons">
     {steward&&<button disabled={loading||rationale.trim().length<12} onClick={()=>void act('submit')}>Submit / reset review</button>}
     {qaqc&&<button disabled={loading||!record?.detailed_exploration||rationale.trim().length<12} onClick={()=>void act('qaqc_approve')}>Approve QA/QC</button>}
     {cp&&<button disabled={loading||!record?.qaqc_approved||rationale.trim().length<12} onClick={()=>void act('cp_approve')}>Competent person sign-off</button>}
    </div>
  </details>
  {error&&<p role="alert" className="pr-error">{error}</p>}
 </section>
}
