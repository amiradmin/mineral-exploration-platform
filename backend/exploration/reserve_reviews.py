"""Target-scoped Gate 2 review comments, separate from formal committee sign-off."""
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AuditEvent, CommitteeMembership, ReserveReviewComment, Target

WRITE_ROLES = {"expert", "cp", "chair", "board"}


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def reserve_review_comments(request, target_id):
    target = get_object_or_404(Target, pk=target_id)
    memberships = set(CommitteeMembership.objects.filter(
        target=target, user=request.user, active=True
    ).values_list("role", flat=True))
    if not memberships:
        return Response({"detail": "Active membership for this target is required."}, status=403)

    if request.method == "GET":
        items = ReserveReviewComment.objects.filter(target=target).select_related("author").order_by("created_at", "id")[:200]
        return Response({
            "roles": sorted(memberships),
            "can_comment": bool(memberships & WRITE_ROLES),
            "comments": [{
                "id": item.pk,
                "author": item.author.get_full_name() or item.author.get_username(),
                "author_id": item.author_id,
                "body": item.body,
                "created_at": item.created_at,
            } for item in items],
        })

    if not memberships & WRITE_ROLES:
        return Response({"detail": "Your committee role is read-only."}, status=403)
    body = request.data.get("body")
    if not isinstance(body, str) or not 3 <= len(body.strip()) <= 4000:
        return Response({"detail": "Comment must contain 3–4000 characters."}, status=400)
    item = ReserveReviewComment.objects.create(target=target, author=request.user, body=body.strip())
    AuditEvent.objects.create(
        actor=request.user, action="reserve_review_comment_created",
        entity_type="ReserveReviewComment", entity_id=str(item.pk),
        details={"target_id": target.pk, "gate": 2},
    )
    return Response({"id": item.pk, "created_at": item.created_at}, status=201)
