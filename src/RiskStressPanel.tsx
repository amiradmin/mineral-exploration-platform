import {useState} from 'react'
import {useAuth} from './auth'
import './RiskStressPanel.css'
type Stress={model:string;iterations:number;inputs:Record<string,number>;geotech:{minimum_seismic_fos:number;maximum_seepage_index:number;note:string};distribution:{p05:number;p50:number;p95:number;units:string};source_refs:Record<string,{snapshot_id:number;sha256:string}>;warning:string}
export default function RiskStressPanel({targetId}:{targetId:string}){
 const {apiFetch}=useAuth()
 const [data,setData]=useState<Stress|null>(null)
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const [iterations,setIterations]=useState(2000)
 const [opex,setOpex]=useState(52)
 const [ore,setOre]=useState(4)
 const [grade,setGrade]=useState(0.84)
 const [recovery,setRecovery]=useState(87)
 const run=async()=>{try{setBusy(true);setError('');setData(null);const r=await apiFetch('/api/targets/'+encodeURIComponent(targetId)+'/risk-stress/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({iterations,unit_opex:opex,annual_ore_million:ore,grade_pct:grade,recovery_pct:recovery})});const body=await r.json();if(!r.ok)throw Error(body.detail+(body.missing?.length?' ('+body.missing.join(', ')+')':''));setData(body)}catch(e){setError(String(e))}finally{setBusy(false)}}
 return <section className="rsp-panel"><div className="rsp-title"><h2>Reviewed-source Stress Testing</h2><span>Reproducible simulation · Not FID approval</span></div><p>Uses historical copper prices, Pitram fleet downtime/efficiency and geotechnical warning indicators when all three source snapshots are reviewed.</p>
 <div className="rsp-fields"><label>Iterations<input type="number" min={100} max={10000} step={100} value={iterations} onChange={e=>setIterations(Number(e.target.value))}/></label><label>Ore Mt/year<input type="number" min=".1" max={100} step=".1" value={ore} onChange={e=>setOre(Number(e.target.value))}/></label><label>Unit OPEX $/t<input type="number" min={0} max={100000} value={opex} onChange={e=>setOpex(Number(e.target.value))}/></label><label>Cu grade (%)<input type="number" min=".01" max="100" step=".01" value={grade} onChange={e=>setGrade(Number(e.target.value))}/></label><label>Recovery (%)<input type="number" min=".01" max="100" step=".5" value={recovery} onChange={e=>setRecovery(Number(e.target.value))}/></label><button disabled={busy} onClick={()=>void run()}>{busy?'Analyzing…':'Run reviewed-source stress test'}</button></div>
 {error&&<p className="rsp-error" role="alert">{error}</p>}
 {data&&<div className="rsp-results"><div className="rsp-quantiles">{(['p05','p50','p95'] as const).map(k=><div key={k}><small>{k.toUpperCase()}</small><strong>{'$'+data.distribution[k].toFixed(2)+'M'}</strong></div>)}</div><p>Historic copper price ${data.inputs.historical_copper_price_usd_per_t.toFixed(0)}/t · Fleet downtime {(data.inputs.fleet_downtime_fraction*100).toFixed(1)}% · Market coefficient of variation {(data.inputs.market_coefficient_of_variation*100).toFixed(1)}% · Assumed OPEX dispersion {(data.inputs.assumed_opex_spread*100).toFixed(1)}%</p><p>Minimum seismic FOS {data.geotech.minimum_seismic_fos} · Maximum seepage index {data.geotech.maximum_seepage_index}</p><p>{data.geotech.note} {data.warning}</p><small>Source snapshot fingerprints: {Object.entries(data.source_refs).map(([k,v])=>k+' #'+v.snapshot_id+' '+v.sha256.slice(0,10)).join(' · ')}</small></div>}
 </section>
}
