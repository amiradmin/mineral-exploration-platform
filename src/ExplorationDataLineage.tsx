import React, {useEffect, useRef, useState} from 'react'
import SourceGeoJsonMap from './SourceGeoJsonMap'
import SourceRawHistory from './SourceRawHistory'
import {Activity, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Database, FileSpreadsheet, FlaskConical, GitBranch, Info, Layers3, Map, Network, Radar, X} from 'lucide-react'
import './ExplorationDataLineage.css'

type Factor = 'P_Source' | 'P_Pathway' | 'P_Trap' | 'P_Timing'
type Source = {
  id:string
  name:string
  format:string
  evidence:string[]
  factors:Factor[]
  protocols:string[]
  configured?:boolean
  status?:string
  isDemo?:boolean
  mappedFactors?:Factor[]
}
type Snapshot = {
  dataset: string
  observed_at: string
  received_at: string
  values: Record<string, unknown>
}
type SourceDetail = {
  configured:boolean
  status:string
  protocol:string|null
  format:string|null
  last_checked_at:string|null
  last_success_at:string|null
  latest:Snapshot|null
}
const catalog:Record<string,Source> = {
  oasis:{id:'oasis',name:'Oasis montaj',format:'Geosoft Grid',evidence:['Magnetic / gravity anomaly','Radiometric K, Th, U'],factors:['P_Source'],protocols:['File import (Grid / CSV)']},
  gcd:{id:'gcd',name:'GCDkit / IgPet',format:'Structured assay / CSV',evidence:['REE signatures','Sr/Y and V/Sc ratios'],factors:['P_Source'],protocols:['CSV', 'File export']},
  res:{id:'res',name:'RES2DINV / RES3DINV',format:'Inversion tomography',evidence:['Resistivity sections','IP chargeability'],factors:['P_Pathway'],protocols:['File export', 'CSV']},
  gis:{id:'gis',name:'ArcGIS Pro / QGIS',format:'GeoJSON / Shapefile',evidence:['Fault / fracture density','Tectonic structures'],factors:['P_Pathway','P_Trap'],protocols:['REST API (when available)', 'GeoJSON / Shapefile', 'OGC services']},
  rock:{id:'rock',name:'RockWorks',format:'Striplog / borehole data',evidence:['Lithology logs','Hydrothermal alteration'],factors:['P_Trap'],protocols:['CSV / file export']},
  dips:{id:'dips',name:'Dips (Rocscience)',format:'Stereonet data',evidence:['Discontinuity orientations'],factors:['P_Trap'],protocols:['CSV / file export']},
  geobank:{id:'geobank',name:'Datamine CCLAS / Geobank',format:'Assay / LIMS export',evidence:['Assay QA/QC results','CRM / blank / duplicate'],factors:['P_Timing'],protocols:['CSV / file export', 'API (subject to license)']},
}
const examples:Record<string,string[]> = {
  'T-001':['oasis','gcd','res','gis','geobank'],
  'T-002':['gcd','gis','rock','geobank'],
  'T-003':['gis','dips','geobank'],
  'T-004':['oasis','res','gis'],
  'T-005':['gcd','rock'],
}
const factorLabels:Record<Factor,string> = {
  P_Source:'Source rock potential',
  P_Pathway:'Mineralizing fluid pathway',
  P_Trap:'Structural / geological trap',
  P_Timing:'Mineralization timing',
}
const factorOrder:Factor[]=['P_Source','P_Pathway','P_Trap','P_Timing']
const iconFor=(id:string)=>{
  if(id==='gcd'||id==='geobank')return <FlaskConical size={17}/>
  if(id==='res'||id==='oasis')return <Radar size={17}/>
  if(id==='gis')return <Map size={17}/>
  if(id==='dips')return <Network size={17}/>
  return <Layers3 size={17}/>
}
const dateLabel=(value:string|null|undefined)=>value?new Date(value).toLocaleString():'Not available'

