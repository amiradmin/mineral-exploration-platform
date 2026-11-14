import {useState,type ReactNode} from 'react'
import {ArrowDown,ArrowUp,GripVertical} from 'lucide-react'
import './DashboardPanelLayout.css'

type Panel = {id:string;label:string;content:ReactNode}

function savedOrder(key:string):string[]{
 try {
  const value:unknown=JSON.parse(localStorage.getItem(key)??'null')
  return Array.isArray(value)?value.filter((id):id is string=>typeof id==='string'):[]
 } catch {
  return []
 }
}

export default function DashboardPanelLayout({panels,storageKey}:{panels:Panel[];storageKey:string}){
 const [saved,setSaved]=useState(()=>savedOrder(storageKey))
 const [dragged,setDragged]=useState<string|null>(null)
 const [dropTarget,setDropTarget]=useState<string|null>(null)
 const [announcement,setAnnouncement]=useState('')
 const byId=new Map(panels.map(panel=>[panel.id,panel]))
 const order=[...new Set([...saved,...byId.keys()])].filter(id=>byId.has(id))

 function move(id:string,target:string){
  if(id===target||!byId.has(id)||!byId.has(target))return
  const position=order.indexOf(target)
  const next=order.filter(item=>item!==id)
  next.splice(position,0,id)
  setSaved(next)
  setAnnouncement(byId.get(id)?.label+' moved to position '+(position+1)+' of '+next.length)
  try {localStorage.setItem(storageKey,JSON.stringify(next))} catch { /* Layout still works for this session. */ }
 }

 function finishDrag(){
  setDragged(null)
  setDropTarget(null)
 }

 return <div className="dashboard-panel-layout">
  <span className="dashboard-layout-announcement" role="status">{announcement}</span>
  {order.map((id,index)=>{
   const panel=byId.get(id)!
   return <div key={id} className="dashboard-layout-panel" data-drop-target={dropTarget===id}
    onDragOver={event=>{
     if(!dragged||dragged===id)return
     event.preventDefault()
     event.dataTransfer.dropEffect='move'
     setDropTarget(id)
    }}
    onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setDropTarget(current=>current===id?null:current)}}
    onDrop={event=>{
     if(!dragged)return
     event.preventDefault()
     move(dragged,id)
     finishDrag()
    }}>
    <div className="dashboard-layout-tools" role="group" aria-label={'Reorder '+panel.label}>
     <span className="dashboard-layout-grip" draggable title={'Drag '+panel.label} aria-hidden="true"
      onDragStart={event=>{
       event.dataTransfer.effectAllowed='move'
       event.dataTransfer.setData('text/plain',id)
       setDragged(id)
      }}
      onDragEnd={finishDrag}><GripVertical size={16}/></span>
     <button type="button" disabled={index===0} aria-label={'Move '+panel.label+' up'} title="Move up"
      onClick={()=>move(id,order[index-1])}><ArrowUp size={14} aria-hidden="true"/></button>
     <button type="button" disabled={index===order.length-1} aria-label={'Move '+panel.label+' down'} title="Move down"
      onClick={()=>move(id,order[index+1])}><ArrowDown size={14} aria-hidden="true"/></button>
    </div>
    {panel.content}
   </div>
  })}
 </div>
}
