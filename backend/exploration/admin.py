from django.contrib import admin
from .models import (
    AssayBatch, AuditEvent, Drillhole, Element, EvidenceFactor,
    EvidenceReadiness, GateDecision, OperationProgram, QAQCIssue, SourceConnection, SourceDataSnapshot, EvidenceFactorRule, EvidenceEvaluation, EvidenceEvaluationInput, Target, WorkTask,
    CommitteeMembership, ExpertOverride, StrategicProjectFlag, ExecutiveCommitteeMemo, CommitteeGateDecision,
)

admin.site.register([Target, Drillhole, Element, EvidenceFactor, OperationProgram, AssayBatch, QAQCIssue, WorkTask])


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor", "action", "entity_type", "entity_id")
    readonly_fields = ("actor", "action", "entity_type", "entity_id", "details", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(GateDecision)
class GateDecisionAdmin(admin.ModelAdmin):
    list_display = ("program", "gate", "outcome", "approver", "created_at")
    readonly_fields = ("program", "gate", "outcome", "rationale", "approver", "policy_version", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(EvidenceReadiness)
class EvidenceReadinessAdmin(admin.ModelAdmin):
    list_display = ("program", "data_status", "detailed_exploration", "qaqc_approved", "competent_person_approved")


class SourceDataSnapshotInline(admin.TabularInline):
    model = SourceDataSnapshot
    extra = 0
    readonly_fields = ("received_at",)


@admin.register(SourceConnection)
class SourceConnectionAdmin(admin.ModelAdmin):
    list_display = ("target", "software_key", "protocol", "status", "is_demo", "last_success_at")
    list_filter = ("status", "protocol", "is_demo")
    search_fields = ("software_key", "target__name")
    inlines = [SourceDataSnapshotInline]


@admin.register(SourceDataSnapshot)
class SourceDataSnapshotAdmin(admin.ModelAdmin):
    list_display = ("connection", "dataset", "observed_at", "received_at")
    readonly_fields = ("received_at",)
    list_filter = ("connection__software_key",)


@admin.register(EvidenceFactorRule)
class EvidenceFactorRuleAdmin(admin.ModelAdmin):
    list_display = ("connection", "factor", "metric_key", "version", "is_demonstration", "is_enabled", "approved_by")
    list_filter = ("factor", "is_demonstration", "is_enabled")
    readonly_fields = ("approved_by", "approved_at", "created_at")

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return [field.name for field in self.model._meta.fields]
        return super().get_readonly_fields(request, obj)

    def has_delete_permission(self, request, obj=None):
        return False


class EvaluationInputInline(admin.TabularInline):
    model = EvidenceEvaluationInput
    extra = 0
    can_delete = False
    readonly_fields = ("snapshot", "rule", "frozen_rule", "snapshot_sha256",
                       "observed_value", "normalized_score", "weighted_score")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(EvidenceEvaluation)
class EvidenceEvaluationAdmin(admin.ModelAdmin):
    list_display = ("id", "target", "algorithm_version", "status", "content_sha256", "created_at", "approved_by")
    list_filter = ("status", "target")
    readonly_fields = ("target", "algorithm_version", "parameters", "outputs", "provenance",
                       "content_sha256", "status", "created_by", "created_at", "approved_by", "approved_at")
    inlines = [EvaluationInputInline]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return request.user.is_staff

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(EvidenceEvaluationInput)
class EvidenceEvaluationInputAdmin(admin.ModelAdmin):
    list_display = ("evaluation", "snapshot", "rule", "observed_value", "weighted_score")
    readonly_fields = ("evaluation", "snapshot", "rule", "frozen_rule", "snapshot_sha256",
                       "observed_value", "normalized_score", "weighted_score")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return request.user.is_staff

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CommitteeMembership)
class CommitteeMembershipAdmin(admin.ModelAdmin):
    list_display = ("target", "user", "role", "active", "created_at")
    list_filter = ("role", "active", "target")
    search_fields = ("user__username", "target__name", "target__id")

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


class CommitteeReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return bool(request.user.is_staff)

    def has_delete_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.fields]


@admin.register(ExpertOverride)
class ExpertOverrideAdmin(CommitteeReadOnlyAdmin):
    list_display = ("target", "factor", "delta_points", "status", "proposed_by", "reviewed_by")


@admin.register(StrategicProjectFlag)
class StrategicProjectFlagAdmin(CommitteeReadOnlyAdmin):
    list_display = ("target", "gate", "kind", "title", "status", "created_by")


@admin.register(ExecutiveCommitteeMemo)
class ExecutiveCommitteeMemoAdmin(CommitteeReadOnlyAdmin):
    list_display = ("target", "gate", "version", "signed_by", "signed_at")


@admin.register(CommitteeGateDecision)
class CommitteeGateDecisionAdmin(CommitteeReadOnlyAdmin):
    list_display = ("target", "gate", "outcome", "decided_by", "created_at")
