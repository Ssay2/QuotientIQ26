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

