from django.urls import path
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
    path("targets/<str:target_id>/sources/", source_registry, name="source-registry"),
    path("targets/<str:target_id>/evidence-evaluations/", evidence_evaluations, name="evidence-evaluations"),
    path("targets/<str:target_id>/evidence-evaluations/<int:evaluation_id>/approve/", approve_evidence_evaluation, name="approve-evidence-evaluation"),
    path("evidence/rules/<int:rule_id>/approve/", approve_evidence_rule, name="approve-evidence-rule"),
    path("simulators/gis/ingest/", ingest_gis_simulator, name="ingest-gis-simulator"),
    path("source-details/<str:target_id>/<slug:software_key>/snapshots/", source_snapshot_history, name="source-snapshot-history"),
    path("source-details/<str:target_id>/<slug:software_key>/", source_details, name="source-details"),
    path("programs/<int:program_id>/gate-decisions/", submit_gate_decision, name="submit-gate-decision"),
] + router.urls
