"""Risk source registry and deterministic seeded stress engine (not live vendor APIs)."""
import csv
import hashlib
import io
import math
import random
from statistics import stdev
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Target, RiskSourceSnapshot, AuditEvent
from .engineering_evidence import is_editor, is_reviewer

FIELDS = {
    "geotech": {"scenario","static_fos","seismic_fos","seepage_index"},
    "pitram": {"period","downtime_hours","scheduled_hours","mtbf_hours","mttr_hours","haul_efficiency_pct"},
    "market": {"period","commodity","price_usd_per_t"},
}
MAX_ROWS = 2000

def parse_risk_csv(source, data):
    try:
        reader = csv.DictReader(io.StringIO(data.decode("utf-8-sig")), strict=True)
        rows=list(reader)
    except (UnicodeError,csv.Error) as exc:
        raise ValueError("Invalid UTF-8 CSV export") from exc
    if not rows or len(rows)>MAX_ROWS or set(reader.fieldnames or [])!=FIELDS[source] or len(set(reader.fieldnames or []))!=len(reader.fieldnames or []):
        raise ValueError("Invalid headers or row count for "+source)
    result=[]
    for row in rows:
        if None in row or any(v is None for v in row.values()):
            raise ValueError("Malformed CSV row")
        if source=="geotech":
            name=row["scenario"].strip()[:100]
            if not name: raise ValueError("Scenario name required")
            item={"scenario":name}
            for key,maximum in (("static_fos",20),("seismic_fos",20),("seepage_index",100)):
                val=float(row[key])
                if not math.isfinite(val) or not 0<=val<=maximum: raise ValueError("Invalid "+key)
                item[key]=val
        elif source=="pitram":
            item={"period":row["period"].strip()[:40]}
            if not item["period"]: raise ValueError("Period required")
            for key,maximum in (("downtime_hours",1e7),("scheduled_hours",1e7),("mtbf_hours",1e7),("mttr_hours",1e7),("haul_efficiency_pct",100)):
                val=float(row[key])
                if not math.isfinite(val) or not 0<=val<=maximum: raise ValueError("Invalid "+key)
                item[key]=val
            if item["scheduled_hours"]<=0 or item["downtime_hours"]>item["scheduled_hours"]:
                raise ValueError("Downtime must not exceed scheduled hours")
        else:
            commodity=row["commodity"].strip().lower()
            if commodity not in ("copper","gold"):
                raise ValueError("Only copper or gold series supported")
            price=float(row["price_usd_per_t"])
            if not math.isfinite(price) or not 0<price<=1e9: raise ValueError("Invalid commodity price")
            item={"period":row["period"].strip()[:40],"commodity":commodity,"price_usd_per_t":price}
            if not item["period"]: raise ValueError("Period required")
        result.append(item)
    return result

def serialize(row):
    return {"id":row.id,"source":row.source,"source_filename":row.source_filename,
            "source_sha256":row.source_sha256,"model_version":row.model_version,
            "row_count":len(row.rows),"reviewed":bool(row.reviewed_by_id),
            "rows":row.rows,"created_at":row.created_at}

def selected_sources(target):
    data=list(RiskSourceSnapshot.objects.filter(target=target).order_by("-created_at","-id"))
    return {source:(lambda row: row if row and row.reviewed_by_id else None)(next((row for row in data if row.source==source),None)) for source in FIELDS}

