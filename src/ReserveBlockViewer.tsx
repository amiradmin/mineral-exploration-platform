import {useMemo,useRef,useState} from 'react'
import type {PointerEvent,WheelEvent} from 'react'
import {Crosshair,Eye,EyeOff,RotateCcw,ZoomIn,ZoomOut} from 'lucide-react'
import './ReserveBlockViewer.css'

type Vec=[number,number,number]
type Block={x:number;y:number;z:number;grade:number;id:string}
const clamp=(value:number,low:number,high:number)=>Math.min(high,Math.max(low,value))
const palette=(grade:number)=>grade>=1.1?'#e95443':grade>=.85?'#f9a34b':grade>=.65?'#edd36c':grade>=.45?'#5bcdad':'#4092bc'
const channel=(color:string,factor:number)=>'#'+[1,3,5].map(i=>Math.round(clamp(parseInt(color.slice(i,i+2),16)*factor,0,255)).toString(16).padStart(2,'0')).join('')
const boxCorners=(x:number,y:number,z:number):Vec[]=>[
 [x,y,z],[x+1,y,z],[x+1,y+1,z],[x,y+1,z],
 [x,y,z+1],[x+1,y,z+1],[x+1,y+1,z+1],[x,y+1,z+1],
]
const faceIndices=[[4,5,6,7],[1,2,6,5],[2,3,7,6],[3,0,4,7],[0,1,5,4]]
const geometry=Array.from({length:13*10*5},(_,i)=>{
 const x=i%13,y=Math.floor(i/13)%10,z=Math.floor(i/130)
 const centerY=4.6+Math.sin(x*.51)*1.05
 const metric=Math.pow((x-6)/6.3,2)+Math.pow((y-centerY)/3.1,2)+Math.pow((z-1.9)/3.4,2)
 const lithology=Math.sin(x*.87+y*.47+z*.64)*.17+Math.cos(y*.92-z*.37)*.085
 return {x,y,z,metric,grade:clamp(1.16-metric*.6+lithology,0,1.6),id:`BM-${String(i+1).padStart(4,'0')}`}
}).filter(b=>b.metric<1.16)

