# Customer executive enhancements — repository gap analysis and delivery plan

**Reviewed:** 2026-11-09  
**Baseline:** `main` (repository tree inspected at `001b9115e1934a23521523a3eb499797c431d283`)  
**Source:** Customer document “سند معماری تکمیلی و مشخصات فنی ارتقای پلتفرم تصمیم‌ساز معادن”, sections 1–6.  
**Purpose:** Engineering plan only; no customer feature in this document is claimed as implemented.

## Executive conclusion

The existing Data Mine application has six React decision modules, Django REST models for exploration operations, and a browser-side financial demonstration. It does **not** yet possess the integrated data provenance, reviewer accountability, sample-support gating, backend financial scenario execution, or legal analysis infrastructure specified by the customer. First stabilize data ownership and authorization, then deliver capabilities in the customer's five phases.

## Evidence-driven gap matrix

| Customer requirement | Current repository evidence | Status | Required work |
| --- | --- | --- | --- |
| M1–M6 source software ingestion and data lineage (section 1) | `backend/exploration/models.py` contains targets, drillholes, programs, assays, QA/QC and tasks; no ingestion job/source/lineage models. Module `fv-sync` shows integration names as UI text. | **Missing** | Source registry; supported file adapters; immutable source/transform/version lineage; errors, reconciliation and freshness; per-module detail drawer. |
| Expert overrides, flags, CP/QP review and executive memo (section 2) | `src/StageGate.tsx` and `src/decisionPipeline.ts` implement presentation decisions; no persistent reviewer entities or approved adjustments in backend. | **Missing** | Reviewer roles, evidence-backed override proposals, delta history, strategic flags, signed memo workflow, final authorized approvals. |
| Map scale, sampling support and investment locks (section 3) | Drillhole depth and program aggregate core recovery exist in `models.py`, but no project map-scale version, DDH/RC totals, grid geometry, RQD support or backend FID eligibility rule. | **Partial inputs only** | Project evidence snapshot; sample metadata; geographic scale and density validation; fail-closed backend decision policy. |
| M5 AI conversational scenario planning (section 4) | `src/FinancialValuator.tsx` has local cash flow, NPV/IRR/payback formulas and sliders. `src/decisionPipeline.ts` is explicitly a simplified display proxy. | **Partial UI / engine only** | Backend deterministic versioned DCF/TCO engine, structured scenario schema, LLM-to-schema parser with validation, comparison audit and tests. |
| M7 contract and partnership analysis (section 5) | No legal module component, contract model, upload or clause-analysis endpoints in the inspected tree. | **Missing** | Secure upload/PDF text extraction, cited clause risks and human review, owner/investor split optimizer coupled to reserve, mine cost and financial models. |
| Four-gate approval accountability (sections 2–3) | `src/StageGate.tsx` defines six modules and gate labels; `src/FinancialValuator.tsx` uses React state checkboxes for CFO/CEO/Chairman acknowledgement. | **Visual/demo only** | Persisted stages, reviewers, prerequisites, audit log and server-enforced FID permission. |
| Production database/authentication | `backend/terrascope/settings.py` uses SQLite; DRF config contains no global default permission/auth classes; `views.py` exposes model viewsets. `README.md` explicitly says role selection is not RBAC. | **Foundation gap** | PostgreSQL/PostGIS migration, least-privilege authentication and object-level permissions, storage, audit, environment migration and security tests. |

### Existing useful foundations (retain rather than rewrite)

- React/TypeScript/Vite frontend, six distinct module components and module-specific styling in `src/`.
- Django REST framework and domain resources in `backend/exploration/`: `Target`, `Drillhole`, `Element`, `EvidenceFactor`, `OperationProgram`, `AssayBatch`, `QAQCIssue`, `WorkTask`.
- Local financial controls and annual cash flow calculations in `src/FinancialValuator.tsx`; useful as reference/UI, **not** authoritative calculations.
- Four-gate visual decision journey in `src/StageGate.tsx` and `src/decisionPipeline.ts`; preserve design while moving approval decisions to a verified backend policy.

## Proposed domain services and records

This is a **proposed** architecture, not a representation of already-implemented endpoints.

