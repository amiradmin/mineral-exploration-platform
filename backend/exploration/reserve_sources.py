"""Read-only source provenance and input completeness for Gate 2.

A recorded source or uploaded JSON is not proof of vendor integration,
statistical validation, a classified Mineral Resource or an Ore Reserve.
"""
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CommitteeMembership, SourceConnection, Target

SOURCE_CATALOG = (
    ("leapfrog", "Leapfrog Edge", "Geostatistics", (
        "variogram_ranges", "kriging_variance", "search_ellipsoid", "block_grades",
    )),
    ("micromine", "Micromine Origin", "Geostatistics", (
        "variogram_ranges", "kriging_variance", "search_ellipsoid", "block_grades",
    )),
    ("surpac", "GEOVIA Surpac", "Block model", (
        "cell_dimensions", "lithology_codes", "bulk_density",
    )),
    ("geobank", "Micromine Geobank", "Core logging", (
        "core_recovery", "rqd", "downhole_surveys",
    )),
)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def reserve_source_readiness(request, target_id):
    target = get_object_or_404(Target, pk=target_id)
    is_member = CommitteeMembership.objects.filter(
        target=target, user=request.user, active=True,
    ).exists()
    if not is_member and not request.user.is_superuser:
        return Response({"detail": "Active membership for this target is required."}, status=403)

    connections = {
        item.software_key: item for item in SourceConnection.objects.filter(
            target=target, software_key__in=[row[0] for row in SOURCE_CATALOG],
        )
    }
    sources = []
    for key, name, domain, expected in SOURCE_CATALOG:
        connection = connections.get(key)
        snapshot = connection.snapshots.order_by("-received_at", "-pk").first() if connection else None
        values = snapshot.values if snapshot and isinstance(snapshot.values, dict) else {}
        available = [field for field in expected if field in values and values[field] is not None]
        missing = [field for field in expected if field not in available]
        sources.append({
            "key": key,
            "name": name,
            "domain": domain,
            "status": connection.status if connection else "not_configured",
            "is_demo": connection.is_demo if connection else False,
            "protocol": connection.protocol if connection else None,
            "format": connection.data_format if connection else None,
            "snapshot": {
                "id": snapshot.pk,
                "dataset": snapshot.dataset,
                "observed_at": snapshot.observed_at,
                "received_at": snapshot.received_at,
            } if snapshot else None,
            "present_fields": available,
            "missing_fields": missing,
            "input_completeness": bool(snapshot and not missing),
        })
    has_geo = any(s["input_completeness"] and not s["is_demo"] for s in sources[:2])
    has_blocks = sources[2]["input_completeness"] and not sources[2]["is_demo"]
    has_logging = sources[3]["input_completeness"] and not sources[3]["is_demo"]
    return Response({
        "target_id": target.pk,
        "sources": sources,
        "input_completeness": {
            "geostatistics": has_geo, "block_model": has_blocks, "core_logging": has_logging,
        },
        "all_inputs_present": bool(has_geo and has_blocks and has_logging),
        "validated_resource_estimate": False,
        "validated_ore_reserve": False,
        "note": "Field presence is a preliminary completeness check, not data QA/QC, statistical calibration, vendor connectivity verification, resource classification or reserve sign-off.",
    })
