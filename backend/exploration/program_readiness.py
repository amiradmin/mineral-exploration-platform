"""Program evidence attestation: recorded draft, role-separated QAQC/CP review."""
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import EvidenceReadiness, OperationProgram, AuditEvent

def can_steward(user):
    return user.is_superuser or user.groups.filter(name="data_steward").exists()
def can_cp(user):
    return user.is_superuser or user.groups.filter(name="competent_person").exists()
def can_qaqc(user):
    return user.is_superuser or user.groups.filter(name="qaqc_reviewer").exists()

def snapshot(record):
    return {"exists":bool(record),"data_status":record.data_status if record else "unverified",
        "detailed_exploration":record.detailed_exploration if record else False,
        "qaqc_approved":record.qaqc_approved if record else False,
        "competent_person_approved":record.competent_person_approved if record else False,
        "updated_at":record.updated_at if record else None}

@api_view(["GET","POST"])
@permission_classes([IsAuthenticated])
def program_evidence_readiness(request,program_id):
    program=get_object_or_404(OperationProgram,pk=program_id)
    record=EvidenceReadiness.objects.filter(program=program).first()
    if request.method=="GET":
        return Response(snapshot(record))
    action=request.data.get("action")
    rationale=request.data.get("rationale")
    if action not in ("submit","qaqc_approve","cp_approve","reset") or not isinstance(rationale,str) or len(rationale.strip())<12:
        return Response({"detail":"Valid action and rationale (at least 12 characters) required."},status=400)
    if action in ("submit","reset") and not can_steward(request.user):
        return Response({"detail":"Data steward permission required."},status=403)
    if action=="qaqc_approve" and not can_qaqc(request.user):
        return Response({"detail":"QA/QC reviewer permission required."},status=403)
    if action=="cp_approve" and not can_cp(request.user):
        return Response({"detail":"Competent person permission required."},status=403)
    with transaction.atomic():
        record,_=EvidenceReadiness.objects.select_for_update().get_or_create(program=program)
        if action=="submit":
            if not isinstance(request.data.get("detailed_exploration"),bool):
                return Response({"detail":"detailed_exploration must be a boolean."},status=400)
            record.detailed_exploration=request.data["detailed_exploration"]
            record.data_status="unverified"
            record.qaqc_approved=False
            record.competent_person_approved=False
        elif action=="reset":
            record.data_status="unverified"
            record.qaqc_approved=False
            record.competent_person_approved=False
        elif action=="qaqc_approve":
            if not record.detailed_exploration:
                return Response({"detail":"Detailed exploration attestation must be submitted first."},status=409)
            record.qaqc_approved=True
        else:
            if not record.detailed_exploration or not record.qaqc_approved:
                return Response({"detail":"Detailed exploration and QA/QC approvals required."},status=409)
            record.competent_person_approved=True
            record.data_status="verified"
        record.save()
        AuditEvent.objects.create(actor=request.user,action="program_evidence_"+action,
           entity_type="EvidenceReadiness",entity_id=str(program.pk),
           details={"program_id":program.pk,"rationale":rationale.strip(),"state":{**snapshot(record),"updated_at":record.updated_at.isoformat()}})
    return Response(snapshot(record))
