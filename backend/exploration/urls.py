from rest_framework.routers import DefaultRouter
from .views import AssayBatchViewSet, DrillholeViewSet, ElementViewSet, EvidenceFactorViewSet, OperationProgramViewSet, QAQCIssueViewSet, TargetViewSet, WorkTaskViewSet

router = DefaultRouter()
router.register("targets", TargetViewSet)
router.register("drillholes", DrillholeViewSet)
router.register("elements", ElementViewSet)
router.register("evidence-factors", EvidenceFactorViewSet)
router.register("programs", OperationProgramViewSet)
router.register("assay-batches", AssayBatchViewSet)
router.register("qaqc-issues", QAQCIssueViewSet)
router.register("tasks", WorkTaskViewSet)

urlpatterns = router.urls
