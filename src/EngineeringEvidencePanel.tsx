import {useCallback,useEffect,useState} from 'react'
import {useAuth} from './auth'
import './EngineeringEvidencePanel.css'
type Row={id:number;source:string;source_filename:string;source_format:string;source_sha256:string;analysis_date:string;model_version:string;metrics:Record<string,number>;verified:boolean}
type State={policy:{eligible:boolean;blockers:string[];sources:Record<string,{status:string;metrics:Record<string,number>}>};records:Row[]}
const specs={
 alastri:{label:'Alastri / Beyond',formats:'DXF / CSV / XML / report',keys:['stripping_ratio','overall_pit_slope_deg','cutoff_grade_pct','ore_tonnes','waste_tonnes'],required:['stripping_ratio','overall_pit_slope_deg']},
 datamine:{label:'Datamine Strategic Planners',formats:'CSV / XML / report',keys:['annual_ore_tonnes','annual_plant_feed_tonnes','mine_capacity_tpa','plant_capacity_tpa','lom_years'],required:['annual_ore_tonnes','annual_plant_feed_tonnes']},
 rocscience:{label:'Rocscience Slide2 / Slide3',formats:'CSV / report',keys:['static_fos','overall_slope_angle_deg'],required:['static_fos']}
} as const
type Source=keyof typeof specs
export default function EngineeringEvidencePanel({targetId}:{targetId:string}){
 const {apiFetch,user}=useAuth()
 const [data,setData]=useState<State|null>(null)
 const [error,setError]=useState('')
 const [source,setSource]=useState<Source>('alastri')
 const [filename,setFilename]=useState('')
 const [format,setFormat]=useState('csv')
 const [hash,setHash]=useState('')
 const [date,setDate]=useState('')
 const [version,setVersion]=useState('')
 const [values,setValues]=useState<Record<string,string>>({})
 const [reload,setReload]=useState(0)
 const [reviewId,setReviewId]=useState<number|null>(null)
 const [rationale,setRationale]=useState('')
 const [scope,setScope]=useState('')
 const canEdit=Boolean(user?.is_superuser||user?.memberships?.some(m=>m.role==='data_steward'))
 const canReview=Boolean(user?.is_superuser||user?.memberships?.some(m=>m.role==='competent_person'))
 const load=useCallback(async()=>{
  const response=await apiFetch('/api/targets/'+encodeURIComponent(targetId)+'/engineering-evidence/')
  const json=await response.json()
  if(!response.ok)throw Error(json.detail||'Evidence unavailable')
  setData(json)
 },[apiFetch,targetId])
 useEffect(()=>{setData(null);setError('');void load().catch(e=>setError(String(e)))},[load,reload])
 const submit=async()=>{try{
  setError('')
  const metrics:Record<string,number>={}
  for(const key of specs[source].keys){if(values[key]?.trim())metrics[key]=Number(values[key])}
  const response=await apiFetch('/api/targets/'+encodeURIComponent(targetId)+'/engineering-evidence/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source,source_filename:filename,source_format:format,source_sha256:hash,analysis_date:date,model_version:version,metrics})})
  const body=await response.json()
  if(!response.ok)throw Error(JSON.stringify(body))
  setFilename('');setHash('');setValues({});setReload(x=>x+1)
 }catch(e){setError(String(e))}}
 const review=async(decision:'approve'|'reject')=>{if(!reviewId)return;try{setError('');const r=await apiFetch('/api/targets/'+encodeURIComponent(targetId)+'/engineering-evidence/'+reviewId+'/review/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision,rationale})});const b=await r.json();if(!r.ok)throw Error(JSON.stringify(b));setReviewId(null);setRationale('');setReload(x=>x+1)}catch(e){setError(String(e))}}
 return <section className="eng-panel">
  <div className="eng-head"><div><h2>Engineering Evidence &amp; Mine Design Inputs</h2><p>Gate 3 · registered file extracts; no live vendor synchronization</p></div><span className={data?.policy.eligible?'eng-ok':'eng-hold'}>{data?.policy.eligible?'Engineering evidence reviewed':'Investment inputs restricted'}</span></div>
  <div className="eng-sources">{(Object.keys(specs) as Source[]).map(key=><article key={key}><strong>{specs[key].label}</strong><span>{data?.policy.sources[key]?.status||'Not loaded'}</span><small>{specs[key].formats}</small><dl>{Object.entries(data?.policy.sources[key]?.metrics||{}).map(([k,v])=><div key={k}><dt>{k.replaceAll('_',' ')}</dt><dd>{v.toLocaleString()}</dd></div>)}</dl></article>)}</div>
  <p className="eng-notice">Stripping ratio, LOM feed and static slope FOS require verified source provenance. A static FOS is not a universal pass/fail threshold: design criteria are site-specific.</p>
  {error&&<p className="eng-error" role="alert">{error}</p>}
  {canEdit&&<details className="eng-entry"><summary>Register engineering export / extracted result</summary><p>Provide the SHA-256 fingerprint of the actual source file. DXF geometry is not parsed here; numeric results must be extracted and reviewed separately.</p>
   <div className="eng-fields">
    <label>Software<select value={source} onChange={e=>{setSource(e.target.value as Source);setValues({})}}>{(Object.keys(specs) as Source[]).map(k=><option key={k} value={k}>{specs[k].label}</option>)}</select></label>
    <label>Export type<select value={format} onChange={e=>setFormat(e.target.value)}>{['csv','dxf','xml','json','report'].map(f=><option key={f} value={f}>{f.toUpperCase()}</option>)}</select></label>
    <label>File name<input value={filename} onChange={e=>setFilename(e.target.value)}/></label>
    <label>File SHA-256<input value={hash} onChange={e=>setHash(e.target.value)} placeholder="64-character SHA-256"/></label>
    <label>Analysis date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    <label>Model version<input value={version} onChange={e=>setVersion(e.target.value)}/></label>
    {specs[source].keys.map(key=><label key={key}>{key.replaceAll('_',' ')} {specs[source].required.some(k=>k===key)?'*':''}<input type="number" step="any" value={values[key]||''} onChange={e=>setValues(v=>({...v,[key]:e.target.value}))}/></label>)}
   </div><button type="button" onClick={()=>void submit()}>Register for expert review</button>
  </details>}
  <h3>Source history &amp; review</h3>
  {data?.records.length?data.records.map(row=><div className="eng-record" key={row.id}><span><strong>{specs[row.source as Source]?.label||row.source}</strong> · {row.source_filename}<small>{row.analysis_date} · model {row.model_version} · SHA-256 {row.source_sha256.slice(0,12)}…</small></span><span>{row.verified?'Reviewed':'Pending review'}</span>{canReview&&!row.verified&&<button onClick={()=>setReviewId(row.id)}>Review</button>}</div>):<p>No engineering evidence has been registered for this target.</p>}
  {reviewId!==null&&<div className="eng-review"><label>Review rationale<textarea value={rationale} onChange={e=>setRationale(e.target.value)} rows={2}/></label><button onClick={()=>void review('approve')} disabled={!rationale.trim()}>Approve</button><button onClick={()=>void review('reject')} disabled={!rationale.trim()}>Reject</button><button onClick={()=>setReviewId(null)}>Cancel</button></div>}
  <p className="eng-notice">Economic outputs on this page are illustrative scenario calculations until evidence and investment authorization have been reviewed.</p>
 </section>
}
