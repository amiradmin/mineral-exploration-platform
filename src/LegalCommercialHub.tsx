import {useEffect,useState} from 'react'
import {FileText,Scale,UploadCloud,ShieldAlert,ShieldCheck,Calculator,Download,RefreshCw} from 'lucide-react'
import {useAuth} from './auth'
import {targets} from './mockData'
import SourceEvidencePanel from './SourceEvidencePanel'
import './LegalCommercialHub.css'

type Finding={code:string;severity:'high'|'medium'|'info';title:string;status:string;message:string;evidence?:{paragraph:number;excerpt:string}[]}
type Contract={id:number;filename:string;sha256:string;status:string;findings:Finding[];created_at:string;reviewed_by_id:number|null}
type Comparison={id:string;label:string;investor_conditions_met:boolean;npv_m:number;irr_pct:number|null;payback_years:number|null;net_cash_m:number;cash_flows:{year:number;owner_share_pct:number;revenue_m:number;owner_value_m:number;opex_m:number;capex_m:number;tax_m:number;cash_flow_m:number;cumulative_m:number}[]}
type ResponseResult={target_id:string;mode:string;is_illustrative:boolean;source_refs:Record<string,{snapshot_id:number;sha256:string}>;assumptions:Record<string,number|boolean>;results:{comparisons:Comparison[];frontier:{owner_share_pct:number;npv_m:number;irr_pct:number|null;payback_years:number|null;meets_conditions:boolean}[];maximum_owner_share_pct:number|null;recommendation:string;model_version:string};warnings:string[];legal_review_status:string;run_id?:number}
type ScenarioParams={mine_life:number;commodity_price_usd_per_t:number;metal_recovery_pct:number;operating_cost_usd_per_ore_t:number;tax_pct:number;discount_rate_pct:number;min_investor_irr_pct:number;max_payback_years:number;early_owner_share_pct:number;late_owner_share_pct:number;switch_after_year:number;use_reviewed_sources:boolean;save_run:boolean}
const defaults:ScenarioParams={mine_life:11,commodity_price_usd_per_t:9200,metal_recovery_pct:87,operating_cost_usd_per_ore_t:55,tax_pct:25,discount_rate_pct:10,min_investor_irr_pct:10,max_payback_years:6,early_owner_share_pct:15,late_owner_share_pct:28,switch_after_year:4,use_reviewed_sources:false,save_run:true}
const fields:[keyof ScenarioParams,string,number,number,number][]=[
 ['mine_life','Mine life (years)',3,30,1],['commodity_price_usd_per_t','Copper price (USD/t)',1,1000000,50],
 ['metal_recovery_pct','Recovery (%)',1,100,1],['operating_cost_usd_per_ore_t','Ore operating cost (USD/t)',0,100000,1],
 ['tax_pct','Tax assumption (%)',0,60,1],['discount_rate_pct','DCF discount rate (%)',0,40,.5],
 ['min_investor_irr_pct','Investor IRR hurdle (%)',0,60,.5],['max_payback_years','Max payback (years)',1,30,.5],
 ['early_owner_share_pct','Early owner share (%)',0,75,1],['late_owner_share_pct','Late owner share (%)',0,75,1],
 ['switch_after_year','Earliest step-up year',1,29,1]
]
const usd=(n:number)=>'$'+Math.abs(n).toLocaleString('en-US',{maximumFractionDigits:2})+'M'
const withSign=(n:number)=>(n<0?'−':'')+usd(n)
const niceTime=(s:string)=>new Date(s).toLocaleString()
export default function LegalCommercialHub({initialTargetId}:{initialTargetId:string}){
 const {apiFetch,user}=useAuth()
 const [targetId,setTargetId]=useState(initialTargetId)
 const [section,setSection]=useState<'contracts'|'partnership'>('contracts')
 const [documents,setDocuments]=useState<Contract[]>([])
 const [selectedContract,setSelectedContract]=useState<number|null>(null)
 const [file,setFile]=useState<File|null>(null)
 const [reviewNote,setReviewNote]=useState('')
 const [params,setParams]=useState<ScenarioParams>(defaults)
 const [simulation,setSimulation]=useState<ResponseResult|null>(null)
 const [expanded,setExpanded]=useState<string|null>(null)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [busy,setBusy]=useState(false)
 const [refresh,setRefresh]=useState(0)
 const memberships=user?.memberships?.filter(m=>m.target_id===targetId).map(m=>m.role)??[]
 const canRead=Boolean(user?.is_superuser||memberships.length)
 const canWrite=Boolean(user?.is_superuser||memberships.some(role=>['expert','cp','chair','board','legal'].includes(role)))
 const canReview=Boolean(user?.is_superuser||memberships.some(role=>['legal'].includes(role)))
 const base='/api/targets/'+encodeURIComponent(targetId)
 useEffect(()=>{setSelectedContract(null);setDocuments([]);setSimulation(null);setError('');if(!canRead)return;let active=true;void apiFetch(base+'/legal-contracts/').then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.detail||'Contracts unavailable');return data}).then(d=>{if(active)setDocuments(d.records)}).catch(e=>{if(active)setError(String(e))});return()=>{active=false}},[base,apiFetch,canRead,refresh])
 const upload=async()=>{if(!file)return;setBusy(true);setError('');setNotice('');try{
  const body=new FormData();body.append('file',file)
  const r=await apiFetch(base+'/legal-contracts/',{method:'POST',body});const d=await r.json()
  if(!r.ok)throw Error(d.detail||JSON.stringify(d))
  setNotice('Contract screened and recorded for review.');setFile(null);setSelectedContract(d.id);setRefresh(n=>n+1)
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 const review=async()=>{if(selectedContract===null)return;setBusy(true);setError('');try{
  const r=await apiFetch(base+'/legal-contracts/'+selectedContract+'/review/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rationale:reviewNote})});const d=await r.json()
  if(!r.ok)throw Error(d.detail||JSON.stringify(d))
  setNotice('Designated legal reviewer sign-off recorded. Independent legal advice remains necessary for binding decisions.');setReviewNote('');setRefresh(n=>n+1)
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 const simulate=async()=>{setBusy(true);setError('');setSimulation(null);try{
  const r=await apiFetch(base+'/commercial-scenarios/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params)});const d=await r.json()
  if(!r.ok)throw Error(d.detail||JSON.stringify(d));setSimulation(d);setSection('partnership')
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 const download=()=>{if(!simulation)return;const blob=new Blob([JSON.stringify(simulation,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='partnership-split-'+targetId+'.json';a.click();URL.revokeObjectURL(url)}
 const active=documents.find(x=>x.id===selectedContract)
 return <div className="lc-hub">
  <div className="lc-head"><div><small>MODULE 7 · PROJECT GOVERNANCE</small><h1><Scale size={23}/> Legal &amp; Commercial AI Hub</h1><p>Contract risk screening and quantitative mineral partnership negotiations, grounded in reviewed evidence where available.</p></div><div className="lc-head-status"><ShieldAlert size={16}/> Advisory only · Legal counsel required</div></div>
  <div className="lc-target"><label>Exploration target<select value={targetId} onChange={e=>setTargetId(e.target.value)}>{targets.map(t=><option key={t.id} value={t.id}>{t.id} · {t.name}</option>)}</select></label><button onClick={()=>setRefresh(v=>v+1)}><RefreshCw size={15}/> Refresh</button><span>{canRead?'Authorized target workspace':'Membership required for confidential legal data'}</span></div>
  {!canRead?<section className="lc-panel"><h2>Restricted legal records</h2><p>An administrator must grant you an active target-specific committee membership in User Access Management. Contract text and financial scenarios are not public project data.</p></section>:<>
   <div className="lc-tabs"><button className={section==='contracts'?'active':''} onClick={()=>setSection('contracts')}><FileText size={16}/> Contract Risk Audit</button><button className={section==='partnership'?'active':''} onClick={()=>setSection('partnership')}><Calculator size={16}/> Partnership Split Optimizer</button></div>
   {section==='contracts'&&<>
    <section className="lc-panel"><div className="lc-panel-head"><h2>Confidential document audit</h2><span>TXT / searchable PDF · max 2 MB · text screening v1</span></div><p>Flags possible take-or-pay, unilateral termination, unrecovered capital, FX, stripping delay and royalty provisions. Every match links to an excerpt from the uploaded document. Missing matches do not establish legal compliance.</p>
     {canWrite&&<div className="lc-upload"><label>Upload contract<input type="file" accept=".pdf,.txt" onChange={e=>setFile(e.target.files?.[0]??null)}/></label><button disabled={!file||busy} onClick={()=>void upload()}><UploadCloud size={15}/> {busy?'Screening…':'Upload and audit'}</button></div>}
     <div className="lc-contract-grid"><aside>{documents.length?documents.map(doc=><button key={doc.id} className={selectedContract===doc.id?'active':''} onClick={()=>setSelectedContract(doc.id)}><strong>{doc.filename}</strong><small>{doc.status} · {niceTime(doc.created_at)}</small></button>):<p>No contracts registered for this target.</p>}</aside><div className="lc-findings">{active?<><div className="lc-contract-title"><h3>{active.filename}</h3><span>{active.status==='reviewed'?'Technical review recorded':'Pending legal review'}</span></div><p>SHA-256: <code>{active.sha256}</code></p>
       {active.findings.map((finding,index)=><article key={finding.code+index} className={'lc-finding lc-'+finding.severity}><div><strong>{finding.title}</strong><span>{finding.severity.toUpperCase()} · {finding.status.replaceAll('_',' ')}</span></div><p>{finding.message}</p>{finding.evidence?.map((ev,j)=><blockquote key={j}><small>Excerpt · paragraph {ev.paragraph}</small><p>{ev.excerpt}</p></blockquote>)}</article>)}
       {canReview&&active.status!=='reviewed'&&<div className="lc-review"><label>Legal review rationale<textarea rows={3} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="Provide legal-review references or technical findings (20+ characters)"/></label><button disabled={busy||reviewNote.trim().length<20} onClick={()=>void review()}><ShieldCheck size={15}/> Record review</button></div>}
      </>:<p>Select a contract to inspect risk flags and source excerpts.</p>}</div></div>
    </section>
   </>}
   {section==='partnership'&&<>
    <section className="lc-panel"><div className="lc-panel-head"><h2>Partnership Split Optimizer</h2><span>Deterministic DCF · Python backend</span></div>
     <p>Owner share is modeled as recovered metal value. Contract-specific exemptions, royalties, financing fees and reserve classifications require independent review. The 15–18% negotiation range is evaluated, not assumed to be optimal.</p>
     <SourceEvidencePanel targetId={targetId} kind="financial" onChanged={()=>setSimulation(null)}/>
     <div className="lc-assumptions">{fields.map(([key,label,min,max,step])=><label key={key}>{label}<input type="number" min={min} max={max} step={step} value={params[key] as number} onChange={e=>{setParams(old=>({...old,[key]:Number(e.target.value)}));setSimulation(null)}}/></label>)}</div>
     <label className="lc-toggle"><input type="checkbox" checked={params.use_reviewed_sources} onChange={e=>{setParams(p=>({...p,use_reviewed_sources:e.target.checked}));setSimulation(null)}}/> Require reviewed MineTrust LOM production and ERP/EPC setup CAPEX</label>
     <label className="lc-toggle"><input type="checkbox" checked={params.save_run} onChange={e=>setParams(p=>({...p,save_run:e.target.checked}))}/> Save auditable result to target history</label>
     <button className="lc-primary" disabled={busy} onClick={()=>void simulate()}>{busy?'Calculating…':'Simulate commercial share strategies'}</button>
    </section>
    {simulation&&<section className="lc-panel"><div className="lc-panel-head"><h2>Investment negotiation comparison</h2><span>{simulation.mode.replaceAll('_',' ')} · {simulation.results.model_version}</span></div>
     <div className="lc-kpis"><div><small>Maximum whole-percent owner share meeting all hurdles</small><strong>{simulation.results.maximum_owner_share_pct===null?'None':simulation.results.maximum_owner_share_pct+'%'}</strong></div><div><small>Source data</small><strong>{simulation.is_illustrative?'Illustrative':'Reviewed source records'}</strong></div><div><small>Contract review</small><strong>{simulation.legal_review_status.replaceAll('_',' ')}</strong></div></div>
     <div className="lc-table-wrap"><table><thead><tr><th>Owner share strategy</th><th>Investor NPV ($M)</th><th>Investor IRR</th><th>Payback</th><th>Hurdles</th></tr></thead><tbody>{simulation.results.comparisons.map(x=><tr key={x.id}><th>{x.label}</th><td className={x.npv_m>=0?'lc-positive':'lc-negative'}>{withSign(x.npv_m)}</td><td>{x.irr_pct===null?'N/A':x.irr_pct+'%'}</td><td>{x.payback_years===null?'Not reached':x.payback_years+' years'}</td><td>{x.investor_conditions_met?'Met':'Not met'}</td></tr>)}</tbody></table></div>
     <div className="lc-summary"><b>{simulation.results.recommendation}</b><p>The step-up share increases only after the selected year AND actual modeled CAPEX payback. Review cash-flow scheduling and ownership economics with the commercial team.</p></div>
     <div className="lc-actions"><button onClick={download}><Download size={15}/> Export assumptions, sources and annual DCF</button>{simulation.run_id&&<span>Saved run #{simulation.run_id}</span>}</div>
     <div className="lc-charts"><h3>Share sensitivity: investor NPV versus owner share</h3><svg viewBox="0 0 660 185" role="img" aria-label="Investors NPV by flat owner share">
       <rect x="45" y="10" width="600" height="145" fill="#101d35"/>{[0,1,2,3,4].map(i=><line key={i} x1="45" y1={15+i*35} x2="645" y2={15+i*35} stroke="#385371" strokeWidth=".7"/>)}
       {(()=>{const pts=simulation.results.frontier;const min=Math.min(0,...pts.map(x=>x.npv_m));const max=Math.max(1,...pts.map(x=>x.npv_m));const y=(v:number)=>15+(max-v)/(max-min)*135;const x=(share:number)=>45+share/50*600;return <><line x1="45" x2="645" y1={y(0)} y2={y(0)} stroke="#e6aa67" strokeDasharray="5 5"/><polyline fill="none" stroke="#60d9f0" strokeWidth="3" points={pts.map(p=>x(p.owner_share_pct)+','+y(p.npv_m)).join(' ')}/>{pts.filter(p=>p.meets_conditions&&p.owner_share_pct%5===0).map(p=><circle key={p.owner_share_pct} cx={x(p.owner_share_pct)} cy={y(p.npv_m)} r="4" fill="#69efaf"/>)}</>})()}
       {[0,10,20,30,40,50].map(x=><text key={x} x={45+x/50*600} y="173" fontSize="11" textAnchor="middle" fill="#a8bdcc">{x}%</text>)}
      </svg><p>Green points satisfy NPV ≥ 0, the chosen IRR hurdle and maximum payback.</p></div>
     {simulation.results.comparisons.map(item=><details className="lc-flow" key={item.id} open={expanded===item.id} onToggle={e=>{if((e.currentTarget as HTMLDetailsElement).open)setExpanded(item.id)}}><summary>{item.label} · annual cash flow</summary><div className="lc-table-wrap"><table><thead><tr><th>Year</th><th>Owner %</th><th>Gross revenue</th><th>Owner value</th><th>OPEX</th><th>CAPEX</th><th>Tax</th><th>Investor cash flow</th></tr></thead><tbody>{item.cash_flows.map(f=><tr key={f.year}><td>{f.year}</td><td>{f.owner_share_pct}%</td><td>{usd(f.revenue_m)}</td><td>{usd(f.owner_value_m)}</td><td>{usd(f.opex_m)}</td><td>{usd(f.capex_m)}</td><td>{usd(f.tax_m)}</td><td>{withSign(f.cash_flow_m)}</td></tr>)}</tbody></table></div></details>)}
     <div className="lc-warnings">{simulation.warnings.map((warning,i)=><p key={i}><ShieldAlert size={14}/>{warning}</p>)}</div>
    </section>}
   </>}
   {notice&&<div className="lc-message" role="status">{notice}</div>}{error&&<div className="lc-error" role="alert">{error}</div>}
  </>}
 </div>
}