function SourceDetails({source,targetId,targetName,onClose}:{source:Source;targetId:string;targetName:string;onClose:()=>void}){
  const [detail,setDetail]=useState<SourceDetail|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const closeRef=useRef<HTMLButtonElement|null>(null)
  const [lastRefreshed,setLastRefreshed]=useState<string|null>(null)
  const [refreshing,setRefreshing]=useState(false)
  const [autoRefresh,setAutoRefresh]=useState(true)
  const [refreshSequence,setRefreshSequence]=useState(0)
  useEffect(()=>{
    const controller=new AbortController()
    let inFlight=false
    const load=async()=>{
      if(inFlight || controller.signal.aborted) return
      inFlight=true
      setRefreshing(true)
      try{
        const response=await fetch('/api/source-details/'+encodeURIComponent(targetId)+'/'+encodeURIComponent(source.id)+'/',{
          signal:controller.signal,
          credentials:'same-origin',
          cache:'no-store',
        })
        if(!response.ok) throw new Error(response.status===403||response.status===401?'Sign-in is required to view this source.':'Source details could not be loaded.')
        const data:SourceDetail=await response.json()
        if(!controller.signal.aborted){
          setDetail(data)
          setError('')
          setLastRefreshed(new Date().toISOString())
        }
      }catch(err){
        if(!controller.signal.aborted){
          setError(err instanceof Error?err.message:'Unable to read source data.')
        }
      }finally{
        inFlight=false
        if(!controller.signal.aborted){setLoading(false);setRefreshing(false)}
      }
    }
    void load()
    const timer=autoRefresh?window.setInterval(()=>{if(!document.hidden)void load()},30_000):null
    return ()=>{controller.abort();if(timer!==null)window.clearInterval(timer)}
  },[source.id,targetId,autoRefresh,refreshSequence])
  useEffect(()=>{
    closeRef.current?.focus()
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()}
    document.addEventListener('keydown',onKey)
    return ()=>document.removeEventListener('keydown',onKey)
  },[onClose])
  return <div className="ee-source-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <section className="ee-source-dialog" role="dialog" aria-modal="true" aria-label={source.name+' source details'}>
      <header className="ee-source-dialog-header">
        <span className="ee-source-dialog-icon">{iconFor(source.id)}</span>
        <div><small>EXPLORATION DATA SOURCE · {targetId}</small><h2>{source.name}</h2><p>{targetName}</p></div>
        <button ref={closeRef} type="button" className="ee-source-close" aria-label="Close source details" onClick={onClose}><X size={19}/></button>
      </header>
      <div className="ee-source-dialog-body">
        <div className="ee-source-refreshbar">
          <span className={error?'ee-source-poll-error':'ee-source-poll-ok'}>{refreshing?'Updating…':error?'Refresh failed':autoRefresh?'Auto-refresh every 30 seconds':'Auto-refresh paused'}</span>
          <span>{lastRefreshed?'Last checked '+dateLabel(lastRefreshed):'Not checked yet'}</span>
          <label><input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)}/> Auto refresh</label>
          <button type="button" disabled={refreshing} onClick={()=>setRefreshSequence(i=>i+1)}>Refresh now</button>
        </div>
        <div className="ee-source-demo-notice"><Info size={16}/> {detail?.latest?.values?.simulated===true?'SIMULATED GIS FEED — Generated GeoJSON, not real ArcGIS Pro or QGIS measurements.':'Source associations are illustrative. Latest stored data and recorded protocol are displayed when configured in Data Mine.'}</div>
        {source.id==='gis'&&detail?.latest?.values?.geojson&&<SourceGeoJsonMap geojson={detail.latest.values.geojson} observedAt={detail.latest.observed_at}/>}
        <div className="ee-source-detail-grid">
          <div className="ee-source-detail-panel">
            <h3><Activity size={16}/> Latest data available</h3>
            {loading&&<p role="status">Reading Data Mine source records…</p>}
            {error&&<p role="alert">{error}</p>}
            {!loading&&!error&&detail&&!detail.latest&&<div className="ee-source-empty"><Database size={23}/><strong>No source data received</strong><p>No imported snapshot is recorded for this project and software.</p></div>}
            {!loading&&!error&&detail?.latest&&<>
              <div className="ee-source-meta"><span>Dataset</span><strong>{detail.latest.dataset}</strong></div>
              <div className="ee-source-meta"><span>Observed at source</span><strong>{dateLabel(detail.latest.observed_at)}</strong></div>
              <div className="ee-source-meta"><span>Received by Data Mine</span><strong>{dateLabel(detail.latest.received_at)}</strong></div>
              <div className="ee-source-values">{Object.entries(detail.latest.values).filter(([name])=>name!=='geojson').slice(0,25).map(([name,value])=><div key={name}><span>{name.replaceAll('_',' ')}</span><strong>{typeof value==='object'?JSON.stringify(value):String(value)}</strong></div>)}</div>
              {detail.latest.values.geojson&&typeof detail.latest.values.geojson==='object'&&'features' in detail.latest.values.geojson&&Array.isArray(detail.latest.values.geojson.features)&&<div className="ee-source-features"><h4>Received GeoJSON features</h4>{detail.latest.values.geojson.features.slice(0,10).map((feature:any,i:number)=><div key={i} className="ee-source-feature"><strong>{String(feature.properties?.name??'Feature '+(i+1))}</strong><small>{String(feature.geometry?.type??'Geometry')} · {JSON.stringify(feature.geometry?.coordinates??[])}</small></div>)}</div>}
            </>}
            <h4>Expected evidence (illustrative)</h4>
            <div className="ee-source-tags">{source.evidence.map(item=><span key={item}>{item}</span>)}</div>
          </div>
          <div className="ee-source-detail-panel">
            <h3><Network size={16}/> Connection protocol</h3>
            <div className="ee-source-meta"><span>Configured protocol</span><strong>{loading?'Loading…':detail?.protocol||'Not configured'}</strong></div>
            <div className="ee-source-meta"><span>Connection state</span><strong className={detail?.status==='connected'?'ee-source-connected':''}>{loading?'Loading…':detail?.status?.replaceAll('_',' ')||'Not available'}</strong></div>
            <div className="ee-source-meta"><span>Data format</span><strong>{detail?.format||'Not configured'}</strong></div>
            <div className="ee-source-meta"><span>Last checked</span><strong>{dateLabel(detail?.last_checked_at)}</strong></div>
            <div className="ee-source-meta"><span>Last successful import</span><strong>{dateLabel(detail?.last_success_at)}</strong></div>
            <h4>Possible integration methods (not verified)</h4>
            <div className="ee-source-tags">{source.protocols.map(method=><span key={method}>{method}</span>)}</div>
            <p className="ee-source-method-note">API, CSV, socket and file transfers are transport options. A method is considered active only after an integration is configured and tested; this page does not initiate vendor connections.</p>
          </div>
        </div>
        <SourceRawHistory targetId={targetId} softwareKey={source.id}/>
      </div>
    </section>
  </div>
}

