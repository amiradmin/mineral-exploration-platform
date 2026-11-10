"""Deterministic commercial partnership economics: no LLM calculations or FID approval."""
import math
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Target, CommercialScenarioRun, AuditEvent, LegalContract
from .legal_contracts import permitted
from .financial_sources import current_sources

MODEL_VERSION="partnership-dcf-v1"
class CommercialInputs(serializers.Serializer):
    mine_life=serializers.IntegerField(min_value=3,max_value=30,default=11)
    commodity_price_usd_per_t=serializers.FloatField(min_value=1,max_value=1_000_000,default=9200)
    metal_recovery_pct=serializers.FloatField(min_value=1,max_value=100,default=87)
    operating_cost_usd_per_ore_t=serializers.FloatField(min_value=0,max_value=100_000,default=55)
    tax_pct=serializers.FloatField(min_value=0,max_value=60,default=25)
    discount_rate_pct=serializers.FloatField(min_value=0,max_value=40,default=10)
    min_investor_irr_pct=serializers.FloatField(min_value=0,max_value=60,default=10)
    max_payback_years=serializers.FloatField(min_value=1,max_value=30,default=6)
    early_owner_share_pct=serializers.FloatField(min_value=0,max_value=75,default=15)
    late_owner_share_pct=serializers.FloatField(min_value=0,max_value=75,default=28)
    switch_after_year=serializers.IntegerField(min_value=1,max_value=29,default=4)
    use_reviewed_sources=serializers.BooleanField(default=False)
    save_run=serializers.BooleanField(default=False)
    def validate(self,values):
        for key,val in values.items():
            if type(val) is float and not math.isfinite(val):
                raise serializers.ValidationError({key:"Finite numbers required."})
        if values["switch_after_year"]>=values["mine_life"]:
            raise serializers.ValidationError({"switch_after_year":"Switch year must precede end of mine life."})
        return values

def annual_model(params, production, capex, strategy):
    life=params["mine_life"]
    rate=params["discount_rate_pct"]/100
    tax_rate=params["tax_pct"]/100
    capex_by_year={}
    for row in capex:
        year=row["year"]
        if 0<=year<=life:
            capex_by_year[year]=capex_by_year.get(year,0)+row["amount_usd"]/1e6
    production_by_year={row["year"]:row for row in production}
    depreciation_by_year={}
    for start,amount in capex_by_year.items():
        if amount<=0:continue
        depreciation_years=max(1,life-start)
        for year in range(max(1,start+1),life+1):
            depreciation_by_year[year]=depreciation_by_year.get(year,0)+amount/depreciation_years
    cash0=-capex_by_year.get(0,0)
    total=cash0
    payback=None
    first_recovery_year=None
    flows=[{"year":0,"owner_share_pct":0.0,"revenue_m":0.0,"owner_value_m":0.0,
           "opex_m":0.0,"capex_m":round(-cash0,4),"depreciation_m":0.0,"tax_m":0.0,
           "cash_flow_m":round(cash0,4),"cumulative_m":round(total,4)}]
    npv=cash0
    for year in range(1,life+1):
        row=production_by_year[year]
        tonnes=row.get("plant_feed_tonnes",row["ore_tonnes"])
        copper_equivalent_tonnes=tonnes*(row["grade_pct"]/100)*(params["metal_recovery_pct"]/100)
        gross=copper_equivalent_tonnes*params["commodity_price_usd_per_t"]/1e6
        if strategy=="tiered":
            share=(params["late_owner_share_pct"] if year>params["switch_after_year"] and first_recovery_year is not None else params["early_owner_share_pct"])/100
        else:
            share=strategy/100
        owner_value=gross*share
        opex=tonnes*params["operating_cost_usd_per_ore_t"]/1e6
        capex_y=capex_by_year.get(year,0)
        depreciation=depreciation_by_year.get(year,0)
        taxable=max(0,gross-owner_value-opex-depreciation)
        income_tax=taxable*tax_rate
        annual=gross-owner_value-opex-capex_y-income_tax
        before=total
        total+=annual
        npv+=annual/(1+rate)**year
        if first_recovery_year is None and before<0<=total and annual>0:
            first_recovery_year=year
            payback=year-1+(-before/annual)
        flows.append({"year":year,"owner_share_pct":round(share*100,2),
                      "revenue_m":round(gross,4),"owner_value_m":round(owner_value,4),
                      "opex_m":round(opex,4),"capex_m":round(capex_y,4),
                      "depreciation_m":round(depreciation,4),"tax_m":round(income_tax,4),
                      "cash_flow_m":round(annual,4),"cumulative_m":round(total,4)})
    def present_value(discount):
        return sum(row["cash_flow_m"]/(1+discount)**row["year"] for row in flows)
    irr=None
    if cash0<0:
        lo=0.0
        hi=10.0
        if present_value(lo)>=0 and present_value(hi)<0:
            for _ in range(90):
                mid=(lo+hi)/2
                if present_value(mid)>0:lo=mid
                else:hi=mid
            irr=(lo+hi)/2*100
    return {"npv_m":round(npv,2),"irr_pct":round(irr,2) if irr is not None else None,
            "payback_years":round(payback,2) if payback is not None else None,
            "cash_flows":flows,"net_cash_m":round(total,2)}

