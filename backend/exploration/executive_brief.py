"""Read-only executive investment briefing; never derives approvals from demo economics."""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Target,CommitteeMembership,ProgramTarget,GateDecision,EvidenceReadiness,
    DataScaleProfile,EngineeringEvidence,FinancialSourceSnapshot,RiskSourceSnapshot,
    LegalContract,StrategicProjectFlag,ExecutiveCommitteeMemo,CommitteeGateDecision,
    CommercialScenarioRun
)
from .governance import fid_blockers
from .data_scale import evaluate as evaluate_data_scale

LABELS={
    "evidence_snapshot_missing":"Program evidence-readiness record has not been created",
    "evidence_unverified":"Program evidence attestation is not verified",
    "detailed_exploration_required":"Detailed exploration evidence has not been validated",
    "qaqc_approval_required":"QA/QC approval is missing",
    "competent_person_approval_required":"Competent Person sign-off is missing",
    "program_target_data_scale_link_missing":"Program is not associated with an exploration target",
    "data_scale_profile_missing":"Sampling and map-scale metadata are missing",
    "detailed_map_scale_required":"Detailed-scale geological maps are required",
    "verified_assay_support_required":"Validated assay and laboratory evidence is missing",
    "drilling_support_required":"Drillholes and drilling metreage are required",
    "drill_grid_missing":"Drillhole spacing evidence is missing",
    "core_quality_missing":"Core recovery or RQD is missing",
    "evidence_not_verified":"Geological data scale has not been independently verified",
    "alastri_verified_evidence_missing":"Reviewed pit design from Alastri is missing",
    "datamine_verified_evidence_missing":"Reviewed mining schedule from Datamine is missing",
    "rocscience_verified_evidence_missing":"Reviewed static slope assessment is missing",
    "legal_contract_pending_review":"Latest participation agreement is awaiting legal counsel review",
}
MODULES=[
    ("exploration-evaluator","Prospect screening","1"),
    ("reserve-simulator","Resource evidence","2"),
    ("economics-engine","Mine economics","3"),
    ("risk-scenarios","Risk stress","3–4"),
    ("financial-valuator","Investment valuation","4"),
    ("esg-governance","ESG governance","Continuous"),
]

def _latest_status(queryset,approved_field):
    latest=queryset.order_by("-created_at","-pk").first()
    if latest is None:return {"state":"missing","updated_at":None,"record_id":None}
    return {"state":"reviewed" if getattr(latest,approved_field) else "pending",
            "updated_at":latest.created_at,"record_id":latest.pk}

