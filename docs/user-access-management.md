# Data Mine — React User Access Management & Section 2 navigation

## React UI

Superuser account → **Administration → User Access Management** in the left navigation.

A user can be created with username, password (at least 8 characters), and optional
email. Accounts are regular users by default, not superusers or staff. An administrator
can activate/deactivate accounts, grant or revoke one of five roles (`expert`, `cp`,
`chair`, `board`, `auditor`) for a specific exploration target.
Existing Django Admin remains available for advanced identity management.

Module 1 → Exploration Evaluator now presents two tabs immediately beneath the
top KPIs: **01 Data Lineage & Software Ingestion Hub**, and
**02 Expert Committee & Peer Review**. Selecting the second tab opens the
existing target-scoped committee workflow without scrolling past the ingestion
console. English and Persian translations are supplied for the new controls.

### Security

The administration navigation is hidden for non-superusers, but the server is
authoritative. Every administration endpoint requires an authenticated **active
Django superuser**. Neither global staff membership nor `board`/`chair`
roles grant authority to provision users. Account/role mutations generate
`AuditEvent` records. A user cannot deactivate their own account, and the
last active superuser cannot be deactivated.

Admin API paths:
- `GET/POST /api/admin-access/users/`
- `PATCH /api/admin-access/users/<id>/` — account active state
- `POST /api/admin-access/users/<id>/memberships/` — grant or reactivate target role
- `DELETE /api/admin-access/memberships/<id>/` — revoke target role

All requests use the existing JWT Bearer token; access and refresh token handling
are unchanged. No privileged role can be created through this interface.
To create the first administrator use `docker compose exec api python manage.py createsuperuser`.

For public deployments, enforce HTTPS, strong credential policy, MFA and account
provisioning review. Django Admin must remain restricted to trusted operators.
