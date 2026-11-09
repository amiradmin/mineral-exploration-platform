"""Target-scoped technical committee workflow.

No API endpoint accepts arbitrary target access through global staff or group membership.
All writes require active project membership, and demo evidence cannot be approved.
Authenticated session sign-off is an audit attestation, not a PKI digital signature.
"""
import hashlib
import math
import re

from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
    AuditEvent, CommitteeMembership, CommitteeGateDecision, EvidenceEvaluation,
    ExecutiveCommitteeMemo, ExpertOverride, StrategicProjectFlag, Target,
)


def roles(request, target):
    if not request.user.is_authenticated:
        return set()
    return set(CommitteeMembership.objects.filter(
        target=target, user=request.user, active=True,
    ).values_list("role", flat=True))


def require_role(request, target, allowed):
    available = roles(request, target)
    if not available.intersection(allowed):
        return Response({"detail": "Active target-specific committee membership required."}, status=403)
    return None


def event(request, action, model, obj, target, details=None):
    AuditEvent.objects.create(
        actor=request.user, action=action, entity_type=model,
        entity_id=str(obj.pk), details={"target_id": target.pk, **(details or {})},
    )


def current_evaluation(target):
    return EvidenceEvaluation.objects.filter(target=target).order_by("-created_at", "-pk").first()


def clean_reference(value):
    return isinstance(value, str) and 3 <= len(value.strip()) <= 240 and not any(c in value for c in "\n\r")


def clean_explanation(value):
    return isinstance(value, str) and 20 <= len(value.strip()) <= 12000


def evaluation_matches(evaluation, target):
    return evaluation is not None and evaluation.target_id == target.pk


def override_json(obj):
    return {
        "id": obj.pk, "evaluation_id": obj.evaluation_id, "factor": obj.factor,
        "base_score": obj.base_score, "delta_points": obj.delta_points,
        "adjusted_score": obj.adjusted_score, "justification": obj.justification,
        "evidence_reference": obj.evidence_reference, "evidence_sha256": obj.evidence_sha256,
        "status": obj.status, "proposed_by": obj.proposed_by_id,
        "proposed_at": obj.proposed_at, "reviewed_by": obj.reviewed_by_id,
        "reviewed_at": obj.reviewed_at, "review_note": obj.review_note,
    }


def flag_json(obj):
    return {
        "id": obj.pk, "kind": obj.kind, "title": obj.title, "rationale": obj.rationale,
        "evidence_reference": obj.evidence_reference, "gate": obj.gate, "status": obj.status,
        "created_by": obj.created_by_id, "created_at": obj.created_at,
        "resolved_by": obj.resolved_by_id, "resolved_at": obj.resolved_at,
        "resolution_note": obj.resolution_note,
    }


def memo_json(obj):
    return {
        "id": obj.pk, "gate": obj.gate, "version": obj.version,
        "evaluation_id": obj.evaluation_id, "body": obj.body,
        "body_sha256": obj.body_sha256, "created_by": obj.created_by_id,
        "created_at": obj.created_at, "signed_by": obj.signed_by_id,
        "signed_at": obj.signed_at, "signing_attestation": obj.signing_attestation,
        "signature_type": "authenticated_attestation_only" if obj.signed_at else None,
    }


def blockers(target, gate, evaluation, memo):
    problems = []
    if evaluation is None or evaluation.status != "approved":
        problems.append("approved_evaluation_required")
    if memo is None or memo.signed_at is None or memo.evaluation_id != (evaluation.pk if evaluation else None):
        problems.append("signed_current_evaluation_memo_required")
    if StrategicProjectFlag.objects.filter(
        target=target, gate=gate, kind__in=["fatal_flaw", "prerequisite"], status="open",
    ).exists():
        problems.append("unresolved_strategic_blockers")
    if ExpertOverride.objects.filter(target=target, evaluation=evaluation, status="proposed").exists():
        problems.append("pending_expert_overrides")
    return problems


