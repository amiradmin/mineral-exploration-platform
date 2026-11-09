import React, {useState} from 'react'
import {Activity, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Database, GitBranch, Info, Layers3} from 'lucide-react'
import './ExplorationDataLineage.css'

/**
 * Customer-requested conceptual integration graph. The catalog describes export
 * possibilities, NOT real connected products, sync jobs or validated input data.
 */
type Factor = 'P_Source' | 'P_Pathway' | 'P_Trap' | 'P_Timing'
type Source = {
  id:string
  name:string
  format:string
  evidence:string[]
  factors:Factor[]
}
const catalog:Record<string,Source> = {
  oasis:{id:'oasis',name:'Oasis montaj',format:'Geosoft Grid',evidence:['Magnetic / gravity anomaly','Radiometric K, Th, U'],factors:['P_Source']},
  gcd:{id:'gcd',name:'GCDkit / IgPet',format:'Structured assay / CSV',evidence:['REE signatures','Sr/Y and V/Sc ratios'],factors:['P_Source']},
  res:{id:'res',name:'RES2DINV / RES3DINV',format:'Inversion tomography',evidence:['Resistivity sections','IP chargeability'],factors:['P_Pathway']},
  gis:{id:'gis',name:'ArcGIS Pro / QGIS',format:'GeoJSON / Shapefile',evidence:['Fault / fracture density','Tectonic structures'],factors:['P_Pathway','P_Trap']},
  rock:{id:'rock',name:'RockWorks',format:'Striplog / borehole data',evidence:['Lithology logs','Hydrothermal alteration'],factors:['P_Trap']},
  dips:{id:'dips',name:'Dips (Rocscience)',format:'Stereonet data',evidence:['Discontinuity orientations'],factors:['P_Trap']},
  geobank:{id:'geobank',name:'Datamine CCLAS / Geobank',format:'Assay / LIMS export',evidence:['Assay QA/QC results','CRM / blank / duplicate'],factors:['P_Timing']},
}
const examples:Record<string,string[]> = {
  'T-001':['oasis','gcd','res','gis','geobank'],
  'T-002':['gcd','gis','rock','geobank'],
  'T-003':['gis','dips','geobank'],
  'T-004':['oasis','res','gis'],
  'T-005':['gcd','rock'],
}
const factorLabels:Record<Factor,string> = {
  P_Source:'Source rock potential',
  P_Pathway:'Mineralizing fluid pathway',
  P_Trap:'Structural / geological trap',
  P_Timing:'Mineralization timing',
}
const factorOrder:Factor[]=['P_Source','P_Pathway','P_Trap','P_Timing']

export default function ExplorationDataLineage({targetId,targetName}:{targetId:string;targetName:string}){
  const [expanded,setExpanded]=useState(true)
  const [selected,setSelected]=useState<string|null>(null)
  const sources=(examples[targetId]??[]).map(id=>catalog[id]).filter((value):value is Source=>Boolean(value))
  const active=sources.find(source=>source.id===selected)??null
  const effective=active??null
  const covered=new Set(sources.flatMap(source=>source.factors))

  return <section className="ee-lineage ee-panel" aria-label="Data source lineage">
    <div className="ee-lineage-head">
      <div className="ee-lineage-heading"><span className="ee-lineage-heading-icon"><GitBranch size={18}/></span>
        <div><h2>DATA SOURCE LINEAGE</h2><p>Conceptual evidence flow · {targetName}</p></div>
      </div>
      <div className="ee-lineage-head-actions">
        <span className="ee-lineage-mode"><Info size={13}/> DEMO MAPPING — NOT CONNECTED</span>
        <span className="ee-lineage-count"><Database size={14}/> {sources.length} example sources</span>
        <button className="ee-lineage-toggle" type="button" onClick={()=>setExpanded(x=>!x)} aria-expanded={expanded} aria-controls="ee-lineage-content">{expanded?<ChevronUp size={16}/>:<ChevronDown size={16}/>} {expanded?'Collapse':'Expand'}</button>
      </div>
    </div>
    {expanded&&<div id="ee-lineage-content">
      <div className="ee-lineage-subtitle">Select a source to highlight its mapped evidence and evaluation factors. These are illustrative source associations, not real integrations or validated calculations.</div>
      <div className="ee-lineage-columns">
        <div className="ee-lineage-column">
          <div className="ee-lineage-column-heading"><Database size={15}/> SOFTWARE SOURCES <span>{sources.length}</span></div>
          <div className="ee-lineage-source-list">
            {sources.map(source=><button key={source.id} type="button" className={'ee-lineage-source'+(selected===source.id?' ee-lineage-selected':'')+(selected!==null&&selected!==source.id?' ee-lineage-muted':'')} onClick={()=>setSelected(old=>old===source.id?null:source.id)} aria-pressed={selected===source.id}>
              <span className="ee-lineage-node-icon"><Layers3 size={17}/></span><span className="ee-lineage-source-copy"><strong>{source.name}</strong><small>{source.format}</small></span><span className="ee-lineage-source-end"><span>Example</span><ArrowRight size={15}/></span>
            </button>)}
          </div>
        </div>
        <div className="ee-lineage-column ee-lineage-evidence">
          <div className="ee-lineage-column-heading"><Activity size={15}/> EXTRACTED EVIDENCE</div>
          <div className="ee-lineage-evidence-list">
            {sources.flatMap(source=>source.evidence.map((item,index)=>({source,item,key:source.id+'-'+index}))).map(({source,item,key})=><div key={key} className={'ee-lineage-evidence-node'+(effective&&effective.id!==source.id?' ee-lineage-muted':'')+(effective?.id===source.id?' ee-lineage-selected':'')}>
              <span className="ee-lineage-connector" aria-hidden="true"/><span className="ee-lineage-small-dot"/><span>{item}</span>
            </div>)}
          </div>
        </div>
        <div className="ee-lineage-column ee-lineage-factors">
          <div className="ee-lineage-column-heading"><GitBranch size={15}/> EVALUATION FACTORS</div>
          <div className="ee-lineage-factor-list">
            {factorOrder.map(factor=><div key={factor} className={'ee-lineage-factor'+(effective&&!effective.factors.includes(factor)?' ee-lineage-muted':'')+((effective?.factors.includes(factor))?' ee-lineage-selected':'')}>
              <span className="ee-lineage-factor-connector" aria-hidden="true"/><span><strong>{factor}</strong><small>{factorLabels[factor]}</small></span>{covered.has(factor)?<CheckCircle2 size={16}/>:<span className="ee-lineage-empty">No example</span>}
            </div>)}
          </div>
          <div className="ee-lineage-score"><span>EXPLORATION EVALUATION</span><strong>Source → Evidence → Factor</strong><small>Illustrative mapping only. Does not recalculate the Gate 1 score.</small></div>
        </div>
      </div>
      <div className="ee-lineage-foot">
        <span><span className="ee-lineage-legend-dot"/> Mapped in example</span>
        <span>Source selection: <strong>{effective?effective.name:'All sources'}</strong></span>
        <span>Actual source status, import timestamps and lineage require Phase 1 ingestion APIs.</span>
      </div>
    </div>}
  </section>
}