@api_view(["GET","POST"])
@permission_classes([IsAuthenticated])
def risk_sources(request,target_id):
    target=get_object_or_404(Target,pk=target_id)
    if request.method=="GET":
        current=selected_sources(target)
        records=RiskSourceSnapshot.objects.filter(target=target).order_by("-created_at")[:30]
        return Response({"sources":{key:{"status":"reviewed" if item else "missing_or_pending","snapshot_id":item.id if item else None} for key,item in current.items()},"records":[serialize(r) for r in records]})
    if not is_editor(request.user): return Response({"detail":"Data steward permission required"},status=403)
    source=request.data.get("source")
    file=request.FILES.get("file")
    version=request.data.get("model_version")
    if source not in FIELDS or not file or not isinstance(version,str) or not version.strip() or len(version)>100:
        return Response({"detail":"Source, CSV and model version required"},status=400)
    if not file.name.lower().endswith(".csv") or file.size>2_000_000:
        return Response({"detail":"Only CSV exports up to 2 MB are accepted"},status=400)
    data=file.read()
    try:
        rows=parse_risk_csv(source,data)
    except (ValueError,TypeError,OverflowError) as exc:
        return Response({"detail":str(exc)[:240]},status=400)
    with transaction.atomic():
        snapshot=RiskSourceSnapshot.objects.create(target=target,source=source,source_filename=file.name[:240],
            source_sha256=hashlib.sha256(data).hexdigest(),model_version=version.strip(),rows=rows)
        AuditEvent.objects.create(actor=request.user,action="risk_source_uploaded",entity_type="RiskSourceSnapshot",
            entity_id=str(snapshot.id),details={"target_id":target.id,"source":source,"sha256":snapshot.source_sha256})
    return Response(serialize(snapshot),status=201)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def risk_source_review(request,target_id,snapshot_id):
    if not is_reviewer(request.user): return Response({"detail":"Competent person review required"},status=403)
    decision=request.data.get("decision")
    rationale=request.data.get("rationale")
    if decision not in ("approve","reject") or not isinstance(rationale,str) or len(rationale.strip())<12:
        return Response({"detail":"Decision and reason (12+ characters) required"},status=400)
    with transaction.atomic():
        row=get_object_or_404(RiskSourceSnapshot.objects.select_for_update(),id=snapshot_id,target_id=target_id)
        if row.reviewed_by_id: return Response({"detail":"Already reviewed"},status=409)
        if decision=="approve":
            row.reviewed_by=request.user
            row.reviewed_at=timezone.now()
            row.save(update_fields=["reviewed_by","reviewed_at"])
        AuditEvent.objects.create(actor=request.user,action="risk_source_review",entity_type="RiskSourceSnapshot",
            entity_id=str(row.id),details={"target_id":target_id,"decision":decision,"rationale":rationale.strip()})
    return Response(serialize(row))

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def risk_stress(request,target_id):
    """Reproducible risk envelope. Descriptive and simulated, not investment authorization."""
    target=get_object_or_404(Target,pk=target_id)
    current=selected_sources(target)
    if any(value is None for value in current.values()):
        return Response({"detail":"All three risk data sources must be reviewed first",
            "missing":[key for key,item in current.items() if item is None]},status=409)
    try:
        mine_life=int(request.data.get("mine_life",11))
        iterations=int(request.data.get("iterations",2000))
        annual_ore_million=float(request.data.get("annual_ore_million",4))
        unit_opex=float(request.data.get("unit_opex",52))
        if not 3<=mine_life<=30 or not 100<=iterations<=10000 or not 0<annual_ore_million<=100 or not 0<=unit_opex<=1e5:
            raise ValueError()
    except (TypeError,ValueError,OverflowError):
        return Response({"detail":"Invalid stress parameters"},status=400)
    geotech=current["geotech"].rows
    pitram=current["pitram"].rows
    market=current["market"].rows
    copper=[r["price_usd_per_t"] for r in market if r["commodity"]=="copper"]
    if len(copper)<4:
        return Response({"detail":"At least four historical copper observations are required"},status=409)
    volatility=stdev(copper)/sum(copper)*len(copper)
    if not math.isfinite(volatility):
        return Response({"detail":"Invalid historical price volatility"},status=400)
    volatility=min(volatility,2)
    downtime=sum(r["downtime_hours"] for r in pitram)/sum(r["scheduled_hours"] for r in pitram)
    average_efficiency=sum(r["haul_efficiency_pct"] for r in pitram)/len(pitram)/100
    geotech_low=min(r["seismic_fos"] for r in geotech)
    seepage_high=max(r["seepage_index"] for r in geotech)
    # Slope and seepage are advisory flags; absent site-specific limits, no fake FOS threshold.
    # Cost-stress range is a transparent engineering assumption, not an empirically calibrated distribution.
    opex_spread=min(0.75,downtime*1.5+(1-average_efficiency)*0.35)
    rng=random.Random(42042)
    outputs=[]
    for _ in range(iterations):
        price_factor=max(0,rng.gauss(1,volatility))
        opex_factor=max(.05,rng.gauss(1,opex_spread))
        outputs.append(annual_ore_million*(price_factor*100-opex_factor*unit_opex))
    outputs.sort()
    def q(p):return round(outputs[min(len(outputs)-1,int(p*(len(outputs)-1)))],2)
    return Response({"model":"seeded-normal-stress-v1","illustrative":True,"iterations":iterations,
        "inputs":{"market_coefficient_of_variation":round(volatility,4),"fleet_downtime_fraction":round(downtime,4),
                  "mean_haul_efficiency":round(average_efficiency,4),"assumed_opex_spread":round(opex_spread,4)},
        "geotech":{"minimum_seismic_fos":geotech_low,"maximum_seepage_index":seepage_high,
                   "note":"Site-specific acceptance criteria must be provided by a qualified geotechnical engineer."},
        "distribution":{"p05":q(.05),"p50":q(.50),"p95":q(.95),"units":"illustrative contribution proxy, $M"},
        "source_refs":{key:{"snapshot_id":row.id,"sha256":row.source_sha256} for key,row in current.items()},
        "warning":"Not a calibrated project cash-flow or true price-process forecast; validate commodity basis and stress model before investment reliance."})
