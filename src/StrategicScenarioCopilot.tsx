import {useState} from 'react'
import {useAuth} from './auth'
import './StrategicScenarioCopilot.css'
type Flow={year:number;capex:number;maintenance:number;downtime_cost:number;depreciation:number;tax:number;cash_flow:number;cumulative:number}
type Result={id:string;name:string;initial_capex:number;lom_net_capex:number;maintenance:number;downtime_pct:number;replacement_interval:number;npv:number;payback_years:number|null;annual_flows:Flow[]}
type Output={policy_version:string;calculation_mode:string;source_mode?:string;source_refs?:Record<string,{snapshot_id:number;sha256:string}>;verified_project_economics:boolean;translator:{intent:string;confidence:string;changes:Record<string,number|boolean>;warnings:string[]};assumptions:Record<string,number>;results:Result[];best_npv:string;fastest_payback:string|null;npv_spread:number;recommendation:string;disclaimer:string}
const cash=(x:number)=> (x<0?'−':'')+'$'+Math.abs(x).toLocaleString('en-US',{maximumFractionDigits:2})+'M'
const example='Compare used premium mining equipment with a new Caterpillar fleet and new economy machines replaced every 2 years. Mine life 11 years, discount rate 10%.'
const fields=[['mine_life','Mine life (years)',3,30,1],['discount_rate','Discount rate (%)',0,40,.5],['annual_contribution','Annual operating contribution ($M/year)',0,10000,1],['revenue_at_risk','Annual revenue at risk ($M/year)',0,10000,1],['tax_rate','Effective tax rate (%)',0,60,1],['commodity_price_usd_per_t','Copper price ($/t metal)',0,1000000,50],['metal_recovery_pct','Metal recovery (%)',0,100,1],['cost_per_ore_t_usd','Ore operating cost ($/t)',0,1000000,1]] as const
export default function StrategicScenarioCopilot({targetId}:{targetId:string}){
 const {apiFetch}=useAuth()
 const [prompt,setPrompt]=useState(example)
 const [assumptions,setAssumptions]=useState<Record<string,number>>({mine_life:11,discount_rate:10,annual_contribution:60,revenue_at_risk:40,tax_rate:25,commodity_price_usd_per_t:9200,metal_recovery_pct:87,cost_per_ore_t_usd:55})
 const [useReviewed,setUseReviewed]=useState(false)
 const [output,setOutput]=useState<Output|null>(null)
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const [selected,setSelected]=useState<string|null>(null)
 const run=async()=>{try{setBusy(true);setError('');setOutput(null);const response=await apiFetch('/api/strategic-scenarios/fleet/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,...assumptions,target_id:targetId,use_reviewed_sources:useReviewed})});const body=await response.json();if(!response.ok)throw Error(body.detail||'Unable to evaluate scenario');setOutput(body)}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 const download=()=>{if(!output)return;const blob=new Blob([JSON.stringify({target_id:targetId,prompt,...output},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='fleet-strategy-'+targetId+'.json';link.click();URL.revokeObjectURL(url)}
 return <section className="ssc-wrap" aria-label="Strategic fleet scenarios — Data Mine LLM">
  <div className="ssc-head"><div><small>MODULE 5 · STRATEGIC SCENARIO — DATA MINE LLM</small><h2>Mining Fleet Procurement Strategies</h2><p>Describe a boardroom procurement question. The translator extracts a controlled parameter set, and Python calculates 11-year cash flows deterministically.</p></div><span>Illustrative, not FID authorization</span></div>
  <label className="ssc-prompt">Strategic question<textarea value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={2000} rows={3} placeholder="Ask in English or Persian"/></label>
  <div className="ssc-fields">{fields.map(([key,label,min,max,step])=><label key={key}>{label}<input type="number" min={min} max={max} step={step} value={assumptions[key]} onChange={e=>setAssumptions(a=>({...a,[key]:Number(e.target.value)}))}/></label>)}</div>
  <label className="ssc-checkbox"><input type="checkbox" checked={useReviewed} onChange={e=>setUseReviewed(e.target.checked)}/> Require reviewed MineTrust + ERP/EPC source records (otherwise illustrative modeling only)</label>
  <div className="ssc-buttons"><button disabled={busy||prompt.trim().length<8} onClick={()=>void run()}>{busy?'Computing…':'Interpret & run deterministic fleet DCF'}</button>{output&&<button onClick={download}>Export scenario audit JSON</button>}</div>
  {error&&<p className="ssc-error" role="alert">{error}</p>}
  {output&&<>
   <div className="ssc-translation"><b>Structured interpretation</b><span>Engine: {output.calculation_mode.replaceAll('_',' ')} · Version: {output.policy_version} · Source mode: {output.source_mode||'illustrative'}</span><span>Extracted inputs: {JSON.stringify(output.translator.changes)}</span><span>Applied financial assumptions: {JSON.stringify(output.assumptions)}</span>{output.translator.warnings.map((warning,index)=><small key={index}>{warning}</small>)}</div>
   <div className="ssc-table-scroll"><table><thead><tr><th>Finance / operations</th>{output.results.map(result=><th key={result.id}>{result.name}</th>)}</tr></thead><tbody>
    <tr><td>Initial CAPEX (year 0)</td>{output.results.map(r=><td key={r.id}>{cash(r.initial_capex)}</td>)}</tr>
    <tr><td>LOM net fleet CAPEX</td>{output.results.map(r=><td key={r.id}>{cash(r.lom_net_capex)}</td>)}</tr>
    <tr><td>Annual maintenance</td>{output.results.map(r=><td key={r.id}>{cash(r.maintenance)}/yr</td>)}</tr>
    <tr><td>Downtime assumption</td>{output.results.map(r=><td key={r.id}>{r.downtime_pct}%</td>)}</tr>
    <tr><td>NPV @ {output.assumptions.discount_rate}%</td>{output.results.map(r=><td className={r.id===output.best_npv?'ssc-best':''} key={r.id}>{cash(r.npv)}</td>)}</tr>
    <tr><td>Simple undiscounted payback</td>{output.results.map(r=><td key={r.id}>{r.payback_years===null?'Not reached':r.payback_years.toFixed(2)+' years'}</td>)}</tr>
   </tbody></table></div>
   <div className="ssc-summary"><strong>{output.recommendation}</strong><span>Model NPV spread: {cash(output.npv_spread)}. Fastest payback: {output.fastest_payback||'Not reached'}.</span><p>{output.disclaimer}</p></div>
   <div className="ssc-flows"><h3>Annual DCF audit tables</h3>{output.results.map(r=><details key={r.id} open={selected===r.id} onToggle={e=>{if((e.currentTarget as HTMLDetailsElement).open)setSelected(r.id)}}><summary>{r.name} · {r.annual_flows.length} cash-flow periods</summary><div className="ssc-table-scroll"><table><thead><tr><th>Year</th><th>CAPEX</th><th>Maintenance</th><th>Downtime loss</th><th>Depreciation</th><th>Tax</th><th>Free cash flow</th></tr></thead><tbody>{r.annual_flows.map(f=><tr key={f.year}><td>{f.year}</td><td>{cash(f.capex)}</td><td>{cash(f.maintenance)}</td><td>{cash(f.downtime_cost)}</td><td>{cash(f.depreciation)}</td><td>{cash(f.tax)}</td><td>{cash(f.cash_flow)}</td></tr>)}</tbody></table></div></details>)}</div>
  </>}
 </section>
}
