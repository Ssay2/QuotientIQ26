"""QuotientIQ backend regression tests."""
import io
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://quotient-mvp.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@quotientiq.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
assert ADMIN_PASSWORD, "ADMIN_PASSWORD env var must be set to run backend tests"


# -------- Fixtures --------
@pytest.fixture(scope="session")
def admin_client():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['access_token']}"})
    s.admin_id = data["id"]
    return s


@pytest.fixture(scope="session")
def fresh_user_client():
    s = requests.Session()
    email = f"test_{uuid.uuid4().hex[:8]}@quotientiq.com"
    r = s.post(f"{API}/auth/register", json={
        "email": email, "password": "Test1234!", "name": "Test User", "company": "Acme"
    })
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['access_token']}"})
    s.user_email = email
    s.user_id = data["id"]
    return s


# -------- Health --------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# -------- Auth flows --------
class TestAuth:
    def test_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert d["role"] == "admin"
        assert isinstance(d["access_token"], str) and len(d["access_token"]) > 20
        # Cookies set
        assert "access_token" in r.cookies

    def test_login_wrong_pw(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_register_and_me(self):
        email = f"test_{uuid.uuid4().hex[:8]}@quotientiq.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Test1234!", "name": "John", "company": "Acme"
        })
        assert r.status_code == 200, r.text
        d = r.json()
        token = d["access_token"]
        assert d["email"] == email
        # /me
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"] == email

    def test_register_duplicate(self):
        email = f"dup_{uuid.uuid4().hex[:8]}@quotientiq.com"
        body = {"email": email, "password": "Test1234!", "name": "Dup", "company": "X"}
        r1 = requests.post(f"{API}/auth/register", json=body)
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/auth/register", json=body)
        assert r2.status_code == 400

    def test_protected_without_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout(self, admin_client):
        r = admin_client.post(f"{API}/auth/logout")
        assert r.status_code == 200
        assert r.json().get("ok") is True


# -------- Seeded agent on register --------
class TestSeededAgent:
    def test_new_user_has_seeded_agent(self, fresh_user_client):
        r = fresh_user_client.get(f"{API}/agents")
        assert r.status_code == 200
        agents = r.json()
        assert len(agents) >= 1, "Newly registered user should have a seeded support agent"
        assert any("Support Agent" in a["name"] for a in agents)

    def test_admin_has_demo_agent(self, admin_client):
        r = admin_client.get(f"{API}/agents")
        assert r.status_code == 200
        agents = r.json()
        assert any("Demo" in a["name"] for a in agents), "Admin should have demo agent seeded"


# -------- Agents CRUD --------
class TestAgents:
    def test_create_get_update_delete(self, admin_client):
        # CREATE
        r = admin_client.post(f"{API}/agents", json={
            "name": "TEST_Agent", "role": "Tester", "category": "QA",
            "icon": "Bot", "description": "desc", "instructions": "Be helpful"
        })
        assert r.status_code == 200, r.text
        agent = r.json()
        assert agent["name"] == "TEST_Agent"
        assert "id" in agent
        agent_id = agent["id"]

        # GET
        g = admin_client.get(f"{API}/agents/{agent_id}")
        assert g.status_code == 200
        assert g.json()["name"] == "TEST_Agent"

        # UPDATE
        u = admin_client.patch(f"{API}/agents/{agent_id}", json={
            "name": "TEST_Agent_v2", "role": "Tester", "category": "QA",
            "icon": "Bot", "description": "d2", "instructions": "new instr"
        })
        assert u.status_code == 200
        assert u.json()["name"] == "TEST_Agent_v2"

        # GET to verify persistence
        g2 = admin_client.get(f"{API}/agents/{agent_id}")
        assert g2.json()["instructions"] == "new instr"

        # DELETE
        d = admin_client.delete(f"{API}/agents/{agent_id}")
        assert d.status_code == 200

        # GET should be 404
        g3 = admin_client.get(f"{API}/agents/{agent_id}")
        assert g3.status_code == 404


# -------- Marketplace --------
class TestMarketplace:
    def test_list_templates(self):
        r = requests.get(f"{API}/marketplace")
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 8, f"Expected 8 marketplace templates, got {len(items)}"
        # required ids
        ids = {i["id"] for i in items}
        for required in ["support", "sales", "recruiter", "marketing", "analyst", "ops", "legal", "finance"]:
            assert required in ids

    def test_install_template(self, admin_client):
        r = admin_client.post(f"{API}/marketplace/install/sales")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["category"] == "Sales"
        assert "id" in d
        # cleanup
        admin_client.delete(f"{API}/agents/{d['id']}")

    def test_install_invalid(self, admin_client):
        r = admin_client.post(f"{API}/marketplace/install/nonexistent")
        assert r.status_code == 404


# -------- PDF Upload --------
def _make_pdf_bytes(text="QuotientIQ test knowledge document. Hello world."):
    """Minimal valid PDF with extractable text."""
    try:
        from reportlab.pdfgen import canvas
        buf = io.BytesIO()
        c = canvas.Canvas(buf)
        c.drawString(100, 750, text)
        c.save()
        return buf.getvalue()
    except ImportError:
        # Fallback: hand-crafted minimal PDF
        return (b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
                b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
                b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
                b"4 0 obj<</Length 56>>stream\nBT /F1 24 Tf 100 700 Td ("
                + text.encode() + b") Tj ET\nendstream endobj\n"
                b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
                b"xref\n0 6\n0000000000 65535 f \ntrailer<</Size 6/Root 1 0 R>>\n%%EOF")


