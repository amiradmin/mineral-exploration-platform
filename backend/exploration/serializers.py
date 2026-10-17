from rest_framework import serializers
from .models import AssayBatch, Drillhole, Element, EvidenceFactor, OperationProgram, QAQCIssue, Target, WorkTask


class TargetSerializer(serializers.ModelSerializer):
    aiScore = serializers.IntegerField(source="ai_score")

    class Meta:
        model = Target
        fields = ["id", "name", "commodity", "deposit", "aiScore", "confidence", "completeness", "priority", "stage", "action", "x", "y", "rationale", "evidence"]


class DrillholeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Drillhole
        fields = "__all__"


class ElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Element
        fields = "__all__"


class EvidenceFactorSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvidenceFactor
        fields = ["label", "value"]


class OperationProgramSerializer(serializers.ModelSerializer):
    planned = serializers.IntegerField(source="planned_metres")
    actual = serializers.IntegerField(source="actual_metres")
    logged = serializers.IntegerField(source="logged_metres")
    cores = serializers.DecimalField(source="core_recovery", max_digits=5, decimal_places=2)
    pending = serializers.IntegerField(source="pending_assays")
    cost = serializers.IntegerField(source="budget_used")
    targets = serializers.IntegerField(source="target_count")

    class Meta:
        model = OperationProgram
        fields = ["id", "name", "commodity", "rigs", "planned", "actual", "logged", "cores", "samples", "pending", "cost", "targets"]


class AssayBatchSerializer(serializers.ModelSerializer):
    project = serializers.CharField(source="program.name", read_only=True)
    due = serializers.DateField(source="due_date")
    qa = serializers.CharField(source="qa_status")

    class Meta:
        model = AssayBatch
        fields = ["id", "project", "batch", "samples", "due", "status", "qa"]


class QAQCIssueSerializer(serializers.ModelSerializer):
    project = serializers.CharField(source="program.name", read_only=True)

    class Meta:
        model = QAQCIssue
        fields = ["id", "project", "category", "severity", "owner", "status"]


class WorkTaskSerializer(serializers.ModelSerializer):
    project = serializers.CharField(source="program.name", read_only=True)

    class Meta:
        model = WorkTask
        fields = ["id", "name", "team", "project", "priority", "done"]