def ready_for_bargaining(result,params):
    return result["npv_m"]>=0 and result["irr_pct"] is not None and result["irr_pct"]>=params["min_investor_irr_pct"] and result["payback_years"] is not None and result["payback_years"]<=params["max_payback_years"]

def evaluate(params, production, capex):
    options=[("flat_15",15),("flat_18",18),("flat_25",25),("flat_28",28),("tiered","tiered")]
    comparisons=[]
    for name,share in options:
        result=annual_model(params,production,capex,share)
        comparisons.append({"id":name,"label":"Step-up after CAPEX payback and year "+str(params["switch_after_year"]) if share=="tiered" else str(share)+"% flat owner share",
                            "investor_conditions_met":ready_for_bargaining(result,params),**result})
    frontier=[]
    for share in range(0,51):
        result=annual_model(params,production,capex,share)
        frontier.append({"owner_share_pct":share,"npv_m":result["npv_m"],
                         "irr_pct":result["irr_pct"],"payback_years":result["payback_years"],
                         "meets_conditions":ready_for_bargaining(result,params)})
    eligible=[x for x in frontier if x["meets_conditions"]]
    maximum=max((x["owner_share_pct"] for x in eligible),default=None)
    return {"comparisons":comparisons,"frontier":frontier,
            "maximum_owner_share_pct":maximum,
            "recommendation":("Within the entered assumptions, the highest whole-percent flat owner share satisfying the investor hurdle is "+str(maximum)+"%." if maximum is not None else "No flat owner share between 0% and 50% satisfies all entered investor conditions."),
            "model_version":MODEL_VERSION}

def verified_sources(target,params):
    current=current_sources(target)
    if any(x is None for x in current.values()):
        raise ValueError("Both latest MineTrust and ERP/EPC snapshots must be independently reviewed.")
    production=current["minetrust"].rows
    capex=current["erp_epc"].rows
    if sorted(row["year"] for row in production)!=list(range(1,params["mine_life"]+1)):
        raise ValueError("MineTrust schedule must cover every operating year in the selected mine life.")
    if not any(row["year"]==0 and row["amount_usd"]>0 for row in capex):
        raise ValueError("Reviewed ERP/EPC ledger must contain a positive year-0 setup CAPEX record.")
    refs={k:{"snapshot_id":v.id,"sha256":v.source_sha256} for k,v in current.items()}
    return production,capex,refs

def illustrative_sources(life):
    return ([{"year":i,"ore_tonnes":4_000_000,"grade_pct":0.84,"plant_feed_tonnes":3_900_000} for i in range(1,life+1)],
            [{"year":0,"category":"plant","amount_usd":240_000_000}],
            {})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def commercial_comparison(request,target_id):
    target=get_object_or_404(Target,pk=target_id)
    if not permitted(request.user,target):
        return Response({"detail":"Active target committee membership required."},status=403)
    serializer=CommercialInputs(data=request.data)
    serializer.is_valid(raise_exception=True)
    params=serializer.validated_data
    try:
        production,capex,refs=verified_sources(target,params) if params["use_reviewed_sources"] else illustrative_sources(params["mine_life"])
    except ValueError as exc:
        return Response({"detail":str(exc)},status=409)
    result=evaluate(params,production,capex)
    warnings=["No formal reserve certification or Gate 2 mineable reserves reconciliation is available in this model.",
              "Module 3 operating costs are not yet persisted as verified inputs; entered $/t OPEX is a scenario assumption.",
              "Royalty is modeled as recovered-metal value share. Real contracts may require taxes, transfer fees, minimums and different valuation bases.",
              "The hurdle rate and payback target are negotiation constraints, not legal or bankability standards."]
    recent=LegalContract.objects.filter(target=target).first()
    if recent and recent.status!="reviewed":
        warnings.append("Latest contract is pending committee review; contractual obligations may materially change economics.")
    payload={"target_id":target_id,"mode":"reviewed_lom_and_ledger" if params["use_reviewed_sources"] else "illustrative",
             "is_illustrative":not params["use_reviewed_sources"],
             "source_refs":refs,"assumptions":params,"results":result,"warnings":warnings,
             "legal_review_status":recent.status if recent else "no_contract"}
    if params["save_run"]:
        with transaction.atomic():
            row=CommercialScenarioRun.objects.create(target=target,created_by=request.user,
                assumptions=params,source_refs=refs,result=result,is_illustrative=not params["use_reviewed_sources"])
            AuditEvent.objects.create(actor=request.user,action="commercial_scenario_saved",
                entity_type="CommercialScenarioRun",entity_id=str(row.id),
                details={"target_id":target_id,"mode":payload["mode"],"source_refs":refs})
        payload["run_id"]=row.id
    return Response(payload)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def scenario_history(request,target_id):
    target=get_object_or_404(Target,pk=target_id)
    if not permitted(request.user,target):
        return Response({"detail":"Active target committee membership required."},status=403)
    rows=CommercialScenarioRun.objects.filter(target=target)[:30]
    return Response({"records":[{"id":r.id,"created_at":r.created_at,"model_version":r.model_version,
                                "is_illustrative":r.is_illustrative,"source_refs":r.source_refs,"created_by_id":r.created_by_id} for r in rows]})
