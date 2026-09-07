import jwt
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.domain import FieldEntity, UserProfileEntity, UsageEventEntity

TEST_SECRET = "test-secret-for-pacha-tests"

client = TestClient(app)


def make_token(user_id: str, email: str) -> str:
    return jwt.encode({"sub": user_id, "email": email, "aud": "authenticated"}, TEST_SECRET, algorithm="HS256")


def auth_headers(user_id: str, email: str) -> dict:
    return {"Authorization": f"Bearer {make_token(user_id, email)}"}


@pytest.fixture(autouse=True)
def clean_db():
    """Wipe the relevant tables before each test so tests don't interfere."""
    db = SessionLocal()
    db.query(UsageEventEntity).delete()
    db.query(FieldEntity).delete()
    db.query(UserProfileEntity).delete()
    db.commit()
    db.close()
    yield


def test_fields_endpoint_requires_auth():
    resp = client.get("/api/fields/")
    assert resp.status_code == 401

def test_invalid_token_rejected():
    resp = client.get("/api/fields/", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401

def test_create_and_list_field_for_authenticated_user():
    headers = auth_headers("user-aaa", "alice@example.com")
    payload = {
        "name": "Lote de Alice", "latitude": -38.0, "longitude": -57.55,
        "crop_id": "wheat", "planting_date": "2026-06-10", "variety": "Standard", "maturity_class": "medium"
    }
    resp = client.post("/api/fields/", json=payload, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Lote de Alice"

    resp = client.get("/api/fields/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1

def test_users_only_see_their_own_fields():
    alice_headers = auth_headers("user-alice", "alice@example.com")
    bob_headers = auth_headers("user-bob", "bob@example.com")
    payload = {
        "name": "Solo de Alice", "latitude": -38.0, "longitude": -57.55,
        "crop_id": "maize", "planting_date": "2026-05-10", "variety": "X", "maturity_class": "medium"
    }
    client.post("/api/fields/", json=payload, headers=alice_headers)

    # Bob shouldn't see Alice's field in his list...
    resp = client.get("/api/fields/", headers=bob_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 0

    # ...nor be able to fetch or delete it directly by ID.
    alice_field_id = client.get("/api/fields/", headers=alice_headers).json()[0]["id"]
    resp = client.get(f"/api/fields/{alice_field_id}", headers=bob_headers)
    assert resp.status_code == 404
    resp = client.delete(f"/api/fields/{alice_field_id}", headers=bob_headers)
    assert resp.status_code == 404

def test_free_tier_field_limit_enforced():
    headers = auth_headers("user-limit-test", "limituser@example.com")
    payload_base = {
        "latitude": -38.0, "longitude": -57.55,
        "crop_id": "soybean", "planting_date": "2026-10-15", "variety": "X", "maturity_class": "medium"
    }
    # Free tier limit is 5 - the first 5 should succeed.
    for i in range(5):
        resp = client.post("/api/fields/", json={**payload_base, "name": f"Lote {i}"}, headers=headers)
        assert resp.status_code == 200, f"Field {i} should have succeeded: {resp.text}"

    # The 6th must be blocked.
    resp = client.post("/api/fields/", json={**payload_base, "name": "Lote 6"}, headers=headers)
    assert resp.status_code == 403
    assert "limit" in resp.json()["detail"].lower()

def test_usage_summary_reflects_field_count_and_tier():
    headers = auth_headers("user-usage", "usageuser@example.com")
    payload = {
        "name": "Uno", "latitude": -38.0, "longitude": -57.55,
        "crop_id": "barley", "planting_date": "2026-06-15", "variety": "X", "maturity_class": "medium"
    }
    client.post("/api/fields/", json=payload, headers=headers)
    resp = client.get("/api/fields/usage-summary", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["used"] == 1
    assert body["limit"] == 5
    assert body["tier"] == "free"

def test_admin_endpoints_require_admin_email():
    regular_headers = auth_headers("user-regular", "notadmin@example.com")
    resp = client.get("/api/admin/users", headers=regular_headers)
    assert resp.status_code == 403

def test_admin_can_access_admin_endpoints():
    admin_headers = auth_headers("user-admin", "admin@pacha-test.com")
    resp = client.get("/api/admin/users", headers=admin_headers)
    assert resp.status_code == 200
    resp = client.get("/api/admin/usage-summary", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "total_events" in body
    assert "top_crops" in body

def test_admin_can_change_user_tier():
    admin_headers = auth_headers("user-admin", "admin@pacha-test.com")
    resp = client.patch("/api/admin/users/some-user-id/tier?tier=premium", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["tier"] == "premium"

    # That user should now have the premium limit (50) instead of free (5).
    upgraded_headers = auth_headers("some-user-id", "upgraded@example.com")
    resp = client.get("/api/fields/usage-summary", headers=upgraded_headers)
    assert resp.json()["limit"] == 50
    assert resp.json()["tier"] == "premium"
