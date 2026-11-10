import {useEffect,useState} from 'react'
import {useAuth} from './auth'
import './SourceEvidencePanel.css'
type Kind='financial'|'risk'
type Snapshot={id:number;source:string;source_filename:string;source_sha256:string;model_version:string;reviewed:boolean;row_count?:number;rows:Record<string,string|number>[]}
type Listing={sources:Record<string,{status:string;snapshot_id:number|null}>;records:Snapshot[]}
const catalog={
 financial:[
  {key:'minetrust',label:'Datamine MineTrust',fields:'year,ore_tonnes,grade_pct,plant_feed_tonnes (optional)',note:'LOM mine-to-crusher schedule'},
  {key:'erp_epc',label:'ERP / EPC Financial Ledger',fields:'year,category,amount_usd,contract_reference (optional)',note:'Plant, infrastructure and fleet CAPEX'}
 ],
 risk:[
  {key:'geotech',label:'Slide2 / GeoStudio',fields:'scenario,static_fos,seismic_fos,seepage_index',note:'Dynamic slope and groundwater seepage scenarios'},
  {key:'pitram',label:'Micromine Pitram',fields:'period,downtime_hours,scheduled_hours,mtbf_hours,mttr_hours,haul_efficiency_pct',note:'Reliability, MTBF, MTTR and fleet utilization'},
  {key:'market',label:'Commodity price history',fields:'period,commodity,price_usd_per_t',note:'LME-compatible historical metal prices (no live feed)'}
 ]
}
export default function SourceEvidencePanel({targetId,kind,onChanged}:{targetId:string;kind:Kind;onChanged?:()=>void}){
 const {apiFetch,user}=useAuth()
 const [data,setData]=useState<Listing|null>(null)
 const [source,setSource]=useState<string>(catalog[kind][0].key)
 const [file,setFile]=useState<File|null>(null)
 const [version,setVersion]=useState('v1')
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState(false)
 const [reviewId,setReviewId]=useState<number|null>(null)
 const [rationale,setRationale]=useState('')
 const [revision,setRevision]=useState(0)
 const canUpload=Boolean(user?.is_superuser||user?.memberships?.some(m=>m.role==='data_steward'))
 const canReview=Boolean(user?.is_superuser||user?.memberships?.some(m=>m.role==='competent_person'))
 const endpoint='/api/targets/'+encodeURIComponent(targetId)+'/'+kind+'-sources/'
 useEffect(()=>{setSource(catalog[kind][0].key)},[kind])
 useEffect(()=>{let active=true;setData(null);void apiFetch(endpoint).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.detail||'Source registry unavailable');return j}).then(j=>{if(active){setData(j);setError('')}}).catch(e=>{if(active)setError(String(e))});return()=>{active=false}},[endpoint,apiFetch,revision])
 const upload=async()=>{if(!file)return;setBusy(true);setError('');setMessage('');try{
  const form=new FormData();form.append('source',source);form.append('file',file);form.append('model_version',version)
  const res=await apiFetch(endpoint,{method:'POST',body:form});const j=await res.json()
  if(!res.ok)throw Error(j.detail||JSON.stringify(j))
  setMessage('File recorded for independent review. SHA-256: '+j.source_sha256)
  setFile(null);setRevision(n=>n+1);onChanged?.()
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 const review=async(decision:'approve'|'reject')=>{if(reviewId===null)return;setBusy(true);setError('');try{
  const res=await apiFetch(endpoint+reviewId+'/review/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision,rationale})})
  const j=await res.json();if(!res.ok)throw Error(j.detail||JSON.stringify(j))
  setMessage(decision==='approve'?'Source snapshot reviewed':'Snapshot rejected')
  setReviewId(null);setRationale('');setRevision(n=>n+1);onChanged?.()
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 return <section className="se-panel">
  <div className="se-title"><div><h2>{kind==='risk'?'Risk model source evidence':'Financial model source evidence'}</h2><p>Versioned CSV summaries · independent review · no automatic vendor connection</p></div></div>
  <div className="se-source-cards">{catalog[kind].map(entry=><article key={entry.key}><b>{entry.label}</b><small>{entry.note}</small><span>{data?.sources[entry.key]?.status.replaceAll('_',' ')||'Checking…'}</span><code>{entry.fields}</code></article>)}</div>
  {canUpload&&<details className="se-tools"><summary>Import CSV source snapshot</summary><p>Use one row per LOM year, contract item, operational period or stress case. Figures remain unverified until expert review.</p><div className="se-fields"><label>Source<select value={source} onChange={e=>setSource(e.target.value)}>{catalog[kind].map(x=><option key={x.key} value={x.key}>{x.label}</option>)}</select></label><label>Model version<input value={version} maxLength={100} onChange={e=>setVersion(e.target.value)}/></label><label>CSV export<input type="file" accept=".csv" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button disabled={busy||!file||!version.trim()} onClick={()=>void upload()}>Register import</button></div></details>}
  <details className="se-tools"><summary>Source history · {data?.records.length??0} recent snapshots</summary>{data?.records.length?data.records.map(row=><div key={row.id} className="se-record"><div><b>{row.source}</b> · {row.source_filename}<small>{row.model_version} · {row.row_count??row.rows?.length??0} rows · SHA-256 {row.source_sha256.slice(0,14)}…</small></div><span>{row.reviewed?'Reviewed':'Pending review'}</span>{canReview&&!row.reviewed&&<button onClick={()=>setReviewId(row.id)}>Review</button>}</div>):<p>No source snapshots imported.</p>}</details>
  {reviewId!==null&&<div className="se-review"><label>Review rationale<textarea rows={2} value={rationale} onChange={e=>setRationale(e.target.value)}/></label><button disabled={busy||rationale.trim().length<12} onClick={()=>void review('approve')}>Approve</button><button disabled={busy||rationale.trim().length<12} onClick={()=>void review('reject')}>Reject</button><button onClick={()=>setReviewId(null)}>Cancel</button></div>}
  {error&&<p role="alert" className="se-error">{error}</p>}{message&&<p role="status">{message}</p>}
 </section>
}
