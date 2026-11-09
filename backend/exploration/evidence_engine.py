"""Deterministic, server-owned evidence lineage and factor calculation.

This is a *demonstration method* unless a qualified reviewer approves
non-demo source rules and data. It never updates the existing PoS sliders.
"""
import hashlib
import json
import math
from django.db import transaction
from django.utils import timezone

from .models import (
    AuditEvent, EvidenceEvaluation, EvidenceEvaluationInput, EvidenceFactorRule,
    SourceConnection, SourceDataSnapshot,
)

ALGORITHM_VERSION = "linear-normalization-v1"
FACTORS = ("P_Source", "P_Pathway", "P_Trap", "P_Timing")
CATALOG = {
    "oasis": {"name": "Oasis montaj", "format": "Geosoft Grid", "factors": ["P_Source"]},
    "gcd": {"name": "GCDkit / IgPet", "format": "CSV", "factors": ["P_Source"]},
    "res": {"name": "RES2DINV / RES3DINV", "format": "Inversion tomography", "factors": ["P_Pathway"]},
    "gis": {"name": "ArcGIS Pro / QGIS", "format": "GeoJSON / Shapefile", "factors": ["P_Pathway", "P_Trap"]},
    "rock": {"name": "RockWorks", "format": "Striplog", "factors": ["P_Trap"]},
    "dips": {"name": "Dips", "format": "Stereonet", "factors": ["P_Trap"]},
    "geobank": {"name": "Datamine CCLAS / Geobank", "format": "LIMS", "factors": ["P_Timing"]},
}


