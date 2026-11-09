"""Superuser-only user provisioning and target membership management.

This API intentionally does not delegate account creation or role grants to
project chairs, staff, or Django group members.
"""
from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AuditEvent, CommitteeMembership, Target


def _require_admin(request):
    if not request.user.is_authenticated or not request.user.is_active or not request.user.is_superuser:
        return Response({"detail": "Superuser access required."}, status=403)
    return None


def _serialize(user):
    return {
        "id": user.pk, "username": user.get_username(),
        "first_name": user.first_name, "last_name": user.last_name, "email": user.email,
        "is_active": user.is_active, "is_staff": user.is_staff, "is_superuser": user.is_superuser,
        "memberships": [{
            "id": m.pk, "target_id": m.target_id, "role": m.role, "active": m.active,
        } for m in user.committee_memberships.all().order_by("target_id", "role")],
    }


def _audit(actor, action, obj, details):
    AuditEvent.objects.create(
        actor=actor, action=action, entity_type="UserAccess", entity_id=str(obj.pk),
        details=details,
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def users(request):
    denied = _require_admin(request)
    if denied is not None:
        return denied
    User = get_user_model()
    if request.method == "GET":
        people = User.objects.prefetch_related("committee_memberships").order_by("username")[:500]
        return Response({
            "users": [_serialize(p) for p in people],
            "targets": list(Target.objects.order_by("id").values("id", "name")[:500]),
            "roles": [value for value, _ in CommitteeMembership.ROLES],
        })
    data = request.data
    username = data.get("username")
    password = data.get("password")
    if not isinstance(username, str) or not 3 <= len(username.strip()) <= 150:
        return Response({"detail": "Username must contain 3–150 characters."}, status=400)
    if not isinstance(password, str) or len(password) < 12:
        return Response({"detail": "Password must contain at least 12 characters."}, status=400)
    if User.objects.filter(username__iexact=username.strip()).exists():
        return Response({"detail": "Username already exists."}, status=409)
    email = data.get("email", "")
    if not isinstance(email, str) or len(email) > 254:
        return Response({"detail": "Invalid email."}, status=400)
    with transaction.atomic():
        user = User.objects.create_user(
            username=username.strip(), email=email.strip(),
            password=password,
            first_name=str(data.get("first_name") or "")[:150],
            last_name=str(data.get("last_name") or "")[:150],
        )
        _audit(request.user, "user_created", user, {"username": user.username})
    return Response(_serialize(user), status=201)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def user_status(request, user_id):
    denied = _require_admin(request)
    if denied is not None:
        return denied
    with transaction.atomic():
        User = get_user_model()
        user = get_object_or_404(User.objects.select_for_update(), pk=user_id)
        active = request.data.get("is_active")
        if type(active) is not bool:
            return Response({"detail": "is_active must be boolean."}, status=400)
        if user.pk == request.user.pk and not active:
            return Response({"detail": "You cannot deactivate your own account."}, status=409)
        if user.is_superuser and not active:
            other = User.objects.filter(is_active=True, is_superuser=True).exclude(pk=user.pk).exists()
            if not other:
                return Response({"detail": "Cannot deactivate the last active superuser."}, status=409)
        user.is_active = active
        user.save(update_fields=["is_active"])
        _audit(request.user, "user_status_changed", user, {"is_active": active})
    return Response(_serialize(user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def assign_membership(request, user_id):
    denied = _require_admin(request)
    if denied is not None:
        return denied
    target = get_object_or_404(Target, pk=request.data.get("target_id"))
    role = request.data.get("role")
    if role not in dict(CommitteeMembership.ROLES):
        return Response({"detail": "Unknown committee role."}, status=400)
    user = get_object_or_404(get_user_model(), pk=user_id)
    with transaction.atomic():
        membership, created = CommitteeMembership.objects.get_or_create(
            user=user, target=target, role=role, defaults={"active": True},
        )
        if not membership.active:
            membership.active = True
            membership.save(update_fields=["active"])
        _audit(request.user, "committee_membership_granted", user,
               {"target_id": target.pk, "role": role, "membership_id": membership.pk})
    return Response({"id": membership.pk, "user_id": user.pk, "target_id": target.pk,
                     "role": role, "active": True}, status=201 if created else 200)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def revoke_membership(request, membership_id):
    denied = _require_admin(request)
    if denied is not None:
        return denied
    with transaction.atomic():
        membership = get_object_or_404(
            CommitteeMembership.objects.select_for_update(), pk=membership_id,
        )
        if not membership.active:
            return Response({"detail": "Membership is already revoked."}, status=409)
        membership.active = False
        membership.save(update_fields=["active"])
        _audit(request.user, "committee_membership_revoked", membership.user,
               {"target_id": membership.target_id, "role": membership.role,
                "membership_id": membership.pk})
    return Response({"id": membership.pk, "active": False})
