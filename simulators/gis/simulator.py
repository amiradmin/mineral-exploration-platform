#!/usr/bin/env python3
"""Synthetic ArcGIS Pro / QGIS-style exporter. No vendor installation is required."""
import json
import logging
import os
import random
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
LOG = logging.getLogger("gis-simulator")

API_URL = os.environ.get("API_URL", "http://api:8000/api/simulators/gis/ingest/")
TOKEN = os.environ.get("GIS_SIMULATOR_TOKEN", "")
TARGET = os.environ.get("GIS_SIMULATOR_TARGET", "T-001")
INTERVAL = max(5, min(3600, int(os.environ.get("GIS_SIMULATOR_INTERVAL_SECONDS", "30"))))
if len(TOKEN) < 24:
    raise SystemExit("GIS_SIMULATOR_TOKEN must be a unique secret of at least 24 characters")
if TARGET not in {"T-001", "T-002", "T-003", "T-004"}:
    raise SystemExit("GIS_SIMULATOR_TARGET must be one of T-001, T-002, T-003, T-004")


def sample_geojson(sequence):
    """Small, deterministic-looking but varying synthetic features near central Iran."""
    rng = random.Random(sequence + 1945)
    offset = rng.uniform(-0.009, 0.009)
    return {
        "type": "FeatureCollection",
        "name": "synthetic_tectonic_structures",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": [
                    [54.16 + offset, 32.18], [54.24 + offset, 32.25],
                    [54.36 + offset, 32.33], [54.44 + offset, 32.39],
                ]},
                "properties": {
                    "name": "Synthetic NW-SE Fault",
                    "feature_class": "fault",
                    "length_km": round(18.6 + rng.random(), 2),
                    "confidence": "simulated",
                },
            },
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": [
                    [54.22, 32.40 + offset], [54.30, 32.33 + offset],
                    [54.37, 32.23 + offset],
                ]},
                "properties": {
                    "name": "Synthetic NE-SW Fracture",
                    "feature_class": "fracture",
                    "length_km": round(12.1 + rng.random(), 2),
                    "confidence": "simulated",
                },
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [54.30 + offset, 32.31]},
                "properties": {
                    "name": "Synthetic Structural Intersection",
                    "feature_class": "intersection",
                    "fracture_density_per_km2": round(2 + rng.random(), 2),
                    "confidence": "simulated",
                },
            },
        ],
    }


def send(sequence):
    payload = {
        "target_id": TARGET,
        "dataset": "synthetic-arcgis-qgis-structures",
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "geojson": sample_geojson(sequence),
    }
    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload, separators=(",", ":")).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-GIS-Simulator-Token": TOKEN,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            result = json.load(response)
            LOG.info("Published simulated GeoJSON target=%s features=%s snapshot=%s",
                     TARGET, len(payload["geojson"]["features"]), result.get("id"))
            return True
    except urllib.error.HTTPError as exc:
        LOG.warning("Data Mine rejected GIS sample: HTTP %d", exc.code)
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        LOG.warning("GIS sample delivery not ready: %s", exc)
    return False


def main():
    sequence = 0
    while True:
        sequence += 1
        send(sequence)
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
