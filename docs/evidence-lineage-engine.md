# Data Mine: Evidence-to-factor calculation and auditable evaluation runs

## Scope

This feature turns the Module 1 source map into a **database-driven registry** and creates
reproducible *candidate* calculations from stored evidence snapshots. It does **not**
calibrate exploration success probabilities. It does **not** alter the existing Gate 1
presentation-only PoS, QA/QC slider values or FID decisions.

### Data lineage

- `SourceConnection`: one target/source integration, its protocol, format, status and demo flag.
- `SourceDataSnapshot`: exactly received record and timestamp (as previously implemented).
- `EvidenceFactorRule`: versioned source-to-factor rule; metric key, input range,
  output range, weight, rationale, approved reviewer.
- `EvidenceEvaluation`: algorithm version, computed factor outputs, calculation
  parameters, provenance, SHA-256 fingerprint, reviewer and approval status.
- `EvidenceEvaluationInput`: normalized contribution, rule ID, source snapshot ID,
  frozen rule definition and snapshot content hash.

The algorithm `linear-normalization-v1` computes each rule's score as
`output_min + clamp((observed_value-input_min)/(input_max-input_min),0,1)*(output_max-output_min)`
and aggregates multiple rule scores for a factor by an explicitly recorded weighted mean.

A factor with no valid input is **missing**, not inferred or taken from the UI sliders.
An evaluation is **pending** review only if all four factors are populated, every
rule has non-demo expert approval and every input has non-demo provenance.
Any simulated/demo input makes the entire run `demo` and **ineligible for approval**.
Unverified or partial real data makes a run `incomplete`.
Only a competent-person group member may approve a complete, unchanged pending run
created by somebody else. The latest-run guard, source snapshot hashes and frozen
rule checks protect the review workflow against accidental modifications. This is
not cryptographic signing or a tamper-proof external audit log.

### APIs

```
GET  /api/targets/T-001/sources/
GET  /api/targets/T-001/evidence-evaluations/
POST /api/targets/T-001/evidence-evaluations/                # data_steward
POST /api/evidence/rules/<rule_id>/approve/                  # competent_person
POST /api/targets/T-001/evidence-evaluations/<id>/approve/  # competent_person
```

The registry includes available software *catalog options* and configured integrations
separately. Unknown custom source keys entered in the Django admin also appear in
the registry. A public viewer can only see demo source registrations and demo
evaluation runs; real source registry details and evaluations require staff status.
The approval APIs use explicit Django groups (not public).

### GIS example

The opt-in `gis-simulator` publishes a synthetic GeoJSON file every 30 seconds.
Its ingestion API records a top-level `fracture_density_per_km2` scalar extracted
from the synthetic feature, and automatically provisions a **demo-only**
`P_Pathway` rule with a 0-5 linear scale.

Every received simulator snapshot creates an independent, auditable **demo**
evaluation run. The result contains only `P_Pathway`; the other three factors
are explicitly missing. It cannot approve or support investment decisions.
New source connections and verified rules for `P_Source`, `P_Trap` and `P_Timing`
can be created through Django Admin, with a separate rule review action.

### Governance and remaining work

- Real CSV, LIMS, inversion, Grid, Shapefile and ArcGIS/QGIS source importers are not
  yet implemented. The generic source registry does not imply vendor connectivity.
- The demo GIS pipeline is synthetic and the transformation is not a scientifically
  calibrated mineral prospectivity model.
- Project-level row permissions and cryptographic signing must be implemented before
  multi-tenant or bank-grade approval workflows. Current rules use globally scoped
  staff and role groups.
- For a formal audit, store original artefacts with checksums and immutable object
  storage / external audit log; the current SHA-256 fingerprint only detects
  changes in current database contents when approval is requested.
- Keep `SEED_DEMO=false` and `GIS_SIMULATOR_ENABLED=false` when operating real data.
- The prior presentation-only factor sliders, DCI and PoS should be clearly
  distinguished from this server-owned evidence calculation; this feature does
  not replace them with unverified input.

### Operational verification

```bash
docker compose --profile simulation up -d --build
curl -s http://localhost:8085/api/targets/T-001/sources/
curl -s http://localhost:8085/api/targets/T-001/evidence-evaluations/
docker compose logs --tail=30 gis-simulator
```

Inspect the **Evidence → Factor Calculation & Audit** panel under the Data Source
Lineage graph in Exploration Evaluation. It shows the latest stored evaluation,
rule versions, observed metrics, factor scores, snapshot IDs and approval state.