class TestPDFUpload:
    def test_upload_pdf(self, fresh_user_client):
        agents = fresh_user_client.get(f"{API}/agents").json()
        agent_id = agents[0]["id"]
        pdf = _make_pdf_bytes("Acme Co return policy: 30 days. Refunds via support@acme.co.")
        files = {"file": ("policy.pdf", pdf, "application/pdf")}
        r = fresh_user_client.post(f"{API}/agents/{agent_id}/upload", files=files)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["filename"] == "policy.pdf"
        assert d["chars"] > 0
        # Verify agent has file
        g = fresh_user_client.get(f"{API}/agents/{agent_id}")
        assert len(g.json()["knowledge_files"]) >= 1

    def test_upload_unsupported_ext_rejected(self, fresh_user_client):
        # V2 now accepts pdf/docx/txt/md/csv; truly unsupported extensions get 400.
        agents = fresh_user_client.get(f"{API}/agents").json()
        agent_id = agents[0]["id"]
        files = {"file": ("data.exe", b"\x00\x01\x02", "application/octet-stream")}
        r = fresh_user_client.post(f"{API}/agents/{agent_id}/upload", files=files)
        assert r.status_code == 400


# -------- Chat (sync) --------
class TestChat:
    def test_chat_sync_returns_reply(self, admin_client):
        agents = admin_client.get(f"{API}/agents").json()
        # find demo agent
        target = next((a for a in agents if "Demo" in a["name"]), agents[0])
        agent_id = target["id"]
        r = admin_client.post(f"{API}/agents/{agent_id}/chat-sync", json={
            "message": "Say hello in exactly 3 words.",
            "customer_name": "TestUser"
        }, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "conversation_id" in d
        assert "reply" in d
        assert isinstance(d["reply"], str) and len(d["reply"]) > 0, f"Empty reply: {d}"

    def test_conversation_persists(self, admin_client):
        agents = admin_client.get(f"{API}/agents").json()
        agent_id = next((a for a in agents if "Demo" in a["name"]), agents[0])["id"]
        r1 = admin_client.post(f"{API}/agents/{agent_id}/chat-sync", json={
            "message": "Hi", "customer_name": "PersistTest"
        }, timeout=60)
        assert r1.status_code == 200
        conv_id = r1.json()["conversation_id"]
        c = admin_client.get(f"{API}/conversations/{conv_id}")
        assert c.status_code == 200
        msgs = c.json()["messages"]
        assert len(msgs) >= 2
        assert any(m["role"] == "user" for m in msgs)
        assert any(m["role"] == "assistant" for m in msgs)


# -------- Analytics --------
class TestAnalytics:
    def test_summary_fields(self, admin_client):
        r = admin_client.get(f"{API}/analytics/summary")
        assert r.status_code == 200
        d = r.json()
        for key in ["agents", "conversations", "messages", "tasks_completed",
                    "hours_saved", "cost_saved", "performance_score", "series"]:
            assert key in d, f"Missing {key}"
        assert isinstance(d["series"], list)


# -------- V2: Company Profile (Memory layer) --------
class TestCompanyProfile:
    def test_default_profile_for_new_user(self, fresh_user_client):
        r = fresh_user_client.get(f"{API}/company-profile")
        assert r.status_code == 200, r.text
        d = r.json()
        # company name auto-populated from registration company "Acme"
        assert d.get("company_name") == "Acme"
        for k in ["audience", "products", "services", "pricing", "brand_voice", "policies"]:
            assert k in d

    def test_put_profile_upserts_all_fields(self, fresh_user_client):
        payload = {
            "company_name": "TEST_ProfCo",
            "audience": "SMBs",
            "products": "Widgets",
            "services": "Consulting",
            "pricing": "$99/mo",
            "brand_voice": "Friendly, direct",
            "policies": "30-day refund",
        }
        r = fresh_user_client.put(f"{API}/company-profile", json=payload)
        assert r.status_code == 200, r.text
        # GET to verify persistence
        g = fresh_user_client.get(f"{API}/company-profile")
        assert g.status_code == 200
        d = g.json()
        for k, v in payload.items():
            assert d[k] == v, f"Mismatch on {k}: {d.get(k)} != {v}"

        # Second PUT updates same doc (one-per-user upsert)
        payload2 = {**payload, "company_name": "TEST_ProfCo_v2"}
        r2 = fresh_user_client.put(f"{API}/company-profile", json=payload2)
        assert r2.status_code == 200
        g2 = fresh_user_client.get(f"{API}/company-profile").json()
        assert g2["company_name"] == "TEST_ProfCo_v2"


# -------- V2: Text & URL ingestion --------
class TestIngestText:
    def test_ingest_text_appends(self, fresh_user_client):
        agent_id = fresh_user_client.get(f"{API}/agents").json()[0]["id"]
        r = fresh_user_client.post(
            f"{API}/agents/{agent_id}/ingest-text",
            json={"label": "FAQ", "text": "Q: hours? A: 9-5 M-F"},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["chars"] > 0

    def test_ingest_empty_text_rejected(self, fresh_user_client):
        agent_id = fresh_user_client.get(f"{API}/agents").json()[0]["id"]
        r = fresh_user_client.post(
            f"{API}/agents/{agent_id}/ingest-text",
            json={"label": "x", "text": "   "},
        )
        assert r.status_code == 400


class TestIngestUrl:
    def test_ingest_url_success(self, fresh_user_client):
        agent_id = fresh_user_client.get(f"{API}/agents").json()[0]["id"]
        r = fresh_user_client.post(
            f"{API}/agents/{agent_id}/ingest-url",
            json={"url": "https://example.com"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["chars"] > 0

    def test_ingest_bad_url_rejected(self, fresh_user_client):
        agent_id = fresh_user_client.get(f"{API}/agents").json()[0]["id"]
        r = fresh_user_client.post(
            f"{API}/agents/{agent_id}/ingest-url",
            json={"url": "http://nonexistent-domain-abc-xyz-12345.invalid"},
            timeout=30,
        )
        assert r.status_code == 400


# -------- V2: Multi-format upload (DOCX, TXT) --------
def _make_docx_bytes(text="Acme docx knowledge: warranty is 1 year."):
    from docx import Document as Doc
    d = Doc()
    d.add_paragraph(text)
    buf = io.BytesIO()
    d.save(buf)
    return buf.getvalue()


class TestMultiFormatUpload:
    def test_upload_docx(self, fresh_user_client):
        agent_id = fresh_user_client.get(f"{API}/agents").json()[0]["id"]
        docx_bytes = _make_docx_bytes()
        r = fresh_user_client.post(
            f"{API}/agents/{agent_id}/upload",
            files={"file": ("policy.docx", docx_bytes,
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["chars"] > 0

    def test_upload_txt(self, fresh_user_client):
        agent_id = fresh_user_client.get(f"{API}/agents").json()[0]["id"]
        r = fresh_user_client.post(
            f"{API}/agents/{agent_id}/upload",
            files={"file": ("notes.txt", b"Some plain text knowledge.", "text/plain")},
        )
        assert r.status_code == 200, r.text
        assert r.json()["chars"] > 0

    def test_upload_unsupported_rejected(self, fresh_user_client):
        agent_id = fresh_user_client.get(f"{API}/agents").json()[0]["id"]
        r = fresh_user_client.post(
            f"{API}/agents/{agent_id}/upload",
            files={"file": ("data.xyz", b"x", "application/octet-stream")},
        )
        assert r.status_code == 400


# -------- V2: Org Chart --------
class TestOrgTree:
    def test_tree_structure_and_reparent(self, admin_client):
        # Create two TEST_ agents
        a = admin_client.post(f"{API}/agents", json={"name": "TEST_OrgParent", "role": "Lead"}).json()
        b = admin_client.post(f"{API}/agents", json={"name": "TEST_OrgChild", "role": "Member"}).json()
        try:
            # Reparent b under a
            p = admin_client.patch(f"{API}/agents/{b['id']}", json={"parent_agent_id": a["id"]})
            assert p.status_code == 200, p.text
            assert p.json().get("parent_agent_id") == a["id"]

            # Tree
            t = admin_client.get(f"{API}/org/tree")
            assert t.status_code == 200
            data = t.json()
            assert "roots" in data and "count" in data
            assert data["count"] >= 2
            # Find a in roots and ensure b is a child
            def find(nodes, target):
                for n in nodes:
                    if n["id"] == target:
                        return n
                    sub = find(n.get("children", []), target)
                    if sub:
                        return sub
                return None
            anode = find(data["roots"], a["id"])
            assert anode is not None
            assert any(c["id"] == b["id"] for c in anode.get("children", []))
        finally:
            admin_client.delete(f"{API}/agents/{b['id']}")
            admin_client.delete(f"{API}/agents/{a['id']}")

    def test_self_parent_rejected(self, admin_client):
        a = admin_client.post(f"{API}/agents", json={"name": "TEST_OrgSelf", "role": "X"}).json()
        try:
            r = admin_client.patch(f"{API}/agents/{a['id']}", json={"parent_agent_id": a["id"]})
            assert r.status_code == 400
        finally:
            admin_client.delete(f"{API}/agents/{a['id']}")

    def test_invalid_parent_rejected(self, admin_client):
        a = admin_client.post(f"{API}/agents", json={"name": "TEST_OrgBad", "role": "X"}).json()
        try:
            # nonexistent but valid ObjectId
            bogus = "507f1f77bcf86cd799439011"
            r = admin_client.patch(f"{API}/agents/{a['id']}", json={"parent_agent_id": bogus})
            assert r.status_code == 400
        finally:
            admin_client.delete(f"{API}/agents/{a['id']}")


# -------- V2: Chat uses company profile + team context --------
class TestChatV2Context:
    def test_chat_uses_profile_and_team(self, fresh_user_client):
        # Save company profile
        prof = {
            "company_name": "ProfTest Co",
            "audience": "small businesses",
            "products": "AI agents",
            "services": "consulting",
            "pricing": "$99/mo",
            "brand_voice": "friendly",
            "policies": "30-day refund",
        }
        r = fresh_user_client.put(f"{API}/company-profile", json=prof)
        assert r.status_code == 200

        # Create two agents A and B
        a = fresh_user_client.post(f"{API}/agents", json={"name": "TEST_AgentAlpha", "role": "Support"}).json()
        b = fresh_user_client.post(f"{API}/agents", json={"name": "TEST_AgentBravoUnique", "role": "Sales"}).json()
        try:
            # Ask about company
            r1 = fresh_user_client.post(
                f"{API}/agents/{a['id']}/chat-sync",
                json={"message": "What company are we? Reply with the company name only."},
                timeout=90,
            )
            assert r1.status_code == 200, r1.text
            reply1 = r1.json()["reply"]
            assert "ProfTest" in reply1, f"Expected company name in reply, got: {reply1!r}"

            # Ask about team
            r2 = fresh_user_client.post(
                f"{API}/agents/{a['id']}/chat-sync",
                json={"message": "Who else is on my team? List their names."},
                timeout=90,
            )
            assert r2.status_code == 200, r2.text
            reply2 = r2.json()["reply"]
            assert "AgentBravoUnique" in reply2 or "Bravo" in reply2, f"Expected teammate name in reply, got: {reply2!r}"
        finally:
            fresh_user_client.delete(f"{API}/agents/{a['id']}")
            fresh_user_client.delete(f"{API}/agents/{b['id']}")


# ==================== V3 ====================

# -------- V3: Brute-force lockout --------
class TestBruteForceLockout:
    def test_lockout_after_5_failures(self):
        # Use fully unique email so admin tests aren't affected.
        email = f"lockouttest_{uuid.uuid4().hex[:10]}@example.com"
        # Register the user first so the email "exists" (the lockout should
        # work regardless, but verifies success-clears-counter path).
        rr = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Correct1234!", "name": "Lock", "company": "L"
        })
        assert rr.status_code == 200, rr.text

        # 5 failed attempts → all should be 401.
        for i in range(5):
            r = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrong"})
            assert r.status_code == 401, f"attempt {i + 1}: expected 401, got {r.status_code} {r.text}"

        # 6th attempt should be 429.
        r6 = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrong"})
        assert r6.status_code == 429, f"expected 429 on 6th, got {r6.status_code} {r6.text}"
        # Body mentions retry / minutes
        body6 = r6.text.lower()
        assert "try again" in body6 or "minute" in body6 or "too many" in body6

        # Even a correct password should be blocked while locked.
        r_correct_locked = requests.post(f"{API}/auth/login", json={"email": email, "password": "Correct1234!"})
        assert r_correct_locked.status_code == 429

        # Cleanup login_attempts so subsequent runs / admin aren't impacted.
        # Load backend .env to find the live MongoDB connection.
        from pymongo import MongoClient
        env_path = "/app/backend/.env"
        mongo_url = "mongodb://localhost:27017"
        db_name = "quotientiq_db"
        try:
            with open(env_path) as f:
                for line in f:
                    if line.startswith("MONGO_URL"):
                        mongo_url = line.split("=", 1)[1].strip().strip('"')
                    elif line.startswith("DB_NAME"):
                        db_name = line.split("=", 1)[1].strip().strip('"')
        except FileNotFoundError:
            pass
        m = MongoClient(mongo_url)
        m[db_name].login_attempts.delete_many({"identifier": f"email:{email}"})
        m.close()

        # After clear, correct password works → success path & clears counter.
        r_ok = requests.post(f"{API}/auth/login", json={"email": email, "password": "Correct1234!"})
        assert r_ok.status_code == 200, r_ok.text


# -------- V3: Billing (Stripe) --------
class TestBilling:
    def test_billing_me_default_free(self, fresh_user_client):
        r = fresh_user_client.get(f"{API}/billing/me")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["plan"] == "free"
        ids = {p["id"] for p in d["available_plans"]}
        assert "starter" in ids and "professional" in ids
        # Each plan has amount + name
        for p in d["available_plans"]:
            assert "amount" in p and "name" in p

    def test_checkout_invalid_plan_400(self, fresh_user_client):
        r = fresh_user_client.post(f"{API}/billing/checkout",
                                   json={"plan_id": "nonexistent", "origin_url": BASE_URL})
        assert r.status_code == 400

    def test_checkout_starter_returns_stripe_url(self, fresh_user_client):
        r = fresh_user_client.post(
            f"{API}/billing/checkout",
            json={"plan_id": "starter", "origin_url": BASE_URL},
            timeout=30,
        )
        # 200 with stripe.com url, OR 502/503 if Stripe key isn't usable in this env.
        if r.status_code in (502, 503):
            pytest.skip(f"Stripe not configured in env: {r.status_code} {r.text}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert "url" in d and "session_id" in d
        assert "stripe.com" in d["url"], f"Expected stripe.com in url, got {d['url']}"

        # Status endpoint should return 200 (no plan yet)
        sid = d["session_id"]
        s = fresh_user_client.get(f"{API}/billing/status/{sid}", timeout=30)
        # Stripe may return 200 with payment_status unpaid; could 502 if stripe down
        if s.status_code == 502:
            pytest.skip(f"Stripe status flaky: {s.text}")
        assert s.status_code == 200, s.text
        sd = s.json()
        assert sd.get("payment_status") != "paid"

        # Plan should remain 'free' because not paid
        me = fresh_user_client.get(f"{API}/billing/me").json()
        assert me["plan"] == "free"

    def test_status_unknown_session_404(self, fresh_user_client):
        r = fresh_user_client.get(f"{API}/billing/status/cs_test_doesnotexist_{uuid.uuid4().hex}")
        assert r.status_code == 404

    def test_status_cross_user_isolation(self, fresh_user_client):
        # User A creates a session
        r = fresh_user_client.post(
            f"{API}/billing/checkout",
            json={"plan_id": "starter", "origin_url": BASE_URL},
            timeout=30,
        )
        if r.status_code in (502, 503):
            pytest.skip("Stripe not configured")
        assert r.status_code == 200, r.text
        sid = r.json()["session_id"]

        # User B (fresh) tries to query → 404
        s = requests.Session()
        email = f"other_{uuid.uuid4().hex[:8]}@quotientiq.com"
        rr = s.post(f"{API}/auth/register", json={
            "email": email, "password": "Other1234!", "name": "Other", "company": "X"
        })
        assert rr.status_code == 200
        s.headers["Authorization"] = f"Bearer {rr.json()['access_token']}"
        bad = s.get(f"{API}/billing/status/{sid}")
        assert bad.status_code == 404


# -------- V3: _parse_delegations unit --------
class TestParseDelegations:
    def test_parse_extracts_and_cleans(self):
        # Import directly from server module
        import sys
        sys.path.insert(0, "/app/backend")
        from server import _parse_delegations

        text = (
            "Hello team!\n\n"
            "[DELEGATE: HR Person | how many vacation days do new hires get?]\n"
            "Some middle text.\n"
            "[DELEGATE:  Finance  |   what's the Q3 budget? ]\n"
            "Goodbye!"
        )
        cleaned, dels = _parse_delegations(text)
        assert len(dels) == 2
        assert dels[0]["agent"] == "HR Person"
        assert dels[0]["question"] == "how many vacation days do new hires get?"
        assert dels[1]["agent"] == "Finance"
        assert dels[1]["question"] == "what's the Q3 budget?"
        assert "[DELEGATE" not in cleaned
        assert "Hello team!" in cleaned
        assert "Goodbye!" in cleaned

    def test_parse_no_delegation(self):
        import sys
        sys.path.insert(0, "/app/backend")
        from server import _parse_delegations
        cleaned, dels = _parse_delegations("Plain reply, no markers.")
        assert dels == []
        assert cleaned == "Plain reply, no markers."


# -------- V3: Multi-agent delegation E2E --------
class TestMultiAgentDelegation:
    def test_delegation_stitched_in_chat(self, fresh_user_client):
        # Install Sales + HR templates from marketplace
        sales_r = fresh_user_client.post(f"{API}/marketplace/install/sales")
        hr_r = fresh_user_client.post(f"{API}/marketplace/install/recruiter")
        assert sales_r.status_code == 200, sales_r.text
        assert hr_r.status_code == 200, hr_r.text
        sales = sales_r.json()
        hr = hr_r.json()

        # Rename HR agent to 'HR Person' for predictable matching
        hr_renamed = fresh_user_client.patch(f"{API}/agents/{hr['id']}", json={
            "name": "HR Person", "role": hr.get("role", "Recruiter"),
            "category": hr.get("category", "HR"),
            "icon": hr.get("icon", "Bot"), "description": hr.get("description", ""),
            "instructions": "You are the HR Person. New hires receive 15 vacation days per year. Be concise.",
        })
        assert hr_renamed.status_code == 200, hr_renamed.text

        # Patch Sales agent A to instruct delegation
        sales_upd = fresh_user_client.patch(f"{API}/agents/{sales['id']}", json={
            "name": "Salesperson",
            "role": sales.get("role", "Sales"),
            "category": sales.get("category", "Sales"),
            "icon": sales.get("icon", "Bot"),
            "description": sales.get("description", ""),
            "instructions": (
                "You are a Salesperson. When asked about HR or hiring, "
                "always end your reply with [DELEGATE: HR Person | <restate the user question>]. "
                "Always include such a marker for HR-related questions."
            ),
        })
        assert sales_upd.status_code == 200, sales_upd.text

        try:
            r = fresh_user_client.post(
                f"{API}/agents/{sales['id']}/chat-sync",
                json={"message": "how many vacation days do new hires get?"},
                timeout=120,
            )
            assert r.status_code == 200, r.text
            reply = r.json()["reply"]
            # Stitched "Asked HR Person" block
            assert "Asked" in reply and "HR Person" in reply, (
                f"Expected stitched 'Asked HR Person' block. Got: {reply!r}"
            )
            # Likely contains the actual answer about vacation days
            assert ("15" in reply or "vacation" in reply.lower()), (
                f"Expected HR answer content in stitched block. Got: {reply!r}"
            )
        finally:
            fresh_user_client.delete(f"{API}/agents/{sales['id']}")
            fresh_user_client.delete(f"{API}/agents/{hr['id']}")


# -------- V3: Embed flow --------
class TestEmbed:
    def test_embed_enable_disable_and_public_chat(self, fresh_user_client):
        agent = fresh_user_client.get(f"{API}/agents").json()[0]
        agent_id = agent["id"]

        # Enable embed → token returned
        e = fresh_user_client.post(f"{API}/agents/{agent_id}/embed-enable")
        assert e.status_code == 200, e.text
        token = e.json()["embed_token"]
        assert isinstance(token, str) and len(token) > 10

        # Public GET /api/embed/{token}/agent (NO auth)
        pub = requests.get(f"{API}/embed/{token}/agent")
        assert pub.status_code == 200, pub.text
        meta = pub.json()
        assert meta["name"] == agent["name"]
        assert meta["agent_id"] == agent_id

        # Public POST chat (NO auth)
        chat = requests.post(f"{API}/embed/{token}/chat",
                             json={"message": "Hi, say hello in 5 words"}, timeout=60)
        assert chat.status_code == 200, chat.text
        d = chat.json()
        assert "reply" in d and isinstance(d["reply"], str) and len(d["reply"]) > 0
        assert "visitor_id" in d and d["visitor_id"].startswith("v_")

        # Invalid token → 404
        bad = requests.get(f"{API}/embed/totally_invalid_token_xyz/agent")
        assert bad.status_code == 404
        bad2 = requests.post(f"{API}/embed/totally_invalid_token_xyz/chat",
                             json={"message": "hi"})
        assert bad2.status_code == 404

        # Disable
        d = fresh_user_client.post(f"{API}/agents/{agent_id}/embed-disable")
        assert d.status_code == 200
        # After disable, public endpoint 404
        post = requests.get(f"{API}/embed/{token}/agent")
        assert post.status_code == 404


# -------- V3: Widget loader (static asset) --------
class TestWidgetLoader:
    def test_widget_js_served(self):
        r = requests.get(f"{BASE_URL}/widget.js", timeout=10)
        assert r.status_code == 200, r.text[:200]
        # IIFE / self-invoking pattern present
        body = r.text
        assert "(function" in body or "(()" in body or "function(" in body, (
            f"widget.js does not look like an IIFE. First 200 chars: {body[:200]!r}"
        )
        # Mentions data-quotientiq-token attribute that EmbedSection emits
        assert "quotientiq" in body.lower()



# -------- V4: Conversations Explorer --------
class TestConversationsExplorer:
    def test_list_conversations_basic_and_filters(self, fresh_user_client):
        # Create an agent
        r = fresh_user_client.post(f"{API}/agents", json={"name": "ConvTestAgent", "instructions": "Reply hi.", "icon": "Bot", "category": "Customer Service"})
        assert r.status_code == 200
        agent_id = r.json()["id"]
        # Create a conversation via chat-sync (LLM call may take a few seconds)
        r = fresh_user_client.post(f"{API}/agents/{agent_id}/chat-sync", json={"message": "Hello", "customer_name": "Alice"}, timeout=120)
        assert r.status_code == 200, r.text
        conv_id = r.json()["conversation_id"]

        # List
        r = fresh_user_client.get(f"{API}/conversations")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "conversations" in data and isinstance(data["conversations"], list)
        assert data["count"] >= 1
        # Find our conv
        ours = [c for c in data["conversations"] if c["id"] == conv_id]
        assert len(ours) == 1, f"Expected our conv in list, got: {data['conversations']}"
        c = ours[0]
        for field in ("id", "agent_id", "customer_name", "source", "updated_at", "created_at", "last_role", "last_preview", "message_count", "agent"):
            assert field in c, f"Missing {field}"
        assert c["customer_name"] == "Alice"
        assert c["message_count"] >= 1
        assert c["agent"] is not None and c["agent"]["name"] == "ConvTestAgent"
        assert len(c["last_preview"]) <= 160

        # agent_id filter
        r = fresh_user_client.get(f"{API}/conversations", params={"agent_id": agent_id})
        assert r.status_code == 200
        assert all(c["agent_id"] == agent_id for c in r.json()["conversations"])

        # unknown source returns empty
        r = fresh_user_client.get(f"{API}/conversations", params={"source": "nonexistent_xyz"})
        assert r.status_code == 200
        assert r.json()["conversations"] == []

    def test_export_conversation(self, fresh_user_client):
        r = fresh_user_client.post(f"{API}/agents", json={"name": "ExportAgent", "instructions": "ok"})
        agent_id = r.json()["id"]
        r = fresh_user_client.post(f"{API}/agents/{agent_id}/chat-sync", json={"message": "ping"}, timeout=120)
        conv_id = r.json()["conversation_id"]
        r = fresh_user_client.get(f"{API}/conversations/{conv_id}/export")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == conv_id
        assert "messages" in d and len(d["messages"]) >= 1
        # 404 for non-existent
        from bson import ObjectId
        r2 = fresh_user_client.get(f"{API}/conversations/{ObjectId()}/export")
        assert r2.status_code == 404

    def test_delete_conversation_and_isolation(self, fresh_user_client, admin_client):
        # Create conv for fresh user
        r = fresh_user_client.post(f"{API}/agents", json={"name": "DelAgent"})
        agent_id = r.json()["id"]
        r = fresh_user_client.post(f"{API}/agents/{agent_id}/chat-sync", json={"message": "hi"}, timeout=120)
        conv_id = r.json()["conversation_id"]

        # Admin (different user) cannot delete
        r = admin_client.delete(f"{API}/conversations/{conv_id}")
        assert r.status_code == 404

        # Owner deletes
        r = fresh_user_client.delete(f"{API}/conversations/{conv_id}")
        assert r.status_code == 200
        # Verify gone
        r = fresh_user_client.get(f"{API}/conversations/{conv_id}/export")
        assert r.status_code == 404
        # Second delete returns 404
        r = fresh_user_client.delete(f"{API}/conversations/{conv_id}")
        assert r.status_code == 404


# -------- V4: Embed rate limiting --------
class TestEmbedRateLimit:
    def test_per_visitor_40_then_429_other_visitor_ok(self, fresh_user_client):
        # Fresh agent to avoid clobbering existing embed_token
        r = fresh_user_client.post(f"{API}/agents", json={"name": "RateLimitAgent", "instructions": "Always reply with the single word: ok"})
        agent_id = r.json()["id"]
        r = fresh_user_client.post(f"{API}/agents/{agent_id}/embed-enable")
        assert r.status_code == 200
        token = r.json()["embed_token"]

        # Clean any stale hits for this token
        # We can't access mongo directly here; instead use a unique visitor_id per test
        v1 = f"v_test_{uuid.uuid4().hex[:8]}"
        v2 = f"v_test_{uuid.uuid4().hex[:8]}"

        # Send 40 requests for v1. Use plain requests (no auth) since /embed is public.
        # Skip the LLM call by patching? No — we must hit the real endpoint. 40 LLM calls is expensive.
        # Instead, increment by inserting embed_hits directly is not possible from test, so we send real requests.
        # To keep this within reasonable time, we send 40 minimal messages.
        ok_count = 0
        last_status = None
        for i in range(40):
            rr = requests.post(f"{API}/embed/{token}/chat", json={"message": "ok", "visitor_id": v1}, timeout=120)
            last_status = rr.status_code
            if rr.status_code == 200:
                ok_count += 1
            else:
                # If we hit an unexpected error early, fail fast
                pytest.fail(f"Request {i+1} for v1 failed: {rr.status_code} {rr.text[:200]}")
        assert ok_count == 40, f"Expected 40 OK, got {ok_count}"

        # 41st request for v1 should be 429
        rr = requests.post(f"{API}/embed/{token}/chat", json={"message": "ok", "visitor_id": v1}, timeout=30)
        assert rr.status_code == 429, f"Expected 429 for v1's 41st, got {rr.status_code}: {rr.text[:200]}"

        # Different visitor still works (proves per-visitor scoping)
        rr = requests.post(f"{API}/embed/{token}/chat", json={"message": "ok", "visitor_id": v2}, timeout=120)
        assert rr.status_code == 200, f"Different visitor should still work, got {rr.status_code}: {rr.text[:200]}"


# -------- V4: TTL index on embed_hits --------
class TestEmbedHitsTTL:
    def test_ttl_index_exists(self):
        """Verify TTL index on embed_hits.ts_dt with expireAfterSeconds=3600."""
        from pymongo import MongoClient
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")
        if not mongo_url or not db_name:
            pytest.skip("MONGO_URL/DB_NAME not available to inspect indexes")
        client = MongoClient(mongo_url)
        try:
            db = client[db_name]
            indexes = list(db.embed_hits.list_indexes())
            ttl = [i for i in indexes if i.get("expireAfterSeconds") is not None and "ts_dt" in i.get("key", {})]
            assert ttl, f"No TTL index on embed_hits.ts_dt. Indexes: {indexes}"
            assert ttl[0]["expireAfterSeconds"] == 3600, f"Expected TTL=3600, got {ttl[0]['expireAfterSeconds']}"
        finally:
            client.close()


# ==================== V5 ====================

INDUSTRY_IDS = ["hvac", "plumbing", "auto", "law", "real_estate"]


def _mongo():
    from pymongo import MongoClient
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "quotientiq_db")
    return MongoClient(mongo_url), db_name


# -------- V5: Industry templates --------
class TestIndustries:
    def test_list_industries(self):
        r = requests.get(f"{API}/industries")
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        ids = {i["id"] for i in items}
        for required in INDUSTRY_IDS:
            assert required in ids, f"Missing industry {required}; got {ids}"
        for it in items:
            for k in ("id", "name", "tagline", "agent_count"):
                assert k in it, f"Industry {it.get('id')} missing {k}"
            assert isinstance(it["agent_count"], int) and it["agent_count"] > 0

    def test_install_hvac_creates_agents(self, fresh_user_client):
        before = len(fresh_user_client.get(f"{API}/agents").json())
        r = fresh_user_client.post(f"{API}/industries/hvac/install")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["industry_id"] == "hvac"
        assert d["agents_created"] >= 1
        assert len(d["agent_ids"]) == d["agents_created"]
        after = len(fresh_user_client.get(f"{API}/agents").json())
        assert after - before == d["agents_created"]

    def test_install_unknown_industry_404(self, fresh_user_client):
        r = fresh_user_client.post(f"{API}/industries/nonexistent_xyz/install")
        assert r.status_code == 404

    def test_install_merges_profile_without_clobbering(self, fresh_user_client):
        # Pre-set a custom company_name
        fresh_user_client.put(f"{API}/company-profile", json={
            "company_name": "MyExistingCo", "audience": "", "products": "",
            "services": "", "pricing": "", "brand_voice": "", "policies": ""
        })
        r = fresh_user_client.post(f"{API}/industries/plumbing/install")
        assert r.status_code == 200
        prof = fresh_user_client.get(f"{API}/company-profile").json()
        assert prof["company_name"] == "MyExistingCo", "Existing non-empty field was clobbered"
        # An empty field should now be filled from template
        assert (prof.get("audience") or "").strip(), "Empty field should be filled by template"


# -------- V5: Trial / Billing --------
class TestTrial:
    def test_new_user_has_14_day_trial(self, fresh_user_client):
        r = fresh_user_client.get(f"{API}/billing/me")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["plan"] == "free"
        assert "trial_days_remaining" in d
        assert 12 <= d["trial_days_remaining"] <= 14
        assert d.get("is_active") is True

    def test_paid_plan_returns_9999(self, fresh_user_client):
        client, db_name = _mongo()
        try:
            client[db_name].users.update_one(
                {"email": fresh_user_client.user_email}, {"$set": {"plan": "starter"}}
            )
            d = fresh_user_client.get(f"{API}/billing/me").json()
            assert d["plan"] == "starter"
            assert d["trial_days_remaining"] == 9999
            assert d["is_active"] is True
        finally:
            client[db_name].users.update_one(
                {"email": fresh_user_client.user_email}, {"$set": {"plan": "free"}}
            )
            client.close()


# -------- V5: Paywall enforcement --------
class TestPaywall:
    def test_trial_expired_blocks_then_paid_unblocks(self):
        # Create fresh user
        s = requests.Session()
        email = f"paywall_{uuid.uuid4().hex[:8]}@quotientiq.com"
        rr = s.post(f"{API}/auth/register", json={
            "email": email, "password": "Test1234!", "name": "PW", "company": "Co"
        })
        assert rr.status_code == 200, rr.text
        token = rr.json()["access_token"]
        s.headers["Authorization"] = f"Bearer {token}"

        # Sanity: works while trial is active
        r = s.post(f"{API}/agents", json={"name": "TEST_PW_OK", "role": "x"})
        assert r.status_code == 200
        s.delete(f"{API}/agents/{r.json()['id']}")

        # Expire the trial by setting trial_started_at to 20 days ago
        client, db_name = _mongo()
        try:
            from datetime import datetime, timedelta, timezone
            past = (datetime.now(timezone.utc) - timedelta(days=20)).isoformat()
            client[db_name].users.update_one(
                {"email": email}, {"$set": {"trial_started_at": past, "plan": "free"}}
            )

            # Verify billing reflects expiry
            d = s.get(f"{API}/billing/me").json()
            assert d.get("is_active") is False, f"Expected is_active=False after expiry: {d}"

            # Agent create blocked
            r = s.post(f"{API}/agents", json={"name": "TEST_blocked", "role": "x"})
            assert r.status_code == 402, f"Expected 402, got {r.status_code} {r.text}"

            # Industry install blocked
            r = s.post(f"{API}/industries/hvac/install")
            assert r.status_code == 402, f"Expected 402 on industry install, got {r.status_code} {r.text}"

            # Simulate payment: plan='starter'
            client[db_name].users.update_one({"email": email}, {"$set": {"plan": "starter"}})

            # Now agent create works
            r = s.post(f"{API}/agents", json={"name": "TEST_paid", "role": "x"})
            assert r.status_code == 200, r.text
            s.delete(f"{API}/agents/{r.json()['id']}")

            # Industry install works
            r = s.post(f"{API}/industries/auto/install")
            assert r.status_code == 200, r.text
        finally:
            client.close()


# -------- V5: Team --------
class TestTeam:
    def test_get_team_for_fresh_user(self, fresh_user_client):
        r = fresh_user_client.get(f"{API}/team")
        assert r.status_code == 200, r.text
        d = r.json()
        assert "members" in d
        # Fresh user is owner of their org with themselves as a member
        emails = [m.get("email") for m in d["members"]]
        assert fresh_user_client.user_email in emails

    def test_invite_member_success_and_persist(self, admin_client):
        invitee = f"invite_{uuid.uuid4().hex[:8]}@example.com"
        try:
            r = admin_client.post(f"{API}/team/invite", json={"email": invitee, "role": "employee"})
            assert r.status_code == 200, r.text
            d = r.json()
            assert d["email"] == invitee
            assert d["role"] == "employee"
            # Verify in /team
            team = admin_client.get(f"{API}/team").json()
            emails = [m["email"] for m in team["members"]]
            assert invitee in emails
        finally:
            admin_client.delete(f"{API}/team/{invitee}")

    def test_invite_owner_role_rejected(self, admin_client):
        r = admin_client.post(f"{API}/team/invite", json={
            "email": f"owner_{uuid.uuid4().hex[:6]}@x.com", "role": "owner"
        })
        assert r.status_code == 400

    def test_invite_invalid_role_rejected(self, admin_client):
        r = admin_client.post(f"{API}/team/invite", json={
            "email": f"bad_{uuid.uuid4().hex[:6]}@x.com", "role": "superuser"
        })
        assert r.status_code == 400

    def test_invite_existing_member_rejected(self, admin_client):
        invitee = f"dup_{uuid.uuid4().hex[:8]}@example.com"
        try:
            r1 = admin_client.post(f"{API}/team/invite", json={"email": invitee, "role": "employee"})
            assert r1.status_code == 200, r1.text
            r2 = admin_client.post(f"{API}/team/invite", json={"email": invitee, "role": "manager"})
            assert r2.status_code == 400
        finally:
            admin_client.delete(f"{API}/team/{invitee}")

    def test_remove_member(self, admin_client):
        invitee = f"rem_{uuid.uuid4().hex[:8]}@example.com"
        r = admin_client.post(f"{API}/team/invite", json={"email": invitee, "role": "employee"})
        assert r.status_code == 200
        r = admin_client.delete(f"{API}/team/{invitee}")
        assert r.status_code == 200
        team = admin_client.get(f"{API}/team").json()
        assert invitee not in [m["email"] for m in team["members"]]

    def test_non_admin_cannot_invite(self, fresh_user_client):
        # Force role to employee for this user
        client, db_name = _mongo()
        try:
            client[db_name].users.update_one(
                {"email": fresh_user_client.user_email}, {"$set": {"role": "employee"}}
            )
            r = fresh_user_client.post(f"{API}/team/invite", json={
                "email": f"x_{uuid.uuid4().hex[:6]}@x.com", "role": "employee"
            })
            assert r.status_code == 403, r.text
            r = fresh_user_client.delete(f"{API}/team/some@x.com")
            assert r.status_code == 403
        finally:
            client[db_name].users.update_one(
                {"email": fresh_user_client.user_email}, {"$set": {"role": "owner"}}
            )
            client.close()


# -------- V5: Audit logs --------
class TestAuditLogs:
    def test_audit_log_records_actions(self, fresh_user_client):
        # Perform actions that should write audit logs
        a = fresh_user_client.post(f"{API}/agents", json={"name": "TEST_audit", "role": "x"}).json()
        # Industry install
        fresh_user_client.post(f"{API}/industries/hvac/install")

        r = fresh_user_client.get(f"{API}/audit-logs")
        assert r.status_code == 200, r.text
        d = r.json()
        assert "logs" in d
        actions = [l["action"] for l in d["logs"]]
        assert "agent.create" in actions
        assert "industry.install" in actions
        # Sorted desc by ts
        ts_list = [l.get("ts") for l in d["logs"] if l.get("ts")]
        assert ts_list == sorted(ts_list, reverse=True)
        # Cleanup
        fresh_user_client.delete(f"{API}/agents/{a['id']}")

    def test_audit_log_action_filter(self, fresh_user_client):
        fresh_user_client.post(f"{API}/agents", json={"name": "TEST_aud2", "role": "x"})
        r = fresh_user_client.get(f"{API}/audit-logs", params={"action": "agent.create"})
        assert r.status_code == 200
        for l in r.json()["logs"]:
            assert l["action"] == "agent.create"


# -------- V5: API keys --------
class TestApiKeys:
    def test_create_list_use_revoke_flow(self, fresh_user_client):
        # CREATE
        r = fresh_user_client.post(f"{API}/keys", json={"name": "test-key-1"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["key"].startswith("qiq_")
        assert d["prefix"].startswith("qiq_")
        key_id = d["id"]
        raw = d["key"]

        # LIST - no raw key, only prefix
        r = fresh_user_client.get(f"{API}/keys")
        assert r.status_code == 200
        keys = r.json()["keys"]
        ours = [k for k in keys if k["id"] == key_id]
        assert len(ours) == 1
        assert "key" not in ours[0], "Raw key should not be in list response"
        assert ours[0]["prefix"].startswith("qiq_")

        # USE the key on protected endpoint (no other auth)
        s = requests.Session()
        s.headers["Authorization"] = f"Bearer {raw}"
        r = s.get(f"{API}/agents")
        assert r.status_code == 200, f"Valid API key should access /agents: {r.text}"

        # Creating/revoking keys with API key auth → 403
        r = s.post(f"{API}/keys", json={"name": "should-fail"})
        assert r.status_code == 403
        r = s.delete(f"{API}/keys/{key_id}")
        assert r.status_code == 403

        # REVOKE with session
        r = fresh_user_client.delete(f"{API}/keys/{key_id}")
        assert r.status_code == 200

        # Revoked key → 401 on protected endpoint
        r = s.get(f"{API}/agents")
        assert r.status_code == 401, f"Revoked key should return 401, got {r.status_code}"

    def test_nonexistent_key_returns_401(self):
        s = requests.Session()
        s.headers["Authorization"] = "Bearer qiq_thiskeydoesnotexist_xyz_12345"
        r = s.get(f"{API}/agents")
        assert r.status_code == 401

    def test_revoke_unknown_key_returns_404(self, fresh_user_client):
        from bson import ObjectId
        r = fresh_user_client.delete(f"{API}/keys/{ObjectId()}")
        assert r.status_code == 404
