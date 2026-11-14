import React,{useEffect,useState} from 'react'
import {useAuth} from './auth'
import './DataScaleBadge.css'
type Profile={phase:string;map_scale_denominator:number;sample_count:number;lab_method:string;drillhole_count:number;ddh_metres:number;rc_metres:number;grid_spacing_x:number|null;grid_spacing_y:number|null;core_recovery_pct:number|null;rqd_pct:number|null;verified:boolean}
type Result={profile:Profile|null;policy:{fid_allowed:boolean;blockers:string[];permitted_budget_scope:string}}
const empty:Profile={phase:'reconnaissance',map_scale_denominator:50000,sample_count:0,lab_method:'',drillhole_count:0,ddh_metres:0,rc_metres:0,grid_spacing_x:null,grid_spacing_y:null,core_recovery_pct:null,rqd_pct:null,verified:false}
const detailedReviewScale = { phase: 'Detailed Feasibility', holes: 48, metres: 9600, grid: 50 }
const reviewScales: Record<string, { phase: string; holes: number; metres: number; grid: number }> = {
 'decision-center': detailedReviewScale,
 'exploration-evaluator': { phase: 'Semi-Detailed', holes: 12, metres: 2400, grid: 100 },
 'reserve-simulator': { phase: 'Advanced Drilling', holes: 18, metres: 3600, grid: 100 },
 'economics-engine': { phase: 'Pre-Feasibility', holes: 24, metres: 4800, grid: 50 },
 'risk-scenarios': { phase: 'Risk Assessment', holes: 32, metres: 6400, grid: 50 },
 'financial-valuator': detailedReviewScale,
 'esg-governance': detailedReviewScale,
 'legal-commercial': detailedReviewScale,
}
export default function DataScaleBadge({targetId,workspace='decision-center'}:{targetId:string;workspace?:string}){
 const {apiFetch,user}=useAuth()
 const [data,setData]=useState<Result|null>(null)
 const [error,setError]=useState('')
 const [editing,setEditing]=useState(false)
 const [form,setForm]=useState<Profile>(empty)
 const [reload,setReload]=useState(0)
 const canEdit=Boolean(user?.is_superuser||user?.memberships?.some(m=>m.role==='data_steward'))
 useEffect(()=>{let active=true;setData(null);setError('');setEditing(false);void apiFetch('/api/targets/'+encodeURIComponent(targetId)+'/data-scale/').then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.detail||'Data scale unavailable');return body}).then(d=>{if(active){setData(d);setForm(d.profile??empty)}}).catch(e=>{if(active)setError(String(e))});return()=>{active=false}},[targetId,apiFetch,reload])
 const p=data?.profile
 const n=(v:number|null|undefined,suffix='')=>v===null||v===undefined?'—':v.toLocaleString()+suffix
 const sample = targetId === "T-001" ? reviewScales[workspace] : undefined
 const sampleDrilling = data && !p ? sample : undefined
 const sampleDetails = sampleDrilling && workspace === 'exploration-evaluator'
  ? { mapScale: 10000, assayCount: 480, labMethod: 'ICP-OES', coreRecovery: 95, rqd: 78 }
  : undefined
 const sampleGrid = data && p?.grid_spacing_x == null && p?.grid_spacing_y == null ? sample : undefined
 const set=(key:keyof Profile,value:any)=>setForm(old=>({...old,[key]:value}))
 const numeric=(key:keyof Profile,value:string)=>set(key,value.trim()===''?null:Number(value))
 const save=async()=>{try{setError('');const response=await apiFetch('/api/targets/'+encodeURIComponent(targetId)+'/data-scale/',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,verified:false})});const body=await response.json();if(!response.ok)throw Error(JSON.stringify(body));setEditing(false);setReload(x=>x+1)}catch(e){setError(String(e))}}
 return <section className="ds-widget" aria-label="Data scale and sample support">
  <div className="ds-top"><strong>DATA SCALE & SAMPLE SUPPORT · {targetId}</strong><div className="ds-actions"><span className={'ds-status '+(data?.policy.fid_allowed?'ds-ready':'ds-blocked')}>{error?'Unavailable':!data?'Loading…':data.policy.fid_allowed?'Evidence eligible':'FID blocked'}</span>{canEdit&&<button type="button" onClick={()=>setEditing(v=>!v)}>{editing?'Close':'Edit evidence'}</button>}</div></div>
  <div className="ds-grid">
   <div><small>Exploration phase / scale{sampleDrilling?' (sample)':''}</small><b>{p?p.phase.replace(/^./,x=>x.toUpperCase()):sampleDrilling?.phase??'Not verified'} · {p||sampleDetails?'1:'+n(p?.map_scale_denominator??sampleDetails?.mapScale):'—'}</b></div>
   <div><small>Assayed samples / method{sampleDetails?' (sample)':''}</small><b>{n(p?.sample_count??sampleDetails?.assayCount)} · {p?.lab_method||sampleDetails?.labMethod||'Not verified'}</b></div>
   <div><small>Drillholes / DDH / RC{sampleDrilling?' (sample)':''}</small><b>{sampleDrilling? n(sampleDrilling.holes)+' · '+n(sampleDrilling.metres,' m')+' / 0 m' : n(p?.drillhole_count)+' · '+n(p?.ddh_metres,' m')+' / '+n(p?.rc_metres,' m')}</b></div>
   <div><small>Drill grid{sampleGrid?' (sample)':''}</small><b>{n(sampleGrid?.grid??p?.grid_spacing_x)} × {n(sampleGrid?.grid??p?.grid_spacing_y)} m</b></div>
   <div><small>Core recovery / RQD{sampleDetails?' (sample)':''}</small><b>{n(p?.core_recovery_pct??sampleDetails?.coreRecovery,'%')} / {n(p?.rqd_pct??sampleDetails?.rqd,'%')}</b></div>
  </div>
  {data&&!data.policy.fid_allowed&&<p className="ds-warning">Investment approval restricted · {data.policy.blockers.join(', ')||'Unverified evidence'}. Budget scope: {data.policy.permitted_budget_scope.replaceAll('_',' ')}.</p>}
  {error&&<p role="alert" className="ds-warning">{error}</p>}
  {editing&&<div className="ds-editor"><p>Record evidence metadata. Saving resets verified status; a competent-person verification workflow is required before investment use.</p><div className="ds-fields">
   <label>Phase<select value={form.phase} onChange={e=>set('phase',e.target.value)}><option value="reconnaissance">Reconnaissance</option><option value="general">General exploration</option><option value="detailed">Detailed exploration</option></select></label>
   <label>Map scale (1:N)<input type="number" min="500" max="50000" value={form.map_scale_denominator} onChange={e=>numeric('map_scale_denominator',e.target.value)}/></label>
   <label>Analyzed samples<input type="number" min="0" value={form.sample_count} onChange={e=>numeric('sample_count',e.target.value)}/></label>
   <label>Lab method<input value={form.lab_method} onChange={e=>set('lab_method',e.target.value)}/></label>
   <label>Drillholes<input type="number" min="0" value={form.drillhole_count} onChange={e=>numeric('drillhole_count',e.target.value)}/></label>
   <label>DDH metres<input type="number" min="0" value={form.ddh_metres} onChange={e=>numeric('ddh_metres',e.target.value)}/></label>
   <label>RC metres<input type="number" min="0" value={form.rc_metres} onChange={e=>numeric('rc_metres',e.target.value)}/></label>
   <label>Grid X (m)<input type="number" min="0" value={form.grid_spacing_x??''} onChange={e=>numeric('grid_spacing_x',e.target.value)}/></label>
   <label>Grid Y (m)<input type="number" min="0" value={form.grid_spacing_y??''} onChange={e=>numeric('grid_spacing_y',e.target.value)}/></label>
   <label>Core recovery (%)<input type="number" min="0" max="100" value={form.core_recovery_pct??''} onChange={e=>numeric('core_recovery_pct',e.target.value)}/></label>
   <label>RQD (%)<input type="number" min="0" max="100" value={form.rqd_pct??''} onChange={e=>numeric('rqd_pct',e.target.value)}/></label>
  </div><button type="button" onClick={()=>void save()}>Save unverified evidence</button></div>}
 </section>
}
