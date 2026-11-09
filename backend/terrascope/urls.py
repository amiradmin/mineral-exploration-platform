from django.contrib import admin
from django.urls import include, path
from exploration.auth_api import csrf_bootstrap, login, refresh, logout, profile

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/csrf/", csrf_bootstrap, name="auth-csrf"),
    path("api/auth/login/", login, name="auth-login"),
    path("api/auth/refresh/", refresh, name="auth-refresh"),
    path("api/auth/logout/", logout, name="auth-logout"),
    path("api/auth/me/", profile, name="auth-me"),
    path("api/", include("exploration.urls")),
]
