"""Conservative contract text screening: clause evidence, no autonomous legal conclusions."""
import hashlib
import io
import re
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Target, LegalContract, AuditEvent, CommitteeMembership
from .financial_sources import current_sources

MAX_BYTES = 2_000_000
MAX_TEXT = 80_000
RULES = (
    ("minimum_tonnage", "Minimum mining / take-or-pay obligation", "high",
        (r"take[ -]?or[ -]?pay", r"minimum.{0,35}(?:tonnage|extraction|production|ore|tonnes?)",r"حداقل.{0,35}(?:تناژ|استخراج|تولید)",r"تعهد.{0,30}برداشت")),
    ("unilateral_termination", "Unilateral termination / cancellation", "high",
        (r"unilateral.{0,35}terminat",r"terminat.{0,35}(?:without cause|at sole discretion)",r"فسخ.{0,25}(?:یک.طرفه|بدون دلیل)",r"حق فسخ")),
    ("unrecovered_capex", "Unrecovered / unamortized capital compensation", "high",
        (r"unamortiz",r"unrecover.{0,20}(?:capex|capital|investment)",r"جبران.{0,30}(?:سرمایه|هزینه)",r"مستهلک.نشده")),
    ("fx_exposure", "Foreign exchange / currency adjustment", "medium",
        (r"exchange rate",r"currency fluctuat",r"نرخ.{0,12}تسعیر",r"نوسان.{0,12}ارز")),
    ("stripping_delay", "Stripping / overburden delay penalties", "medium",
        (r"stripping.{0,45}(?:penalt|delay|liquidated damages)",r"overburden.{0,40}(?:delay|penalt)",r"باطله.برداری.{0,45}(?:تاخیر|جریمه)",r"جریمه.{0,45}باطله")),
    ("royalty", "Royalty / owner share / production split", "medium",
        (r"royalt",r"owner.{0,25}(?:share|portion)",r"حق.الامتیاز",r"سهم.{0,15}مالک",r"تسهیم")),
)
FRIENDLY = {key:{"title":name,"severity":severity} for key,name,severity,_ in RULES}

def permitted(user, target, write=False, reviewer=False):
    if not user.is_authenticated or not user.is_active:
        return False
    if user.is_superuser: return True
    accepted=("cp","chair") if reviewer else (("expert","cp","chair","board") if write else ("expert","cp","chair","board","auditor"))
    return CommitteeMembership.objects.filter(target=target,user=user,active=True,role__in=accepted).exists()

def extract_text(content, filename):
    name=filename.lower()
    if name.endswith(".txt"):
        return content.decode("utf-8-sig")
    if name.endswith(".pdf"):
        if not content.startswith(b"%PDF-"):
            raise ValueError("Not a PDF file.")
        try:
            from pypdf import PdfReader
            reader=PdfReader(io.BytesIO(content),strict=True)
            if reader.is_encrypted:
                raise ValueError("Encrypted PDFs are not supported.")
            if not 1<=len(reader.pages)<=25:
                raise ValueError("PDF page count must be 1–25.")
            parts=[]
            for page in reader.pages:
                parts.append(page.extract_text() or "")
                if sum(len(x) for x in parts)>MAX_TEXT:
                    raise ValueError("Contract text exceeds the 80,000-character limit.")
            return "\n".join(parts)
        except ValueError: raise
        except Exception as exc:
            raise ValueError("PDF text extraction failed. Use a searchable PDF.") from exc
    raise ValueError("Only .txt and searchable .pdf documents are accepted.")

def screen_text(text, capacity=None):
    # Paragraph excerpts are review aids, never proof of contract interpretation.
    chunks=[x.strip() for x in re.split(r"(?:\n\s*\n|\n|(?<=[.;؛])\s+)",text) if x.strip()]
    checked=[]
    findings=[]
    for key,title,severity,patterns in RULES:
        matches=[]
        for index,chunk in enumerate(chunks):
            if any(re.search(p,chunk,flags=re.I|re.S) for p in patterns):
                matches.append({"paragraph":index+1,"excerpt":chunk[:300]})
                if len(matches)==3: break
        checked.append({"key":key,"title":title,"found":bool(matches)})
        if matches:
            findings.append({"code":key,"severity":severity,"title":title,"status":"review_required",
                             "evidence":matches,"message":"Potential contractual exposure; requires legal counsel review."})
    rule_keys={row["code"] for row in findings}
    if "minimum_tonnage" in rule_keys:
        tonnes=[]
        for match in re.finditer(r"(?:minimum|حداقل|take[ -]?or[ -]?pay).{0,75}?(\d[\d,]*)\s*(?:tonnes?|tons?|تن)",text,re.I|re.S):
            try: tonnes.append(int(match.group(1).replace(",","")))
            except ValueError: pass
        if tonnes:
            minimum=max(tonnes)
            if capacity is None:
                findings.append({"code":"minimum_tonnage_unverified_capacity","severity":"high",
                   "title":"Minimum take-or-pay vs production schedule","status":"evidence_missing",
                   "message":f"Detected potential minimum of {minimum:,} t. No reviewed MineTrust annual capacity is available; certified reserve evidence must also be checked."})
            else:
                low=min(capacity)
                findings.append({"code":"minimum_tonnage_capacity_check","severity":"high" if minimum>low else "medium",
                    "title":"Take-or-pay production capacity check","status":"review_required",
                    "message":f"Potential contract minimum {minimum:,} t; reviewed MineTrust minimum annual ore {low:,.0f} t. Contract unit and period, mineable reserves and legal exceptions still require confirmation."})
    if "unilateral_termination" in rule_keys and "unrecovered_capex" not in rule_keys:
        findings.append({"code":"termination_compensation_missing","severity":"high",
            "title":"Termination without detected unamortized CAPEX protection","status":"review_required",
            "message":"A termination clause was detected, but no capital-recovery provision was recognized. Absence of a match does not prove absence of protection."})
    for key in ("minimum_tonnage","unilateral_termination","unrecovered_capex","fx_exposure","stripping_delay","royalty"):
        if key not in rule_keys:
            findings.append({"code":"not_detected_"+key,"severity":"info","title":FRIENDLY[key]["title"],
                "status":"not_detected","message":"No matching text detected. This is not proof the contract lacks the provision."})
    return checked,findings

