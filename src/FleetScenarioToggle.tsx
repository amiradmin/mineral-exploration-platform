import {fleetReviewCases,formatFleetNpv,type FleetCase} from './decisionPipeline'
import './FleetScenarioToggle.css'

const cases: FleetCase[] = ['hold', 'go']

export default function FleetScenarioToggle({value,onChange}:{value:FleetCase;onChange:(value:FleetCase)=>void}){
 return <div className="fleet-toggle" role="group" aria-label="Fleet optimization scenario">
  {cases.map(id=>{
   const scenario=fleetReviewCases[id]
   return <button key={id} type="button" data-scenario={id} aria-pressed={id===value}
    onClick={()=>{if(id!==value)onChange(id)}}>
    <strong>{scenario.verdict}</strong>
    <span>{scenario.label}</span>
    <span>NPV {formatFleetNpv(scenario.npv)}</span>
   </button>
  })}
 </div>
}
