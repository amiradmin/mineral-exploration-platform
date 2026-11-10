import {useEffect,useState} from 'react'
import {useAuth} from './auth'
import './ProgramInvestmentPanel.css'
import ProgramReadinessChecklist from './ProgramReadinessChecklist'
type Program={id:number;name:string}
type Readiness={program_id:number;fid_allowed:boolean;blockers:string[];targets:{id:string;sample_support:{fid_allowed:boolean;blockers:string[]};engineering:{eligible:boolean;blockers:string[]}}[]}
export default function ProgramInvestmentPanel({targetId}:{targetId:string}){
 const {apiFetch,user}=useAuth()
 const [programs,setPrograms]=useState<Program[]>([])
 const [programId,setProgramId]=useState('')
 const [targetIds,setTargetIds]=useState<string[]>([])
 const [readiness,setReadiness]=useState<Readiness|null>(null)
 const [category,setCategory]=useState('exploration')
 const [amount,setAmount]=useState('')
 const [rationale,setRationale]=useState('')
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [reload,setReload]=useState(0)
 const canEdit=Boolean(user?.is_superuser||user?.memberships?.some(m=>m.role==='data_steward'))
 const canApprove=Boolean(user?.is_superuser||user?.memberships?.some(m=>m.role==='board_approver'))
 useEffect(()=>{let alive=true;void apiFetch('/api/programs/').then(r=>r.json()).then(d=>{if(!alive)return;const list=Array.isArray(d)?d:d.results||[];setPrograms(list);setProgramId(p=>p||String(list[0]?.id||''))}).catch(e=>{if(alive)setError(String(e))});return()=>{alive=false}},[apiFetch])
 useEffect(()=>{if(!programId)return;let alive=true;setReadiness(null);setError('');void Promise.all([
  apiFetch('/api/programs/'+programId+'/target-scope/').then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.detail||'Scope unavailable');return b}),
  apiFetch('/api/programs/'+programId+'/investment-readiness/').then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.detail||'Readiness unavailable');return b})
 ]).then(([scope,ready])=>{if(alive){setTargetIds(scope.target_ids);setReadiness(ready)}}).catch(e=>{if(alive)setError(String(e))});return()=>{alive=false}},[apiFetch,programId,reload])
 const saveScope=async()=>{try{setError('');setNotice('');const response=await apiFetch('/api/programs/'+programId+'/target-scope/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({target_ids:targetIds})});const body=await response.json();if(!response.ok)throw Error(JSON.stringify(body));setNotice('Program target scope updated.');setReload(x=>x+1)}catch(e){setError(String(e))}}
 const requestBudget=async()=>{try{setError('');setNotice('');const response=await apiFetch('/api/programs/'+programId+'/budget-authorizations/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category,amount_usd:amount,rationale})});const body=await response.json();if(!response.ok)throw Error(JSON.stringify(body));setNotice('Budget authorization #'+body.id+' recorded.');setReload(x=>x+1)}catch(e){setError(String(e))}}
 return <section className="pi-panel"><h2>Investment Readiness &amp; Program Budget Controls</h2><p>Server-enforced evidence policy. Preliminary exploration spending and construction CAPEX are separated.</p>
 <label>Mining program <select value={programId} onChange={e=>setProgramId(e.target.value)}><option value="">Select program</option>{programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 {programId&&<>
  <div className="pi-status"><strong>{readiness?.fid_allowed?'Implemented FID checks satisfied':'FID / construction CAPEX blocked'}</strong><span>{readiness?.fid_allowed?'All currently enforced evidence checks passed. Separate board approval is still necessary.':'Complete the checklist below to identify and resolve blockers.'}</span></div><ProgramReadinessChecklist programId={programId} blockers={readiness?.blockers??[]} onUpdated={()=>setReload(x=>x+1)}/>
  <p>Selected target: {targetId}. Linked program targets: {targetIds.join(', ')||'None'}</p>
  {canEdit&&<div className="pi-scope"><label><input type="checkbox" checked={targetIds.includes(targetId)} onChange={e=>setTargetIds(ids=>e.target.checked?[...new Set([...ids,targetId])]:ids.filter(x=>x!==targetId))}/> Include selected target in program investment scope</label><button onClick={()=>void saveScope()} disabled={!targetIds.length}>Save target scope</button><small>Saving replaces this program's entire linked target set. Existing linked targets remain listed above.</small></div>}
  {canApprove&&<details className="pi-budget"><summary>Authorize scoped expenditure</summary><h3>Investment request</h3><label>Budget type<select value={category} onChange={e=>setCategory(e.target.value)}><option value="exploration">Further exploration / drilling</option><option value="construction">Construction / development CAPEX</option></select></label><label>Amount (USD)<input type="number" min=".01" step=".01" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Rationale<textarea value={rationale} rows={2} onChange={e=>setRationale(e.target.value)}/></label><button disabled={!amount||rationale.trim().length<12||category==='construction'&&!readiness?.fid_allowed} onClick={()=>void requestBudget()}>Submit authorization</button></details>}
 </>}
 {error&&<p role="alert" className="pi-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
 </section>
}
