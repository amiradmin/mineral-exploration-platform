"""Engineering result registry. Extracted metrics are never treated as live vendor integrations."""
import re, math
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import AuditEvent, EngineeringEvidence, OperationProgram, ProgramTarget, Target
from .data_scale import evaluate

METRICS = {
    "alastri":{"stripping_ratio":(0,100),"cutoff_grade_pct":(0,100),"overall_pit_slope_deg":(0,90),"ore_tonnes":(0,1e12),"waste_tonnes":(0,1e12)},
    "datamine":{"annual_ore_tonnes":(0,1e11),"annual_plant_feed_tonnes":(0,1e11),"mine_capacity_tpa":(0,1e11),"plant_capacity_tpa":(0,1e11),"lom_years":(0,1000)},
    "rocscience":{"static_fos":(0,20),"overall_slope_angle_deg":(0,90)},
}
REQUIRED = {"alastri":{"stripping_ratio","overall_pit_slope_deg"},"datamine":{"annual_ore_tonnes","annual_plant_feed_tonnes"},"rocscience":{"static_fos"}}
FORMATS = {"alastri":{"csv","dxf","xml","json","report"},"datamine":{"csv","xml","json","report"},"rocscience":{"csv","json","report"}}

def is_editor(user):
    return user.is_superuser or user.groups.filter(name="data_steward").exists()
def is_reviewer(user):
    return user.is_superuser or user.groups.filter(name="competent_person").exists()

def engineering_policy(target):
    rows=list(EngineeringEvidence.objects.filter(target=target).order_by("-created_at","-id"))
    items={}
    blockers=[]
    for source in METRICS:
        approved=next((x for x in rows if x.source==source and x.verified and x.reviewed_by_id),None)
        items[source]={"status":"verified" if approved else ("pending_review" if any(x.source==source for x in rows) else "missing"),"evidence_id":approved.pk if approved else None,"metrics":approved.metrics if approved else {}}
        if approved is None: blockers.append(source+"_verified_evidence_missing")
    return {"eligible":not blockers,"sources":items,"blockers":blockers}

class EvidencePayload(serializers.Serializer):
    source=serializers.ChoiceField(choices=list(METRICS))
    source_filename=serializers.CharField(max_length=240)
    source_format=serializers.ChoiceField(choices=["csv","dxf","xml","json","report"])
    source_sha256=serializers.RegexField(regex=r"^[0-9a-fA-F]{64}$")
    analysis_date=serializers.DateField()
    model_version=serializers.CharField(max_length=100)
    metrics=serializers.DictField(child=serializers.FloatField())
    def validate(self,data):
        source=data["source"]
        if data["source_format"] not in FORMATS[source]: raise serializers.ValidationError({"source_format":"Unsupported format for this extract."})
        metrics=data["metrics"]
        if not REQUIRED[source].issubset(metrics): raise serializers.ValidationError({"metrics":"Missing required metrics: "+", ".join(sorted(REQUIRED[source]-metrics.keys()))})
        if set(metrics)-set(METRICS[source]): raise serializers.ValidationError({"metrics":"Unsupported metric keys."})
        for key,val in metrics.items():
            lo,hi=METRICS[source][key]
            if not math.isfinite(val) or not lo<=val<=hi: raise serializers.ValidationError({"metrics":f"{key} outside allowed range"})
        if data["analysis_date"]>timezone.localdate(): raise serializers.ValidationError({"analysis_date":"Future analysis dates are not accepted."})
        return data

def serialize(row):
    return {"id":row.pk,"source":row.source,"source_filename":row.source_filename,"source_format":row.source_format,"source_sha256":row.source_sha256,"analysis_date":row.analysis_date,"model_version":row.model_version,"metrics":row.metrics,"verified":row.verified,"reviewed_by_id":row.reviewed_by_id,"created_at":row.created_at}

@api_view(["GET","POST"])
@permission_classes([IsAuthenticated])
def engineering_evidence(request,target_id):
    target=get_object_or_404(Target,pk=target_id)
    if request.method=="GET":
        records=EngineeringEvidence.objects.filter(target=target).order_by("-created_at")[:30]
        return Response({"target_id":target_id,"policy":engineering_policy(target),"records":[serialize(r) for r in records]})
    if not is_editor(request.user): return Response({"detail":"Data steward role required"},status=403)
    payload=EvidencePayload(data=request.data)
    payload.is_valid(raise_exception=True)
    with transaction.atomic():
        row=EngineeringEvidence.objects.create(target=target,**payload.validated_data)
        AuditEvent.objects.create(actor=request.user,action="engineering_evidence_submitted",entity_type="EngineeringEvidence",entity_id=str(row.pk),details={"target_id":target_id,"source":row.source,"hash":row.source_sha256})
    return Response(serialize(row),status=201)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def review_engineering_evidence(request,target_id,evidence_id):
    if not is_reviewer(request.user): return Response({"detail":"Competent person approval required"},status=403)
    row=get_object_or_404(EngineeringEvidence,pk=evidence_id,target_id=target_id)
    if row.verified: return Response({"detail":"Evidence already reviewed"},status=409)
    if request.data.get("decision") not in ("approve","reject") or not str(request.data.get("rationale","")).strip():
        return Response({"detail":"Decision (approve/reject) and rationale required"},status=400)
    with transaction.atomic():
        if request.data["decision"]=="approve":
            row.verified=True
            row.reviewed_by=request.user
            row.reviewed_at=timezone.now()
            row.save(update_fields=["verified","reviewed_by","reviewed_at"])
        AuditEvent.objects.create(actor=request.user,action="engineering_evidence_review",entity_type="EngineeringEvidence",entity_id=str(row.pk),details={"decision":request.data["decision"],"rationale":request.data["rationale"]})
    return Response(serialize(row))

@api_view(["GET","POST"])
@permission_classes([IsAuthenticated])
def program_targets(request,program_id):
    program=get_object_or_404(OperationProgram,pk=program_id)
    if request.method=="GET":
        return Response({"program_id":program_id,"target_ids":list(ProgramTarget.objects.filter(program=program).values_list("target_id",flat=True))})
    if not is_editor(request.user): return Response({"detail":"Data steward role required"},status=403)
    class Scope(serializers.Serializer):
        target_ids=serializers.ListField(child=serializers.CharField(max_length=16),allow_empty=False)
    payload=Scope(data=request.data);payload.is_valid(raise_exception=True)
    ids=payload.validated_data["target_ids"]
    if len(ids)!=len(set(ids)) or Target.objects.filter(pk__in=ids).count()!=len(ids):
        return Response({"detail":"Target IDs must be unique and exist"},status=400)
    with transaction.atomic():
        ProgramTarget.objects.filter(program=program).delete()
        ProgramTarget.objects.bulk_create([ProgramTarget(program=program,target_id=i) for i in ids])
        AuditEvent.objects.create(actor=request.user,action="program_target_scope_changed",entity_type="OperationProgram",entity_id=str(program.pk),details={"target_ids":ids})
    return Response({"program_id":program_id,"target_ids":ids})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def investment_readiness(request,program_id):
    program=get_object_or_404(OperationProgram,pk=program_id)
    from .governance import fid_blockers
    targets=Target.objects.filter(program_links__program=program).distinct()
    return Response({"program_id":program_id,"fid_allowed":not fid_blockers(program),"blockers":fid_blockers(program),"targets":[{"id":t.pk,"sample_support":evaluate(getattr(t,"data_scale",None)),"engineering":engineering_policy(t)} for t in targets]})
