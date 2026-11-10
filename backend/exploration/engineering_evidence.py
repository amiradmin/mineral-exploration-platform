"""Engineering result registry. Extracted metrics are never treated as live vendor integrations."""
import re, math, hashlib, csv, json, io
from xml.etree import ElementTree
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

@api_view(["GET","POST"])
@permission_classes([IsAuthenticated])
def budget_authorizations(request,program_id):
    from decimal import Decimal
    from .models import BudgetAuthorization
    from .governance import fid_blockers
    program=get_object_or_404(OperationProgram,pk=program_id)
    if request.method=="GET":
        return Response({"program_id":program_id,"fid_blockers":fid_blockers(program),"records":[{"id":r.pk,"category":r.category,"amount_usd":str(r.amount_usd),"created_at":r.created_at} for r in BudgetAuthorization.objects.filter(program=program)[:50]]})
    user=request.user
    if not (user.is_superuser or user.groups.filter(name="board_approver").exists()):
        return Response({"detail":"Board approver permission required"},status=403)
    class BudgetPayload(serializers.Serializer):
        category=serializers.ChoiceField(choices=["exploration","construction"])
        amount_usd=serializers.DecimalField(max_digits=18,decimal_places=2,min_value=Decimal("0.01"))
        rationale=serializers.CharField(min_length=12,max_length=4000)
    payload=BudgetPayload(data=request.data)
    payload.is_valid(raise_exception=True)
    blockers=fid_blockers(program) if payload.validated_data["category"]=="construction" else []
    if blockers: return Response({"detail":"Construction CAPEX authorization blocked by evidence gates","blockers":blockers},status=409)
    with transaction.atomic():
        record=BudgetAuthorization.objects.create(program=program,approver=user,**payload.validated_data)
        AuditEvent.objects.create(actor=user,action="budget_authorization",entity_type="BudgetAuthorization",entity_id=str(record.pk),details={"program_id":program.pk,"category":record.category,"amount_usd":str(record.amount_usd)})
    return Response({"id":record.pk,"category":record.category,"amount_usd":str(record.amount_usd)},status=201)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_engineering_export(request,target_id):
    """Import a *flat exported metric summary*, never interpret arbitrary mine geometry."""
    target=get_object_or_404(Target,pk=target_id)
    if not is_editor(request.user):
        return Response({"detail":"Data steward permission required"},status=403)
    source=request.data.get("source")
    uploaded=request.FILES.get("file")
    if source not in METRICS or uploaded is None:
        return Response({"detail":"Source and export file required"},status=400)
    if uploaded.size>2_000_000:
        return Response({"detail":"Maximum export size is 2 MB"},status=400)
    ext=uploaded.name.rsplit(".",1)[-1].lower() if "." in uploaded.name else ""
    if ext not in {"csv","json","xml"} or ext not in FORMATS[source]:
        return Response({"detail":"Upload a supported CSV, JSON or XML metric-summary file. DXF geometry is not imported."},status=400)
    content=uploaded.read()
    try:
        decoded=content.decode("utf-8-sig")
        if ext=="json":
            parsed=json.loads(decoded)
            if not isinstance(parsed,dict): raise ValueError("Expected a flat JSON object.")
        elif ext=="csv":
            reader=csv.DictReader(io.StringIO(decoded),strict=True)
            rows=list(reader)
            if len(rows)!=1 or not reader.fieldnames or len(set(reader.fieldnames))!=len(reader.fieldnames):
                raise ValueError("CSV must contain exactly one summary row with unique headers.")
            parsed=rows[0]
        else:
            if "<!DOCTYPE" in decoded.upper() or "<!ENTITY" in decoded.upper():
                raise ValueError("DTD and XML entities are forbidden.")
            root=ElementTree.fromstring(decoded)
            if len(list(root))>40 or any(len(list(child)) for child in root):
                raise ValueError("Expected a flat XML summary.")
            parsed={child.tag:child.text for child in root}
        allowed=set(METRICS[source])|{"analysis_date","model_version"}
        if set(parsed)-allowed:
            raise ValueError("Unknown export fields: "+", ".join(sorted(set(parsed)-allowed)))
        fields={"source":source,"source_filename":uploaded.name,"source_format":ext,
            "source_sha256":hashlib.sha256(content).hexdigest(),
            "analysis_date":parsed.get("analysis_date"),
            "model_version":parsed.get("model_version"),
            "metrics":{k:float(v) for k,v in parsed.items() if k in METRICS[source]}}
    except (UnicodeError,ValueError,TypeError,KeyError,ElementTree.ParseError,csv.Error,OverflowError) as exc:
        return Response({"detail":"Invalid metric-summary export: "+str(exc)[:240]},status=400)
    serializer=EvidencePayload(data=fields)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        row=EngineeringEvidence.objects.create(target=target,**serializer.validated_data)
        AuditEvent.objects.create(actor=request.user,action="engineering_export_imported",
            entity_type="EngineeringEvidence",entity_id=str(row.pk),
            details={"target_id":target_id,"source":source,"file_sha256":row.source_sha256,"filename":row.source_filename})
    return Response(serialize(row),status=201)