def public_record(obj,include_text=False):
    data={"id":obj.id,"target_id":obj.target_id,"filename":obj.filename,"sha256":obj.sha256,
        "status":obj.status,"findings":obj.findings,"clauses_checked":obj.clauses_checked,
        "created_at":obj.created_at,"created_by_id":obj.created_by_id,"reviewed_by_id":obj.reviewed_by_id}
    if include_text: data["extracted_text"]=obj.extracted_text
    return data

@api_view(["GET","POST"])
@permission_classes([IsAuthenticated])
def contract_registry(request,target_id):
    target=get_object_or_404(Target,pk=target_id)
    if not permitted(request.user,target,write=request.method=="POST"):
        return Response({"detail":"Active target-specific committee membership required."},status=403)
    if request.method=="GET":
        records=LegalContract.objects.filter(target=target)[:30]
        return Response({"records":[public_record(obj) for obj in records],
            "note":"Restricted confidential documents. Automated clause screening is not a legal opinion."})
    file=request.FILES.get("file")
    if not file or file.size<10 or file.size>MAX_BYTES:
        return Response({"detail":"Provide a TXT or searchable PDF up to 2 MB."},status=400)
    try:
        text=extract_text(file.read(),file.name)
        if len(text)>MAX_TEXT or len(text.strip())<30:
            return Response({"detail":"No usable contract text detected. OCR is not supported."},status=400)
    except (UnicodeError,ValueError) as exc:
        return Response({"detail":str(exc)},status=400)
    source=current_sources(target).get("minetrust")
    capacities=[r["ore_tonnes"] for r in source.rows] if source else None
    checked,findings=screen_text(text,capacity=capacities)
    with transaction.atomic():
        obj=LegalContract.objects.create(target=target,filename=file.name[:240],
            sha256=hashlib.sha256(file.read() if False else text.encode()).hexdigest(),
            extracted_text=text,findings=findings,clauses_checked=checked,created_by=request.user)
        AuditEvent.objects.create(actor=request.user,action="contract_uploaded",entity_type="LegalContract",
            entity_id=str(obj.id),details={"target_id":target_id,"sha256":obj.sha256,"finding_count":len(findings)})
    return Response(public_record(obj),status=201)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def contract_detail(request,target_id,contract_id):
    target=get_object_or_404(Target,pk=target_id)
    if not permitted(request.user,target): return Response({"detail":"Target-specific access required."},status=403)
    obj=get_object_or_404(LegalContract,id=contract_id,target=target)
    return Response(public_record(obj,include_text=True))

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def contract_review(request,target_id,contract_id):
    target=get_object_or_404(Target,pk=target_id)
    if not permitted(request.user,target,reviewer=True):
        return Response({"detail":"Competent person or chair membership required."},status=403)
    rationale=request.data.get("rationale")
    if not isinstance(rationale,str) or len(rationale.strip())<20:
        return Response({"detail":"Legal review rationale (minimum 20 characters) required."},status=400)
    with transaction.atomic():
        obj=get_object_or_404(LegalContract.objects.select_for_update(),id=contract_id,target=target)
        if obj.status=="reviewed":return Response({"detail":"Contract already reviewed."},status=409)
        obj.status="reviewed"
        obj.reviewed_by=request.user
        obj.reviewed_at=timezone.now()
        obj.save(update_fields=["status","reviewed_by","reviewed_at"])
        AuditEvent.objects.create(actor=request.user,action="contract_review",entity_type="LegalContract",
           entity_id=str(obj.id),details={"target_id":target_id,"rationale":rationale.strip(),
                                           "reviewer_role":"technical_review_not_legal_advice"})
    return Response(public_record(obj))
