"""Data-scale and sample-support policy. Missing evidence fails closed."""
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Target, DataScaleProfile, AuditEvent

def evaluate(profile):
    if profile is None:
        return {"phase":"unverified","detailed_eligible":False,"fid_allowed":False,"blockers":["data_scale_profile_missing"],"permitted_budget_scope":"evidence_collection_only"}
    blockers=[]
    if profile.phase!="detailed": blockers.append("detailed_exploration_required")
    if not 500 <= profile.map_scale_denominator <= 2500: blockers.append("detailed_map_scale_required")
    if profile.sample_count < 1 or not profile.lab_method.strip(): blockers.append("verified_assay_support_required")
    if profile.drillhole_count < 1 or profile.ddh_metres + profile.rc_metres <= 0: blockers.append("drilling_support_required")
    if not profile.grid_spacing_x or not profile.grid_spacing_y: blockers.append("drill_grid_missing")
    if profile.core_recovery_pct is None or profile.rqd_pct is None: blockers.append("core_quality_missing")
    if not profile.verified: blockers.append("evidence_not_verified")
    return {"phase":profile.phase,"detailed_eligible":not blockers,"fid_allowed":not blockers,"blockers":blockers,"permitted_budget_scope":"subject_to_other_gates" if not blockers else "detailed_drilling_and_evidence_only"}

@api_view(["GET","PUT"])
@permission_classes([permissions.IsAuthenticated])
def data_scale_profile(request,target_id):
    target=get_object_or_404(Target,pk=target_id)
    profile=DataScaleProfile.objects.filter(target=target).first()
    if request.method=="PUT":
        user=request.user
        if not (user.is_superuser or user.groups.filter(name="data_steward").exists()):
            return Response({"detail":"Data steward permission required"},status=403)
        from rest_framework import serializers
        class Payload(serializers.Serializer):
            phase=serializers.ChoiceField(choices=["reconnaissance","general","detailed"])
            map_scale_denominator=serializers.IntegerField(min_value=500,max_value=50000)
            sample_count=serializers.IntegerField(min_value=0)
            lab_method=serializers.CharField(max_length=160,allow_blank=True)
            drillhole_count=serializers.IntegerField(min_value=0)
            ddh_metres=serializers.FloatField(min_value=0)
            rc_metres=serializers.FloatField(min_value=0)
            grid_spacing_x=serializers.FloatField(min_value=0,allow_null=True)
            grid_spacing_y=serializers.FloatField(min_value=0,allow_null=True)
            core_recovery_pct=serializers.FloatField(min_value=0,max_value=100,allow_null=True)
            rqd_pct=serializers.FloatField(min_value=0,max_value=100,allow_null=True)
            verified=serializers.BooleanField(default=False)
        serializer=Payload(data=request.data)
        serializer.is_valid(raise_exception=True)
        from django.db import transaction
        with transaction.atomic():
            profile,_=DataScaleProfile.objects.update_or_create(target=target,defaults=serializer.validated_data)
            AuditEvent.objects.create(actor=user,action="data_scale_updated",entity_type="DataScaleProfile",entity_id=target_id,details={"phase":profile.phase,"verified":profile.verified})
    values={key:getattr(profile,key) for key in ["phase","map_scale_denominator","sample_count","lab_method","drillhole_count","ddh_metres","rc_metres","grid_spacing_x","grid_spacing_y","core_recovery_pct","rqd_pct","verified"]} if profile else None
    return Response({"target_id":target_id,"profile":values,"policy":evaluate(profile)})
