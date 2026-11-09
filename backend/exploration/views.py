from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.response import Response

from .audit import AuditedModelViewSetMixin
from .evidence_engine import CATALOG, create_evaluation, seed_demo_gis_rule, serialize_evaluation, verify_evaluation_unchanged
from .governance import GateApproverPermission, ReadPublicWriteRestricted, fid_blockers
from .models import AuditEvent, AssayBatch, Drillhole, Element, EvidenceFactor, GateDecision, OperationProgram, QAQCIssue, SourceConnection, EvidenceFactorRule, EvidenceEvaluation, Target, WorkTask
from .serializers import AssayBatchSerializer, DrillholeSerializer, ElementSerializer, EvidenceFactorSerializer, OperationProgramSerializer, QAQCIssueSerializer, TargetSerializer, WorkTaskSerializer


class RestrictedViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    permission_classes = [ReadPublicWriteRestricted]


class TargetViewSet(RestrictedViewSet):
    queryset = Target.objects.all()
    serializer_class = TargetSerializer
    search_fields = ["id", "name", "commodity", "deposit", "stage"]
    ordering_fields = ["ai_score", "confidence", "name"]


class DrillholeViewSet(RestrictedViewSet):
    queryset = Drillhole.objects.all()
    serializer_class = DrillholeSerializer
    search_fields = ["id", "status", "intercept"]


class ElementViewSet(RestrictedViewSet):
    queryset = Element.objects.all()
    serializer_class = ElementSerializer


class EvidenceFactorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EvidenceFactor.objects.all()
    serializer_class = EvidenceFactorSerializer


class OperationProgramViewSet(RestrictedViewSet):
    queryset = OperationProgram.objects.all()
    serializer_class = OperationProgramSerializer
    search_fields = ["name", "commodity"]

    @action(detail=False, methods=["get"])
    def summary(self, request):
        programs = self.get_queryset()
        return Response({
            "programs": OperationProgramSerializer(programs, many=True).data,
            "totals": {
                "planned": sum(program.planned_metres for program in programs),
                "actual": sum(program.actual_metres for program in programs),
                "logged": sum(program.logged_metres for program in programs),
                "samples": sum(program.samples for program in programs),
                "pending": sum(program.pending_assays for program in programs),
            },
        })


class AssayBatchViewSet(RestrictedViewSet):
    queryset = AssayBatch.objects.select_related("program").all()
    serializer_class = AssayBatchSerializer
    filterset_fields = ["status", "qa_status", "program"]


class QAQCIssueViewSet(RestrictedViewSet):
    queryset = QAQCIssue.objects.select_related("program").all()
    serializer_class = QAQCIssueSerializer
    filterset_fields = ["severity", "status", "program"]


class WorkTaskViewSet(RestrictedViewSet):
    queryset = WorkTask.objects.select_related("program").all()
    serializer_class = WorkTaskSerializer
    filterset_fields = ["done", "priority", "program"]


