# Gate 4 Strategic Scenario Co-Pilot: controlled implementation

## Scope
- Module 4: Risk & Scenario Analyzer registers independent risk source evidence from Slide2/GeoStudio, Pitram and historical metal-price CSV records. It computes a deterministic seeded stress distribution and presents geotechnical indicators, but **does not assign universal slope safety thresholds**.
- Module 5: Financial Valuator provides a constrained natural-language **rule-based** scenario translator and Python fleet DCF engine. A general-purpose LLM is **not** connected. No user prompt is executed as code.
- MineTrust and ERP/EPC CSV imports are stored as versioned source snapshots with a SHA-256 fingerprint and independent expert review. **No vendor/live LME API connectivity is configured**.
- All economics are exploratory until validated by the project governance process. They are not a regulatory resource or reserve certification, a bankable feasibility study or a final investment decision.

## Financial CSV contract
Upload via Module 5 source registry as a data steward; a competent-person reviewer must approve the snapshot.

MineTrust: one row per operating year. Every year from 1 to the selected mine life must be present before selecting reviewed-source DCF mode. Units are metric tonnes and *percent* grade, not fractions.
```csv
year,ore_tonnes,grade_pct,plant_feed_tonnes
1,4000000,0.84,3900000
2,4100000,0.82,4000000
```
ERP/EPC: one row per CAPEX item. Year 0 is commissioning / setup. Accepted categories: plant, infrastructure, fleet, other. Values are USD, not millions. The fleet strategy engine adds its own fleet schedule; ERP rows categorized as `fleet` are **excluded to avoid double counting**.
```csv
year,category,amount_usd,contract_reference
0,plant,30000000,EPC-01
2,infrastructure,5000000,EPC-02
```

## Risk CSV contract
Slide2 / GeoStudio: numeric FOS and a source-defined seepage index (interpretation requires expert metadata).
```csv
scenario,static_fos,seismic_fos,seepage_index
static-design,1.45,1.22,0.5
```
Pitram: consistent period-level machine fleet aggregates.
```csv
period,downtime_hours,scheduled_hours,mtbf_hours,mttr_hours,haul_efficiency_pct
2026Q1,50,1000,100,5,85
```
Commodity historical price export: currently calibrated for copper; copper prices USD per metric tonne. A minimum of four observations is required by stress simulation.
```csv
period,commodity,price_usd_per_t
2026Q1,copper,9000
2026Q2,copper,9500
2026Q3,copper,9200
2026Q4,copper,8800
```

## Model and validation caveats
1. Annual DCF consists of upfront and scheduled fleet CAPEX, annual operations, assumed downtime exposure and straight-line depreciation tax shield. Payback is **undiscounted**. Effective taxation is simplified.
2. Fleet CAPEX, maintenance and downtime assumptions are synthetic until sourced and reviewed. MineTrust/ERP records become available only when both current source snapshots are approved.
3. The Monte Carlo source-stress model is a reproducible, **independent normally distributed price and OPEX proxy**, not a calibrated copper-price process. It does not validate geotechnical wall stability or simulate hydraulic seepage. Risk sources are not silently mapped to FID gates.
4. The original three row values and NPVs in the business request are examples, not independent financial calculations or company quotations.
5. Changes to a source create a new pending snapshot and must not silently inherit an older review status. Validation and source versions are auditable.
6. For decision-grade implementation, extend the geometry/series schemas, document commodity price conventions and engineering assumptions, reconcile capex balances to ERP, and introduce independent expert approvals and financial model validation.

## Local deployment
```bash
git pull origin main
docker compose up -d --build
docker compose exec api python manage.py migrate
```
Check `/risk-scenarios` and `/financial-valuator`. UI is English-first; user-selected language does not translate all new panels yet.
