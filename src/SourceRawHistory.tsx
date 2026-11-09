import {useEffect, useMemo, useState} from 'react'
import {CalendarClock, ChevronLeft, ChevronRight, Code2, Download, Database, RefreshCw} from 'lucide-react'
import './SourceRawHistory.css'

type Snapshot = {
  id:number
  dataset:string
  observed_at:string
  received_at:string
  values:Record<string,unknown>
}
type HistoryResponse = {
  count:number
  page:number
  page_size:number
  pages:number
  time_field:string
  results:Snapshot[]
}
const isoFromLocal=(value:string):string|null=>{
  if(!value)return null
  const dt=new Date(value)
  return Number.isNaN(dt.getTime())?null:dt.toISOString()
}
const fmt=(value:string)=>new Date(value).toLocaleString()
const downloadJson=(filename:string,content:string)=>{
  const url=URL.createObjectURL(new Blob([content],{type:'application/json'}))
  const a=document.createElement('a')
  a.href=url
  a.download=filename
  a.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}

export default function SourceRawHistory({targetId,softwareKey}:{targetId:string;softwareKey:string}){
  const [fromDraft,setFromDraft]=useState('')
  const [toDraft,setToDraft]=useState('')
  const [applied,setApplied]=useState<{from:string;to:string}>({from:'',to:''})
  const [page,setPage]=useState(1)
  const [revision,setRevision]=useState(0)
  const [data,setData]=useState<HistoryResponse|null>(null)
  const [selected,setSelected]=useState<number|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const selectedRow=useMemo(()=>data?.results.find(row=>row.id===selected)??null,[data,selected])
  const invalidRange=Boolean(fromDraft&&toDraft&&new Date(fromDraft).getTime()>new Date(toDraft).getTime())
  const invalidDate=Boolean((fromDraft&&!isoFromLocal(fromDraft))||(toDraft&&!isoFromLocal(toDraft)))

  useEffect(()=>{
    const controller=new AbortController()
    const query=new URLSearchParams({page:String(page)})
    if(applied.from)query.set('from',applied.from)
    if(applied.to)query.set('to',applied.to)
    setLoading(true)
    setError('')
    fetch('/api/source-details/'+encodeURIComponent(targetId)+'/'+encodeURIComponent(softwareKey)+'/snapshots/?'+query,{
      signal:controller.signal,
      credentials:'same-origin',
      cache:'no-store',
    }).then(async response=>{
      if(!response.ok){
        const body=await response.json().catch(()=>null)
        throw new Error(typeof body?.detail==='string'?body.detail:'Historical records could not be loaded (HTTP '+response.status+').')
      }
      return response.json()
    }).then((result:HistoryResponse)=>{
      if(!controller.signal.aborted){setData(result);setSelected(null)}
    }).catch((reason:Error)=>{
      if(!controller.signal.aborted){setError(reason.message);setData(null)}
    }).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return ()=>controller.abort()
  },[targetId,softwareKey,applied,page,revision])

  const apply=()=>{
    if(invalidDate||invalidRange)return
    setApplied({from:isoFromLocal(fromDraft)??'',to:isoFromLocal(toDraft)??''})
    setPage(1)
    setRevision(i=>i+1)
  }
  const clear=()=>{
    setFromDraft('');setToDraft('')
    setApplied({from:'',to:''})
    setPage(1)
    setRevision(i=>i+1)
  }
  return <section className="ee-history-panel" aria-label="Raw source data history">
    <header className="ee-history-header">
      <div><h3><Database size={16}/> RAW DATA / HISTORY</h3><p>Actual JSON snapshots stored in Data Mine · filter by <strong>received time</strong></p></div>
      <button type="button" className="ee-history-refresh" onClick={()=>setRevision(i=>i+1)} disabled={loading}><RefreshCw size={14}/> Reload</button>
    </header>
    <form className="ee-history-filters" onSubmit={e=>{e.preventDefault();apply()}}>
      <label><CalendarClock size={14}/> From (local time)
        <input type="datetime-local" value={fromDraft} onChange={e=>setFromDraft(e.target.value)}/>
      </label>
      <label><CalendarClock size={14}/> To (local time)
        <input type="datetime-local" value={toDraft} onChange={e=>setToDraft(e.target.value)}/>
      </label>
      <button type="submit" disabled={loading||invalidDate||invalidRange}>Apply interval</button>
      <button type="button" className="ee-history-clear" onClick={clear}>All records</button>
      {(invalidDate||invalidRange)&&<span className="ee-history-invalid" role="alert">{invalidRange?'Start must not be after end.':'Enter a valid date/time.'}</span>}
    </form>
    <div className="ee-history-summary" aria-live="polite">
      <span>{loading?'Loading records…':error?'Unable to load history':data?.count===0?'No snapshots in this interval':`${data?.count??0} matching snapshots`}</span>
      <span>{applied.from||applied.to?'Filtered interval · inclusive':'All available history'} · UTC stored, shown in local time</span>
    </div>
    {error&&<p className="ee-history-error" role="alert">{error}</p>}
    {!loading&&!error&&data&&<>
      <div className="ee-history-table-wrap">
        <table className="ee-history-table">
          <thead><tr><th>Received</th><th>Observed</th><th>Dataset</th><th>Features</th><th>Raw JSON</th></tr></thead>
          <tbody>{data.results.length===0?<tr><td colSpan={5} className="ee-history-empty">No stored snapshots match this time range.</td></tr>:data.results.map(row=><tr key={row.id} className={selected===row.id?'ee-history-active':''}>
            <td>{fmt(row.received_at)}</td><td>{fmt(row.observed_at)}</td><td>{row.dataset}{row.values.simulated===true&&<span className="ee-history-synthetic">SYNTHETIC</span>}</td><td>{typeof row.values.feature_count==='number'?row.values.feature_count:'—'}</td>
            <td><button type="button" aria-pressed={selected===row.id} onClick={()=>setSelected(old=>old===row.id?null:row.id)}><Code2 size={14}/> {selected===row.id?'Hide':'View'}</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="ee-history-pages">
        <span>Page {data.page} of {Math.max(data.pages,1)} · {data.page_size} per page</span>
        <div>
          <button type="button" disabled={loading||page<=1} onClick={()=>setPage(n=>n-1)}><ChevronLeft size={15}/> Previous</button>
          <button type="button" disabled={loading||page>=data.pages} onClick={()=>setPage(n=>n+1)}>Next <ChevronRight size={15}/></button>
        </div>
      </div>
      {selectedRow&&<div className="ee-history-json">
        <div><strong>RAW SNAPSHOT #{selectedRow.id} — {selectedRow.dataset}</strong><button type="button" onClick={()=>downloadJson(`${targetId}-${softwareKey}-snapshot-${selectedRow.id}.json`,JSON.stringify(selectedRow,null,2))}><Download size={14}/> Download JSON</button></div>
        <pre>{JSON.stringify(selectedRow,null,2)}</pre>
      </div>}
    </>}
  </section>
}
