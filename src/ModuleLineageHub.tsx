import {useEffect,useState} from 'react'
import {ChevronDown,ChevronUp,Database,RefreshCw,ShieldAlert} from 'lucide-react'
import {useAuth} from './auth'
import {moduleArchitecture,type ModuleKey} from './moduleArchitecture'
import './ModuleLineageHub.css'
type RowState={status:string;protocol?:string;observed?:string|null;received?:string|null;reference?:string;detail?:string}
type SourceDetail={status?:string;protocol?:string;is_demo?:boolean;latest?:{observed_at?:string;received_at?:string;dataset?:string}|null}
const unavailable:RowState={status:'Not configured'}
const nice=(value?:string|null)=>value?new Date(value).toLocaleString():'—'
const stateFromReview=(status?:string,record?:{id?:number;created_at?:string;source_filename?:string}):RowState=>({
 status:status==='reviewed'||status==='verified'?'Reviewed evidence':status==='pending_review'||status==='missing_or_pending'?'Pending / unavailable':'Not configured',
 received:record?.created_at,reference:record?.id?'#'+record.id:undefined,
 detail:record?.source_filename
})
function mapRecords(sources:Record<string,{status?:string;snapshot_id?:number|null}>|undefined,records:{id:number;source:string;source_filename?:string;created_at?:string;verified?:boolean;reviewed?:boolean}[]):Record<string,RowState>{
 const states:Record<string,RowState>={}
 for(const [key,value] of Object.entries(sources||{})){
  const row=records.find(record=>record.id===value.snapshot_id)??records.find(record=>record.source===key)
  const latest=records.find(record=>record.source===key)
  const observed=latest||row
  if(value.status==='verified'||value.status==='reviewed'){
   states[key]={...stateFromReview('reviewed',row),received:row?.created_at,detail:row?.source_filename}
  }else if(observed){
   states[key]={status:'Pending review',received:observed.created_at,reference:'#'+observed.id,detail:observed.source_filename}
  }else states[key]=unavailable
 }
 for(const record of records){
  if(!states[record.source])states[record.source]={
   status:record.verified||record.reviewed?'Reviewed evidence':'Pending review',received:record.created_at,
   reference:'#'+record.id,detail:record.source_filename
  }
 }
 return states
}
export default function ModuleLineageHub({module,targetId}:{module:ModuleKey;targetId:string}){
 const {apiFetch}=useAuth()
 const [open,setOpen]=useState(false)
 const [rows,setRows]=useState<Record<string,RowState>>({})
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [revision,setRevision]=useState(0)
 const architecture=moduleArchitecture[module]
 useEffect(()=>{setOpen(false);setRows({});setError('')},[module,targetId])
 useEffect(()=>{
  if(!open)return
  let alive=true
  setLoading(true);setError('')
  const request=async(path:string)=>{
   const response=await apiFetch(path,{cache:'no-store'})
   const payload=await response.json().catch(()=>({}))
   if(!response.ok)throw Error(payload.detail||'HTTP '+response.status)
   return payload
  }
  const root='/api/targets/'+encodeURIComponent(targetId)
  const resolve=async():Promise<Record<string,RowState>>=>{
   if(module==='exploration-evaluator'){
    const results=await Promise.all(architecture.sources.map(async entry=>{
     try{
      const detail:SourceDetail=await request('/api/source-details/'+encodeURIComponent(targetId)+'/'+encodeURIComponent(entry.key)+'/')
      const hasData=Boolean(detail.latest)
      return [entry.key,{status:detail.is_demo?'Simulated source':hasData?'Recorded snapshot':detail.status==='connected'?'Configured / no data':'Not configured',
        protocol:detail.protocol,observed:detail.latest?.observed_at,received:detail.latest?.received_at,detail:detail.latest?.dataset}] as const
     }catch{return [entry.key,{status:'Unavailable / restricted'}] as const}
    }))
    return Object.fromEntries(results)
   }
   if(module==='reserve-simulator'){
    const data=await request(root+'/reserve-sources/')
    return Object.fromEntries((data.sources||[]).map((row:{key:string;is_demo:boolean;status:string;protocol:string|null;snapshot:{observed_at:string;received_at:string;dataset:string}|null})=>[
     row.key,{status:row.is_demo?'Simulated source':row.snapshot?'Recorded snapshot':row.status==='not_configured'?'Not configured':'Configured / no data',
       protocol:row.protocol,observed:row.snapshot?.observed_at,received:row.snapshot?.received_at,detail:row.snapshot?.dataset}]))
   }
   if(module==='economics-engine'){
    const data=await request(root+'/engineering-evidence/')
    const states=mapRecords(Object.fromEntries(Object.entries(data.policy?.sources||{}).map(([key,value])=>[key,{status:(value as {status?:string}).status,snapshot_id:(value as {evidence_id?:number}).evidence_id}])),data.records||[])
    return states
   }
   if(module==='risk-scenarios'||module==='financial-valuator'){
    const data=await request(root+'/'+(module==='risk-scenarios'?'risk':'financial')+'-sources/')
    return mapRecords(data.sources,data.records||[])
   }
   if(module==='legal-commercial'){
    const [contracts,financial]=await Promise.allSettled([request(root+'/legal-contracts/'),request(root+'/financial-sources/')])
    const result:Record<string,RowState>={}
    if(financial.status==='fulfilled')Object.assign(result,mapRecords(financial.value.sources,financial.value.records||[]))
    else result.minetrust=result.erp_epc={status:'Unavailable / restricted'}
    if(contracts.status==='fulfilled'){
     const record=contracts.value.records?.[0]
     result.contracts=record?{status:record.status==='reviewed'?'Legal review recorded':'Pending legal review',received:record.created_at,detail:record.filename,reference:'#'+record.id}:unavailable
    }else result.contracts={status:'Unavailable / restricted'}
    return result
   }
   return {} // ESG vendor connectors: planned, do not invent records or timestamps.
  }
  void resolve().then(value=>{if(alive)setRows(value)}).catch(e=>{if(alive){setRows({});setError(e instanceof Error?e.message:String(e))}}).finally(()=>{if(alive)setLoading(false)})
  return()=>{alive=false}
 },[open,module,targetId,revision,apiFetch,architecture.sources])
 const badge=(status:string)=>status==='Reviewed evidence'||status==='Legal review recorded'?'reviewed':status==='Simulated source'?'demo':status==='Pending review'||status==='Pending legal review'?'pending':status.includes('Unavailable')?'unavailable':'neutral'
 return <section className="mlh-panel" aria-label={architecture.name+' Data Lineage and Software Ingestion'}>
   <button type="button" className="mlh-trigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>
    <span className="mlh-icon"><Database size={19}/></span>
    <span className="mlh-label"><strong>Data Lineage &amp; Software Ingestion Hub</strong><small>Module {architecture.number} · {architecture.gate} · {architecture.sources.length} source mappings · {targetId}</small></span>
    <span className="mlh-expand">{open?'Hide provenance':'Source traceability'} {open?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</span>
   </button>
   {open&&<div className="mlh-content">
    <div className="mlh-explain"><p><strong>{architecture.function}.</strong> {architecture.summary}</p><button type="button" onClick={()=>setRevision(x=>x+1)} disabled={loading}><RefreshCw size={14}/> Refresh recorded sources</button></div>
    {error&&<p className="mlh-error" role="alert"><ShieldAlert size={15}/>{error}</p>}
    <div className="mlh-scroll"><table><thead><tr><th>Source system</th><th>Format / protocol</th><th>Source data</th><th>Destination factor</th><th>Recorded state</th><th>Observed / imported</th></tr></thead><tbody>{architecture.sources.map(source=>{
     const row=rows[source.key]??unavailable
     const status=loading?'Checking…':row.status
     return <tr key={source.key}><td><b>{source.name}</b>{row.reference&&<small>Record {row.reference}</small>}</td><td>{row.protocol||source.format}</td><td>{source.inputs}</td><td><strong>{source.output}</strong></td><td><span className={'mlh-status '+badge(status)}>{status}</span>{row.detail&&<small>{row.detail}</small>}</td><td><small>Observed: {nice(row.observed)}</small><small>Imported: {nice(row.received)}</small></td></tr>
    })}</tbody></table></div>
    <p className="mlh-footnote">Catalog mappings describe intended provenance, not confirmed live vendor integrations. Only an actual stored snapshot or approved record establishes recorded evidence. A missing source timestamp is displayed as —. Unverified, simulated and absent data must not be treated as certification or FID clearance.</p>
   </div>}
  </section>
}