export default function ReserveBlockViewer({holes,continuity,cutoff}:{holes:number;continuity:number;cutoff:number}){
 const [azimuth,setAzimuth]=useState(-.65)
 const [elevation,setElevation]=useState(.62)
 const [zoom,setZoom]=useState(1)
 const [slice,setSlice]=useState(13)
 const [drilling,setDrilling]=useState(true)
 const [gradeColors,setGradeColors]=useState(true)
 const [selected,setSelected]=useState<Block|null>(null)
 const drag=useRef<{x:number;y:number;azimuth:number;elevation:number}|null>(null)
 const project=(v:Vec):[number,number]=>{
  const x=v[0]-6.5,y=v[1]-5,z=v[2]-2.5
  const horizontal=x*Math.cos(azimuth)-y*Math.sin(azimuth)
  const depth=x*Math.sin(azimuth)+y*Math.cos(azimuth)
  const factor=19*zoom
  return [260+horizontal*factor,187+(depth*Math.sin(elevation)-z*Math.cos(elevation))*factor]
 }
 const polygon=(vertices:Vec[])=>vertices.map(v=>project(v).map(n=>n.toFixed(1)).join(',')).join(' ')
 const blocks=useMemo(()=>{
  const visible=geometry.filter(b=>b.x<slice&&b.grade+(continuity-75)/380>=cutoff)
  return visible.sort((a,b)=>{
   const depthA=(a.x-6)*Math.sin(azimuth)+(a.y-5)*Math.cos(azimuth)
   const depthB=(b.x-6)*Math.sin(azimuth)+(b.y-5)*Math.cos(azimuth)
   return depthA-depthB||a.z-b.z
  })
 },[slice,cutoff,continuity,azimuth])
 const onPointerDown=(event:PointerEvent<SVGSVGElement>)=>{
  if(event.button!==0)return
  drag.current={x:event.clientX,y:event.clientY,azimuth,elevation}
  event.currentTarget.setPointerCapture(event.pointerId)
 }
 const onPointerMove=(event:PointerEvent<SVGSVGElement>)=>{
  if(!drag.current)return
  setAzimuth(drag.current.azimuth+(event.clientX-drag.current.x)*.012)
  setElevation(clamp(drag.current.elevation+(event.clientY-drag.current.y)*.006,.22,1.25))
 }
 const onPointerUp=(event:PointerEvent<SVGSVGElement>)=>{
  drag.current=null
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
 }
 const onWheel=(event:WheelEvent<SVGSVGElement>)=>{
  event.preventDefault()
  setZoom(v=>clamp(v+(event.deltaY<0?.1:-.1),.65,1.7))
 }
 const groundLines=Array.from({length:15},(_,i)=>i)
 const drillTraces=Array.from({length:Math.min(holes,40)},(_,i)=>{
  const x=1+(i*7%12),y=1+(i*13%9),offset=i%3*.3
  return {id:i+1,a:[x,y,6.7] as Vec,b:[x+offset,y+1.4,0] as Vec}
 })
 return <div className="rbv">
  <div className="rbv-masthead"><div><strong>3D RESOURCE BLOCK EXPLORER</strong><small>Illustrative voxel geometry · no vendor model loaded</small></div><span>Cu grade (%), conceptual</span></div>
  <svg className="rbv-scene" viewBox="0 0 520 385" role="img" aria-label="Rotatable three-dimensional copper grade block model with drillholes and clipping slices"
   onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}>
   <defs><radialGradient id="rbv-sky"><stop offset="0" stopColor="#14354a"/><stop offset="1" stopColor="#060e1a"/></radialGradient></defs>
   <rect width="520" height="385" fill="url(#rbv-sky)"/>
   <g stroke="#2c5261" strokeWidth=".5" opacity=".48" fill="none">
    {groundLines.map(i=><g key={i}>
     <polyline points={polygon([[i,0,0],[i,10,0]])}/>
     {i<11&&<polyline points={polygon([[0,i,0],[13,i,0]])}/>}
    </g>)}
   </g>
   <g opacity=".63" fill="none" stroke="#6c96a7" strokeWidth=".8" strokeDasharray="3 4">
    <polyline points={polygon([[0,0,0],[13,0,0],[13,10,0],[0,10,0],[0,0,0]])}/>
    <polyline points={polygon([[0,0,5.8],[13,0,5.8],[13,10,5.8],[0,10,5.8],[0,0,5.8]])}/>
    {[[0,0],[13,0],[13,10],[0,10]].map(([x,y],i)=><polyline key={i} points={polygon([[x,y,0],[x,y,5.8]])}/>)}
   </g>
   {blocks.map(block=>{
    const corners=boxCorners(block.x,block.y,block.z)
    const effectiveGrade=block.grade+(continuity-75)/380
    const color=gradeColors?palette(effectiveGrade):'#409eb7'
    const active=selected?.id===block.id
    return <g key={block.id} onClick={e=>{e.stopPropagation();setSelected({...block,grade:effectiveGrade})}} className="rbv-cube" opacity={active?1:.93}>
     {faceIndices.map((face,i)=><polygon key={i} points={polygon(face.map(index=>corners[index]))}
       fill={channel(color,[1.13,.83,.65,.8,.7][i])} stroke={active?'#f7fafc':'#122b3b'} strokeWidth={active?1.7:.38}/>)}
    </g>
   })}
   {drilling&&<g pointerEvents="none">{drillTraces.map(trace=><g key={trace.id}>
    <polyline points={polygon([trace.a,trace.b])} fill="none" stroke="#e4fafb" strokeWidth="1.5" strokeDasharray="5 2" opacity=".78"/>
    <circle cx={project(trace.a)[0]} cy={project(trace.a)[1]} r="2.2" fill="#e4fafb"/>
   </g>)}</g>}
   <g strokeWidth="2.4" fontSize="11" fontWeight="600">
    {([['X',[0,0,0],[2,0,0],'#e98f77'],['Y',[0,0,0],[0,2,0],'#7fdda9'],['Z',[0,0,0],[0,0,2],'#70bce8']] as [string,Vec,Vec,string][]).map(([axis,from,to,color])=><g key={axis}>
     <polyline points={polygon([from,to])} stroke={color} fill="none"/>
     <text x={project(to)[0]+4} y={project(to)[1]+3} fill={color}>{axis}</text>
    </g>)}
   </g>
   <text x="12" y="19" fill="#a5cbd4" fontSize="10">Drag to orbit · scroll to zoom · select a block</text>
   <text x="12" y="369" fill="#8eb3c0" fontSize="10">{blocks.length} visible blocks / {geometry.length} conceptual blocks</text>
  </svg>
  <div className="rbv-toolbar">
   <button type="button" onClick={()=>{setAzimuth(-.65);setElevation(.62);setZoom(1);setSlice(13);setSelected(null)}} title="Reset camera and slice"><RotateCcw size={14}/> Reset</button>
   <button type="button" onClick={()=>setZoom(v=>clamp(v+.12,.65,1.7))} title="Zoom in"><ZoomIn size={14}/></button>
   <button type="button" onClick={()=>setZoom(v=>clamp(v-.12,.65,1.7))} title="Zoom out"><ZoomOut size={14}/></button>
   <button type="button" onClick={()=>setDrilling(v=>!v)}>{drilling?<Eye size={14}/>:<EyeOff size={14}/>} Drillholes</button>
   <button type="button" onClick={()=>setGradeColors(v=>!v)}><Crosshair size={14}/> Grade</button>
  </div>
  <div className="rbv-slice"><label htmlFor="rbv-x-slice">X section clipping</label><input id="rbv-x-slice" type="range" min="1" max="13" value={slice} onChange={e=>{setSlice(Number(e.target.value));setSelected(null)}}/><output>{slice===13?'Full volume':`X ≤ ${slice}`}</output></div>
  <div className="rbv-bottom"><div className="rbv-legend"><span>Cu grade</span>{[['<0.45','#4092bc'],['0.45–0.65','#5bcdad'],['0.65–0.85','#edd36c'],['0.85–1.10','#f9a34b'],['≥1.10','#e95443']].map(([label,color])=><span key={label}><i style={{background:color}}/>{label}</span>)}</div>
  <div className="rbv-inspector">{selected?<><strong>{selected.id}</strong><span>Grade: {selected.grade.toFixed(2)}% Cu</span><span>Cell: {selected.x}, {selected.y}, {selected.z}</span></>:<span>Select a block to inspect</span>}</div></div>
  <p className="rbv-disclaimer">Visual-only synthetic block model. No kriging, conditional simulation, Surpac .mdl parsing, imported coordinates or Mineral Resource/Ore Reserve estimate is implied.</p>
 </div>
}
