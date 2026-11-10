/** Data sources mapped to the 6 analytical modules + Module 7 governance extension.
 * Catalog metadata is a design contract, NOT evidence that a vendor connector is live.
 */
export type ModuleKey='exploration-evaluator'|'reserve-simulator'|'economics-engine'|'risk-scenarios'|'financial-valuator'|'esg-governance'|'legal-commercial'
export type SourceDef={key:string;name:string;format:string;inputs:string;output:string;statusKey?:string}
export const moduleArchitecture:Record<ModuleKey,{number:number;name:string;gate:string;function:string;summary:string;sources:SourceDef[]}>={
 'exploration-evaluator':{number:1,name:'Exploration Evaluator',gate:'Gate 1',function:'Screening & Target Ranking',summary:'Geophysical, geochemical and structural evidence mapped to prospectivity factors.',sources:[
  {key:'oasis',name:'Oasis montaj (Seequent)',format:'Geosoft Grid / REST (if configured)',inputs:'Magnetic, gravity, radiometric K/Th/U grids',output:'P_Source'},
  {key:'gcd',name:'GCDkit / IgPet',format:'Assay CSV',inputs:'REE, Sr/Y, V/Sc, petrology',output:'P_Source'},
  {key:'res',name:'RES2DINV / RES3DINV',format:'Inversion tomography export',inputs:'Resistivity and chargeability',output:'P_Pathway'},
  {key:'gis',name:'ArcGIS Pro / QGIS',format:'GeoJSON / Shapefile',inputs:'Faults, fractures, tectonic boundaries',output:'P_Pathway / P_Trap'},
  {key:'rock',name:'RockWorks',format:'Striplog export',inputs:'Drill logs, alteration, lithostratigraphy',output:'P_Trap'},
  {key:'dips',name:'Dips (Rocscience)',format:'Stereonet export',inputs:'Discontinuity strike, dip and sets',output:'P_Trap'},
  {key:'geobank',name:'Datamine CCLAS / Geobank',format:'LIMS / CSV',inputs:'CRM, blanks, duplicates and assay QA/QC',output:'P_Timing / DCI'}
 ]},
 'reserve-simulator':{number:2,name:'Reserve Simulator',gate:'Gate 2',function:'Drilling & Resource Evidence',summary:'Resource geometry and grade uncertainty; confidence categories require qualified professional sign-off.',sources:[
  {key:'leapfrog-geo',name:'Leapfrog Geo (Seequent)',format:'3D mesh / Central export',inputs:'Ore wireframes and lithological boundaries',output:'3D geometry'},
  {key:'leapfrog',name:'Leapfrog Edge / Micromine',format:'Geostatistics block model',inputs:'Variograms, kriging variance, search domains',output:'P95 / P50 / P10 scenarios'},
  {key:'surpac',name:'GEOVIA Surpac',format:'.mdl block export',inputs:'Cell size, lithology codes, density',output:'Block model support'},
  {key:'geobank',name:'Micromine Geobank',format:'Core logging export',inputs:'Recovery, RQD, borehole deviation',output:'DCI_Geology'}
 ]},
 'economics-engine':{number:3,name:'Mining Economics Engine',gate:'Gate 3',function:'Pre-Feasibility & Mine Design',summary:'Mining geometry, stripping, schedule and pit stability inputs to economic screening.',sources:[
  {key:'alastri',name:'Micromine Alastri / Beyond',format:'DXF / XML / extracted summary',inputs:'Pit shells, stripping ratio, pit slopes',output:'SR / cut-off grade'},
  {key:'datamine',name:'Datamine Strategic Planners',format:'LOM pushback / summary',inputs:'Mining sequence, plant and mine capacity',output:'Annual feed and extraction schedule'},
  {key:'rocscience',name:'Slide2 / Slide3 (Rocscience)',format:'Limit equilibrium results',inputs:'Static slope Factor of Safety',output:'Pit design slope validation'},
  {key:'rs2',name:'RS2 (Rocscience)',format:'Finite element mesh / report',inputs:'Stress/strain in deeper pit benches',output:'Pit wall stability check'}
 ]},
 'risk-scenarios':{number:4,name:'Risk & Scenario Analyzer',gate:'Gates 3–4',function:'Technical & Market Stress Testing',summary:'Reviewed geotechnical, fleet and market records support scenario distributions.',sources:[
  {key:'geotech',name:'Slide2 / GeoStudio',format:'Dynamic slope / seepage CSV',inputs:'Seismic FOS and groundwater seepage',output:'Geotechnical stress'},
  {key:'pitram',name:'Micromine Pitram',format:'Fleet event CSV',inputs:'Downtime, MTBF, MTTR, haul efficiency',output:'OPEX stress envelope'},
  {key:'market',name:'LME-compatible commodity data',format:'Historical CSV / live API planned',inputs:'Copper and gold price history, volatility',output:'Commodity Monte Carlo range'}
 ]},
 'financial-valuator':{number:5,name:'Financial Valuator',gate:'Gate 4',function:'LOM DCF & Investment Analysis',summary:'Use reviewed production and capital source records for scenario calculations and audit trails.',sources:[
  {key:'minetrust',name:'Datamine MineTrust',format:'Audit-ready annual CSV',inputs:'LOM ore tonnes and delivered grade',output:'Annual production and DCF'},
  {key:'erp_epc',name:'ERP / EPC ledger',format:'Financial ledger CSV',inputs:'Contract CAPEX for plant, infrastructure and fleet',output:'Setup / sustaining CAPEX'}
 ]},
 'esg-governance':{number:6,name:'ESG & Governance Tracker',gate:'Cross-gate',function:'Environmental & Social Assurance',summary:'Continuous ESG indicators; external source integrations are not configured in this phase.',sources:[
  {key:'tailings',name:'Slide2 / RS2 Tailings',format:'Dam stability model export',inputs:'Tailings dam FOS and liquefaction',output:'Tailings governance'},
  {key:'gis-esg',name:'ArcGIS Pro / QGIS',format:'Spatial boundaries',inputs:'Protected habitats, water sources, pastures',output:'SLO / legal compliance'},
  {key:'pitram-safety',name:'Micromine Pitram Safety',format:'Safety shift logs',inputs:'Safety hours, LTI, near misses',output:'TRIFR'},
  {key:'sustainability',name:'Datamine Sustainability',format:'Environmental IoT exports',inputs:'Recycled water, energy meters',output:'Water & carbon intensity'}
 ]},
 'legal-commercial':{number:7,name:'Legal & Commercial AI Hub',gate:'Cross-gate',function:'Contract & Partnership Governance',summary:'Confidential contract screening and finance-linked participation scenarios.',sources:[
  {key:'contracts',name:'Mining participation contracts',format:'Searchable PDF / TXT',inputs:'Take-or-pay, termination, FX, royalty and stripping clauses',output:'Contract risk flags and counsel review'},
  {key:'minetrust',name:'Datamine MineTrust',format:'Reviewed annual production CSV',inputs:'Ore tonnage and grade across mine life',output:'Share distribution / investor DCF'},
  {key:'erp_epc',name:'ERP / EPC ledger',format:'Reviewed CAPEX CSV',inputs:'Construction, infrastructure and asset contracts',output:'CAPEX recovery / partnership payback'}
 ]}
}
export const moduleKeys=Object.keys(moduleArchitecture) as ModuleKey[]