**Foundation:** PostgreSQL + PostGIS; project/tenancy and object access; identity and roles (geologist, CP/QP reviewer, finance reviewer, legal reviewer, board approver, admin); append-only audit events; object storage for evidence documents; asynchronous workers for parsing/integration.

**Data lineage:** `SourceSystem`, `SourceConnection`, `ImportBatch`, `SourceArtifact`, `TransformationRun`, `LineageEdge`, `DerivedMetric`; each metric points to input artifact versions, transform/algorithm version, timestamp, owner, validation status and integrity checksum. Use file adapters first; mark proprietary/live API support unverified until licensing and access are confirmed. Never display a vendor as "connected" simply because its name is present in UI.

**Sample support:** `EvidenceSnapshot` (project, stage, effective date, map scale/CRS, sample count, method, DDH/RC drillhole count and metres, drill grid spacing, core recovery, RQD, QA/QC status, source links). Treat map scale bands in the customer document as requested business defaults subject to qualified-person approval, not universal JORC/NI 43-101/SAMREC compliance rules.

**Review and gate:** `ExpertReview`, `OverrideProposal` (original value, proposed value, units, reason, evidence), `StrategicFlag` (value catalyst/fatal flaw/prerequisite), `ExecutiveMemo`, `GateDecision` (outcome, criterion versions, signers, signed timestamps). Every approved adjustment must preserve original value and prevent self-approval when separation of duties is required. Server rejects FID if required evidence, qualified sign-off or phase prerequisites are missing.

**Finance:** `FinancialAssumptionSet`, `FinancialScenario`, `ScenarioRun`, `ScenarioComparison`; deterministic versioned DCF/TCO functions with annual cash flow, correct NPV, IRR (including undefined/non-conventional cases), payback, equipment replacement, downtime and salvage assumptions. AI may translate prompts to validated structured schema, never produce final numeric financial decisions itself; show all assumptions and provenance.

**Legal:** `ContractDocument`, `Clause`, `ContractFinding`, `LegalReview`, `PartnershipScenario`; upload controls, access permissions, extracted clause spans/page anchors, risk rationales with source references, confidence and human verification. Calculate owner/investor economics from the same verified model versions used by M2/M3/M5; avoid hard-coded customer example percentages.

## Module mapping (customer's section 1)

- **M1 Exploration:** Oasis montaj, GCDkit/IgPet, RES2DINV/3DINV, ArcGIS/QGIS, RockWorks, Dips, CCLAS/Geobank → source/pathway/trap/timing evidence and DCI.
- **M2 Reserve:** Leapfrog Geo/Edge, Micromine, Surpac, Geobank → 3D geometry, block support, uncertainty scenarios and geological DCI.
- **M3 Economics:** Alastri/Beyond, Datamine Strategic Planners, Slide2/3, RS2 → pit, stripping, mine schedule, slope stability.
- **M4 Risk:** Slide2/GeoStudio, Pitram, LME feeds → geotechnical, reliability and commodity-price stress inputs.
- **M5 Finance:** MineTrust, ERP/EPC → LOM schedules and CAPEX; scenario assistant operates over verified model data.
- **M6 ESG:** tailings models, ArcGIS/QGIS, Pitram Safety, Datamine Sustainability → safety, water, environment, permits and ESG.
- **M7 Legal:** PDF/text contracts → clause risks and split scenarios tied to verified M2, M3 and M5 outputs.

Do not claim `REST API`, direct proprietary format support or live market feeds exist without per-vendor verification. Start with controlled CSV/GeoJSON and a documented source contract; add adapters as confirmed.

## Delivery increments and acceptance gates

### P0 — Production foundations (blocking prerequisite)
1. Introduce PostgreSQL/PostGIS with reproducible migration from existing SQLite demo data, tested rollback and backups.
2. Authentication, permissions per project/role/record, protected write endpoints, audit events; fail closed for unauthorized FID.
3. Define versioned domain contracts and document separation of synthetic/demo versus verified/decision-grade data.

**Done when:** CI exercises migration, permission-denial and persisted audit tests; no anonymous mutation of protected entities; current demo still works as demo.

