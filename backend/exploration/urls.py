from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AssayBatchViewSet, DrillholeViewSet, ElementViewSet, EvidenceFactorViewSet, OperationProgramViewSet, QAQCIssueViewSet, TargetViewSet, WorkTaskViewSet, submit_gate_decision, source_details, ingest_gis_simulator

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
    path("simulators/gis/ingest/", ingest_gis_simulator, name="ingest-gis-simulator"),
    path("source-details/<str:target_id>/<slug:software_key>/", source_details, name="source-details"),
    path("programs/<int:program_id>/gate-decisions/", submit_gate_decision, name="submit-gate-decision"),
] + router.urls