def digest(value):
    return hashlib.sha256(json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8")).hexdigest()


def snapshot_payload(snapshot):
    return {
        "id": snapshot.pk,
        "dataset": snapshot.dataset,
        "observed_at": snapshot.observed_at.isoformat(),
        "received_at": snapshot.received_at.isoformat(),
        "values": snapshot.values,
        "connection_id": snapshot.connection_id,
    }


def freeze_rule(rule):
    return {
        "id": rule.pk, "version": rule.version,
        "factor": rule.factor, "metric_key": rule.metric_key,
        "input_min": rule.input_min, "input_max": rule.input_max,
        "output_min": rule.output_min, "output_max": rule.output_max,
        "weight": rule.weight, "is_demonstration": rule.is_demonstration,
        "rationale": rule.rationale,
        "approved_by_id": rule.approved_by_id,
        "approved_at": rule.approved_at.isoformat() if rule.approved_at else None,
    }


def seed_demo_gis_rule(connection):
    """Only provision clearly labelled synthetic calibration for demo GIS feed."""
    if not connection.is_demo or connection.software_key != "gis":
        return
    EvidenceFactorRule.objects.get_or_create(
        connection=connection, factor="P_Pathway",
        metric_key="fracture_density_per_km2", version=1,
        defaults={
            "input_min": 0.0, "input_max": 5.0,
            "output_min": 0.0, "output_max": 100.0,
            "weight": 1.0,
            "is_demonstration": True,
            "rationale": "DEMO ONLY: linear display scaling of synthetic fracture density 0-5 per km2. Not calibrated geological probability.",
        },
    )


@transaction.atomic
def create_evaluation(target, actor=None):
    connections = list(SourceConnection.objects.filter(target=target).order_by("pk"))
    connection_ids = [c.pk for c in connections]
    latest = {}
    for snap in (SourceDataSnapshot.objects.filter(connection_id__in=connection_ids)
                 .select_related("connection").order_by("connection_id", "-received_at", "-pk")):
        latest.setdefault(snap.connection_id, snap)

    rules = list(EvidenceFactorRule.objects.filter(
        connection_id__in=connection_ids, is_enabled=True,
    ).select_related("connection").order_by("connection_id", "factor", "metric_key", "-version", "-pk"))
    # One active version of each mapping per source, factor and metric.
    chosen = {}
    for rule in rules:
        chosen.setdefault((rule.connection_id, rule.factor, rule.metric_key), rule)

    ingredients = []
    missing_inputs = []
    demo = False
    ready = True
    for rule in chosen.values():
        snap = latest.get(rule.connection_id)
        if snap is None:
            missing_inputs.append({"rule_id": rule.pk, "reason": "no_snapshot"})
            ready = False
            continue
        value = snap.values.get(rule.metric_key)
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            missing_inputs.append({"rule_id": rule.pk, "reason": "missing_or_non_numeric_metric", "metric_key": rule.metric_key})
            ready = False
            continue
        if not all(math.isfinite(x) for x in (rule.input_min, rule.input_max, rule.output_min, rule.output_max, rule.weight)) or (
            rule.input_max <= rule.input_min or rule.output_max < rule.output_min or not 0 < rule.weight <= 1
        ):
            missing_inputs.append({"rule_id": rule.pk, "reason": "invalid_rule_parameters"})
            ready = False
            continue
        normalized = max(0.0, min(1.0, (value - rule.input_min) / (rule.input_max - rule.input_min)))
        score = round(rule.output_min + normalized * (rule.output_max - rule.output_min), 6)
        weighted = round(score * rule.weight, 6)
        frozen = freeze_rule(rule)
        snapshot_hash = digest(snapshot_payload(snap))
        is_demo = bool(rule.is_demonstration or rule.connection.is_demo or snap.values.get("simulated") is True)
        demo |= is_demo
        if is_demo or rule.approved_by_id is None:
            ready = False
        ingredients.append({
            "rule": rule, "snapshot": snap, "frozen_rule": frozen,
            "snapshot_sha256": snapshot_hash, "value": float(value),
            "normalized_score": score, "weighted_score": weighted,
        })

    outputs = {}
    for factor in FACTORS:
        items = [i for i in ingredients if i["rule"].factor == factor]
        if items:
            weight_sum = sum(i["rule"].weight for i in items)
            outputs[factor] = round(sum(i["weighted_score"] for i in items) / weight_sum, 4)
    missing_factors = [factor for factor in FACTORS if factor not in outputs]
    if missing_factors or missing_inputs or not ingredients:
        ready = False
    if demo:
        status = "demo"
    elif ready:
        status = "pending"
    else:
        status = "incomplete"
    parameters = {
        "algorithm": "clamp((value-input_min)/(input_max-input_min),0,1)*output_range+output_min",
        "aggregate": "weighted_mean_per_factor",
        "required_factors": list(FACTORS),
        "missing_factors": missing_factors,
        "missing_inputs": missing_inputs,
    }
    provenance = [{
        "source_connection_id": i["rule"].connection_id,
        "software_key": i["rule"].connection.software_key,
        "snapshot_id": i["snapshot"].pk,
        "dataset": i["snapshot"].dataset,
        "snapshot_sha256": i["snapshot_sha256"],
        "rule_id": i["rule"].pk,
        "rule_version": i["rule"].version,
        "factor": i["rule"].factor,
        "metric": i["rule"].metric_key,
        "observed_value": i["value"],
        "normalized_score": i["normalized_score"],
        "weighted_score": i["weighted_score"],
        "frozen_rule": i["frozen_rule"],
    } for i in ingredients]
    fingerprint = digest({
        "target_id": target.pk, "algorithm_version": ALGORITHM_VERSION,
        "parameters": parameters, "outputs": outputs, "provenance": provenance,
    })
    evaluation = EvidenceEvaluation.objects.create(
        target=target, created_by=actor, status=status,
        algorithm_version=ALGORITHM_VERSION, parameters=parameters,
        outputs=outputs, provenance=provenance, content_sha256=fingerprint,
    )
    EvidenceEvaluationInput.objects.bulk_create([
        EvidenceEvaluationInput(
            evaluation=evaluation, rule=i["rule"], snapshot=i["snapshot"],
            frozen_rule=i["frozen_rule"], snapshot_sha256=i["snapshot_sha256"],
            observed_value=i["value"], normalized_score=i["normalized_score"],
            weighted_score=i["weighted_score"],
        ) for i in ingredients
    ])
    AuditEvent.objects.create(
        actor=actor, action="evidence_evaluation_created", entity_type="EvidenceEvaluation",
        entity_id=str(evaluation.pk),
        details={"target_id": target.pk, "status": status, "digest": fingerprint,
                 "snapshot_ids": [i["snapshot"].pk for i in ingredients]},
    )
    return evaluation


def verify_evaluation_unchanged(evaluation):
    expected = digest({
        "target_id": evaluation.target_id,
        "algorithm_version": evaluation.algorithm_version,
        "parameters": evaluation.parameters,
        "outputs": evaluation.outputs,
        "provenance": evaluation.provenance,
    })
    if expected != evaluation.content_sha256:
        return False
    inputs = list(evaluation.inputs.select_related("snapshot", "rule", "rule__connection"))
    if len(inputs) != len(evaluation.provenance):
        return False
    for row in inputs:
        if row.snapshot.connection.target_id != evaluation.target_id:
            return False
        if digest(snapshot_payload(row.snapshot)) != row.snapshot_sha256:
            return False
        if freeze_rule(row.rule) != row.frozen_rule:
            return False
        if row.snapshot.values.get("simulated") is True or row.rule.is_demonstration or row.rule.connection.is_demo:
            return False
        if row.rule.approved_by_id is None:
            return False
    return True


def serialize_evaluation(evaluation):
    return {
        "id": evaluation.pk,
        "target_id": evaluation.target_id,
        "algorithm_version": evaluation.algorithm_version,
        "status": evaluation.status,
        "created_at": evaluation.created_at,
        "approved_at": evaluation.approved_at,
        "approved_by": evaluation.approved_by_id,
        "parameters": evaluation.parameters,
        "outputs": evaluation.outputs,
        "provenance": evaluation.provenance,
        "content_sha256": evaluation.content_sha256,
        "decision_grade": evaluation.status == "approved",
    }
