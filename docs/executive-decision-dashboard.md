# Executive Decision Cockpit (board-facing dashboard)

Route: `/` (Investment Dashboard), above the original four-gate/six-module architecture.

## Purpose

Give a board member a defensible answer to four questions: (1) Can we approve investment now? (2) Why or why not? (3) What are the highest recorded technical/commercial risks? (4) What formal decisions and signed memos exist?

## Backend source of truth

`GET /api/targets/{target_id}/executive-brief/?program_id=<optional-linked-program-id>`

- Requires an authenticated user with an **active target committee membership** or superuser privilege.
- Program selector only allows programs explicitly linked through `ProgramTarget` to the chosen target.
- Investment blockers come from the existing server-side `fid_blockers(program)`, including geological data-scale verification, engineering source reviews and latest legal-contract review.
- Formal gate history comes from `GateDecision` records, not the mock `createDecisionSnapshot` presentation function.
- Strategic warnings come from open `StrategicProjectFlag` records and recognized latest-contract findings; absence of flagged items does not establish zero risk.
- The latest signed `ExecutiveCommitteeMemo` is displayed, explicitly as an authenticated attestation, **not** a cryptographic PKI signature.
- Source readiness is taken from current engineering, financial and risk source records. A pending latest source snapshot is not automatically considered reviewed.
- Missing verified project-level NPV, IRR and payback display as **Not available**, never as sample financial KPI values.

## Executive status semantics

- `HOLD`: Program is not explicitly linked, or one or more current FID evidence prerequisites fail, or latest formal gate-4 outcome is HOLD.
- `REVIEW`: No current server evidence blockers, but formal approval not recorded or a current expert fatal flaw requires manual reassessment.
- `GO_RECORDED`: Most recent formal program Gate 4 decision is GO, implemented FID evidence checks still pass, and there are no open fatal-flaw flags in the selected target. It is a **record of a governed action**, not a new authorization or proof of live ESG/legal licensing.
- A historical GO must never be presented as currently valid if evidence blockers subsequently appear.
- The dashboard is **read-only**. Board actions and budget disbursement remain in server-authorized workflows.

## Display

- prominent status/rationale and evidence snapshot timestamp
- target and linked program selector
- four formal gate decision cards
- top investment blockers with links to relevant technical workspaces
- priority strategic flags and legal risks
- engineering, risk, finance and legal source review status
- latest technical committee signed memo
- formal decision history (timestamps, approvers, rationale)
- Markdown board brief download, with explicit limitations

## Limitations

The interface does not currently calculate certified Ore Reserves, validate site-specific technical feasibility, connect to a corporate ERP or produce auditor-certified NPV. Risk sources may still be missing or unverified. The board should consider environmental permits, socio-economic constraints and financing agreements outside the implemented blockers.

## Local deployment

```bash
cd ~/Documents/Presentation/mineral-exploration-platform
git pull origin main
docker compose up -d --build
docker compose exec api python manage.py migrate
```
