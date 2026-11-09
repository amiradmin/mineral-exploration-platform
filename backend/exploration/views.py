from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .audit import AuditedModelViewSetMixin
from .governance import GateApproverPermission, ReadPublicWriteRestricted, fid_blockers
from .models import AuditEvent, AssayBatch, Drillhole, Element, EvidenceFactor, GateDecision, OperationProgram, QAQCIssue, Target, WorkTask
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
