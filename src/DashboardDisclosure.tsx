import {useId,useState,type ReactNode} from 'react'
import {ChevronDown,ChevronUp} from 'lucide-react'
import './DashboardDisclosure.css'

export default function DashboardDisclosure({label,heading,children}:{label:string;heading:ReactNode;children:ReactNode}){
 const [expanded,setExpanded]=useState(true)
 const id=useId()
 const action=(expanded?'Collapse ':'Expand ')+label
 const Icon=expanded?ChevronUp:ChevronDown
 return <>
  <div className="dashboard-disclosure-heading">
   <div>{heading}</div>
   <button type="button" className="dashboard-disclosure-toggle" aria-label={action}
    title={action} aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(value=>!value)}>
    <Icon size={17} aria-hidden="true"/>
   </button>
  </div>
  <div id={id} style={{display:expanded?'contents':'none'}}>{children}</div>
 </>
}
