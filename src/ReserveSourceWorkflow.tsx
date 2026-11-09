import {useCallback,useEffect,useState} from 'react'
import {Database,RefreshCw,ShieldAlert,CheckCircle2} from 'lucide-react'
import {useAuth} from './auth'
import './ReserveSourceWorkflow.css'

type Source={
 key:string;name:string;domain:string;status:string;is_demo:boolean;
 protocol:string|null;format:string|null;
 snapshot:{id:number;dataset:string;observed_at:string;received_at:string}|null;
 present_fields:string[];missing_fields:string[];input_completeness:boolean
}
type Readiness={
 target_id:string;sources:Source[];input_completeness:{geostatistics:boolean;block_model:boolean;core_logging:boolean};
 all_inputs_present:boolean;validated_resource_estimate:boolean;validated_ore_reserve:boolean;note:string
}
const groups=[
 {label:'01 · Geostatistical estimation',keys:['leapfrog','micromine'],description:'Variograms, kriging variance, search ellipsoids and estimated block grades; Leapfrog Edge or Micromine Origin'},
 {label:'02 · 3D block model',keys:['surpac'],description:'GEOVIA Surpac block dimensions, lithology codes and bulk density'},
 {label:'03 · Geological logging & QA/QC',keys:['geobank'],description:'Micromine Geobank core recovery, RQD and downhole surveys'},
] as const
const fields=(keys:string[])=>keys.map(key=>key.replaceAll('_',' ')).join(' · ')

export default function ReserveSourceWorkflow({targetId}:{targetId:string}){
 const {apiFetch}=useAuth()
 const [data,setData]=useState<Readiness|null>(null)
 const [error,setError]=useState('')
 const [reload,setReload]=useState(0)
 const load=useCallback(async(signal:AbortSignal)=>{
  const response=await apiFetch('/api/targets/'+encodeURIComponent(targetId)+'/reserve-sources/',{signal,cache:'no-store'})
  const json=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(json.detail||'Source records are unavailable.')
  if(!signal.aborted){setData(json);setError('')}
 },[apiFetch,targetId])
 useEffect(()=>{
  const controller=new AbortController()
  setData(null);setError('')
  void load(controller.signal).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:String(e))})
  return()=>controller.abort()
 },[load,reload])
 return <section className="rs-source-workflow" aria-label="Reserve source connections and validation">
  <div className="rs-sw-title"><div><h2><Database size={18}/> Source Connections &amp; Data Validation</h2><p>Gate 2 · live source-record status from Django, not simulated vendor synchronization</p></div><button type="button" onClick={()=>setReload(x=>x+1)}><RefreshCw size={14}/> Refresh</button></div>
  <div className="rs-sw-stages"><span>1. Sources</span><span>2. Input checks</span><span>3. Estimation</span><span>4. 3D review</span><span>5. Expert comments</span><span>6. Gate 3 package</span></div>
  {error&&<p className="rs-sw-warning" role="alert"><ShieldAlert size={15}/>{error}</p>}
  {data?<div className="rs-sw-grid">{groups.map(group=>{
   const sources=data.sources.filter(source=>group.keys.some(key=>key===source.key))
   return <article className="rs-sw-card" key={group.label}>
     <h3>{group.label}</h3><p>{group.description}</p>
     {sources.map(source=><div className="rs-sw-source" key={source.key}>
      <div><strong>{source.name}</strong><span className={source.snapshot?'rs-sw-recorded':'rs-sw-missing'}>{source.snapshot?(source.is_demo?'Demo snapshot':'Snapshot recorded'):'No snapshot'}</span></div>
      <small>Connection: {source.status.replaceAll('_',' ')}{source.format?' · '+source.format:''}{source.protocol?' · '+source.protocol:''}</small>
      {source.snapshot&&<small>Dataset: {source.snapshot.dataset} · {new Date(source.snapshot.received_at).toLocaleString()}</small>}
      {source.present_fields.length>0&&<small className="rs-sw-present"><CheckCircle2 size={12}/> Fields present: {fields(source.present_fields)}</small>}
      <small>Missing: {source.missing_fields.length?fields(source.missing_fields):'No required fields missing (presence only)'}</small>
     </div>)}
   </article>
  })}
  </div>:<p className="rs-sw-muted">Source readiness loading or unavailable.</p>}
  <div className="rs-sw-footer"><ShieldAlert size={17}/><p><strong>Evidence boundary:</strong> {data?.note??'No independently validated resource estimate is available.'} Current P95/P50/P10 cards, DCI and block viewer are illustrative until properly calculated, imported and independently reviewed. Mineral Resources are not Ore Reserves.</p></div>
 </section>
}
