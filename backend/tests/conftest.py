import os

# Must be set before app.core.config / app.core.auth are imported anywhere,
# so pytest picks this up via conftest.py collection order.
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret-for-pacha-tests")
os.environ.setdefault("ADMIN_EMAILS", "admin@pacha-test.com")