@api_view(["POST"])
@permission_classes([GateApproverPermission])
def submit_gate_decision(request, program_id):
    """Server-owned gate decision; never honor frontend signoff checkboxes."""
    program = get_object_or_404(OperationProgram, pk=program_id)
    try:
        gate = int(request.data.get("gate", 0))
    except (TypeError, ValueError):
        return Response({"detail": "Invalid gate"}, status=status.HTTP_400_BAD_REQUEST)
    outcome = request.data.get("outcome")
    rationale = request.data.get("rationale")
    if gate not in (1, 2, 3, 4) or outcome not in ("GO", "HOLD", "REVIEW") or not isinstance(rationale, str) or not rationale.strip():
        return Response({"detail": "Valid gate, outcome and rationale are required"}, status=status.HTTP_400_BAD_REQUEST)
    blockers = fid_blockers(program) if gate == 4 and outcome == "GO" else []
    if blockers:
        return Response({"detail": "FID prerequisites not satisfied", "blockers": blockers}, status=status.HTTP_409_CONFLICT)
    with transaction.atomic():
        decision = GateDecision.objects.create(
            program=program, gate=gate, outcome=outcome, rationale=rationale.strip(),
            approver=request.user,
        )
        AuditEvent.objects.create(
            actor=request.user, action="gate_decision", entity_type="GateDecision",
            entity_id=str(decision.pk),
            details={"program_id": program.pk, "gate": gate, "outcome": outcome, "policy_version": decision.policy_version},
        )
    return Response({"id": decision.pk, "gate": gate, "outcome": outcome, "policy_version": decision.policy_version}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def source_details(request, target_id, software_key):
    """Latest stored source snapshot and recorded protocol, never an invented live feed.

    Non-demo source records are restricted to authenticated staff until project
    tenancy and customer-specific access controls are available.
    """
    get_object_or_404(Target, pk=target_id)
    conn = SourceConnection.objects.filter(target_id=target_id, software_key=software_key).first()
    if conn is None:
        return Response({
            "configured": False, "status": "not_configured", "protocol": None,
            "format": None, "last_checked_at": None, "last_success_at": None,
            "latest": None,
        })
    if not conn.is_demo and not (request.user.is_authenticated and request.user.is_staff):
        return Response({"detail": "Sign-in with authorized access is required."}, status=status.HTTP_403_FORBIDDEN)
    latest = conn.snapshots.order_by("-received_at", "-pk").first()
    return Response({
        "configured": True,
        "status": conn.status,
        "protocol": conn.get_protocol_display(),
        "format": conn.data_format or None,
        "last_checked_at": conn.last_checked_at,
        "last_success_at": conn.last_success_at,
        "latest": {
            "dataset": latest.dataset,
            "observed_at": latest.observed_at,
            "received_at": latest.received_at,
            "values": latest.values,
        } if latest else None,
    })


# Simulator ingestion is deliberately isolated from the real source connectors.
# The shared token is accepted ONLY on this route, with explicit opt-in in .env.
@api_view(["POST"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def ingest_gis_simulator(request):
    import hmac
    import os
    from datetime import timedelta
    from django.utils import timezone as dj_timezone
    from rest_framework import serializers
    from .models import SourceDataSnapshot

    secret = os.environ.get("GIS_SIMULATOR_TOKEN", "")
    enabled = os.environ.get("GIS_SIMULATOR_ENABLED", "").lower() == "true"
    token = request.headers.get("X-GIS-Simulator-Token", "")
    if not enabled or len(secret) < 24 or not token or not hmac.compare_digest(secret, token):
        return Response({"detail": "Simulator ingestion not authorized."}, status=status.HTTP_403_FORBIDDEN)

    class GisPayload(serializers.Serializer):
        target_id = serializers.CharField(max_length=16)
        dataset = serializers.CharField(max_length=120)
        observed_at = serializers.DateTimeField()
        geojson = serializers.JSONField()

        def validate_geojson(self, value):
            if not isinstance(value, dict) or value.get("type") != "FeatureCollection":
                raise serializers.ValidationError("Expected GeoJSON FeatureCollection.")
            features = value.get("features")
            if not isinstance(features, list) or not 1 <= len(features) <= 20:
                raise serializers.ValidationError("Expected between 1 and 20 features.")
            for feature in features:
                if not isinstance(feature, dict) or feature.get("type") != "Feature":
                    raise serializers.ValidationError("Each item must be a GeoJSON Feature.")
                geom = feature.get("geometry")
                if not isinstance(geom, dict) or geom.get("type") not in ("Point", "LineString", "Polygon"):
                    raise serializers.ValidationError("Only Point, LineString and Polygon geometry are supported.")
                if not isinstance(feature.get("properties"), dict):
                    raise serializers.ValidationError("Feature properties must be objects.")
            return value

    if len(request.body) > 20_000:
        return Response({"detail": "Payload exceeds 20 KB."}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
    payload = GisPayload(data=request.data)
    payload.is_valid(raise_exception=True)
    values = payload.validated_data
    target_id = values["target_id"]
    if target_id not in ("T-001", "T-002", "T-003", "T-004"):
        return Response({"detail": "Unknown demo simulator target."}, status=status.HTTP_400_BAD_REQUEST)
    target = Target.objects.filter(pk=target_id).first()
    if target is None:
        return Response({"detail": "Target not seeded yet."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    observed_at = values["observed_at"]
    now = dj_timezone.now()
    if observed_at > now + timedelta(minutes=5) or observed_at < now - timedelta(days=2):
        return Response({"detail": "Invalid observation timestamp."}, status=status.HTTP_400_BAD_REQUEST)
    collection = values["geojson"]
    counts = {"Point": 0, "LineString": 0, "Polygon": 0}
    for feature in collection["features"]:
        counts[feature["geometry"]["type"]] += 1
    with transaction.atomic():
        # Never convert a real customer's GIS connection into a demo simulator.
        connection, created = SourceConnection.objects.select_for_update().get_or_create(
            target=target, software_key="gis",
            defaults={"protocol": "api", "data_format": "GeoJSON", "status": "connected", "is_demo": True},
        )
        if not connection.is_demo:
            return Response({"detail": "A non-demo GIS connection already exists."}, status=status.HTTP_409_CONFLICT)
        if connection.protocol != "api" or connection.data_format != "GeoJSON":
            return Response({"detail": "The GIS demo connection uses a different protocol."}, status=status.HTTP_409_CONFLICT)
        # The snapshot always carries an explicit synthetic label. It is not decision-grade.
        snapshot = SourceDataSnapshot.objects.create(
            connection=connection,
            dataset=values["dataset"],
            observed_at=observed_at,
            values={
                "origin": "Synthetic ArcGIS Pro / QGIS simulator",
                "simulated": True,
                "feature_count": len(collection["features"]),
                "point_count": counts["Point"],
                "fault_line_count": counts["LineString"],
                "zone_polygon_count": counts["Polygon"],
                "geojson": collection,
                "fracture_density_per_km2": next(
                    (feature["properties"]["fracture_density_per_km2"]
                     for feature in collection["features"]
                     if feature["geometry"]["type"] == "Point"
                     and isinstance(feature["properties"].get("fracture_density_per_km2"), (int, float))
                     and not isinstance(feature["properties"].get("fracture_density_per_km2"), bool)),
                    None,
                ),
            },
        )
        connection.status = "connected"
        connection.last_checked_at = now
        connection.last_success_at = now
        connection.save(update_fields=["status", "last_checked_at", "last_success_at"])
        seed_demo_gis_rule(connection)
        # Persist a separate reproducible demonstration evaluation for each
        # received GIS snapshot. Never mark it as a CP-approved decision.
        create_evaluation(target)
    return Response({"id": snapshot.pk, "target_id": target_id, "received": True, "simulated": True}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def source_snapshot_history(request, target_id, software_key):
    """Paginated stored raw snapshots, filtered by received_at (UTC instants).

    Uses the same connection-level read policy as source_details.
    No vendor polling and no data mutation occurs here.
    """
    from django.utils.dateparse import parse_datetime
    from django.utils import timezone
    from .models import SourceDataSnapshot

    get_object_or_404(Target, pk=target_id)
    connection = SourceConnection.objects.filter(
        target_id=target_id, software_key=software_key,
    ).first()
    if connection is not None and not connection.is_demo and not (
        request.user.is_authenticated and request.user.is_staff
    ):
        return Response({"detail": "Sign-in with authorized access is required."},
                        status=status.HTTP_403_FORBIDDEN)

    try:
        page = int(request.query_params.get("page", "1"))
    except (TypeError, ValueError):
        return Response({"detail": "page must be a positive integer."},
                        status=status.HTTP_400_BAD_REQUEST)
    if page < 1 or page > 10000:
        return Response({"detail": "page must be between 1 and 10000."},
                        status=status.HTTP_400_BAD_REQUEST)

    dates = {}
    for param in ("from", "to"):
        raw = request.query_params.get(param)
        if raw is None or raw == "":
            continue
        dt = parse_datetime(raw)
        if dt is None or timezone.is_naive(dt):
            return Response({"detail": param + " must be an ISO 8601 timestamp with timezone."},
                            status=status.HTTP_400_BAD_REQUEST)
        dates[param] = dt
    if "from" in dates and "to" in dates and dates["from"] > dates["to"]:
        return Response({"detail": "from must be earlier than or equal to to."},
                        status=status.HTTP_400_BAD_REQUEST)

    queryset = SourceDataSnapshot.objects.filter(connection=connection) if connection else SourceDataSnapshot.objects.none()
    if "from" in dates:
        queryset = queryset.filter(received_at__gte=dates["from"])
    if "to" in dates:
        queryset = queryset.filter(received_at__lte=dates["to"])
    queryset = queryset.order_by("-received_at", "-pk")
    count = queryset.count()
    page_size = 10
    records = queryset[(page-1)*page_size:page*page_size]
    return Response({
        "count": count,
        "page": page,
        "page_size": page_size,
        "pages": (count+page_size-1)//page_size,
        "time_field": "received_at",
        "results": [{
            "id": snapshot.pk,
            "dataset": snapshot.dataset,
            "observed_at": snapshot.observed_at,
            "received_at": snapshot.received_at,
            "values": snapshot.values,
        } for snapshot in records],
    })


def _is_staff(request):
    return request.user.is_authenticated and request.user.is_staff


def _in_group(request, group):
    return bool(request.user.is_authenticated and (
        request.user.is_superuser or request.user.groups.filter(name=group).exists()
    ))


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def source_registry(request, target_id):
    """Registry state belongs to Django, not hardcoded project/source pairs."""
    target = get_object_or_404(Target, pk=target_id)
    connections = list(SourceConnection.objects.filter(target=target).order_by("software_key"))
    visible = {c.software_key: c for c in connections if c.is_demo or _is_staff(request)}
    rules = EvidenceFactorRule.objects.filter(connection__in=visible.values(), is_enabled=True).order_by("factor", "-version")
    factors_by_source = {}
    for rule in rules:
        factors_by_source.setdefault(rule.connection_id, set()).add(rule.factor)
    keys = sorted(set(CATALOG) | set(visible))
    return Response({
        "target_id": target.pk,
        "sources": [{
            "key": key,
            "name": CATALOG.get(key, {}).get("name", key),
            "expected_format": CATALOG.get(key, {}).get("format", "Unknown"),
            "potential_factors": CATALOG.get(key, {}).get("factors", []),
            "configured": key in visible,
            "status": visible[key].status if key in visible else "not_configured",
            "protocol": visible[key].get_protocol_display() if key in visible else None,
            "data_format": visible[key].data_format if key in visible else None,
            "is_demo": visible[key].is_demo if key in visible else None,
            "last_success_at": visible[key].last_success_at if key in visible else None,
            "mapped_factors": sorted(factors_by_source.get(visible[key].pk, [])) if key in visible else [],
        } for key in keys],
    })


@api_view(["GET", "POST"])
@permission_classes([permissions.AllowAny])
def evidence_evaluations(request, target_id):
    target = get_object_or_404(Target, pk=target_id)
    if request.method == "POST":
        if not _in_group(request, "data_steward"):
            return Response({"detail": "Data steward permission required."}, status=status.HTTP_403_FORBIDDEN)
        evaluation = create_evaluation(target, actor=request.user)
        return Response(serialize_evaluation(evaluation), status=status.HTTP_201_CREATED)
    queryset = EvidenceEvaluation.objects.filter(target=target)
    if not _is_staff(request):
        queryset = queryset.filter(status="demo").exclude(inputs__rule__connection__is_demo=False).distinct()
    records = list(queryset.order_by("-created_at", "-pk")[:10])
    return Response({
        "target_id": target.pk,
        "latest": serialize_evaluation(records[0]) if records else None,
        "results": [serialize_evaluation(item) for item in records],
    })


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def approve_evidence_rule(request, rule_id):
    from django.utils import timezone
    if not _in_group(request, "competent_person"):
        return Response({"detail": "Competent person permission required."}, status=status.HTTP_403_FORBIDDEN)
    with transaction.atomic():
        rule = get_object_or_404(EvidenceFactorRule.objects.select_for_update(), pk=rule_id)
        if rule.is_demonstration or rule.connection.is_demo:
            return Response({"detail": "Synthetic/demo rules cannot be approved."}, status=status.HTTP_409_CONFLICT)
        if rule.approved_by_id:
            return Response({"detail": "Rule has already been approved; create a new version to change it."}, status=status.HTTP_409_CONFLICT)
        try:
            rule.full_clean()
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        rule.approved_by = request.user
        rule.approved_at = timezone.now()
        rule.save(update_fields=["approved_by", "approved_at"])
        AuditEvent.objects.create(
            actor=request.user, action="evidence_rule_approved", entity_type="EvidenceFactorRule",
            entity_id=str(rule.pk), details={"target_id": rule.connection.target_id, "version": rule.version},
        )
    return Response({"id": rule.pk, "approved_at": rule.approved_at})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def approve_evidence_evaluation(request, target_id, evaluation_id):
    from django.utils import timezone
    if not _in_group(request, "competent_person"):
        return Response({"detail": "Competent person permission required."}, status=status.HTTP_403_FORBIDDEN)
    with transaction.atomic():
        evaluation = get_object_or_404(
            EvidenceEvaluation.objects.select_for_update(), pk=evaluation_id, target_id=target_id,
        )
        if evaluation.status != "pending":
            return Response({"detail": "Only complete, reviewed-source evaluations can be approved."}, status=status.HTTP_409_CONFLICT)
        if evaluation.created_by_id == request.user.pk:
            return Response({"detail": "The evaluator cannot approve their own run."}, status=status.HTTP_403_FORBIDDEN)
        if not verify_evaluation_unchanged(evaluation):
            return Response({"detail": "Evaluation input/rule integrity check failed."}, status=status.HTTP_409_CONFLICT)
        if EvidenceEvaluation.objects.filter(target_id=target_id).order_by("-created_at", "-pk").first().pk != evaluation.pk:
            return Response({"detail": "Only the latest evaluation can be approved."}, status=status.HTTP_409_CONFLICT)
        evaluation.status = "approved"
        evaluation.approved_by = request.user
        evaluation.approved_at = timezone.now()
        evaluation.save(update_fields=["status", "approved_by", "approved_at"])
        AuditEvent.objects.create(
            actor=request.user, action="evidence_evaluation_approved", entity_type="EvidenceEvaluation",
            entity_id=str(evaluation.pk),
            details={"target_id": target_id, "content_sha256": evaluation.content_sha256},
        )
    return Response(serialize_evaluation(evaluation))
