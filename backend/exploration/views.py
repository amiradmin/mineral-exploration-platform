from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AssayBatch, Drillhole, Element, EvidenceFactor, OperationProgram, QAQCIssue, Target, WorkTask
from .serializers import AssayBatchSerializer, DrillholeSerializer, ElementSerializer, EvidenceFactorSerializer, OperationProgramSerializer, QAQCIssueSerializer, TargetSerializer, WorkTaskSerializer


class TargetViewSet(viewsets.ModelViewSet):
    queryset = Target.objects.all()
    serializer_class = TargetSerializer
    search_fields = ["id", "name", "commodity", "deposit", "stage"]
    ordering_fields = ["ai_score", "confidence", "name"]


class DrillholeViewSet(viewsets.ModelViewSet):
    queryset = Drillhole.objects.all()
    serializer_class = DrillholeSerializer
    search_fields = ["id", "status", "intercept"]


class ElementViewSet(viewsets.ModelViewSet):
    queryset = Element.objects.all()
    serializer_class = ElementSerializer


class EvidenceFactorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EvidenceFactor.objects.all()
    serializer_class = EvidenceFactorSerializer


class OperationProgramViewSet(viewsets.ModelViewSet):
    queryset = OperationProgram.objects.all()
    serializer_class = OperationProgramSerializer
    search_fields = ["name", "commodity"]

    @action(detail=False, methods=["get"])
    def summary(self, request):
        programs = self.get_queryset()
        return Response({
            "programs": OperationProgramSerializer(programs, many=True).data,
            "totals": {
                "planned": sum(program.planned_metres for program in programs),
                "actual": sum(program.actual_metres for program in programs),
                "logged": sum(program.logged_metres for program in programs),
                "samples": sum(program.samples for program in programs),
                "pending": sum(program.pending_assays for program in programs),
            },
        })


class AssayBatchViewSet(viewsets.ModelViewSet):
    queryset = AssayBatch.objects.select_related("program").all()
    serializer_class = AssayBatchSerializer
    filterset_fields = ["status", "qa_status", "program"]


class QAQCIssueViewSet(viewsets.ModelViewSet):
    queryset = QAQCIssue.objects.select_related("program").all()
    serializer_class = QAQCIssueSerializer
    filterset_fields = ["severity", "status", "program"]


class WorkTaskViewSet(viewsets.ModelViewSet):
    queryset = WorkTask.objects.select_related("program").all()
    serializer_class = WorkTaskSerializer
    filterset_fields = ["done", "priority", "program"]
