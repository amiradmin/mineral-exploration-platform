import {useEffect,useState} from 'react'
import {AlertOctagon,Flag,ShieldAlert,CheckCircle2} from 'lucide-react'
import {useAuth} from './auth'
import {carbonateReplacementFlag} from './committeeReviewSamples'
import './ProjectStrategicFlags.css'
type ProjectFlag={id:number;kind:'catalyst'|'fatal_flaw'|'prerequisite';title:string;rationale:string;evidence_reference:string;gate:number;status:string}
const sampleFlags: Record<string, Pick<ProjectFlag,'kind'|'title'|'rationale'>> = {
 'exploration-evaluator': carbonateReplacementFlag,
 'reserve-simulator': {kind:'prerequisite',title:'Geostatistical Anisotropy Confirmed in Block 2',rationale:'Illustrative geostatistical review finding.'},
 'economics-engine': {kind:'fatal_flaw',title:'Metallurgical recovery drops to 82%',rationale:'Illustrative metallurgical downside warning.'},
}
export default function ProjectStrategicFlags({targetId,workspace,onOpenCommittee}:{targetId:string;workspace:string;onOpenCommittee:()=>void}){
 const {apiFetch}=useAuth()
 const [flags,setFlags]=useState<ProjectFlag[]>([])
 const [visible,setVisible]=useState(false)
 const [error,setError]=useState('')
 useEffect(()=>{let active=true;setFlags([]);setVisible(false);setError('');void apiFetch('/api/targets/'+encodeURIComponent(targetId)+'/committee/',{cache:'no-store'}).then(async r=>{
    if(r.status===401||r.status===403)return null
    const d=await r.json()
    if(!r.ok)throw Error(d.detail||'Committee flags unavailable')
    return d
   }).then(d=>{if(active&&d){setVisible(true);setFlags((d.flags||[]).filter((f:ProjectFlag)=>f.status==='open'))}}).catch(e=>{if(active){setError(String(e));setVisible(false)}});return()=>{active=false}},[targetId,apiFetch])
 const sample=targetId==='T-001'?sampleFlags[workspace]:undefined
 if(!visible&&!sample)return null
 const icons={catalyst:CheckCircle2,fatal_flaw:AlertOctagon,prerequisite:ShieldAlert}
 const sorted=[...flags].sort((a,b)=>a.kind==='fatal_flaw'?-1:b.kind==='fatal_flaw'?1:a.kind==='prerequisite'?-1:1)
 return <section className="psf-panel" aria-label="Expert committee strategic flags">
  <div className="psf-header"><span><Flag size={15}/> Expert Committee · Strategic Project Flags</span><span>Target {targetId} · {flags.length} open</span><button onClick={onOpenCommittee}>Open peer review</button></div>
  {sample&&<div className="psf-grid"><article className={'psf-'+sample.kind}><h3>Illustrative review flag</h3><strong>{sample.title}</strong><p>{sample.rationale}</p></article></div>}
  {visible&&(sorted.length?<div className="psf-grid">{sorted.slice(0,6).map(flag=>{const Icon=icons[flag.kind];return <article key={flag.id} className={'psf-'+flag.kind}><h3><Icon size={15}/>{flag.kind.replaceAll('_',' ')} · Gate {flag.gate}</h3><strong>{flag.title}</strong><p>{flag.rationale}</p><small>Evidence: {flag.evidence_reference}</small></article>})}</div>:<p className="psf-empty">No active strategic flags recorded. This does not imply the absence of project risk.</p>)}
  {error&&<p>{error}</p>}
 </section>
}
