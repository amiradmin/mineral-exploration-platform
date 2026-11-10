# Reserve Simulator — Gate 2 source workflow

The Reserve Simulator at `/reserve-simulator` now shows a **Source Connections & Data Validation** panel from target-scoped, authenticated Django records. It does not claim direct connectivity to proprietary vendor installations.

## Sources and expected normalized snapshot keys

| Software key | Software | Expected top-level JSON fields |
| --- | --- | --- |
| `leapfrog` | Leapfrog Edge | `variogram_ranges`, `kriging_variance`, `search_ellipsoid`, `block_grades` |
| `micromine` | Micromine Origin (alternative geostatistical source) | Same four keys |
| `surpac` | GEOVIA Surpac | `cell_dimensions`, `lithology_codes`, `bulk_density` |
| `geobank` | Micromine Geobank | `core_recovery`, `rqd`, `downhole_surveys` |

These keys define a **proposed normalized exchange schema**, not native vendor files and not a supported direct `.mdl` parser. Import/ETL must be implemented against licensed vendor exports for each customer deployment.

Django models: `SourceConnection` (one per target/software key) and `SourceDataSnapshot`. Administrators can inspect and create these using Django Admin; use sanitized metadata summaries rather than large raw files or secrets. The existing `source-details` endpoints provide detailed snapshot history for applicable sources.

## API

`GET /api/targets/<target_id>/reserve-sources/`

Requires authentication and active target-specific committee membership (or superuser for monitoring). Returns source statuses, most recent recorded snapshot metadata, top-level required field presence, missing-field lists, and a grouped input completeness indicator. Data is never described as vendor-certified or independently validated. Even a snapshot marked `connected` or containing every expected field does not mean it is scientifically correct. Demo sources cannot satisfy non-demo group completeness.

## Gate interpretation

The current block viewer is an **interactive 3D-projected SVG voxel model** with orbit rotation, zoom, x-axis clipping sections, drillhole traces, grade bins and voxel inspection; all geometry and grades are deterministic synthetic examples. It does not render imported vendor geometry or implement WebGL. Numeric P95/P50/P10 cards, DCI proxy and sensitivity plots are *illustrative only*. Their values do not derive from the source API, and they are **not** independently verified grade-tonnage quantiles, a calibrated confidence metric, classified mineral resources or ore reserves. UI checkboxes are local acknowledgements, not identity-bound or legally recognized signatures.

The existing `Prepare Gate 3 Review` button submits the target-scoped comment through the authenticated, audited comments API and then enables the illustrative package export. It **does not** record a geological certification or a formal Gate 3 vote.

## Remaining implementation work for real reserve estimation

1. Implement licensed vendor-specific file adapters and an approved normalized model schema with per-record provenance and checksums. Preserve source files under secure object storage.
2. Validate drillhole interval integrity, survey coordinates, density, block coordinates, units, compositing and geostatistical QA/QC.
3. Run uncertainty estimation using properly documented conditional simulation or equivalent statistical methodology. Record seeds, methodology, model versions and realizations.
4. Render validated imported block geometries in a scalable WebGL scene (e.g. Three.js/WebGL with clipping, picking and section planes), not synthetic colored blocks.
5. Design and calibrate geological confidence measures with a CP/QP. Do not equate core RQD with resource confidence.
6. Add backend-attested review decisions and approved gates; keep separate Mineral Resource and Ore Reserve classifications, including modifying-factor assessments.

## Deploy

```bash
git pull origin main
docker compose up -d --build api frontend
docker compose exec api python manage.py test exploration.tests_reserve_sources exploration.tests_reserve_reviews
```
