"""Strictly scoped MineTrust LOM and ERP/EPC budget import, review and provenance."""
import csv
import hashlib
import io
import math
from datetime import date
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Target, FinancialSourceSnapshot, AuditEvent
from .engineering_evidence import is_editor, is_reviewer

COLUMNS = {
    "minetrust": ("year", "ore_tonnes", "grade_pct"),
    "erp_epc": ("year", "category", "amount_usd"),
}
OPTIONAL = {"minetrust": {"plant_feed_tonnes"}, "erp_epc": {"contract_reference"}}
ALLOWED_CATEGORIES = {"plant", "infrastructure", "fleet", "other"}
MAX_ROWS = 100

def parse_rows(source, raw):
    try:
        decoded = raw.decode("utf-8-sig")
        rows = list(csv.DictReader(io.StringIO(decoded), strict=True))
    except (UnicodeDecodeError, csv.Error) as exc:
        raise ValueError("Invalid UTF-8 CSV file") from exc
    fields = set(COLUMNS[source])
    if not rows or len(rows) > MAX_ROWS:
        raise ValueError("CSV must contain between 1 and 100 rows.")
    if set(rows[0]) != fields | (set(rows[0]) & OPTIONAL[source]):
        raise ValueError("Unexpected columns or missing required headers.")
    if any(set(row) != set(rows[0]) or None in row for row in rows):
        raise ValueError("All rows must match the header.")
    cleaned = []
    seen_years = set()
    for row in rows:
        try:
            year = int(row["year"])
            if not 0 <= year <= 50 or str(year) != row["year"].strip():
                raise ValueError("Year must be an integer between 0 and 50.")
            if source == "minetrust":
                if year < 1 or year in seen_years:
                    raise ValueError("MineTrust schedule years must be positive and unique.")
                seen_years.add(year)
                tonnes = float(row["ore_tonnes"])
                grade = float(row["grade_pct"])
                if not math.isfinite(tonnes) or not 0 <= tonnes <= 1e10 or not math.isfinite(grade) or not 0 <= grade <= 100:
                    raise ValueError("Invalid ore tonnage or grade.")
                record = {"year":year, "ore_tonnes":tonnes, "grade_pct":grade}
                if "plant_feed_tonnes" in row and row["plant_feed_tonnes"]:
                    feed = float(row["plant_feed_tonnes"])
                    if not math.isfinite(feed) or not 0 <= feed <= 1e10:
                        raise ValueError("Invalid plant feed.")
                    record["plant_feed_tonnes"] = feed
            else:
                amount = float(row["amount_usd"])
                if not math.isfinite(amount) or not 0 <= amount <= 1e12:
                    raise ValueError("Invalid contracted CAPEX amount.")
                category = str(row["category"]).strip().lower()
                if category not in ALLOWED_CATEGORIES:
                    raise ValueError("Unknown EPC CAPEX category.")
                record = {"year":year, "category":category,"amount_usd":amount}
                if row.get("contract_reference"):
                    record["contract_reference"] = str(row["contract_reference"])[:160]
            cleaned.append(record)
        except (TypeError, OverflowError, ValueError) as exc:
            raise ValueError(str(exc)) from exc
    return sorted(cleaned, key=lambda x:x["year"])

def serialized(record):
    return {"id":record.id,"source":record.source,"source_filename":record.source_filename,
            "source_sha256":record.source_sha256,"model_version":record.model_version,
            "rows":record.rows,"reviewed":record.reviewed_by_id is not None,
            "reviewed_by_id":record.reviewed_by_id,"created_at":record.created_at}

def current_sources(target):
    rows=list(FinancialSourceSnapshot.objects.filter(target=target).order_by("-created_at","-id"))
    result={}
    for source in COLUMNS:
        latest=next((r for r in rows if r.source==source), None)
        result[source] = latest if latest is not None and latest.reviewed_by_id else None
    return result

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def financial_sources(request,target_id):
    target=get_object_or_404(Target,pk=target_id)
    if request.method=="GET":
        recent=FinancialSourceSnapshot.objects.filter(target=target).order_by("-created_at")[:30]
        current=current_sources(target)
        return Response({"target_id":target_id,"sources":{key:{
            "status":"verified" if current[key] else "missing_or_pending",
            "snapshot_id":current[key].id if current[key] else None} for key in COLUMNS},
            "records":[serialized(r) for r in recent]})
    if not is_editor(request.user):
        return Response({"detail":"Data steward role required."},status=403)
    source=request.data.get("source")
    file=request.FILES.get("file")
    version=request.data.get("model_version")
    if source not in COLUMNS or file is None or not isinstance(version,str) or not 1 <= len(version.strip()) <= 100:
        return Response({"detail":"Source, CSV file and model_version are required."},status=400)
    if not file.name.lower().endswith(".csv") or file.size>2_000_000:
        return Response({"detail":"Only CSV files up to 2 MB are accepted."},status=400)
    raw=file.read()
    try:
        parsed=parse_rows(source,raw)
    except ValueError as exc:
        return Response({"detail":str(exc)[:200]},status=400)
    with transaction.atomic():
        record=FinancialSourceSnapshot.objects.create(target=target,source=source,
            source_filename=file.name[:240],source_sha256=hashlib.sha256(raw).hexdigest(),
            model_version=version.strip(),rows=parsed)
        AuditEvent.objects.create(actor=request.user,action="financial_source_import",
            entity_type="FinancialSourceSnapshot",entity_id=str(record.id),
            details={"target_id":target.id,"source":source,"sha256":record.source_sha256})
    return Response(serialized(record),status=201)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def review_financial_source(request,target_id,snapshot_id):
    if not is_reviewer(request.user):
        return Response({"detail":"Competent person role required."},status=403)
    decision=request.data.get("decision")
    rationale=request.data.get("rationale")
    if decision not in ("approve","reject") or not isinstance(rationale,str) or len(rationale.strip())<12:
        return Response({"detail":"Decision and rationale (minimum 12 characters) required."},status=400)
    with transaction.atomic():
        record=get_object_or_404(FinancialSourceSnapshot.objects.select_for_update(),id=snapshot_id,target_id=target_id)
        if record.reviewed_by_id:
            return Response({"detail":"Already reviewed."},status=409)
        if decision=="approve":
            record.reviewed_by=request.user
            record.reviewed_at=timezone.now()
            record.save(update_fields=["reviewed_by","reviewed_at"])
        AuditEvent.objects.create(actor=request.user,action="financial_source_review",
            entity_type="FinancialSourceSnapshot",entity_id=str(record.id),
            details={"target_id":target_id,"decision":decision,"rationale":rationale.strip()})
    return Response(serialized(record))