@api_view(["GET"])
@permission_classes([AllowAny])
def committee_overview(request, target_id):
    target = get_object_or_404(Target, pk=target_id)
    member_roles = roles(request, target)
    if not member_roles:
        return Response({"detail": "Committee access requires a project membership."}, status=403)
    latest = current_evaluation(target)
    overrides = list(ExpertOverride.objects.filter(target=target).order_by("-proposed_at", "-pk")[:30])
    flags = list(StrategicProjectFlag.objects.filter(target=target).order_by("-created_at", "-pk")[:40])
    memos = list(ExecutiveCommitteeMemo.objects.filter(target=target).order_by("-created_at", "-pk")[:15])
    decisions = list(CommitteeGateDecision.objects.filter(target=target).order_by("-created_at", "-pk")[:15])
    gate = 1
    gate_memo = next((m for m in memos if m.gate == gate), None)
    return Response({
        "target_id": target.pk, "roles": sorted(member_roles),
        "latest_evaluation": {"id": latest.pk, "status": latest.status, "outputs": latest.outputs} if latest else None,
        "overrides": [override_json(x) for x in overrides],
        "flags": [flag_json(x) for x in flags],
        "memos": [memo_json(x) for x in memos],
        "decisions": [{
            "id": x.pk, "gate": x.gate, "outcome": x.outcome,
            "rationale": x.rationale, "evaluation_id": x.evaluation_id,
            "memo_id": x.memo_id, "decided_by": x.decided_by_id,
            "created_at": x.created_at,
        } for x in decisions],
        "gate_1_blockers": blockers(target, gate, latest, gate_memo),
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def propose_override(request, target_id):
    target = get_object_or_404(Target, pk=target_id)
    denied = require_role(request, target, {"expert", "cp", "chair"})
    if denied:
        return denied
    data = request.data
    evaluation = current_evaluation(target)
    if not evaluation:
        return Response({"detail": "A recorded evidence evaluation is required."}, status=409)
    factor = data.get("factor")
    base = evaluation.outputs.get(factor) if isinstance(factor, str) else None
    try:
        delta = float(data.get("delta_points"))
    except (TypeError, ValueError, OverflowError):
        delta = float("nan")
    if factor not in dict(ExpertOverride._meta.get_field("factor").choices) or not isinstance(base, (int, float)):
        return Response({"detail": "Factor requires a computed baseline in the latest evaluation."}, status=400)
    if not math.isfinite(delta) or abs(delta) > 100 or not 0 <= base + delta <= 100:
        return Response({"detail": "Delta must be finite percentage points, adjusted score within 0-100."}, status=400)
    if not clean_explanation(data.get("justification")) or not clean_reference(data.get("evidence_reference")):
        return Response({"detail": "Documented justification (20+ characters) and evidence reference are required."}, status=400)
    sha = data.get("evidence_sha256")
    if not isinstance(sha, str) or not re.fullmatch(r"[0-9a-fA-F]{64}", sha):
        return Response({"detail": "A 64-character SHA-256 of the referenced document is required."}, status=400)
    with transaction.atomic():
        obj = ExpertOverride.objects.create(
            target=target, evaluation=evaluation, factor=factor, base_score=base,
            delta_points=delta, adjusted_score=round(base+delta, 6),
            justification=data["justification"].strip(),
            evidence_reference=data["evidence_reference"].strip(),
            evidence_sha256=sha.lower(), proposed_by=request.user,
        )
        event(request, "expert_override_proposed", "ExpertOverride", obj, target,
              {"evaluation_id": evaluation.pk, "delta_points": delta})
    return Response(override_json(obj), status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def review_override(request, target_id, override_id):
    target = get_object_or_404(Target, pk=target_id)
    denied = require_role(request, target, {"cp", "chair"})
    if denied:
        return denied
    decision = request.data.get("decision")
    note = request.data.get("note")
    if decision not in ("approved", "rejected") or not clean_explanation(note):
        return Response({"detail": "Decision approved/rejected and review note (20+ chars) are required."}, status=400)
    with transaction.atomic():
        obj = get_object_or_404(ExpertOverride.objects.select_for_update(), pk=override_id, target=target)
        if obj.status != "proposed":
            return Response({"detail": "Override has already been reviewed."}, status=409)
        if obj.proposed_by_id == request.user.pk:
            return Response({"detail": "Independent reviewer required."}, status=403)
        if decision == "approved":
            if obj.evaluation.status != "approved" or current_evaluation(target).pk != obj.evaluation_id:
                return Response({"detail": "Only current, approved, non-demo evaluations may receive approved overrides."}, status=409)
            if abs(obj.evaluation.outputs.get(obj.factor, float("nan"))-obj.base_score) > 1e-6:
                return Response({"detail": "Baseline no longer matches evaluation."}, status=409)
        obj.status = decision
        obj.reviewed_by = request.user
        obj.reviewed_at = timezone.now()
        obj.review_note = note.strip()
        obj.save(update_fields=["status", "reviewed_by", "reviewed_at", "review_note"])
        event(request, "expert_override_"+decision, "ExpertOverride", obj, target)
    return Response(override_json(obj))


@api_view(["POST"])
@permission_classes([AllowAny])
def create_flag(request, target_id):
    target = get_object_or_404(Target, pk=target_id)
    denied = require_role(request, target, {"expert", "cp", "chair"})
    if denied:
        return denied
    data = request.data
    try:
        gate = int(data.get("gate", 1))
    except (ValueError, TypeError):
        gate = -1
    if data.get("kind") not in dict(StrategicProjectFlag.KINDS) or gate not in (1,2,3,4):
        return Response({"detail": "Flag kind and gate 1-4 are required."}, status=400)
    if not isinstance(data.get("title"), str) or not 5 <= len(data["title"].strip()) <= 180 or not clean_explanation(data.get("rationale")) or not clean_reference(data.get("evidence_reference")):
        return Response({"detail": "Title, rationale (20+ characters) and evidence reference are required."}, status=400)
    with transaction.atomic():
        obj = StrategicProjectFlag.objects.create(
            target=target, gate=gate, kind=data["kind"],
            title=data["title"].strip(), rationale=data["rationale"].strip(),
            evidence_reference=data["evidence_reference"].strip(), created_by=request.user,
        )
        event(request, "committee_flag_created", "StrategicProjectFlag", obj, target, {"kind": obj.kind})
    return Response(flag_json(obj), status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def resolve_flag(request, target_id, flag_id):
    target = get_object_or_404(Target, pk=target_id)
    denied = require_role(request, target, {"cp", "chair"})
    if denied:
        return denied
    if not clean_explanation(request.data.get("note")):
        return Response({"detail": "Resolution evidence and reason (20+ characters) required."}, status=400)
    with transaction.atomic():
        obj = get_object_or_404(StrategicProjectFlag.objects.select_for_update(), pk=flag_id, target=target)
        if obj.status != "open":
            return Response({"detail": "Flag already closed."}, status=409)
        if obj.created_by_id == request.user.pk:
            return Response({"detail": "Independent reviewer required."}, status=403)
        obj.status = "resolved"
        obj.resolved_by = request.user
        obj.resolved_at = timezone.now()
        obj.resolution_note = request.data["note"].strip()
        obj.save(update_fields=["status", "resolved_by", "resolved_at", "resolution_note"])
        event(request, "committee_flag_resolved", "StrategicProjectFlag", obj, target)
    return Response(flag_json(obj))


@api_view(["POST"])
@permission_classes([AllowAny])
def create_memo(request, target_id):
    target = get_object_or_404(Target, pk=target_id)
    denied = require_role(request, target, {"expert", "cp", "chair"})
    if denied:
        return denied
    body = request.data.get("body")
    try:
        gate = int(request.data.get("gate", 1))
    except (TypeError, ValueError):
        gate = -1
    if gate not in (1,2,3,4) or not isinstance(body, str) or not 60 <= len(body.strip()) <= 20000:
        return Response({"detail": "Memo body (60+ characters) and gate 1-4 are required."}, status=400)
    with transaction.atomic():
        # Lock target row so a memo version cannot race a concurrent request.
        target = Target.objects.select_for_update().get(pk=target.pk)
        evaluation = current_evaluation(target)
        if evaluation is None:
            return Response({"detail": "A recorded evidence evaluation is required."}, status=409)
        version = (ExecutiveCommitteeMemo.objects.filter(target=target, gate=gate).aggregate(v=Max("version"))["v"] or 0)+1
        normalized = body.strip()
        obj = ExecutiveCommitteeMemo.objects.create(
            target=target, evaluation=evaluation, gate=gate, version=version,
            body=normalized, body_sha256=hashlib.sha256(normalized.encode("utf-8")).hexdigest(),
            created_by=request.user,
        )
        event(request, "committee_memo_created", "ExecutiveCommitteeMemo", obj, target,
              {"version": version, "evaluation_id": evaluation.pk})
    return Response(memo_json(obj), status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def sign_memo(request, target_id, memo_id):
    target = get_object_or_404(Target, pk=target_id)
    denied = require_role(request, target, {"chair"})
    if denied:
        return denied
    attestation = request.data.get("attestation")
    if not isinstance(attestation, str) or not 20 <= len(attestation.strip()) <= 240:
        return Response({"detail": "Explicit signed-review attestation (20+ chars) required."}, status=400)
    with transaction.atomic():
        obj = get_object_or_404(ExecutiveCommitteeMemo.objects.select_for_update(), pk=memo_id, target=target)
        if obj.signed_at is not None:
            return Response({"detail": "Memo already signed."}, status=409)
        if obj.created_by_id == request.user.pk:
            return Response({"detail": "Independent chair approval required."}, status=403)
        if obj.evaluation.status != "approved" or current_evaluation(target).pk != obj.evaluation_id:
            return Response({"detail": "Only a memo linked to the current approved evidence evaluation can be signed."}, status=409)
        if hashlib.sha256(obj.body.encode("utf-8")).hexdigest() != obj.body_sha256:
            return Response({"detail": "Memo integrity check failed."}, status=409)
        if ExecutiveCommitteeMemo.objects.filter(target=target, gate=obj.gate, version__gt=obj.version).exists():
            return Response({"detail": "A newer memo version exists."}, status=409)
        obj.signed_by = request.user
        obj.signed_at = timezone.now()
        obj.signing_attestation = attestation.strip()
        obj.save(update_fields=["signed_by", "signed_at", "signing_attestation"])
        event(request, "committee_memo_signed", "ExecutiveCommitteeMemo", obj, target,
              {"version": obj.version, "body_sha256": obj.body_sha256,
               "signature_type": "authenticated_attestation_only"})
    return Response(memo_json(obj))


@api_view(["POST"])
@permission_classes([AllowAny])
def committee_gate_decision(request, target_id):
    target = get_object_or_404(Target, pk=target_id)
    denied = require_role(request, target, {"board"})
    if denied:
        return denied
    data = request.data
    try:
        gate = int(data.get("gate", 1))
    except (TypeError, ValueError):
        gate = -1
    outcome = data.get("outcome")
    rationale = data.get("rationale")
    if gate not in (1,2,3,4) or outcome not in ("GO","HOLD","REVIEW") or not clean_explanation(rationale):
        return Response({"detail": "Gate, outcome and documented rationale required."}, status=400)
    with transaction.atomic():
        target = Target.objects.select_for_update().get(pk=target.pk)
        evaluation = current_evaluation(target)
        memo = ExecutiveCommitteeMemo.objects.filter(target=target, gate=gate).order_by("-version").first()
        problems = blockers(target, gate, evaluation, memo) if outcome == "GO" else []
        if problems:
            return Response({"detail": "Committee gate prerequisites blocked.", "blockers": problems}, status=409)
        if evaluation is None or memo is None:
            return Response({"detail": "Evaluation and committee memo must exist for a recorded board decision."}, status=409)
        obj = CommitteeGateDecision.objects.create(
            target=target, gate=gate, outcome=outcome, rationale=rationale.strip(),
            evaluation=evaluation, memo=memo, decided_by=request.user,
        )
        event(request, "committee_gate_decision", "CommitteeGateDecision", obj, target,
              {"outcome": outcome, "gate": gate, "memo_id": memo.pk, "evaluation_id": evaluation.pk})
    return Response({"id": obj.pk, "gate": gate, "outcome": outcome, "memo_id": memo.pk}, status=201)