def _readable_blockers(codes):
    results=[]
    for code in codes:
        if ":" in code:
            target,base=code.split(":",1)
        else:
            target,base=None,code
        results.append({"code":code,"target_id":target,"message":LABELS.get(base,base.replace("_"," ").capitalize()),
                        "module":(
                            "legal-commercial" if "legal" in base else
                            "economics-engine" if base.startswith(("alastri","datamine","rocscience","program_target")) else
                            "reserve-simulator" if base.startswith(("data_scale","drill","core","verified_assay","detailed_map","evidence_not")) else
                            "financial-valuator")})
    return results

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def executive_brief(request,target_id):
    target=get_object_or_404(Target,pk=target_id)
    user=request.user
    if not user.is_superuser and not CommitteeMembership.objects.filter(
        target=target,user=user,active=True
    ).exists():
        return Response({"detail":"Active committee membership for the selected target is required."},status=403)

    links=list(ProgramTarget.objects.filter(target=target).select_related("program").order_by("program__name"))
    programs=[{"id":link.program_id,"name":link.program.name} for link in links]
    requested=request.query_params.get("program_id")
    if requested:
        if not requested.isdecimal() or not any(str(link.program_id)==requested for link in links):
            return Response({"detail":"Program is not linked to the selected target."},status=400)
        program=next(link.program for link in links if str(link.program_id)==requested)
    else:
        program=links[0].program if links else None

    profile=DataScaleProfile.objects.filter(target=target).first()
    scale=evaluate_data_scale(profile)
    blockers=fid_blockers(program) if program else ["program_target_data_scale_link_missing"]
    # Additional governance transparency: latest source evidence (even when
    # FID does not yet enforce the evidence category) must not be described as validated.
    engineering={}
    for source in ("alastri","datamine","rocscience"):
        latest=EngineeringEvidence.objects.filter(target=target,source=source).order_by("-created_at","-pk").first()
        engineering[source]={"state":"missing" if latest is None else "reviewed" if latest.verified and latest.reviewed_by_id else "pending",
                             "updated_at":latest.created_at if latest else None}
    financial={source:_latest_status(FinancialSourceSnapshot.objects.filter(target=target,source=source),"reviewed_by_id")
               for source in ("minetrust","erp_epc")}
    risk={source:_latest_status(RiskSourceSnapshot.objects.filter(target=target,source=source),"reviewed_by_id")
          for source in ("geotech","pitram","market")}
    legal=LegalContract.objects.filter(target=target).order_by("-created_at","-pk").first()
    findings=[f for f in (legal.findings if legal else []) if f.get("severity") in ("high","medium") and f.get("status")!="not_detected"]
    flags=list(StrategicProjectFlag.objects.filter(target=target,status="open").order_by("-created_at","-pk")[:8])
    memos=list(ExecutiveCommitteeMemo.objects.filter(target=target).order_by("-created_at","-pk")[:10])
    signed=next((m for m in memos if m.signed_by_id),None)
    formal=list(GateDecision.objects.filter(program=program).select_related("approver").order_by("-created_at","-pk")[:40]) if program else []
    newest_by_gate={}
    for row in formal:
        if row.gate not in newest_by_gate:newest_by_gate[row.gate]=row
    latest_fid=newest_by_gate.get(4)
    committee=list(CommitteeGateDecision.objects.filter(target=target).select_related("decided_by").order_by("-created_at","-pk")[:10])
    # A past GO is never a current permission if evidence has subsequently changed.
    recommendation="HOLD" if blockers else "REVIEW"
    if latest_fid and latest_fid.outcome=="HOLD":
        recommendation="HOLD"
    elif not blockers and latest_fid and latest_fid.outcome=="GO":
        recommendation="GO_RECORDED"
    elif not blockers and latest_fid and latest_fid.outcome=="REVIEW":
        recommendation="REVIEW"
    unresolved_red=sum(1 for f in flags if f.kind=="fatal_flaw")
    # Committee red flags should not silently be rendered as a green recommendation.
    if unresolved_red and recommendation=="GO_RECORDED":recommendation="REVIEW"
    explanation={
       "HOLD":"Investment authorization is blocked; complete the evidence prerequisites and obtain required decisions.",
       "REVIEW":"Evidence checks do not currently block FID, but board-level assessment and unresolved risks still require review.",
       "GO_RECORDED":"An earlier Gate 4 GO is recorded and implemented evidence checks currently pass. Confirm there have been no unmodeled changes before disbursing funds.",
    }[recommendation]
    decisions=[{"id":d.id,"gate":d.gate,"outcome":d.outcome,"rationale":d.rationale,
                "actor":d.approver.get_username(),"created_at":d.created_at,"policy_version":d.policy_version}
               for d in formal[:12]]
    # No derived IRR or NPV from demo/scenario sliders is exposed as a board KPI.
    scenario=CommercialScenarioRun.objects.filter(target=target).order_by("-created_at","-pk").first()
    financial_summary={
        "npv_m":None,"irr_pct":None,"payback_years":None,
        "status":"No decision-grade, independently validated project DCF is recorded.",
        "latest_scenario":{"id":scenario.pk,"illustrative":scenario.is_illustrative,
            "created_at":scenario.created_at} if scenario else None,
    }
    readiness=EvidenceReadiness.objects.filter(program=program).first() if program else None
    return Response({
        "generated_at":timezone.now(),"target":{"id":target.id,"name":target.name,"commodity":target.commodity,
            "stage":target.stage,"priority":target.priority},
        "programs":programs,"selected_program_id":program.pk if program else None,
        "selected_program_name":program.name if program else None,
        "recommendation":recommendation,"recommendation_rationale":explanation,
        "decision_is_formal":recommendation=="GO_RECORDED",
        "fid_eligible":not blockers and program is not None,
        "blockers":_readable_blockers(blockers),
        "evidence":{"phase":scale["phase"],"data_scale_eligible":scale["fid_allowed"],
            "sample_count":profile.sample_count if profile else None,
            "drillholes":profile.drillhole_count if profile else None,
            "map_scale":"1:"+str(profile.map_scale_denominator) if profile else None,
            "qaqc_approved":bool(readiness and readiness.qaqc_approved),
            "cp_approved":bool(readiness and readiness.competent_person_approved),
            "engineering":engineering,"financial":financial,"risk":risk,
            "legal":{"state":"missing" if legal is None else legal.status,"record_id":legal.pk if legal else None,
                     "updated_at":legal.created_at if legal else None,"risk_count":len(findings)}},
        "financial_summary":financial_summary,
        "key_risks":[{"id":f.id,"type":f.kind,"title":f.title,"rationale":f.rationale,
                      "gate":f.gate,"module":"exploration-evaluator"} for f in flags]+[
                     {"id":"contract-"+str(index),"type":"contract","title":f.get("title","Legal clause"),
                      "rationale":f.get("message","Requires legal review"),"gate":4,"module":"legal-commercial"} for index,f in enumerate(findings[:5])],
        "committee_memo":{"id":signed.id,"gate":signed.gate,"body":signed.body,
                          "signed_by_id":signed.signed_by_id,"signed_at":signed.signed_at,
                          "signature_type":"authenticated_attestation"} if signed else None,
        "formal_gates":[{"gate":n,"outcome":d.outcome if d else "NOT_RECORDED",
                         "created_at":d.created_at if d else None,
                         "decision_id":d.id if d else None} for n in range(1,5) for d in [newest_by_gate.get(n)]],
        "decision_history":decisions,
        "committee_decisions":[{"id":d.id,"gate":d.gate,"outcome":d.outcome,
                               "created_at":d.created_at} for d in committee],
        "next_action":"Complete documented prerequisites and seek a board FID decision through the governed workflow." if blockers else
                      "Review the evidence package, legal concerns and professional memo before issuing a new board FID decision.",
        "limitations":["Financial dashboard values are withheld until a validated project-level DCF is available.",
                       "Source imports and technical screening are not professional reserve certification or final investment approval.",
                       "A recorded GO is a historical decision and is not proof of current license, capital availability or ESG compliance."],
    })
