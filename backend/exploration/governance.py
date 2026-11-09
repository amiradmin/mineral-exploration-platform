from rest_framework.permissions import BasePermission, SAFE_METHODS


class ReadPublicWriteRestricted(BasePermission):
    """Read-only public demo; authenticated role-restricted modifications."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return bool(user and user.is_authenticated and (
            user.is_superuser or user.groups.filter(name="data_steward").exists()
        ))


class GateApproverPermission(BasePermission):
    """Gate approval requires an explicit board approver (not a presentation checkbox)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (
            user.is_superuser or user.groups.filter(name="board_approver").exists()
        ))


def fid_blockers(program):
    """Fail closed until verified project evidence and expert sign-off exist."""
    from .models import EvidenceReadiness
    record = EvidenceReadiness.objects.filter(program=program).first()
    blockers = []
    if not record:
        return ["evidence_snapshot_missing"]
    if record.data_status != EvidenceReadiness.VERIFIED:
        blockers.append("evidence_unverified")
    if not record.detailed_exploration:
        blockers.append("detailed_exploration_required")
    if not record.qaqc_approved:
        blockers.append("qaqc_approval_required")
    if not record.competent_person_approved:
        blockers.append("competent_person_approval_required")
    return blockers
