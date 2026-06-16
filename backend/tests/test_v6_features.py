"""QuotientIQ V6 feature regression tests.

Covers new endpoints added in this iteration:
- Profile/Password/Forgot/Reset
- Notifications + Settings/notifications
- Search
- Onboarding
- Chief of Staff
- Departments
- Agent metrics
- Activity feed
- Integrations registry
- Sessions
- Analytics summary upgrade
- Notification side effects
- Account cascade delete
"""
import io
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://quotient-mvp.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@quotientiq.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['access_token']}"})
    s.user_id = data["id"]
    s.user_email = data["email"]
    return s


def _register(email=None, name="V6 User", company="V6 Co"):
    if not email:
        email = f"v6_{uuid.uuid4().hex[:8]}@quotientiq.com"
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!", "name": name, "company": company})
    assert r.status_code == 200, r.text
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['access_token']}"})
    s.user_id = data["id"]
    s.user_email = email
    return s


@pytest.fixture(scope="module")
def admin():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture
def fresh():
    return _register()


# ---------- Profile / Password ----------
class TestProfilePassword:
    def test_profile_update(self, fresh):
        r = fresh.put(f"{API}/auth/profile", json={"name": "Renamed User", "company": "NewCo"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == "Renamed User"
        assert d["company"] == "NewCo"
        # GET /me to verify persistence
        me = fresh.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["name"] == "Renamed User"
        assert me.json()["company"] == "NewCo"

    def test_password_wrong_current(self, fresh):
        r = fresh.put(f"{API}/auth/password", json={"current_password": "WRONG", "new_password": "Newpass123!"})
        assert r.status_code == 400

    def test_password_too_short(self, fresh):
        r = fresh.put(f"{API}/auth/password", json={"current_password": "Test1234!", "new_password": "short"})
        assert r.status_code in (400, 422)

    def test_password_change_then_login(self, fresh):
        email = fresh.user_email
        r = fresh.put(f"{API}/auth/password", json={"current_password": "Test1234!", "new_password": "Newpass1234!"})
        assert r.status_code == 200, r.text
        # Old password fails
        s = requests.Session()
        r2 = s.post(f"{API}/auth/login", json={"email": email, "password": "Test1234!"})
        assert r2.status_code == 401
        # New password works
        r3 = s.post(f"{API}/auth/login", json={"email": email, "password": "Newpass1234!"})
        assert r3.status_code == 200


# ---------- Forgot / Reset ----------
class TestForgotReset:
    def test_forgot_password_always_200(self):
        # unknown email — no enumeration
        r = requests.post(f"{API}/auth/forgot-password", json={"email": "nobody_xyz@example.com"})
        assert r.status_code == 200

    def test_forgot_then_reset_flow(self):
        u = _register()
        email = u.user_email
        r = requests.post(f"{API}/auth/forgot-password", json={"email": email})
        assert r.status_code == 200
        # If DEV_MODE returns dev_token, use it; else skip the reset half
        body = r.json()
        token = body.get("dev_token") or body.get("token")
        if not token:
            pytest.skip("dev_token not returned (DEV_MODE off)")
        # Invalid token
        bad = requests.post(f"{API}/auth/reset-password", json={"token": "bogus_token_xxx", "new_password": "Reset1234!"})
        assert bad.status_code in (400, 401, 404)
        # Valid token works
        ok = requests.post(f"{API}/auth/reset-password", json={"token": token, "new_password": "Reset1234!"})
        assert ok.status_code == 200, ok.text
        # New password works
        s2 = requests.Session()
        rl = s2.post(f"{API}/auth/login", json={"email": email, "password": "Reset1234!"})
        assert rl.status_code == 200


# ---------- Notifications ----------
class TestNotifications:
    def test_list_unread_count(self, admin):
        r = admin.get(f"{API}/notifications")
        assert r.status_code == 200
        d = r.json()
        items_key = "items" if "items" in d else "notifications"
        unread_key = "unread_count" if "unread_count" in d else "unread"
        assert items_key in d
        assert unread_key in d
        assert isinstance(d[items_key], list)
        assert isinstance(d[unread_key], int)

    def test_mark_read_and_delete_flow(self, admin):
        # Create a notification by creating an agent
        r = admin.post(f"{API}/agents", json={
            "name": f"Notif Test Agent {uuid.uuid4().hex[:4]}",
            "role": "support",
            "industry": "general",
            "personality": "Friendly",
            "system_prompt": "You are helpful"
        })
        assert r.status_code in (200, 201, 402)
        if r.status_code == 402:
            pytest.skip("trial expired for admin")
        list_r = admin.get(f"{API}/notifications")
        assert list_r.status_code == 200
        body = list_r.json()
        items = body.get("items") or body.get("notifications") or []
        if not items:
            pytest.skip("no notifications created")
        nid = items[0]["id"]
        # mark single read
        rr = admin.put(f"{API}/notifications/{nid}/read")
        assert rr.status_code in (200, 204)
        # mark all
        ra = admin.put(f"{API}/notifications/read-all")
        assert ra.status_code in (200, 204)
        # delete
        rd = admin.delete(f"{API}/notifications/{nid}")
        assert rd.status_code in (200, 204)


# ---------- Settings ----------
class TestSettingsNotifications:
    def test_get_returns_defaults_merged(self, fresh):
        r = fresh.get(f"{API}/settings/notifications")
        assert r.status_code == 200
        d = r.json()
        # default keys
        for k in ("agent_tasks", "new_conversations", "team_invites", "knowledge_uploads", "billing_alerts"):
            assert k in d, f"missing default key {k}"

    def test_partial_update_merges(self, fresh):
        # update only one key
        r = fresh.put(f"{API}/settings/notifications", json={"agent_tasks": False})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["agent_tasks"] is False
        # other defaults still present
        assert "new_conversations" in d


# ---------- Search ----------
class TestSearch:
    def test_search_returns_dict(self, admin):
        r = admin.get(f"{API}/search", params={"q": "support"})
        assert r.status_code == 200
        d = r.json()
        # Should return categorized results
        assert isinstance(d, dict)
        # at least one of these keys
        keys = set(d.keys())
        assert keys & {"agents", "conversations", "knowledge", "team", "results"}, f"got keys: {keys}"

    def test_search_type_filter(self, admin):
        r = admin.get(f"{API}/search", params={"q": "a", "types": "agents"})
        assert r.status_code == 200


# ---------- Onboarding ----------
class TestOnboarding:
    def test_status_shape(self, fresh):
        r = fresh.get(f"{API}/onboarding/status")
        assert r.status_code == 200
        d = r.json()
        assert "current_step" in d
        # checks dict
        assert "checks" in d or "company_profile" in d or "industry_installed" in d

    def test_step_advance(self, fresh):
        r = fresh.put(f"{API}/onboarding/step", json={"step": 2, "completed": False, "data": {}})
        assert r.status_code in (200, 204)
        r2 = fresh.get(f"{API}/onboarding/status")
        assert r2.status_code == 200
        # step should be at least 2
        cs = r2.json().get("current_step")
        assert cs is None or cs >= 2

    def test_skip_marks_completed(self, fresh):
        r = fresh.post(f"{API}/onboarding/skip")
        assert r.status_code in (200, 204)


# ---------- Chief of Staff ----------
class TestChief:
    def test_get_creates_chief(self, admin):
        r = admin.get(f"{API}/chief")
        assert r.status_code == 200
        d = r.json()
        assert "workforce_size" in d
        assert "departments" in d
        assert isinstance(d["departments"], (list, dict))

    def test_route_returns_reply(self, admin):
        r = admin.post(f"{API}/chief/route", json={"task": "Summarize current HVAC workforce status"}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "reply" in d
        assert isinstance(d["reply"], str)
        assert len(d["reply"]) > 0
        assert "delegations" in d


# ---------- Departments ----------
class TestDepartments:
    def test_crud(self, admin):
        # List
        r = admin.get(f"{API}/departments")
        assert r.status_code == 200
        body = r.json()
        depts = body if isinstance(body, list) else body.get("departments", [])
        assert isinstance(depts, list)
        # Create
        cr = admin.post(f"{API}/departments", json={"name": f"V6 Dept {uuid.uuid4().hex[:4]}", "description": "test", "agent_ids": [], "color": "#888"})
        assert cr.status_code in (200, 201), cr.text
        did = cr.json().get("id") or cr.json().get("_id")
        assert did
        # Update (PUT requires full body since DepartmentIn.name is required)
        ur = admin.put(f"{API}/departments/{did}", json={"name": "V6 Updated", "description": "updated", "agent_ids": [], "color": "#888"})
        assert ur.status_code in (200, 204)
        # Delete
        dr = admin.delete(f"{API}/departments/{did}")
        assert dr.status_code in (200, 204)

    def test_create_requires_name(self, admin):
        r = admin.post(f"{API}/departments", json={"description": "no name"})
        assert r.status_code in (400, 422)


# ---------- Agent metrics ----------
class TestAgentMetrics:
    def test_metrics_shape(self, admin):
        agents = admin.get(f"{API}/agents").json()
        if not agents:
            pytest.skip("no agents available")
        aid = agents[0]["id"]
        r = admin.get(f"{API}/agents/{aid}/metrics")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("conversations", "messages", "ai_replies", "health_score", "hours_saved", "cost_saved"):
            assert k in d, f"missing metric: {k}"


# ---------- Activity ----------
class TestActivity:
    def test_activity_feed_shape(self, admin):
        r = admin.get(f"{API}/activity")
        assert r.status_code == 200
        d = r.json()
        items = d.get("items", d if isinstance(d, list) else [])
        assert isinstance(items, list)


# ---------- Integrations ----------
class TestIntegrationsRegistry:
    def test_six_integrations(self, admin):
        r = admin.get(f"{API}/integrations")
        assert r.status_code == 200
        d = r.json()
        items = d if isinstance(d, list) else (d.get("integrations") or d.get("items") or [])
        assert len(items) >= 6, f"got {len(items)}"
        by_id = {i.get("id") or i.get("name", "").lower(): i for i in items}
        # openai/stripe must be configured=true
        for key in ("openai", "stripe"):
            match = next((v for k, v in by_id.items() if key in k.lower()), None)
            assert match, f"{key} not in registry"
            assert match.get("configured") is True, f"{key} should be configured: {match}"
        # resend/twilio should be configured=false
        for key in ("resend", "twilio"):
            match = next((v for k, v in by_id.items() if key in k.lower()), None)
            assert match, f"{key} not in registry"
            assert match.get("configured") is False, f"{key} should be unconfigured: {match}"


# ---------- Sessions ----------
class TestSessions:
    def test_get_sessions(self, admin):
        r = admin.get(f"{API}/auth/sessions")
        assert r.status_code == 200


# ---------- Analytics Summary upgrade ----------
class TestAnalyticsSummary:
    def test_summary_has_new_fields(self, admin):
        r = admin.get(f"{API}/analytics/summary")
        assert r.status_code == 200
        d = r.json()
        assert "active_agents" in d
        assert "agent_health" in d
        assert "recent_conversations" in d
        assert isinstance(d["agent_health"], list)
        assert isinstance(d["recent_conversations"], list)


# ---------- Notification side-effects ----------
class TestNotificationSideEffects:
    def test_agent_create_inserts_notification(self):
        u = _register()
        before = u.get(f"{API}/notifications").json().get("unread_count", 0)
        cr = u.post(f"{API}/agents", json={
            "name": "Side Effect Agent",
            "role": "support",
            "industry": "general",
            "personality": "Helpful",
            "system_prompt": "x"
        })
        if cr.status_code == 402:
            pytest.skip("trial gate")
        assert cr.status_code in (200, 201), cr.text
        after = u.get(f"{API}/notifications").json()
        items = after.get("items") or after.get("notifications") or []
        # at least one agent.* type notification
        types = [i.get("type", "") for i in items]
        assert any("agent" in t for t in types), f"no agent notification, types: {types}"


# ---------- Account Cascade Delete ----------
class TestAccountDelete:
    def test_delete_account_cascades(self):
        u = _register()
        email = u.user_email
        # create an agent for the user (so cascade has data)
        u.post(f"{API}/agents", json={"name": "ToDelete", "role": "support", "industry": "general", "personality": "x", "system_prompt": "x"})
        r = u.delete(f"{API}/auth/account")
        assert r.status_code in (200, 204), r.text
        # subsequent /me should fail
        me = u.get(f"{API}/auth/me")
        assert me.status_code in (401, 403, 404)
        # re-login should fail (user gone)
        s2 = requests.Session()
        rl = s2.post(f"{API}/auth/login", json={"email": email, "password": "Test1234!"})
        assert rl.status_code in (401, 404)
