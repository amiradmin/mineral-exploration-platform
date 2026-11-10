"""Constrained natural-language fleet scenarios and auditable deterministic DCF.

The interpreter translates phrases into whitelisted parameters only. No LLM arithmetic,
no execution of generated code, no assumed external economic data.
"""
import math
import re
from decimal import Decimal, ROUND_HALF_UP
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

POLICY_VERSION = "fleet-dcf-v1"
OPTIONS = (
    {"id": "premium_new", "name": "Premium new fleet (illustrative)", "initial_capex": 100, "lom_net_capex": 130, "maintenance": 4.5, "downtime": 3, "asset_life": 8, "replacement_interval": 8},
    {"id": "premium_used", "name": "Low-hour used premium fleet (illustrative)", "initial_capex": 58, "lom_net_capex": 155, "maintenance": 7.2, "downtime": 6, "asset_life": 5, "replacement_interval": 5},
    {"id": "economy_rotation", "name": "Economy new fleet / 2-year rotation (illustrative)", "initial_capex": 42, "lom_net_capex": 172, "maintenance": 9.8, "downtime": 12, "asset_life": 2, "replacement_interval": 2},
)
# Replacement capital assumes total life-of-mine net purchasing expense, inclusive
# of disposal proceeds. The residual increment is allocated equally at the replacement
# years; the original initial investment is paid at year 0.
DEFAULTS = {"mine_life": 11, "discount_rate": 10.0, "annual_contribution": 60.0, "tax_rate": 25.0, "revenue_at_risk": 40.0}

class PromptPayload(serializers.Serializer):
    prompt = serializers.CharField(min_length=8, max_length=2000)
    mine_life = serializers.IntegerField(min_value=3, max_value=30, default=11)
    discount_rate = serializers.FloatField(min_value=0, max_value=40, default=10)
    annual_contribution = serializers.FloatField(min_value=0, max_value=10000, default=60)
    tax_rate = serializers.FloatField(min_value=0, max_value=60, default=25)
    revenue_at_risk = serializers.FloatField(min_value=0, max_value=10000, default=40)
    def validate(self, attrs):
        for key in ("discount_rate", "annual_contribution", "tax_rate", "revenue_at_risk"):
            if not math.isfinite(attrs[key]):
                raise serializers.ValidationError({key: "Must be a finite number."})
        return attrs

def interpret(prompt):
    normalized = prompt.lower().replace("٫", ".").replace("،", " ")
    normalized = normalized.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    if not any(word in normalized for word in ("fleet", "equipment", "machine", "ماشین", "ناوگان", "تجهیزات", "caterpillar", "کاترپیلار")):
        return {"intent": "unsupported", "confidence": "none", "changes": {}, "warnings": ["Only fleet procurement scenarios are supported."]}
    changes = {}
    warnings = []
    # Parse only named quantities; never guess unspecified financial assumptions.
    matches = [
        (r"(?:mine life|life of mine|عمر معدن)\s*(?:of|=|:|را)?\s*(\d{1,2})", "mine_life", int, (3, 30)),
        (r"(?:discount rate|wacc|نرخ تنزیل)\s*(?:of|=|:|را)?\s*(\d+(?:\.\d+)?)\s*%", "discount_rate", float, (0, 40)),
        (r"(?:replacement every|replace every|تعویض هر|جایگزینی هر)\s*(\d{1,2})\s*(?:years?|سال)", "rotation_years", int, (1, 15)),
    ]
    for pattern, key, cast, limits in matches:
        match = re.search(pattern, normalized, flags=re.I)
        if match:
            value = cast(match.group(1))
            if not limits[0] <= value <= limits[1]:
                warnings.append(key + " outside approved limits; ignored.")
            else:
                changes[key] = value
    requested_rotation = "rotation_years" in changes
    if any(word in normalized for word in ("used", "second-hand", "دست دوم", "دست‌دوم", "کارکرده")):
        changes["compare_used"] = True
    if any(word in normalized for word in ("economy", "economic", "اقتصادی", "ارزان")):
        changes["compare_economy"] = True
    if requested_rotation and changes["rotation_years"] != 2:
        warnings.append("The non-standard replacement interval uses a configurable cadence with unchanged illustrative total net CAPEX; provide a revised budget before reliance.")
    return {"intent": "fleet_strategy_comparison", "confidence": "rule_based", "changes": changes,
            "warnings": warnings + ["Rule-based translator, not a connected generative AI model. Review extracted assumptions before use."]}

