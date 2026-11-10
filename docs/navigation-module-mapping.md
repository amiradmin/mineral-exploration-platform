# Data Mine navigation and module mapping (architecture revision)

The platform has **four stage gates**, **six analytical modules** and **Module 7 as a cross-gate legal and commercial governance extension**. A module is not a new gate. The five strategic upgrades are capabilities spanning those pages.

## Sidebar and route mapping

| Sidebar group | Page / module | Route | Primary outcome |
|---|---|---|---|
| Decision center | Investment Dashboard | `/` | Four-gate decision architecture, six analytical workspaces, Module 7 extension |
| Gate 1 | Module 1 · Exploration Evaluator | `/exploration-evaluator` | P_Source / P_Pathway / P_Trap / P_Timing, prospect screening, expert reviews |
| Gate 2 | Module 2 · Reserve Simulator | `/reserve-simulator` | Drill and model evidence, grade/tonnage scenario exploration |
| Gate 3 | Module 3 · Mining Economics Engine | `/economics-engine` | Pit, mining/plant schedules, geology-to-economics stress, construction CAPEX authorization restrictions |
| Gate 3 (also Gate 4) | Module 4 · Risk & Scenario Analyzer | `/risk-scenarios` | Geotechnical, fleet and commodity price stress and source reviews |
| Gate 4 | Module 5 · Financial Valuator | `/financial-valuator` | DCF/NPV, MineTrust and ERP/EPC financial evidence, strategic fleet co-pilot |
| Cross-gate | Module 6 · ESG & Governance | `/esg-governance` | Water, tailings, safety, community and emissions governance |
| Cross-gate | Module 7 · Legal & Commercial AI Hub | `/legal-commercial` | Confidential contract risk screening and owner-share/royalty scenario modeling |

## Shared components

1. **Data Scale & Sample Support** — target-specific badge in the page header. All core modules see the same selected target's sample counts, drill grid and exploration phase, including investment restrictions. Program-target linkage and approvals remain server enforced.
2. **Data Lineage & Software Ingestion Hub** — expandable source matrix directly under the shared header on every module page. Each row shows system name, expected format/protocol, supplied parameters, destination calculation, actual stored source status, available observed and import timestamps. **Never infer a live connection** from a source association.
3. **Expert Committee & Peer Review** — authenticated target-scoped open strategic flags appear in the shared module header; full expert overrides, reviews and executive memos remain in the exploration committee workspace.
4. **Strategic Scenario Co-Pilot** — embedded in Module 5 and uses deterministic Python calculations. NLP translation is rule based, not a connected LLM.
5. **Contract Risk + Commercial Split** — Module 7 supports TXT / searchable PDF clause screening and reviewed-source participation scenarios; legal approval requires designated legal-counsel membership.

## Source coverage and authenticity

The source catalog is defined once in `src/moduleArchitecture.ts`; the visible status comes from APIs only when those records exist.

- **Module 1:** Oasis montaj, GCDkit/IgPet, RES2D/3DINV, ArcGIS/QGIS, RockWorks, Dips, Datamine CCLAS/Geobank. Source-detail endpoints show existing connection and snapshot metadata.
- **Module 2:** Leapfrog Geo (3D mesh importer **planned**), Leapfrog Edge/Micromine, Surpac, Geobank. Reserve source completeness endpoint is already implemented for the latter three paths.
- **Module 3:** Alastri/Beyond, Datamine Strategic Planners and Slide2/Slide3 are registered/reviewed via extracted engineering evidence. RS2 finite-element importer **planned**.
- **Module 4:** Slide2/GeoStudio, Pitram and LME-compatible **historical** commodity records have CSV registration and reviewer approval. An authenticated live LME API feed is **not** configured.
- **Module 5:** MineTrust and ERP/EPC CSV source records and reviewer approval are implemented.
- **Module 6:** Tailings stability, GIS protected areas, Pitram safety and sustainability IoT source adapters are **planned**. Existing ESG charts are scenario data, not vendor-integrated operational feeds.
- **Module 7:** Contract uploads, legal review and MineTrust/ERP-EPC source records. Actual PDF OCR and autonomous legal LLM are **not** implemented.

## Validation and constraints

Page and source indicators do not grant approvals. Geostatistical resource categories, reserve statements and FID decisions require independently evaluated evidence, appropriate professional judgments and backend permission checks. The export/source tables distinguish recorded, reviewed, simulated, absent, restricted and planned states.

## Local deployment

```bash
cd ~/Documents/Presentation/mineral-exploration-platform
git pull origin main
docker compose up -d --build
docker compose exec api python manage.py migrate
docker compose ps
```

Open `http://127.0.0.1:8085/` then use the sidebar. A rebuild must succeed before the local UI reflects the GitHub changes.
