# Module 7 — Legal & Commercial AI Hub

## Implementation scope

Module 7 is available at `/legal-commercial`. This is a governance extension to the six original stage-gate technical modules.

**Contract Risk Audit**
- Accepts UTF-8 TXT and text-searchable PDF files up to 2 MB (max 25 PDF pages).
- Extracts text with `pypdf` (no OCR, no images).
- Uses an explainable, rule-based bilingual (English/Persian) clause screening pass. It flags potential take-or-pay obligations, termination, unrecovered CAPEX, FX adjustment, stripping-delay penalties, and royalties/owner shares.
- Each matching finding includes document paragraph excerpts; a missing match means **not detected**, never **compliant**.
- Where the source text contains a plausible minimum-tonnage obligation, checks it against the latest independently reviewed MineTrust *annual ore schedule* if present.
- This is **not a mineable-reserve validation**. Module 2 currently has no approved mineable reserve-to-contract capacity data contract. Legal review remains mandatory.
- Documents are **confidential**. Read access requires an active target-specific committee membership. Upload requires expert, CP, chair, board or legal membership. Recorded legal review requires the target's designated **legal** role (or a superuser).
- Excerpts and full extracted text remain in the backend database; a production deployment must establish encryption-at-rest, retention, backups, access logging, and institutional legal privilege handling before uploading real confidential contracts.
- Reviewer sign-off is an authenticated record, **not** proof of professional qualifications or a legally binding digital signature.

**Partnership Split Optimizer**
- Compares 15%, 18%, 25%, and 28% flat owner shares with a stepped **15% until year 4 and investor capital payback, then 28% from the following year**. If payback happens later, the step-up is delayed.
- Computes annual metal value, owner value share, operating expense, CAPEX, a simplified straight-line depreciation tax shield, investor cash flow, NPV, positive IRR when computable, and undiscounted payback.
- Calculates a 0–50% owner-share frontier at whole-percent increments using user-set minimum investor IRR, discounted NPV >= 0 and maximum payback constraints.
- Numeric calculations are performed by deterministic backend Python, not by a generative AI model. No "ideal split", IRR or payback values are hardcoded from presentation examples.
- `use_reviewed_sources=true` requires that the latest independently reviewed Datamine MineTrust LOM schedule covers every selected mine year and the latest reviewed ERP/EPC ledger contains positive year-0 CAPEX. The output carries source SHA-256 fingerprints.
- In illustrative mode, the model uses an **explicit synthetic** 4 Mt/y, 0.84% Cu, 3.9 Mt/y feed and $240M setup CAPEX scenario. No real mining project is implied.
- Copper price (USD/t recovered copper), metal recovery, mine life, tax, discount rate, cost per ore tonne and owner shares remain user-editable assumptions. The Module 3 operating-cost slider is **not persisted to a verified contract** today, so this cost is not silently imported.
- Capital spending is in USD; source MineTrust ore tonnage is metric tonnes, grade in percent. Annual financial results are in USD millions.
- Scenario records may be saved as immutable audited runs, separate from formal FID authorizations.
- The model does **not** constitute a bankable feasibility study. It excludes detailed VAT, financing structures, inflation, royalties on alternate valuation bases, mine closure liabilities and permit-specific terms. Nonconventional cash flows may have multiple IRRs.

**Governance**
- The newest uploaded contract, if pending designated legal review, blocks **new FID approval for a linked project target**. A project without a participation contract is not automatically blocked solely because Module 7 has no document.
- A technical/financial scenario report cannot bypass Gate 4 evidence checks or authorize construction capital.
- This rule-based MVP is **not an autonomous legal LLM** and does not provide legal advice.

## API
- `GET/POST /api/targets/{id}/legal-contracts/`
- `GET /api/targets/{id}/legal-contracts/{contract_id}/`
- `POST /api/targets/{id}/legal-contracts/{contract_id}/review/` with `{"rationale":"..."}`
- `POST /api/targets/{id}/commercial-scenarios/` with validated scenario parameters and optional `save_run`
- `GET /api/targets/{id}/commercial-scenarios/history/`

## Deployment

```bash
cd ~/Documents/Presentation/mineral-exploration-platform
git pull origin main
docker compose up -d --build
docker compose exec api python manage.py migrate
docker compose exec api python manage.py check
```

Navigate to `http://127.0.0.1:8085/legal-commercial`. An administrator can assign the new `legal` role to a target via the User Access Management UI.
