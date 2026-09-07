from typing import Optional
import logging
import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException, Depends
from app.core.config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET, ADMIN_EMAILS

logger = logging.getLogger("pacha.auth")

_jwks_client: Optional[PyJWKClient] = None


def _get_jwks_client() -> Optional[PyJWKClient]:
    """Lazily builds (and caches) a client for Supabase's JWKS endpoint,
    which serves whichever signing keys are currently active for the
    project - asymmetric (ES256/RS256) or an imported legacy HS256 secret.
    Supabase's gateway requires an `apikey` header on this endpoint too.

    IMPORTANT: the correct path is /auth/v1/.well-known/jwks.json - NOT
    /auth/v1/jwks (that one 404s). Got this wrong once already; if this
    endpoint ever returns 404 again, that's the first thing to check."""
    global _jwks_client
    if _jwks_client is None and SUPABASE_URL:
        if not SUPABASE_ANON_KEY:
            logger.warning(
                "SUPABASE_URL is set but SUPABASE_ANON_KEY is missing - "
                "Supabase's gateway will likely reject the JWKS request without it."
            )
        jwks_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        headers = {"apikey": SUPABASE_ANON_KEY} if SUPABASE_ANON_KEY else None
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True, lifespan=3600, headers=headers)
    return _jwks_client


class CurrentUser:
    """Represents the authenticated Supabase user for the current request."""
    def __init__(self, id: str, email: str):
        self.id = id
        self.email = email

    def is_admin(self) -> bool:
        return self.email.lower() in ADMIN_EMAILS


def get_current_user(authorization: Optional[str] = Header(None)) -> CurrentUser:
    """FastAPI dependency: extracts and verifies the Supabase-issued JWT from
    the 'Authorization: Bearer <token>' header. Raises 401 if missing/invalid.

    Verification order:
    1. Supabase's JWKS endpoint (SUPABASE_URL) - covers both the new
       asymmetric JWT Signing Keys and an imported legacy secret, and
       tolerates Supabase rotating keys on their end without needing a
       redeploy here.
    2. Legacy shared-secret verification (SUPABASE_JWT_SECRET) - only used
       as a fallback if SUPABASE_URL isn't configured or JWKS lookup fails.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ", 1)[1].strip()

    payload = None
    last_error: Optional[Exception] = None

    jwks_client = _get_jwks_client()
    if jwks_client is not None:
        try:
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256", "HS256"],
                audience="authenticated",
            )
        except Exception as e:
            last_error = e
            logger.warning("JWKS verification failed (%s): %s: %s", SUPABASE_URL, type(e).__name__, e)
    else:
        logger.warning("JWKS client not initialized - SUPABASE_URL is not set.")

    if payload is None and SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except Exception as e:
            last_error = e

    if payload is None:
        if not SUPABASE_URL and not SUPABASE_JWT_SECRET:
            raise HTTPException(
                status_code=500,
                detail="Server auth is not configured. Set SUPABASE_URL (preferred) and/or SUPABASE_JWT_SECRET."
            )
        raise HTTPException(status_code=401, detail=f"Invalid or expired session: {last_error}")

    user_id = payload.get("sub")
    email = payload.get("email", "") or ""
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject (user id)")

    return CurrentUser(id=user_id, email=email)


def require_admin(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Same as get_current_user, but additionally requires the user's email
    to be in ADMIN_EMAILS. Raises 403 otherwise."""
    if not current_user.is_admin():
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
