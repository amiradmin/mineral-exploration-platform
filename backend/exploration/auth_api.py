"""Username/password JWT login with HttpOnly rotating refresh cookie.

Access JWT is returned in JSON and must remain in memory on the frontend.
CSRF is required for cookie-consuming state-changing auth endpoints. Tokens
are never stored in URL parameters or localStorage.
"""
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CommitteeMembership


COOKIE_NAME = "data_mine_refresh"


def _require_csrf(request):
    """DRF api_view is csrf_exempt; explicitly enforce CSRF for cookie flows."""
    checker = CSRFCheck(lambda _request: None)
    checker.process_request(request._request)
    reason = checker.process_view(request._request, lambda _request: None, (), {})
    if reason:
        raise PermissionDenied("CSRF Failed: " + reason)



class LoginThrottle(SimpleRateThrottle):
    scope = "auth_login"
    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


def _cookie(response, token):
    response.set_cookie(
        COOKIE_NAME, str(token), max_age=24*60*60,
        httponly=True, secure=settings.JWT_COOKIE_SECURE,
        samesite="Lax", path="/api/auth/",
    )


def _clear_cookie(response):
    response.delete_cookie(COOKIE_NAME, path="/api/auth/", samesite="Lax")


def _profile(user):
    memberships = list(CommitteeMembership.objects.filter(
        user=user, active=True
    ).values("target_id", "role"))
    return {"id": user.pk, "username": user.get_username(),
            "display_name": user.get_full_name() or user.get_username(),
            "is_staff": user.is_staff,
            "memberships": memberships}


@ensure_csrf_cookie
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def csrf_bootstrap(request):
    return Response({"csrfToken": get_token(request)})


@csrf_protect
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def login(request):
    _require_csrf(request)
    username = request.data.get("username")
    password = request.data.get("password")
    if not isinstance(username, str) or not isinstance(password, str) or not username or not password:
        return Response({"detail": "Username and password are required."}, status=400)
    user = authenticate(request, username=username, password=password)
    if user is None or not user.is_active:
        return Response({"detail": "Invalid credentials."}, status=401)
    token = RefreshToken.for_user(user)
    response = Response({"access": str(token.access_token), "user": _profile(user)})
    response["Cache-Control"] = "no-store"
    _cookie(response, token)
    return response


@csrf_protect
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def refresh(request):
    _require_csrf(request)
    raw = request.COOKIES.get(COOKIE_NAME)
    if not raw:
        return Response({"detail": "No refresh session."}, status=401)
    try:
        old = RefreshToken(raw)
        user_id = old.get("user_id")
        user = get_user_model().objects.get(pk=user_id, is_active=True)
        old.blacklist()
        rotated = RefreshToken.for_user(user)
    except (TokenError, get_user_model().DoesNotExist, TypeError, ValueError):
        response = Response({"detail": "Session expired; sign in again."}, status=401)
        _clear_cookie(response)
        return response
    response = Response({"access": str(rotated.access_token), "user": _profile(user)})
    response["Cache-Control"] = "no-store"
    _cookie(response, rotated)
    return response


@csrf_protect
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def logout(request):
    _require_csrf(request)
    raw = request.COOKIES.get(COOKIE_NAME)
    if raw:
        try:
            RefreshToken(raw).blacklist()
        except TokenError:
            pass
    response = Response({"detail": "Signed out."})
    response["Cache-Control"] = "no-store"
    _clear_cookie(response)
    return response


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def profile(request):
    response = Response({"user": _profile(request.user)})
    response["Cache-Control"] = "no-store"
    return response
