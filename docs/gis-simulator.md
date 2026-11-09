# Synthetic ArcGIS Pro / QGIS GIS simulator

This **does not install or run ArcGIS Pro or QGIS**. The separate `gis-simulator` Docker container emulates a GIS exporter and sends small synthetic GeoJSON FeatureCollections through an internal **HTTP POST/JSON API** to the Django backend, which persists snapshots in PostgreSQL/PostGIS-backed storage. The popup reads the most recently stored snapshot. No licensed vendor software, live QGIS socket or ArcGIS service is connected.

## How to run

1. Ensure `main` contains these changes, and preserve your existing `.env`. Add these values:

```dotenv
GIS_SIMULATOR_ENABLED=true
GIS_SIMULATOR_TARGET=T-001
GIS_SIMULATOR_INTERVAL_SECONDS=30
GIS_SIMULATOR_TOKEN=generate-a-new-unique-secret-of-at-least-24-characters
```

Generate a token locally with `python3 -c 'import secrets; print(secrets.token_urlsafe(40))'`. **Use the same token in both services via .env, do not commit it or use the example placeholder.**

2. Ensure synthetic dataset seeding is enabled on an empty database (`SEED_DEMO=true`), then start:

```bash
docker compose --profile simulation up -d --build
docker compose logs -f gis-simulator
```

3. Visit `http://localhost:8085` → **Exploration Evaluator** → select **North Ridge (T-001)** → Data Source Lineage → **ArcGIS Pro / QGIS** information icon. You will see actual received synthetic coordinates, fault features, connection protocol `REST API`, latest timestamps and feature counts. Close and reopen the popup after a subsequent publication to see updated records.

4. Verify data through the frontend API proxy:

```bash
curl -s http://localhost:8085/api/source-details/T-001/gis/
```

This JSON includes `latest.values.simulated=true`, `latest.values.geojson` and `last_success_at`. No database password or simulator token is exposed in the response.

The simulator is under a **Compose profile** to avoid unintentional data ingestion. Without `--profile simulation` it will not start. The HTTP ingestion endpoint is disabled unless `GIS_SIMULATOR_ENABLED=true` and the shared token matches. The simulator sends to `http://api:8000` using the internal Docker network, not a published port.

To stop synthetic traffic without deleting the database:

```bash
docker compose --profile simulation stop gis-simulator
```

## Limits / isolation

- Exactly one target per simulator container (`T-001` by default); set `GIS_SIMULATOR_TARGET` to `T-002`, `T-003` or `T-004` for another simulated project.
- The source connection is marked `is_demo=true`; ingestion refuses to overwrite an existing real (non-demo) GIS connection.
- This stores *synthetic features*, not actual geospatial layers or PostGIS geometry columns. Mapping to PostGIS geometries and production source connectors is a later step.
- No API credentials are provided to the browser, and the simulator makes no calls to ArcGIS/QGIS.
- Not suitable for real geological analysis, reserves or investment approvals.