export default function ExplorationDataLineage({targetId,targetName}:{targetId:string;targetName:string}){
  const [expanded,setExpanded]=useState(true)
  const [selected,setSelected]=useState<string|null>(null)
  const [detailsFor,setDetailsFor]=useState<string|null>(null)
  const [sources,setSources]=useState<Source[]>([])
  const [registryError,setRegistryError]=useState('')
  useEffect(()=>{
    const controller=new AbortController()
    const refresh=async()=>{
      try{
        const response=await fetch('/api/targets/'+encodeURIComponent(targetId)+'/sources/',{
          credentials:'same-origin',signal:controller.signal,cache:'no-store',
        })
        if(!response.ok)throw new Error('Source registry unavailable (HTTP '+response.status+')')
        const data:{sources:Array<{key:string;name:string;expected_format:string;potential_factors:Factor[];mapped_factors:Factor[];configured:boolean;status:string;is_demo:boolean|null}>}=await response.json()
        if(controller.signal.aborted)return
        setSources(data.sources.map(item=>({
          ...(catalog[item.key]??{
            id:item.key,name:item.name,format:item.expected_format,
            factors:item.potential_factors,evidence:[],protocols:[],
          }),
          name:item.name,
          factors:item.mapped_factors.length?item.mapped_factors:item.potential_factors,
          configured:item.configured,
          mappedFactors:item.mapped_factors,
          isDemo:item.is_demo===true,
          status:item.status,
        })))
        setRegistryError('')
      }catch(err){if(!controller.signal.aborted){setSources([]);setRegistryError(err instanceof Error?err.message:'Source registry unavailable')}}
    }
    void refresh()
    const handle=window.setInterval(()=>{if(!document.hidden)void refresh()},30_000)
    return ()=>{controller.abort();window.clearInterval(handle)}
  },[targetId])
  const active=sources.find(source=>source.id===selected)??null
  const modalSource=sources.find(source=>source.id===detailsFor)??null
  const covered=new Set(sources.filter(source=>source.configured).flatMap(source=>source.mappedFactors??[]))
  return <section className="ee-lineage ee-panel" aria-label="Data source lineage">
    <div className="ee-lineage-head">
      <div className="ee-lineage-heading"><span className="ee-lineage-heading-icon"><GitBranch size={18}/></span>
        <div><h2>DATA SOURCE LINEAGE</h2><p>Conceptual evidence flow · {targetName}</p></div>
      </div>
      <div className="ee-lineage-head-actions">
        <span className="ee-lineage-mode"><Info size={13}/> SOURCE REGISTRY · POTENTIAL MAPPINGS LABELLED</span>
        <span className="ee-lineage-count"><Database size={14}/> {sources.filter(source=>source.configured).length} configured / {sources.length} listed</span>
        <button className="ee-lineage-toggle" type="button" onClick={()=>setExpanded(x=>!x)} aria-expanded={expanded} aria-controls="ee-lineage-content">{expanded?<ChevronUp size={16}/>:<ChevronDown size={16}/>} {expanded?'Collapse':'Expand'}</button>
      </div>
    </div>
    {expanded&&<div id="ee-lineage-content">
      <div className="ee-lineage-subtitle">Configured sources come from Django/PostgreSQL. Other entries are available catalog options; their proposed evidence paths are not calculation lineage.</div>
      {registryError&&<p className="ee-lineage-registry-error" role="alert">{registryError}</p>}
      <div className="ee-lineage-columns">
        <div className="ee-lineage-column">
          <div className="ee-lineage-column-heading"><Database size={15}/> SOFTWARE SOURCES <span>{sources.length}</span></div>
          <div className="ee-lineage-source-list">
            {sources.map(source=><div key={source.id} className={'ee-lineage-source'+(selected===source.id?' ee-lineage-selected':'')+(selected!==null&&selected!==source.id?' ee-lineage-muted':'')}>
              <button type="button" className="ee-lineage-select-source" onClick={()=>setSelected(old=>old===source.id?null:source.id)} aria-pressed={selected===source.id}>
                <span className="ee-lineage-node-icon">{iconFor(source.id)}</span>
                <span className="ee-lineage-source-copy"><strong>{source.name}</strong><small>{source.format}</small></span>
              </button>
              <span className={'ee-lineage-status'+(source.configured?' ee-lineage-registered':'')}>{source.configured?(source.isDemo?'DEMO ': '')+source.status?.replaceAll('_',' '):'NOT SET'}</span>
              <button type="button" className="ee-lineage-info-button" title={'View latest data and protocol for '+source.name} aria-label={'View details for '+source.name} onClick={()=>setDetailsFor(source.id)}><Info size={18}/></button>
            </div>)}
          </div>
        </div>
        <div className="ee-lineage-column ee-lineage-evidence">
          <div className="ee-lineage-column-heading"><Activity size={15}/> EXTRACTED EVIDENCE</div>
          <div className="ee-lineage-evidence-list">
            {sources.flatMap(source=>source.evidence.map((item,index)=>({source,item,key:source.id+'-'+index}))).map(({source,item,key})=><div key={key} className={'ee-lineage-evidence-node'+(active&&active.id!==source.id?' ee-lineage-muted':'')+(active?.id===source.id?' ee-lineage-selected':'')}>
              <span className="ee-lineage-connector" aria-hidden="true"/><span className="ee-lineage-small-dot"/><span>{item}</span>
            </div>)}
          </div>
        </div>
        <div className="ee-lineage-column ee-lineage-factors">
          <div className="ee-lineage-column-heading"><GitBranch size={15}/> EVALUATION FACTORS</div>
          <div className="ee-lineage-factor-list">
            {factorOrder.map(factor=><div key={factor} className={'ee-lineage-factor'+(active&&!active.factors.includes(factor)?' ee-lineage-muted':'')+(active?.factors.includes(factor)?' ee-lineage-selected':'')}>
              <span className="ee-lineage-factor-connector" aria-hidden="true"/><span><strong>{factor}</strong><small>{factorLabels[factor]}</small></span>{covered.has(factor)?<CheckCircle2 size={16}/>:<span className="ee-lineage-empty">No mapping</span>}
            </div>)}
          </div>
          <div className="ee-lineage-score"><span>EXPLORATION EVALUATION</span><strong>Source → Evidence → Factor</strong><small>Illustrative mapping only. Does not recalculate the Gate 1 score.</small></div>
        </div>
      </div>
      <div className="ee-lineage-foot">
        <span><span className="ee-lineage-legend-dot"/> Mapped in example</span>
        <span>Source selection: <strong>{active?active.name:'All sources'}</strong></span>
        <span>Only registered rules and stored snapshots contribute to evaluation runs. Unconfigured sources are catalog possibilities.</span>
      </div>
    </div>}
    {modalSource&&<SourceDetails key={targetId+'-'+modalSource.id} source={modalSource} targetId={targetId} targetName={targetName} onClose={()=>setDetailsFor(null)}/>}
  </section>
}
