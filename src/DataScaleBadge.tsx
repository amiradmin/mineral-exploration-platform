import React,{useEffect,useState} from 'react'
import {useAuth} from './auth'
import './DataScaleBadge.css'
type Profile={phase:string;map_scale_denominator:number;sample_count:number;lab_method:string;drillhole_count:number;ddh_metres:number;rc_metres:number;grid_spacing_x:number|null;grid_spacing_y:number|null;core_recovery_pct:number|null;rqd_pct:number|null;verified:boolean}
type Result={profile:Profile|null;policy:{fid_allowed:boolean;blockers:string[];permitted_budget_scope:string}}
export default function DataScaleBadge({targetId}:{targetId:string}){
 const {apiFetch}=useAuth()
 const [data,setData]=useState<Result|null>(null)
 const [error,setError]=useState(false)
 useEffect(()=>{let active=true;setData(null);setError(false);void apiFetch('/api/targets/'+encodeURIComponent(targetId)+'/data-scale/').then(async r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{if(active)setData(d)}).catch(()=>{if(active)setError(true)});return()=>{active=false}},[targetId,apiFetch])
 const p=data?.profile
 const n=(v:number|null|undefined,suffix='')=>v===null||v===undefined?'—':v.toLocaleString()+suffix
 return <section className="ds-widget" aria-label="Data scale and sample support">
  <div className="ds-top"><strong>DATA SCALE & SAMPLE SUPPORT · {targetId}</strong><span className={'ds-status '+(data?.policy.fid_allowed?'ds-ready':'ds-blocked')}>{error?'Unavailable':!data?'Loading…':data.policy.fid_allowed?'Evidence eligible':'FID blocked'}</span></div>
  <div className="ds-grid">
   <div><small>Exploration phase / scale</small><b>{p?p.phase.replace(/^./,x=>x.toUpperCase()):'Not verified'} · {p?'1:'+n(p.map_scale_denominator):'—'}</b></div>
   <div><small>Assayed samples / method</small><b>{n(p?.sample_count)} · {p?.lab_method||'Not verified'}</b></div>
   <div><small>Drillholes / DDH / RC</small><b>{n(p?.drillhole_count)} · {n(p?.ddh_metres,' m')} / {n(p?.rc_metres,' m')}</b></div>
   <div><small>Drill grid</small><b>{n(p?.grid_spacing_x)} × {n(p?.grid_spacing_y)} m</b></div>
   <div><small>Core recovery / RQD</small><b>{n(p?.core_recovery_pct,'%')} / {n(p?.rqd_pct,'%')}</b></div>
  </div>
  {data&&!data.policy.fid_allowed&&<p className="ds-warning">Investment approval restricted · {data.policy.blockers.join(', ')||'Unverified evidence'}. Budget scope: {data.policy.permitted_budget_scope.replaceAll('_',' ')}.</p>}
 </section>
}
