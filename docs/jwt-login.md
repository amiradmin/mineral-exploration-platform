# Data Mine login and JWT session architecture

Data Mine now shows an EN/FA login page before mounting the dashboard.
Users are **created by an administrator**, not through open self-registration.
Use `docker compose exec api python manage.py createsuperuser` and
`http://localhost:8000/admin/` to create users and assign
target-specific CommitteeMembership records.

## Browser session

- POST `/api/auth/login/`: validates Django username/password and account active
  status; returns a 10-minute **access JWT** as JSON and sets a **24-hour HttpOnly
  refresh JWT** cookie scoped to `/api/auth/`.
- GET `/api/auth/csrf/`: initializes the same-origin CSRF cookie before requests
  involving the refresh cookie.
- POST `/api/auth/refresh/`: CSRF protected; rotates the HttpOnly refresh JWT,
  blacklists the previous refresh JWT and returns a new access JWT.
- POST `/api/auth/logout/`: CSRF protected; blacklists refresh JWT and clears cookie.
- GET `/api/auth/me/`: bearer-token protected; returns username and active memberships.

The access token is **memory-only**, not stored in localStorage or
sessionStorage. Refresh tokens are never exposed to frontend JavaScript.
On reload, the app silently refreshes through the HttpOnly cookie. Logged-out
users see the login screen. Committee/API requests send `Authorization: Bearer`
with the in-memory access token. Expired access tokens are retried once
after refresh.

The login endpoint is IP-throttled to 5 attempts/minute in Django/DRF;
for an internet-facing service add gateway-level rate limits, intrusion
monitoring and MFA.

The **dashboard login gate is frontend UI only**. Public demo API
endpoints already available anonymously are **not made private** by this
feature. Committee endpoints remain server-enforced by project roles.
Do not interpret a JWT login as competent-person certification.

## Deployment

```bash
git pull origin main
docker compose --profile simulation up -d --build
docker compose exec api python manage.py showmigrations token_blacklist
```

Set `DJANGO_SECRET_KEY` to a strong value, and **serve through HTTPS**
before public access. On HTTPS configure `JWT_COOKIE_SECURE=true` and
`CSRF_COOKIE_SECURE=true`. For current HTTP localhost/LAN development the
flags default to false to permit browser cookies.

The JWT signing key defaults to Django's existing `SECRET_KEY` through
SimpleJWT. Rotating `DJANGO_SECRET_KEY` invalidates existing JWTs.

When accessed at `http://192.168.0.150:8085`, Nginx proxies
`/api/auth/` to Django with the same hostname. Use the login page
at port 8085. Do not mix `localhost`, host IP and different names across
the browser tab/session. Browser cookies are host-specific.

The existing Django Admin sign-in at `http://localhost:8000/admin/`
continues to use Django sessions and is separate from the new JWT login page.