def round_money(value):
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

def calculate(option, params, rotation_override=None):
    years = params["mine_life"]
    rate = params["discount_rate"] / 100
    tax = params["tax_rate"] / 100
    interval = rotation_override if option["id"] == "economy_rotation" and rotation_override is not None else option["replacement_interval"]
    replacement_years = list(range(interval, years, interval))
    replacement_capex = max(0, option["lom_net_capex"] - option["initial_capex"]) / len(replacement_years) if replacement_years else 0.0
    # The remaining balance from a net-CAPEX envelope without scheduled
    # replacements is not silently discarded: charge it in the final year.
    final_adjustment = max(0, option["lom_net_capex"]-option["initial_capex"]) if not replacement_years else 0.0
    schedules = []
    vintages = [(0, option["initial_capex"], option["asset_life"])]
    accumulated = -option["initial_capex"]
    payback = None
    flows = [{"year": 0, "capex": round_money(option["initial_capex"]), "maintenance": 0, "downtime_cost": 0,
              "depreciation": 0, "tax": 0, "cash_flow": round_money(-option["initial_capex"]), "cumulative": round_money(accumulated)}]
    npv = -option["initial_capex"]
    for year in range(1, years+1):
        capex = replacement_capex if year in replacement_years else (final_adjustment if year == years else 0)
        if capex and year < years:
            vintages.append((year, capex, interval))
        depreciation = sum(amount/life for start, amount, life in vintages if start < year <= start + life)
        downtime_cost = params["revenue_at_risk"] * option["downtime"]/100
        operating = params["annual_contribution"] - option["maintenance"] - downtime_cost
        taxable = max(0.0, operating - depreciation)
        income_tax = taxable * tax
        cash = operating - income_tax - capex
        before = accumulated
        accumulated += cash
        npv += cash/(1+rate)**year
        if payback is None and before < 0 <= accumulated and cash > 0:
            payback = year-1 + (-before)/cash
        flows.append({"year": year, "capex": round_money(capex), "maintenance": option["maintenance"],
                      "downtime_cost": round_money(downtime_cost), "depreciation": round_money(depreciation),
                      "tax": round_money(income_tax), "cash_flow": round_money(cash), "cumulative": round_money(accumulated)})
    return {"id": option["id"], "name": option["name"], "initial_capex": option["initial_capex"],
            "lom_net_capex": option["lom_net_capex"], "maintenance": option["maintenance"],
            "downtime_pct": option["downtime"], "replacement_interval": interval,
            "npv": round_money(npv), "payback_years": round_money(payback) if payback is not None else None,
            "annual_flows": flows}

def compare(params, changes):
    rotation = changes.get("rotation_years")
    options = [calculate(option, params, rotation) for option in OPTIONS]
    ordered = sorted(options, key=lambda x: x["npv"], reverse=True)
    fastest = min((o for o in options if o["payback_years"] is not None),
                  key=lambda o: o["payback_years"], default=None)
    return {"results": options, "best_npv": ordered[0]["id"],
            "fastest_payback": fastest["id"] if fastest else None,
            "npv_spread": round_money(ordered[0]["npv"]-ordered[-1]["npv"]),
            "recommendation": ("Highest modeled NPV: "+ordered[0]["name"]+
                               ". Evaluate staged or hybrid procurement in a separate modeled scenario; "
                               "no hybrid advantage is assumed.")}

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def strategic_scenario(request):
    serializer = PromptPayload(data=request.data)
    serializer.is_valid(raise_exception=True)
    values = serializer.validated_data
    translation = interpret(values["prompt"])
    if translation["intent"] == "unsupported":
        return Response({"detail": "Unsupported scenario request", "interpretation": translation}, status=422)
    params = {k: values[k] for k in DEFAULTS}
    if "mine_life" in translation["changes"]:
        params["mine_life"] = translation["changes"]["mine_life"]
    if "discount_rate" in translation["changes"]:
        params["discount_rate"] = translation["changes"]["discount_rate"]
    comparison = compare(params, translation["changes"])
    return Response({"policy_version": POLICY_VERSION, "verified_project_economics": False,
                     "calculation_mode": "deterministic_python_dcf",
                     "translator": translation, "assumptions": params, **comparison,
                     "disclaimer": "Illustrative fleet-only scenario, not a validated project NPV or FID recommendation. "
                                   "Annual contribution, revenue-at-risk and tax are user-editable assumptions; "
                                   "depreciation is a simplified straight-line tax shield."})
