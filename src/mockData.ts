export const targets=[
  {id:'T-001',name:'North Ridge',commodity:'Cu-Mo',deposit:'Porphyry Cu-Mo',aiScore:92,confidence:91,completeness:94,priority:'Very High',stage:'Drill Ready',action:'Design drill fence',x:66,y:30,rationale:'A regional fault intersection coincides with a strong Cu-Mo geochemical cluster, residual magnetic anomaly and mapped hydrothermal alteration adjacent to an intrusive contact.',evidence:['Fault intersection','Cu-Mo soil anomaly','Residual magnetic high','Hydrothermal alteration','Intrusive contact']},
  {id:'T-002',name:'Copper Valley',commodity:'Cu-Au',deposit:'Porphyry Cu-Au',aiScore:87,confidence:86,completeness:89,priority:'High',stage:'Advanced Target',action:'Infill geophysics',x:43,y:47,rationale:'Coincident copper-gold surface geochemistry overlies an interpreted intrusive centre with supportive magnetic response and a favorable structural corridor.',evidence:['Cu-Au anomaly','Intrusive centre','Magnetic response','Structural corridor']},
  {id:'T-003',name:'East Fault Zone',commodity:'Au',deposit:'Orogenic Au',aiScore:81,confidence:79,completeness:82,priority:'High',stage:'Field Validation',action:'Map and channel sample',x:28,y:63,rationale:'Gold pathfinder elements and alteration signatures align with a major fault jog and mapped quartz-vein corridor.',evidence:['Au-As-Sb anomaly','Fault jog','Quartz veins','Alteration signature']},
  {id:'T-004',name:'Deep Target 03',commodity:'Cu',deposit:'Buried porphyry',aiScore:74,confidence:76,completeness:71,priority:'Moderate',stage:'Conceptual',action:'Acquire IP/resistivity',x:74,y:70,rationale:'A broad magnetic low and structural geometry suggest a concealed intrusive target, but surface geochemical support is limited.',evidence:['Magnetic low','Structural geometry','Buried intrusive concept']},
  {id:'T-005',name:'South Ridge',commodity:'Fe-Cu',deposit:'Skarn',aiScore:69,confidence:72,completeness:78,priority:'Moderate',stage:'Screening',action:'Detailed mapping',x:18,y:35,rationale:'Carbonate units near an intrusive margin show patchy Fe-Cu geochemistry and moderate magnetic response.',evidence:['Carbonate host','Intrusive margin','Fe-Cu anomaly']},
]

export const drillholes=[
  {id:'DH-021',depth:420,azimuth:55,dip:-65,status:'Complete',intercept:'24 m @ 1.8% Cu'},
  {id:'DH-022',depth:365,azimuth:58,dip:-62,status:'Complete',intercept:'11 m @ 2.1% Cu'},
  {id:'DH-023',depth:510,azimuth:60,dip:-70,status:'Drilling',intercept:'—'},
  {id:'DH-024',depth:450,azimuth:48,dip:-60,status:'Planned',intercept:'—'},
  {id:'DH-025',depth:390,azimuth:52,dip:-67,status:'Complete',intercept:'36 m @ 0.92% Cu'},
  {id:'DH-026',depth:530,azimuth:64,dip:-72,status:'Planned',intercept:'—'},
]

export const evidenceFactors=[
  {label:'Structural control',value:96},
  {label:'Geochemistry',value:94},
  {label:'Magnetics',value:91},
  {label:'Alteration',value:85},
  {label:'Lithology',value:82},
  {label:'Remote sensing',value:76},
]

export const elements=[
  {symbol:'Cu',name:'Copper',anomalies:27},
  {symbol:'Au',name:'Gold',anomalies:19},
  {symbol:'Mo',name:'Molybdenum',anomalies:16},
  {symbol:'As',name:'Arsenic',anomalies:14},
  {symbol:'Pb',name:'Lead',anomalies:11},
  {symbol:'Zn',name:'Zinc',anomalies:9},
]
