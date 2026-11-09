# P0 deployment, migration and governance runbook

## Scope / limitations

This is an initial production-foundation increment, **not** a bankable investment workflow. API reads remain public for the demo, while mutations require a Django authenticated user in the `data_steward` group or a superuser. Final gate submissions additionally require `board_approver` or superuser. These are global roles, **not yet per-project object permissions**. EvidenceReadiness is a manually administered attestation, **not** a comprehensive geological evidence validator. Audit history is append-only via the application endpoints and read-only in Django admin, **not tamper-proof against database administrators**. No qualified-person digital signatures exist yet. Do not permit live investment approvals until these gaps are closed.

## Fresh Docker installation

1. Copy `.env.example` to `.env` and replace both secrets with strong random values. Never commit secrets. Set `SEED_DEMO=true` only for synthetic sample content (the compose file opts in for the current demo).
2. `docker compose up -d --build`
3. `docker compose exec api python manage.py createsuperuser`
4. `docker compose exec api python manage.py check`
5. `docker compose exec api python manage.py showmigrations exploration`

The PostGIS extension is installed by migration on PostgreSQL. Django's conventional backend is used until spatial model fields are introduced. Existing `GET /api/*` demo endpoints stay accessible without credentials; protected writes use session auth with CSRF or an explicit per-user DRF token. The browser's role-selector is still presentation only. Role creation runs during API startup; assigning users to groups is an admin task.

## Migrating a deployed SQLite database (manual maintenance window)

1. **Stop writes and back up the entire SQLite database and Docker volumes.** Copy the SQLite file off host and verify it opens. Do not delete the old SQLite volume.
2. From the old application and old settings (`DB_ENGINE=sqlite DJANGO_DEBUG=true`) export exploration records: `python manage.py dumpdata exploration --natural-foreign --natural-primary --indent 2 > exploration-backup.json`. Preserve the backup and its checksum off-host. Export users/groups separately if required; review identity mapping before importing real accounts.
3. Start fresh PostgreSQL and run `python manage.py migrate`. Avoid running `seed_demo` before importing a real dataset (set `SEED_DEMO=false`).
4. Copy JSON into the API container and run `python manage.py loaddata exploration-backup.json`, then validate counts for targets, drillholes, operation programs, assays, QA/QC and tasks against the old database.
5. Smoke-test the API and role permissions; validate each project is tagged `demo` or `unverified` unless independently verified.
6. Back up PostgreSQL before restoring traffic: `docker compose exec -T db pg_dump -U data_mine -Fc data_mine > data-mine-backup.dump`. Update credentials/names if customized.
7. **Rollback**: stop PostgreSQL-backed writes, redeploy the prior release with the untouched original SQLite volume and configuration; reconcile any writes performed after cutover before reopening. Never assume a lossless automated rollback across both databases.

## API authorization smoke checks

- Public `GET /api/targets/` and `GET /api/programs/summary/`: allowed for synthetic demo.
- Anonymous `PATCH /api/tasks/{id}/`: denied.
- Authenticated user with no `data_steward`: denied.
- `data_steward` mutation: accepted and recorded in `AuditEvent`.
- `POST /api/programs/{id}/gate-decisions/`: requires `board_approver`; gate 4 GO additionally requires a matching `EvidenceReadiness` marked verified + detailed exploration + QA/QC approved + competent-person approved. Otherwise returns 409 with blockers.
- Negative and positive permission checks live in `backend/exploration/tests.py`.

## Remaining production blockers

- Object-level project tenancy and user-to-project assignment (current roles are global).
- Restrict anonymous GET before storing confidential customer data.
- Verified source-linked geological evidence and real competent-person signature/approval workflow.
- Durable offsite backups with restore drills, secrets rotation and production WSGI (currently Django dev server).
- Database-side immutable audit append guarantees, structured before/after mutation snapshots and retention rules.
- Browser integration with a real session workflow and UI decision statuses; current local financial checkboxes are *not* valid approvals.
