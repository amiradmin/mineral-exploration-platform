# Exploration evaluator — source inspection

The information button on a source card opens a project-specific modal with:
- recorded integration transport (REST API, CSV, socket, file, OGC, other)
- configured status, data format, last checked and last successful timestamps
- latest **stored** Data Mine source dataset snapshot, with observation and receipt times
- example output categories and potential transport methods labelled as *illustrative*

Backend: `GET /api/source-details/<target-id>/<software-key>/`.

## Configuration and data lifecycle

A user with Django admin rights may register a `SourceConnection` for a known Target and source key (e.g., `T-001` and `gis`) in the Django admin. `SourceDataSnapshot` entries store timestamped sanitized JSON summaries. Source keys supported in the UI: `oasis`, `gcd`, `res`, `gis`, `rock`, `dips`, `geobank`.

The backend does not connect to proprietary software automatically and never polls a vendor on popup open. A real importer/connector must create snapshots, set checked/success timestamps and update status based on actual connection results. Avoid putting passwords, tokens, personal data, or full proprietary records in `values`.

If no connection is recorded, the popup displays **Not configured / No source data received**. Potential protocols displayed under *Possible integration methods* are suggestions, not confirmed vendor features. Socket is supported as a recorded transport label, not an implemented socket client.

Demo records (`is_demo=true`) are visible without login to preserve existing demo behavior. For non-demo records, the endpoint requires an authenticated staff user until project-specific authorization is implemented. **Do not enable customer-data access for non-project-scoped staff in a multi-tenant deployment.** This is not yet a production data-integration layer.

The graphical target-to-software associations are static examples. A later phase should drive those from `SourceConnection` records and link source snapshots to evaluation calculations.
