# Section 2 — Expert Committee & Peer Review

This is a **target-specific authenticated workflow** in Module 1 → Exploration Evaluator,
below Evidence → Factor Calculation & Audit.

## Access

In Django Admin at `http://localhost:8000/admin/`, a **superuser** creates
users and grants `CommitteeMembership` for a specific `Target` and role:
`expert`, `cp`, `chair`, `board`, `auditor`.
Membership must be active. Global Django groups, staff privileges, and a role
on another target do not imply committee access.

This browser application does not yet provide a first-class login form; use the
Django session sign-in for the same hostname and port (Django admin at port 8000).
Cookie origin/domain and CSRF configuration must be checked for a real deployment.
Server-side role checks are mandatory; the UI's disabled buttons are merely hints.

## Workflow

- Expert submits a percentage-point override on a **stored evaluation factor**.
  Requires a rationale, document reference, and a 64-character externally supplied
  SHA-256 checksum. Original factor and evaluation are never rewritten.
  The input document is **referenced, not uploaded or verified** by this MVP.
  CP or chair independently approves or rejects. **Synthetic / unapproved
  evidence evaluations can never receive approved overrides**.
- Expert creates a `catalyst`, `fatal_flaw`, or `prerequisite` flag
  at a stage gate. Any open fatal flaw or prerequisite blocks **GO**. An
  independent CP/chair may close flags with an explanation. The board still
  determines the financial decision.
- Expert drafts an immutable memo version for a gate, bound to the latest
  evaluation. A different committee chair can record an **authenticated
  attestation** if the evaluation is approved, memo content unchanged, and no
  newer memo version exists. This is **not** a cryptographic or legally
  qualified digital signature.
- A target-scoped board user records GO / HOLD / REVIEW with a rationale.
  **GO requires approved current evidence, latest signed memo, no open
  fatal flaws/prerequisites and no pending overrides**. HOLD / REVIEW
  remain available for legitimate incomplete evaluations after an
  evaluation and memo exist.

## Important boundaries

The target-scoped `CommitteeGateDecision` is distinct from the existing
`GateDecision` tied to `OperationProgram`. There is no dependable
`Target → OperationProgram` link in the current data model. The new
target-specific safety checks do **not** automatically govern the older
program-level endpoint, and must not be presented as doing so.

This workflow does not claim compliance with JORC, NI 43-101, SAMREC,
formal CP/QP credential verification, qualified digital signature,
independent immutable evidence storage, or geological statistical calibration.
`CommitteeMembership` role is an access grant, **not** proof of a
recognized professional designation.

## APIs

```text
GET  /api/targets/T-001/committee/
POST /api/targets/T-001/committee/overrides/
POST /api/targets/T-001/committee/overrides/<id>/review/
POST /api/targets/T-001/committee/flags/
POST /api/targets/T-001/committee/flags/<id>/resolve/
POST /api/targets/T-001/committee/memos/
POST /api/targets/T-001/committee/memos/<id>/sign/
POST /api/targets/T-001/committee/gate-decisions/
```

Every endpoint enforces active target-specific membership.
The server stores an `AuditEvent` for each mutation. Normal API routes
do not expose edit/delete for submitted records. Database administrators
can still modify the database; this is not a tamper-proof ledger.

### Deploy

```bash
git pull origin main
docker compose --profile simulation up -d --build
docker compose exec api python manage.py showmigrations exploration
```

Migration `0006_expert_committee` adds the tables without deleting existing GIS,
source or evaluation data. The evaluator will show an access-required message
until a project membership is provisioned.
