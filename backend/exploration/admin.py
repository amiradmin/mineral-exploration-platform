from django.contrib import admin
from .models import (
    AssayBatch, AuditEvent, Drillhole, Element, EvidenceFactor,
    EvidenceReadiness, GateDecision, OperationProgram, QAQCIssue, Target, WorkTask,
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