### Phase 1 — Data lineage and ingestion hub (customer phase 1)
- Create provenance schema and adapter framework, validation, retry/idempotency, import preview, checksums and module association.
- M1–M6 collapsible status/lineage drawer sourced from APIs; each metric can disclose originating file/system, last synchronization and transform.
- First verified connectors: CSV assay + GeoJSON or equivalent open exchange; proprietary adapters tracked separately.

**Done when:** importing a changed/versioned file produces traceable lineage, errors are visible and a metric displays its actual sources, not static vendor names.

### Phase 2 — Scale and sampling evidence (customer phase 2)
- Project-level phase/scale, sample counts and methods, DDH vs RC lengths, grid spacing, core recovery, RQD, evidence references.
- UI widget across relevant modules; server rejects FID where customer-defined evidence prerequisites fail; explain exact missing fields.

**Done when:** test fixtures with preliminary/incomplete data are blocked, while eligible evidence with required reviews can proceed.

### Phase 3 — Expert committee and governance (customer phase 3)
- Expert proposals, evidence attachments, strategic flags, prerequisite checks, signed executive memos, review history.
- Explicit CP/QP designation and review constraints; no unexplained auto-increase to prospectivity.
- Persisted, role-gated four-stage decision workflow.

**Done when:** every override is attributable, previous numbers remain recoverable, conflicting/unapproved changes do not affect published decisions.

### Phase 4 — AI financial scenario assistant (customer phase 4)
- Extract browser-side model into authoritative tested server service; expose structured assumptions and reproducible scenario outcomes.
- Read-only LLM interpretation layer with JSON/schema and bounds validation, confirmation of material assumptions, no arbitrary code execution.
- Compare equipment purchase and replacement strategies over LOM including maintenance, downtime and resale.

**Done when:** identical inputs produce identical NPV/IRR/payback independently of prompt wording; arithmetic runs only in financial service; scenario outputs cite input versions.

### Phase 5 — Legal/commercial module 7 (customer phase 5)
- Contract upload and permissioned storage; page/paragraph-cited risk findings requiring human confirmation.
- Partnership share sensitivities, break-even and IRR/NPV; ensure source model traceability to M2/M3/M5.
- New module navigation and board-ready summary.

**Done when:** findings link to source clauses, share curves tie to reproducible financial runs, legal review is marked advisory rather than definitive.

## Cross-cutting quality and risk policy

- **Never** present synthetic inputs or simulation outcomes as validated reserves, legal advice or investment recommendations.
- **Never** treat map scale or P95 alone as proof of “proved reserves”; resource/reserve classification requires competent professional judgement and an appropriate reporting basis.
- Keep enterprise audit history immutable, log decision policy version and make approval reversible only through a new, documented superseding decision.
- Log uploaded-contract access and protect document confidentiality; audit AI extraction errors, prompt injection and malformed PDFs.
- Require explicit integration licensing, formats, client data samples, ownership, update frequency and data retention agreement before live connectors.
- Validate example financial numbers in the customer specification as *illustrative*, not acceptance-test truth.

## Recommended test pyramid

- Django model/permission/approval-policy and data lineage unit tests.
- PostgreSQL/PostGIS migration and import idempotency integration tests.
- Deterministic annual cash flow golden cases and edge cases (zero/negative cash flow, multiple IRR, taxes, replacement schedule).
- Browser/UI tests for unsupported/incomplete data indicators and module navigation.
- Upload/fuzz/security tests for suspicious contracts, unauthorized documents and AI schema enforcement.
- Full demo regression with synthetic fixtures and an explicit "not decision-grade" status.

## Questions requiring customer sign-off (not blockers to planning)

1. Which exact vendor versions and legal access/licenses are available? Which data exchange formats are actually exportable?
2. Who are authorized CP/QP reviewers, gate approvers, legal reviewers and financial model owners?
3. Which country/regulatory reporting framework and map-scale/qualification criteria should control FID?
4. Which real historical project datasets, contracts, currency/tax rules and commodity feeds will be supplied?
5. Which integrations must operate live and which may use periodic verified file uploads?

## Backlog

Track the P0 foundations and customer phases 1–5 as GitHub issues, with detailed technical tasks broken down after agreement on API/domain contracts. Sequence: P0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5. Some frontend shell work can run in parallel; approval and AI features cannot be considered production-ready before their persisted controls exist.
