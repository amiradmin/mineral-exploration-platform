from django.contrib import admin
from .models import (
    AssayBatch, AuditEvent, Drillhole, Element, EvidenceFactor,
    EvidenceReadiness, GateDecision, OperationProgram, QAQCIssue, SourceConnection, SourceDataSnapshot, Target, WorkTask,
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
