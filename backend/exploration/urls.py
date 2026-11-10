from .program_readiness import program_evidence_readiness
from .engineering_evidence import engineering_evidence, review_engineering_evidence, program_targets, investment_readiness, budget_authorizations
from .data_scale import data_scale_profile, verify_data_scale
from django.urls import path
from .reserve_reviews import reserve_review_comments
from .reserve_sources import reserve_source_readiness
from .user_admin import users, user_status, assign_membership, revoke_membership
from .committee import committee_overview, propose_override, review_override, create_flag, resolve_flag, create_memo, sign_memo, committee_gate_decision
from rest_framework.routers import DefaultRouter
from .views import source_registry, evidence_evaluations, approve_evidence_rule, approve_evidence_evaluation, AssayBatchViewSet, DrillholeViewSet, ElementViewSet, EvidenceFactorViewSet, OperationProgramViewSet, QAQCIssueViewSet, TargetViewSet, WorkTaskViewSet, submit_gate_decision, source_details, source_snapshot_history, ingest_gis_simulator

router = DefaultRouter()
router.register("targets", TargetViewSet)
router.register("drillholes", DrillholeViewSet)
router.register("elements", ElementViewSet)
router.register("evidence-factors", EvidenceFactorViewSet)
router.register("programs", OperationProgramViewSet)
router.register("assay-batches", AssayBatchViewSet)
router.register("qaqc-issues", QAQCIssueViewSet)
router.register("tasks", WorkTaskViewSet)

urlpatterns = [
    path("programs/<int:program_id>/evidence-readiness/",program_evidence_readiness,name="program-evidence-readiness"),
    path("programs/<int:program_id>/budget-authorizations/",budget_authorizations,name="budget-authorizations"),
    path("targets/<str:target_id>/data-scale/review/",verify_data_scale,name="verify-data-scale"),
    path("targets/<str:target_id>/engineering-evidence/", engineering_evidence, name="engineering-evidence"),
    path("targets/<str:target_id>/engineering-evidence/<int:evidence_id>/review/", review_engineering_evidence, name="engineering-evidence-review"),
    path("programs/<int:program_id>/target-scope/", program_targets, name="program-target-scope"),
    path("programs/<int:program_id>/investment-readiness/", investment_readiness, name="investment-readiness"),
    path("targets/<str:target_id>/data-scale/", data_scale_profile, name="data-scale-profile"),
    path("admin-access/users/", users, name="admin-access-users"),
    path("admin-access/users/<int:user_id>/", user_status, name="admin-access-user-status"),
    path("admin-access/users/<int:user_id>/memberships/", assign_membership, name="admin-access-membership-grant"),
    path("admin-access/memberships/<int:membership_id>/", revoke_membership, name="admin-access-membership-revoke"),
    path("targets/<str:target_id>/reserve-sources/", reserve_source_readiness, name="reserve-source-readiness"),
    path("targets/<str:target_id>/reserve-reviews/comments/", reserve_review_comments, name="reserve-review-comments"),
    path("targets/<str:target_id>/committee/", committee_overview, name="committee-overview"),
    path("targets/<str:target_id>/committee/overrides/", propose_override, name="committee-override-propose"),
    path("targets/<str:target_id>/committee/overrides/<int:override_id>/review/", review_override, name="committee-override-review"),
    path("targets/<str:target_id>/committee/flags/", create_flag, name="committee-flag-create"),
    path("targets/<str:target_id>/committee/flags/<int:flag_id>/resolve/", resolve_flag, name="committee-flag-resolve"),
    path("targets/<str:target_id>/committee/memos/", create_memo, name="committee-memo-create"),
    path("targets/<str:target_id>/committee/memos/<int:memo_id>/sign/", sign_memo, name="committee-memo-sign"),
    path("targets/<str:target_id>/committee/gate-decisions/", committee_gate_decision, name="committee-gate-decision"),
    path("targets/<str:target_id>/sources/", source_registry, name="source-registry"),
    path("targets/<str:target_id>/evidence-evaluations/", evidence_evaluations, name="evidence-evaluations"),
    path("targets/<str:target_id>/evidence-evaluations/<int:evaluation_id>/approve/", approve_evidence_evaluation, name="approve-evidence-evaluation"),
    path("evidence/rules/<int:rule_id>/approve/", approve_evidence_rule, name="approve-evidence-rule"),
    path("simulators/gis/ingest/", ingest_gis_simulator, name="ingest-gis-simulator"),
    path("source-details/<str:target_id>/<slug:software_key>/snapshots/", source_snapshot_history, name="source-snapshot-history"),
    path("source-details/<str:target_id>/<slug:software_key>/", source_details, name="source-details"),
    path("programs/<int:program_id>/gate-decisions/", submit_gate_decision, name="submit-gate-decision"),
] + router.urls
