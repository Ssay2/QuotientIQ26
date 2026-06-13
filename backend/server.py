from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import asyncio
import os
import io
import jwt
import bcrypt
import secrets
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated
from bson import ObjectId

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from pypdf import PdfReader
from docx import Document as DocxDocument
from bs4 import BeautifulSoup
import requests

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
    CheckoutStatusResponse,
)

# ---------------- DB ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')
JWT_ALGORITHM = "HS256"

# Backend-controlled billing packages. NEVER trust prices from the client.
BILLING_PLANS = {
    "starter": {"name": "Starter", "amount": 99.0, "currency": "usd"},
    "professional": {"name": "Professional", "amount": 299.0, "currency": "usd"},
}

# Brute-force protection config
LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 900  # 15 minutes

# Embed (public widget) rate limits
EMBED_TOKEN_MAX_PER_HOUR = 200
EMBED_VISITOR_MAX_PER_HOUR = 40
EMBED_WINDOW_SECONDS = 3600

# Trial config
TRIAL_DAYS = 14
PAID_PLANS = {"starter", "professional", "enterprise"}

# Team roles
TEAM_ROLES = ("owner", "admin", "manager", "employee")

# ---------------- Validation Helpers ----------------
def to_object_id(value: str, label: str = "id") -> ObjectId:
    """Convert a string to ObjectId or raise HTTP 400."""
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(400, f"Invalid {label}")

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# ---------------- Helpers ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))

def trial_days_remaining(user: dict) -> int:
    """Return days remaining in trial. Negative = expired. Paid users return a large number."""
    if user.get("plan") in PAID_PLANS:
        return 9999
    started = user.get("trial_started_at") or user.get("created_at")
    if not started:
        return TRIAL_DAYS
    try:
        ts = datetime.fromisoformat(started.replace("Z", "+00:00")) if isinstance(started, str) else started
        elapsed = (datetime.now(timezone.utc) - ts).total_seconds()
        return int(TRIAL_DAYS - (elapsed / 86400))
    except Exception:
        return TRIAL_DAYS

def is_active(user: dict) -> bool:
    """User can perform paid actions: in trial OR has an active paid plan."""
    return user.get("plan") in PAID_PLANS or trial_days_remaining(user) > 0

async def audit_log(user_id: str, action: str, target_type: str = "", target_id: str = "", metadata: Optional[dict] = None) -> None:
    """Append an audit log entry. Never raise — auditing must not break operations."""
    try:
        await db.audit_logs.insert_one({
            "user_id": user_id,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "metadata": metadata or {},
            "ts": now_iso(),
            "ts_dt": datetime.now(timezone.utc),
        })
    except Exception:
        pass

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(hours=12),
               "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id,
               "exp": datetime.now(timezone.utc) + timedelta(days=7),
               "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

async def get_current_user(request: Request) -> dict:
    # 1) API key auth: Authorization: Bearer qiq_<token>
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer qiq_"):
        raw = auth_header[7:]  # strip "Bearer "
        import hashlib
        sha = hashlib.sha256(raw.encode()).hexdigest()
        key_doc = await db.api_keys.find_one({"key_sha256": sha, "active": True})
        if key_doc:
            await db.api_keys.update_one({"_id": key_doc["_id"]}, {"$set": {"last_used_at": now_iso()}})
            user = await db.users.find_one({"_id": ObjectId(key_doc["user_id"])})
            if user:
                user["id"] = str(user.pop("_id"))
                user.pop("password_hash", None)
                user["auth_via"] = "api_key"
                return user

    # 2) Cookie / Bearer JWT auth
    token = request.cookies.get("access_token")
    if not token and auth_header.startswith("Bearer ") and not auth_header.startswith("Bearer qiq_"):
        token = auth_header[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        user["id"] = str(user.pop("_id"))
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

# ---------------- Models ----------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    company: Optional[str] = ""

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class AgentIn(BaseModel):
    name: str
    role: str = "Customer Support Agent"
    instructions: str = ""
    description: str = ""
    category: str = "Customer Service"
    icon: str = "Headphones"

class AgentPatch(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    instructions: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    parent_agent_id: Optional[str] = None

class CompanyProfileIn(BaseModel):
    company_name: str = ""
    products: str = ""
    services: str = ""
    pricing: str = ""
    brand_voice: str = ""
    policies: str = ""
    audience: str = ""

class TextIngestIn(BaseModel):
    label: str = "Pasted text"
    text: str

class UrlIngestIn(BaseModel):
    url: str

class ChatMessageIn(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    customer_name: Optional[str] = "Guest"

# ---------------- App ----------------
app = FastAPI(title="QuotientIQ API")
api = APIRouter(prefix="/api")

# ---------------- Auth Routes ----------------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "company": body.company or "",
        "role": "owner",
        "plan": "free",
        "trial_started_at": now_iso(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    # Each new user owns a single-member organization by default.
    org_res = await db.organizations.insert_one({
        "owner_id": uid,
        "name": doc["company"] or doc["name"] + "'s workspace",
        "members": [{"user_id": uid, "role": "owner", "email": email, "joined_at": now_iso()}],
        "created_at": now_iso(),
    })
    org_id = str(org_res.inserted_id)
    await db.users.update_one({"_id": res.inserted_id}, {"$set": {"org_id": org_id}})
    # Seed default Customer Support agent for new user
    await db.agents.insert_one({
        "user_id": uid,
        "name": f"{body.company or body.name}'s Support Agent",
        "role": "Customer Support Agent",
        "category": "Customer Service",
        "icon": "Headphones",
        "description": "Answers customer questions using your company knowledge base.",
        "instructions": "You are a helpful customer support agent. Use the provided knowledge base to answer questions accurately. If you don't know, say so politely and offer to connect to a human.",
        "status": "active",
        "knowledge_text": "",
        "knowledge_files": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": body.name, "company": doc["company"], "role": "user", "access_token": access}

@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    # Identifier is email-only: rate-limit per account to defend against credential stuffing.
    # (Per-IP rate limiting belongs at the ingress/edge layer.)
    identifier = f"email:{email}"
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=LOGIN_WINDOW_SECONDS)
    cutoff_iso = cutoff.isoformat()

    # Check current lockout state.
    recent = await db.login_attempts.count_documents({
        "identifier": identifier,
        "ts": {"$gte": cutoff_iso},
    })
    if recent >= LOGIN_MAX_ATTEMPTS:
        raise HTTPException(429, f"Too many failed attempts. Try again in {LOGIN_WINDOW_SECONDS // 60} minutes.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.insert_one({
            "identifier": identifier,
            "ts": now_iso(),
            "ts_dt": datetime.now(timezone.utc),
        })
        raise HTTPException(401, "Invalid email or password")

    # Success — clear attempts.
    await db.login_attempts.delete_many({"identifier": identifier})

    uid = str(user["_id"])
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": user.get("name", ""), "company": user.get("company", ""), "role": user.get("role", "user"), "plan": user.get("plan", "free"), "access_token": access}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

# ---------------- Agents ----------------
@api.get("/agents")
async def list_agents(user: dict = Depends(get_current_user)):
    cursor = db.agents.find({"user_id": user["id"]}).sort("created_at", -1)
    items = []
    async for a in cursor:
        a["id"] = str(a.pop("_id"))
        items.append(a)
    return items

@api.post("/agents")
async def create_agent(body: AgentIn, user: dict = Depends(get_current_user)):
    if not is_active(user):
        raise HTTPException(402, "Your trial has ended. Upgrade to a paid plan to add more agents.")
    doc = body.model_dump()
    doc.update({
        "user_id": user["id"],
        "status": "active",
        "knowledge_text": "",
        "knowledge_files": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    res = await db.agents.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    await audit_log(user["id"], "agent.create", "agent", doc["id"], {"name": doc["name"]})
    return doc

@api.get("/agents/{agent_id}")
async def get_agent(agent_id: str, user: dict = Depends(get_current_user)):
    a = await db.agents.find_one({"_id": to_object_id(agent_id, "agent id"), "user_id": user["id"]})
    if not a:
        raise HTTPException(404, "Agent not found")
    a["id"] = str(a.pop("_id"))
    return a

@api.patch("/agents/{agent_id}")
async def update_agent(agent_id: str, body: AgentPatch, user: dict = Depends(get_current_user)):
    updates = body.model_dump(exclude_unset=True)
    if "parent_agent_id" in updates and updates["parent_agent_id"]:
        new_parent = updates["parent_agent_id"]
        if new_parent == agent_id:
            raise HTTPException(400, "Agent cannot be its own parent")
        parent = await db.agents.find_one(
            {"_id": to_object_id(new_parent, "parent agent id"), "user_id": user["id"]}
        )
        if not parent:
            raise HTTPException(400, "Parent agent not found")
        # Walk up the ancestry of the proposed parent to detect cycles.
        seen = {agent_id}
        cursor_id = new_parent
        for _ in range(100):
            if cursor_id in seen:
                raise HTTPException(400, "Reparent would create a cycle")
            seen.add(cursor_id)
            node = await db.agents.find_one(
                {"_id": to_object_id(cursor_id, "agent id"), "user_id": user["id"]},
                {"parent_agent_id": 1},
            )
            cursor_id = node.get("parent_agent_id") if node else None
            if not cursor_id:
                break
    if updates:
        await db.agents.update_one(
            {"_id": to_object_id(agent_id, "agent id"), "user_id": user["id"]},
            {"$set": updates}
        )
    return await get_agent(agent_id, user)

@api.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, user: dict = Depends(get_current_user)):
    result = await db.agents.delete_one({"_id": to_object_id(agent_id, "agent id"), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Agent not found")
    await db.conversations.delete_many({"agent_id": agent_id, "user_id": user["id"]})
    return {"ok": True}

# ---------------- Knowledge Base ----------------
# ---------------- Knowledge Base ingestion helpers ----------------
def _extract_pdf(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    return "\n".join((p.extract_text() or "") for p in reader.pages).strip()

def _extract_docx(content: bytes) -> str:
    doc = DocxDocument(io.BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs if p.text).strip()

def _extract_url_sync(url: str) -> tuple[str, str]:
    """Fetch a URL and return (title, plaintext). Blocking — must be run in a thread."""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    resp = requests.get(url, timeout=15, headers={"User-Agent": "QuotientIQ-KB/1.0"})
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    title = (soup.title.string.strip() if soup.title and soup.title.string else url)[:120]
    text = " ".join(soup.get_text(" ").split())
    return title, text[:60000]

async def _extract_url(url: str) -> tuple[str, str]:
    # Run the blocking requests call in a worker thread so we don't stall the event loop.
    return await asyncio.to_thread(_extract_url_sync, url)

async def _append_to_knowledge(agent_id: str, label: str, text: str, file_meta: dict) -> dict:
    oid = to_object_id(agent_id, "agent id")
    a = await db.agents.find_one({"_id": oid})
    if not a:
        raise HTTPException(404, "Agent not found")
    new_text = (a.get("knowledge_text", "") + "\n\n" + f"### {label}\n" + text).strip()
    files = a.get("knowledge_files", []) + [file_meta]
    await db.agents.update_one(
        {"_id": oid},
        {"$set": {"knowledge_text": new_text[:300000], "knowledge_files": files}},
    )
    return {"ok": True, "filename": label, "chars": len(text), "files": files}

@api.post("/agents/{agent_id}/upload")
async def upload_pdf(agent_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    oid = to_object_id(agent_id, "agent id")
    a = await db.agents.find_one({"_id": oid, "user_id": user["id"]})
    if not a:
        raise HTTPException(404, "Agent not found")
    name = (file.filename or "").lower()
    content = await file.read()
    try:
        if name.endswith(".pdf"):
            text = _extract_pdf(content)
        elif name.endswith(".docx"):
            text = _extract_docx(content)
        elif name.endswith((".txt", ".md", ".csv")):
            text = content.decode("utf-8", errors="replace").strip()
        else:
            raise HTTPException(400, "Supported types: PDF, DOCX, TXT, MD, CSV")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Could not parse file: {e}")
    if not text:
        raise HTTPException(400, "File contained no extractable text")
    meta = {
        "name": file.filename,
        "kind": name.rsplit(".", 1)[-1] if "." in name else "file",
        "size": len(content),
        "chars": len(text),
        "uploaded_at": now_iso(),
    }
    return await _append_to_knowledge(agent_id, file.filename, text, meta)

@api.post("/agents/{agent_id}/ingest-text")
async def ingest_text(agent_id: str, body: TextIngestIn, user: dict = Depends(get_current_user)):
    a = await db.agents.find_one({"_id": to_object_id(agent_id, "agent id"), "user_id": user["id"]})
    if not a:
        raise HTTPException(404, "Agent not found")
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "Text is empty")
    meta = {"name": body.label or "Pasted text", "kind": "text", "size": len(text),
            "chars": len(text), "uploaded_at": now_iso()}
    return await _append_to_knowledge(agent_id, meta["name"], text, meta)

@api.post("/agents/{agent_id}/ingest-url")
async def ingest_url(agent_id: str, body: UrlIngestIn, user: dict = Depends(get_current_user)):
    a = await db.agents.find_one({"_id": to_object_id(agent_id, "agent id"), "user_id": user["id"]})
    if not a:
        raise HTTPException(404, "Agent not found")
    try:
        title, text = await _extract_url(body.url)
    except Exception as e:
        raise HTTPException(400, f"Could not fetch URL: {e}")
    if not text:
        raise HTTPException(400, "URL had no extractable text")
    meta = {"name": f"{title} ({body.url})", "kind": "url", "size": len(text),
            "chars": len(text), "uploaded_at": now_iso(), "source_url": body.url}
    return await _append_to_knowledge(agent_id, meta["name"], text, meta)

@api.delete("/agents/{agent_id}/files/{filename}")
async def delete_file(agent_id: str, filename: str, user: dict = Depends(get_current_user)):
    oid = to_object_id(agent_id, "agent id")
    a = await db.agents.find_one({"_id": oid, "user_id": user["id"]})
    if not a:
        raise HTTPException(404, "Agent not found")
    files = [f for f in a.get("knowledge_files", []) if f["name"] != filename]
    text = a.get("knowledge_text", "")
    blocks = text.split("### ")
    keep = [b for b in blocks if not b.startswith(filename)]
    new_text = "### ".join(keep).strip()
    await db.agents.update_one(
        {"_id": oid},
        {"$set": {"knowledge_files": files, "knowledge_text": new_text}}
    )
    return {"ok": True, "files": files}

# ---------------- Conversations ----------------
@api.get("/agents/{agent_id}/conversations")
async def list_conversations(agent_id: str, user: dict = Depends(get_current_user)):
    cursor = db.conversations.find({"agent_id": agent_id, "user_id": user["id"]}).sort("updated_at", -1)
    out = []
    async for c in cursor:
        c["id"] = str(c.pop("_id"))
        out.append(c)
    return out

@api.get("/conversations/{conv_id}")
async def get_conversation(conv_id: str, user: dict = Depends(get_current_user)):
    c = await db.conversations.find_one({"_id": to_object_id(conv_id, "conversation id"), "user_id": user["id"]})
    if not c:
        raise HTTPException(404, "Conversation not found")
    c["id"] = str(c.pop("_id"))
    return c

# ---------------- Chat helpers ----------------
async def _load_agent_or_404(agent_id: str, user_id: str) -> dict:
    agent = await db.agents.find_one({"_id": to_object_id(agent_id, "agent id"), "user_id": user_id})
    if not agent:
        raise HTTPException(404, "Agent not found")
    return agent

async def _get_or_create_conversation(agent_id: str, user_id: str, body: "ChatMessageIn") -> tuple[str, dict]:
    if body.conversation_id:
        conv = await db.conversations.find_one(
            {"_id": to_object_id(body.conversation_id, "conversation id"), "user_id": user_id}
        )
        if not conv:
            raise HTTPException(404, "Conversation not found")
        return str(conv["_id"]), conv
    new_conv = {
        "agent_id": agent_id,
        "user_id": user_id,
        "customer_name": body.customer_name or "Guest",
        "messages": [],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    res = await db.conversations.insert_one(new_conv)
    return str(res.inserted_id), new_conv

async def _get_company_profile(user_id: str) -> dict:
    return await db.company_profiles.find_one({"user_id": user_id}) or {}

async def _get_team_context(user_id: str, current_agent_id: str) -> str:
    teammates = await db.agents.find(
        {"user_id": user_id, "_id": {"$ne": to_object_id(current_agent_id, "agent id")}}
    ).to_list(50)
    if not teammates:
        return ""
    lines = [f"- {a.get('name')} ({a.get('role') or a.get('category')})" for a in teammates]
    return "\n".join(lines)

def _format_profile_block(profile: dict) -> str:
    fields = [
        ("Company", profile.get("company_name", "")),
        ("Audience", profile.get("audience", "")),
        ("Products", profile.get("products", "")),
        ("Services", profile.get("services", "")),
        ("Pricing", profile.get("pricing", "")),
        ("Policies", profile.get("policies", "")),
        ("Brand voice", profile.get("brand_voice", "")),
    ]
    lines = [f"{k}: {v}" for k, v in fields if v and str(v).strip()]
    return "\n".join(lines)

async def _build_system_message_full(agent: dict) -> str:
    base = agent.get("instructions") or "You are a helpful AI assistant."
    parts = [base]

    profile = await _get_company_profile(agent["user_id"])
    profile_block = _format_profile_block(profile)
    if profile_block:
        parts.append("--- COMPANY PROFILE ---\n" + profile_block + "\n--- END COMPANY PROFILE ---")

    team = await _get_team_context(agent["user_id"], str(agent["_id"]))
    if team:
        parts.append(
            "--- YOUR TEAM ---\n"
            "You collaborate with the following AI teammates:\n"
            + team
            + "\n\nIf a user asks something that a teammate is better equipped to answer, you may delegate by appending a tag at the very end of your reply in this exact format:\n"
            + "[DELEGATE: <Teammate name> | <The specific question to ask them>]\n"
            + "You may include up to 2 delegation tags. The system will execute them and stitch the teammate's reply into your response automatically. Only delegate when truly necessary.\n"
            + "--- END TEAM ---"
        )

    kb = (agent.get("knowledge_text") or "").strip()
    if kb:
        parts.append(
            "--- KNOWLEDGE BASE ---\n"
            + kb[:30000]
            + "\n--- END KNOWLEDGE BASE ---\nAnswer based strictly on the knowledge base above when possible. If the answer is not in the knowledge base or company profile, say you don't have that information."
        )

    return "\n\n".join(parts)

def _build_system_message(agent: dict) -> str:
    # Kept for backward compatibility (sync code paths).
    base = agent.get("instructions") or "You are a helpful AI assistant."
    kb = (agent.get("knowledge_text") or "").strip()
    if not kb:
        return base
    return base + "\n\n--- KNOWLEDGE BASE ---\n" + kb[:30000]

def _build_user_text(latest: str, prev_messages: list[dict]) -> str:
    recent = (prev_messages or [])[-10:]
    if not recent:
        return latest
    history = "".join(f"\n{m['role'].upper()}: {m['content']}" for m in recent)
    return f"Conversation so far:{history}\n\nLatest user message: {latest}"

def _make_llm_chat(conv_id: str, system_message: str) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=conv_id,
        system_message=system_message,
    ).with_model("openai", "gpt-5.2")

async def _append_user_message(conv_id: str, content: str) -> None:
    await db.conversations.update_one(
        {"_id": to_object_id(conv_id, "conversation id")},
        {"$push": {"messages": {"role": "user", "content": content, "timestamp": now_iso()}},
         "$set": {"updated_at": now_iso()}},
    )

async def _append_assistant_message(conv_id: str, content: str) -> None:
    await db.conversations.update_one(
        {"_id": to_object_id(conv_id, "conversation id")},
        {"$push": {"messages": {"role": "assistant", "content": content, "timestamp": now_iso()}},
         "$set": {"updated_at": now_iso()}},
    )

# ---------------- Chat (SSE streaming) ----------------
@api.post("/agents/{agent_id}/chat")
async def chat_with_agent(agent_id: str, body: ChatMessageIn, user: dict = Depends(get_current_user)):
    agent = await _load_agent_or_404(agent_id, user["id"])
    conv_id, conv = await _get_or_create_conversation(agent_id, user["id"], body)
    await _append_user_message(conv_id, body.message)

    chat = _make_llm_chat(conv_id, await _build_system_message_full(agent))
    user_message = UserMessage(text=_build_user_text(body.message, conv.get("messages")))

    async def event_stream():
        full = ""
        try:
            async for ev in chat.stream_message(user_message):
                if isinstance(ev, TextDelta):
                    full += ev.content
                    yield f"data: {ev.content}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            err = f"[Error: {str(e)}]"
            full += err
            yield f"data: {err}\n\n"

        # Execute any delegations the model requested.
        cleaned, delegations = _parse_delegations(full)
        final_text = cleaned or full
        if delegations:
            for d in delegations[:2]:
                result = await _run_delegation(user["id"], agent_id, d["agent"], d["question"])
                if result.get("ok"):
                    block = f"\n\n— **Asked {result['agent']}**: {d['question']}\n{result['reply']}"
                else:
                    block = f"\n\n_({result.get('error', 'Could not reach teammate')})_"
                final_text += block
                yield f"data: {block}\n\n"

        await _append_assistant_message(conv_id, final_text)
        yield f"event: done\ndata: {conv_id}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )

# Non-streaming variant for simpler testing
@api.post("/agents/{agent_id}/chat-sync")
async def chat_sync(agent_id: str, body: ChatMessageIn, user: dict = Depends(get_current_user)):
    agent = await _load_agent_or_404(agent_id, user["id"])
    conv_id, conv = await _get_or_create_conversation(agent_id, user["id"], body)

    chat = _make_llm_chat(conv_id, await _build_system_message_full(agent))
    full = ""
    async for ev in chat.stream_message(UserMessage(text=body.message)):
        if isinstance(ev, TextDelta):
            full += ev.content
        elif isinstance(ev, StreamDone):
            break

    # Execute any delegations the model requested, mirroring event_stream().
    cleaned, delegations = _parse_delegations(full)
    final_text = cleaned or full
    for d in delegations[:2]:
        result = await _run_delegation(user["id"], agent_id, d["agent"], d["question"])
        if result.get("ok"):
            final_text += f"\n\n— **Asked {result['agent']}**: {d['question']}\n{result['reply']}"
        else:
            final_text += f"\n\n_({result.get('error', 'Could not reach teammate')})_"

    now = now_iso()
    await db.conversations.update_one(
        {"_id": to_object_id(conv_id, "conversation id")},
        {"$push": {"messages": {"$each": [
            {"role": "user", "content": body.message, "timestamp": now},
            {"role": "assistant", "content": final_text, "timestamp": now},
        ]}}, "$set": {"updated_at": now}},
    )
    return {"conversation_id": conv_id, "reply": final_text}

# ---------------- Analytics ----------------
@api.get("/analytics/summary")
async def analytics_summary(user: dict = Depends(get_current_user)):
    agents_count = await db.agents.count_documents({"user_id": user["id"]})
    convs = await db.conversations.find({"user_id": user["id"]}).to_list(5000)
    total_msgs = sum(len(c.get("messages", [])) for c in convs)
    ai_replies = sum(1 for c in convs for m in c.get("messages", []) if m.get("role") == "assistant")
    hours_saved = round(ai_replies * 0.15, 1)  # 9 minutes per AI reply saved
    cost_saved = round(ai_replies * 4.5, 2)    # $4.50 per resolved issue saved
    perf = 92 if ai_replies > 0 else 0
    # Last 7 days breakdown
    from collections import defaultdict
    daily = defaultdict(int)
    for c in convs:
        for m in c.get("messages", []):
            if m.get("role") == "assistant":
                day = m["timestamp"][:10]
                daily[day] += 1
    series = sorted([{"date": d, "count": n} for d, n in daily.items()], key=lambda x: x["date"])[-14:]
    return {
        "agents": agents_count,
        "conversations": len(convs),
        "messages": total_msgs,
        "tasks_completed": ai_replies,
        "hours_saved": hours_saved,
        "cost_saved": cost_saved,
        "performance_score": perf,
        "series": series,
    }

# ---------------- Marketplace (static catalog) ----------------
MARKETPLACE = [
    {"id": "support", "name": "Customer Support Agent", "category": "Customer Service", "icon": "Headphones",
     "description": "Answers customer questions instantly using your uploaded docs.", "instructions": "You are a helpful customer support agent. Use the knowledge base to answer accurately.", "tagline": "24/7 support automation", "available": True},
    {"id": "sales", "name": "Sales Agent", "category": "Sales", "icon": "TrendingUp",
     "description": "Qualifies leads and books meetings with prospects.", "instructions": "You are an enthusiastic sales agent. Qualify leads, answer product questions, push them to book a meeting.", "tagline": "Pipeline on autopilot", "available": True},
    {"id": "recruiter", "name": "Recruiting Agent", "category": "HR", "icon": "Users",
     "description": "Screens resumes and schedules interviews.", "instructions": "You are a recruiting agent. Screen resumes against role requirements, ask clarifying questions, recommend next steps.", "tagline": "Faster hiring loops", "available": True},
    {"id": "marketing", "name": "Marketing Agent", "category": "Marketing", "icon": "Megaphone",
     "description": "Drafts campaigns, social posts, and email sequences.", "instructions": "You are a marketing strategist. Generate copy, campaign ideas, and post variations aligned to brand voice.", "tagline": "Content at scale", "available": True},
    {"id": "analyst", "name": "Business Analyst Agent", "category": "Operations", "icon": "BarChart3",
     "description": "Analyzes KPIs and produces concise reports.", "instructions": "You are a business analyst. Turn data and notes into clear KPI summaries and recommendations.", "tagline": "Insights, instantly", "available": True},
    {"id": "ops", "name": "Operations Agent", "category": "Operations", "icon": "Cog",
     "description": "Automates repetitive operational tasks.", "instructions": "You are an operations agent. Help users build SOPs, automate steps, and standardize processes.", "tagline": "Run the playbook", "available": True},
    {"id": "legal", "name": "Legal Assistant", "category": "Legal", "icon": "Scale",
     "description": "Reviews contracts and flags risk clauses.", "instructions": "You are a legal assistant. Summarize contracts, flag risk clauses, and answer policy questions. You are not a lawyer.", "tagline": "Contracts, demystified", "available": True},
    {"id": "finance", "name": "Finance Agent", "category": "Finance", "icon": "DollarSign",
     "description": "Tracks expenses and forecasts cash flow.", "instructions": "You are a finance agent. Help users with expense categorization, forecasting, and basic financial questions.", "tagline": "Numbers that talk", "available": True},
]

@api.get("/marketplace")
async def marketplace():
    return MARKETPLACE

@api.post("/marketplace/install/{template_id}")
async def install_template(template_id: str, user: dict = Depends(get_current_user)):
    tmpl = next((m for m in MARKETPLACE if m["id"] == template_id), None)
    if not tmpl:
        raise HTTPException(404, "Template not found")
    doc = {
        "user_id": user["id"],
        "name": tmpl["name"],
        "role": tmpl["name"],
        "category": tmpl["category"],
        "icon": tmpl["icon"],
        "description": tmpl["description"],
        "instructions": tmpl["instructions"],
        "status": "active",
        "knowledge_text": "",
        "knowledge_files": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.agents.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc

# ---------------- Company Profile (Memory layer) ----------------
@api.get("/company-profile")
async def get_company_profile(user: dict = Depends(get_current_user)):
    doc = await db.company_profiles.find_one({"user_id": user["id"]})
    if not doc:
        return {
            "company_name": user.get("company", ""),
            "products": "", "services": "", "pricing": "",
            "brand_voice": "", "policies": "", "audience": "",
        }
    doc["id"] = str(doc.pop("_id"))
    return doc

@api.put("/company-profile")
async def save_company_profile(body: CompanyProfileIn, user: dict = Depends(get_current_user)):
    updates = body.model_dump()
    updates["user_id"] = user["id"]
    updates["updated_at"] = now_iso()
    await db.company_profiles.update_one(
        {"user_id": user["id"]},
        {"$set": updates, "$setOnInsert": {"created_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True, **updates}

# ---------------- Org Chart ----------------
@api.get("/org/tree")
async def org_tree(user: dict = Depends(get_current_user)):
    agents = await db.agents.find({"user_id": user["id"]}).to_list(500)
    for a in agents:
        a["id"] = str(a.pop("_id"))
        # Strip heavy fields
        a.pop("knowledge_text", None)

    by_parent: dict[str, list] = {}
    for a in agents:
        parent = a.get("parent_agent_id") or "__root__"
        by_parent.setdefault(parent, []).append(a)

    def build(parent_id: str):
        nodes = by_parent.get(parent_id, [])
        return [{**a, "children": build(a["id"])} for a in nodes]

    return {"roots": build("__root__"), "count": len(agents)}

# ---------------- Billing (Stripe) ----------------
class CheckoutIn(BaseModel):
    plan_id: str
    origin_url: str

@api.post("/billing/checkout")
async def billing_checkout(body: CheckoutIn, user: dict = Depends(get_current_user)):
    plan = BILLING_PLANS.get(body.plan_id)
    if not plan:
        raise HTTPException(400, "Invalid plan")
    if not STRIPE_API_KEY:
        raise HTTPException(503, "Billing not configured")

    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/billing?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/billing?cancelled=1"

    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{origin}/api/webhook/stripe")
    req = CheckoutSessionRequest(
        amount=plan["amount"],
        currency=plan["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": user["id"], "email": user["email"], "plan_id": body.plan_id, "source": "quotientiq_subscribe"},
    )
    try:
        session = await stripe.create_checkout_session(req)
    except Exception as e:
        raise HTTPException(502, f"Stripe error: {e}")

    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["id"],
        "email": user["email"],
        "plan_id": body.plan_id,
        "amount": plan["amount"],
        "currency": plan["currency"],
        "status": "initiated",
        "payment_status": "unpaid",
        "metadata": {"plan_id": body.plan_id},
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })

    return {"url": session.url, "session_id": session.session_id}

@api.get("/billing/status/{session_id}")
async def billing_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    txn = await db.payment_transactions.find_one({"session_id": session_id, "user_id": user["id"]})
    if not txn:
        raise HTTPException(404, "Session not found")

    # If already finalized, return cached state.
    if txn.get("payment_status") == "paid":
        return {"status": txn["status"], "payment_status": "paid", "plan": txn["plan_id"]}

    if not STRIPE_API_KEY:
        raise HTTPException(503, "Billing not configured")

    origin = str(request.base_url).rstrip("/")
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{origin}/api/webhook/stripe")
    try:
        status: CheckoutStatusResponse = await stripe.get_checkout_status(session_id)
    except Exception as e:
        raise HTTPException(502, f"Stripe error: {e}")

    update = {
        "status": status.status,
        "payment_status": status.payment_status,
        "updated_at": now_iso(),
    }
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})

    # Activate plan on first successful payment only.
    if status.payment_status == "paid" and txn.get("payment_status") != "paid":
        await db.users.update_one(
            {"_id": to_object_id(user["id"], "user id")},
            {"$set": {"plan": txn["plan_id"], "plan_activated_at": now_iso()}},
        )

    return {"status": status.status, "payment_status": status.payment_status, "plan": txn["plan_id"]}

@api.get("/billing/me")
async def billing_me(user: dict = Depends(get_current_user)):
    return {
        "plan": user.get("plan", "free"),
        "plan_activated_at": user.get("plan_activated_at"),
        "available_plans": [{"id": k, **v} for k, v in BILLING_PLANS.items()],
        "trial_days_remaining": trial_days_remaining(user),
        "is_active": is_active(user),
    }

# Stripe webhook (no auth — Stripe-signed)
@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_API_KEY:
        return {"ok": False, "error": "billing not configured"}
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url).rstrip("/")
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{host_url}/api/webhook/stripe")
    try:
        ev = await stripe.handle_webhook(body, sig)
    except Exception as e:
        return {"ok": False, "error": str(e)}

    txn = await db.payment_transactions.find_one({"session_id": ev.session_id}) if ev.session_id else None
    if not txn:
        return {"ok": True, "event": ev.event_type}
    if ev.payment_status == "paid" and txn.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": ev.session_id},
            {"$set": {"payment_status": "paid", "status": "complete", "updated_at": now_iso()}},
        )
        await db.users.update_one(
            {"_id": to_object_id(txn["user_id"], "user id")},
            {"$set": {"plan": txn["plan_id"], "plan_activated_at": now_iso()}},
        )
    return {"ok": True, "event": ev.event_type}

# ---------------- Multi-Agent Delegation ----------------
DELEGATION_RE = None  # built lazily to avoid top-level regex parse

def _parse_delegations(text: str) -> tuple[str, list[dict]]:
    """Find inline [DELEGATE: <agent name> | <question>] markers and strip them from text."""
    import re
    pattern = re.compile(r"\[DELEGATE\s*:\s*(.+?)\s*\|\s*(.+?)\]", re.DOTALL)
    delegations = [{"agent": m.group(1).strip(), "question": m.group(2).strip()} for m in pattern.finditer(text)]
    cleaned = pattern.sub("", text).strip()
    return cleaned, delegations

async def _run_delegation(user_id: str, source_agent_id: str, agent_name: str, question: str) -> dict:
    target = await db.agents.find_one({"user_id": user_id, "name": {"$regex": f"^{agent_name}$", "$options": "i"}})
    if not target:
        return {"agent": agent_name, "question": question, "ok": False, "error": "Teammate not found"}
    chat = _make_llm_chat(f"delegate-{source_agent_id}", await _build_system_message_full(target))
    full = ""
    try:
        async for ev in chat.stream_message(UserMessage(text=question)):
            if isinstance(ev, TextDelta):
                full += ev.content
            elif isinstance(ev, StreamDone):
                break
    except Exception as e:
        return {"agent": target["name"], "question": question, "ok": False, "error": str(e)}
    return {"agent": target["name"], "question": question, "ok": True, "reply": full.strip()}

@api.post("/agents/{agent_id}/delegate")
async def manual_delegate(agent_id: str, target_id: str, message: str, user: dict = Depends(get_current_user)):
    """Manually delegate a question from one agent's chat to another agent (sync)."""
    await _load_agent_or_404(agent_id, user["id"])
    target = await db.agents.find_one({"_id": to_object_id(target_id, "agent id"), "user_id": user["id"]})
    if not target:
        raise HTTPException(404, "Target agent not found")
    result = await _run_delegation(user["id"], agent_id, target["name"], message)
    return result

# ---------------- Public Embed (Layer 25) ----------------
class EmbedChatIn(BaseModel):
    message: str
    visitor_id: Optional[str] = None

@api.post("/agents/{agent_id}/embed-enable")
async def embed_enable(agent_id: str, user: dict = Depends(get_current_user)):
    """Generate / rotate a public embed token for this agent."""
    agent = await _load_agent_or_404(agent_id, user["id"])
    token = secrets.token_urlsafe(24)
    await db.agents.update_one(
        {"_id": to_object_id(agent_id, "agent id")},
        {"$set": {"embed_token": token, "embed_enabled": True}},
    )
    return {"embed_token": token, "agent_id": agent_id, "agent_name": agent["name"]}

@api.post("/agents/{agent_id}/embed-disable")
async def embed_disable(agent_id: str, user: dict = Depends(get_current_user)):
    await _load_agent_or_404(agent_id, user["id"])
    await db.agents.update_one(
        {"_id": to_object_id(agent_id, "agent id")},
        {"$set": {"embed_enabled": False}, "$unset": {"embed_token": ""}},
    )
    return {"ok": True}

@api.get("/embed/{token}/agent")
async def embed_get_agent(token: str):
    agent = await db.agents.find_one({"embed_token": token, "embed_enabled": True})
    if not agent:
        raise HTTPException(404, "Embed not found")
    return {
        "agent_id": str(agent["_id"]),
        "name": agent["name"],
        "category": agent.get("category"),
        "icon": agent.get("icon"),
        "description": agent.get("description", ""),
    }

@api.post("/embed/{token}/chat")
async def embed_chat(token: str, body: EmbedChatIn, request: Request):
    agent = await db.agents.find_one({"embed_token": token, "embed_enabled": True})
    if not agent:
        raise HTTPException(404, "Embed not found")
    user_id = agent["user_id"]
    agent_id = str(agent["_id"])
    visitor = body.visitor_id or f"v_{secrets.token_hex(6)}"

    # Per-token + per-visitor rate limiting (public endpoint).
    now_dt = datetime.now(timezone.utc)
    window_start_iso = (now_dt - timedelta(seconds=EMBED_WINDOW_SECONDS)).isoformat()
    token_recent = await db.embed_hits.count_documents({"token": token, "ts": {"$gte": window_start_iso}})
    if token_recent >= EMBED_TOKEN_MAX_PER_HOUR:
        raise HTTPException(429, "This chat is temporarily over its hourly limit. Try again later.")
    visitor_recent = await db.embed_hits.count_documents({"token": token, "visitor": visitor, "ts": {"$gte": window_start_iso}})
    if visitor_recent >= EMBED_VISITOR_MAX_PER_HOUR:
        raise HTTPException(429, "Too many messages — please pause for a moment.")
    await db.embed_hits.insert_one({
        "token": token,
        "visitor": visitor,
        "ts": now_dt.isoformat(),
        "ts_dt": now_dt,
    })

    # Build/find a per-visitor conversation thread
    conv = await db.conversations.find_one({"agent_id": agent_id, "user_id": user_id, "customer_name": visitor})
    if conv:
        conv_id = str(conv["_id"])
    else:
        res = await db.conversations.insert_one({
            "agent_id": agent_id, "user_id": user_id, "customer_name": visitor,
            "messages": [], "created_at": now_iso(), "updated_at": now_iso(),
            "source": "embed",
        })
        conv_id = str(res.inserted_id)

    chat = _make_llm_chat(conv_id, await _build_system_message_full(agent))
    full = ""
    async for ev in chat.stream_message(UserMessage(text=body.message)):
        if isinstance(ev, TextDelta):
            full += ev.content
        elif isinstance(ev, StreamDone):
            break

    # Execute delegations (mirrors the authenticated chat path).
    cleaned, delegations = _parse_delegations(full)
    final_text = cleaned or full
    for d in delegations[:2]:
        result = await _run_delegation(user_id, agent_id, d["agent"], d["question"])
        if result.get("ok"):
            final_text += f"\n\n— **Asked {result['agent']}**: {d['question']}\n{result['reply']}"

    now = now_iso()
    await db.conversations.update_one(
        {"_id": to_object_id(conv_id, "conversation id")},
        {"$push": {"messages": {"$each": [
            {"role": "user", "content": body.message, "timestamp": now},
            {"role": "assistant", "content": final_text, "timestamp": now},
        ]}}, "$set": {"updated_at": now}},
    )
    return {"reply": final_text, "visitor_id": visitor}

# ---------------- Conversations Explorer ----------------
@api.get("/conversations")
async def list_all_conversations(agent_id: Optional[str] = None, source: Optional[str] = None, user: dict = Depends(get_current_user)):
    query: dict = {"user_id": user["id"]}
    if agent_id:
        query["agent_id"] = agent_id
    if source:
        query["source"] = source

    cursor = db.conversations.find(query, {"messages": {"$slice": -1}}).sort("updated_at", -1).limit(200)
    out = []
    async for c in cursor:
        last_msg = (c.get("messages") or [{}])[-1] if c.get("messages") else {}
        out.append({
            "id": str(c.pop("_id")),
            "agent_id": c.get("agent_id"),
            "customer_name": c.get("customer_name", "Guest"),
            "source": c.get("source", "internal"),
            "updated_at": c.get("updated_at"),
            "created_at": c.get("created_at"),
            "last_role": last_msg.get("role"),
            "last_preview": (last_msg.get("content") or "")[:160],
        })

    # Also count total messages for each conversation in a single follow-up query
    if out:
        counts_cursor = db.conversations.aggregate([
            {"$match": query},
            {"$project": {"_id": 1, "n": {"$size": {"$ifNull": ["$messages", []]}}}},
        ])
        counts = {str(c["_id"]): c["n"] async for c in counts_cursor}
        for o in out:
            o["message_count"] = counts.get(o["id"], 0)

    # Attach agent name
    agent_ids = {o["agent_id"] for o in out if o.get("agent_id")}
    if agent_ids:
        agents = await db.agents.find(
            {"_id": {"$in": [to_object_id(aid, "agent id") for aid in agent_ids if ObjectId.is_valid(aid)]}},
            {"name": 1, "icon": 1, "category": 1},
        ).to_list(500)
        amap = {str(a["_id"]): {"name": a.get("name"), "icon": a.get("icon"), "category": a.get("category")} for a in agents}
        for o in out:
            o["agent"] = amap.get(o["agent_id"])

    return {"conversations": out, "count": len(out)}

@api.get("/conversations/{conv_id}/export")
async def export_conversation(conv_id: str, user: dict = Depends(get_current_user)):
    c = await db.conversations.find_one({"_id": to_object_id(conv_id, "conversation id"), "user_id": user["id"]})
    if not c:
        raise HTTPException(404, "Conversation not found")
    c["id"] = str(c.pop("_id"))
    return c

@api.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str, user: dict = Depends(get_current_user)):
    result = await db.conversations.delete_one(
        {"_id": to_object_id(conv_id, "conversation id"), "user_id": user["id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(404, "Conversation not found")
    return {"ok": True}

# ---------------- Industry Templates ----------------
INDUSTRY_TEMPLATES = {
    "hvac": {
        "name": "HVAC Workforce",
        "tagline": "Heating, cooling, and customer love — automated.",
        "company_profile": {
            "audience": "Residential and light-commercial HVAC customers.",
            "services": "Installation, repair, maintenance contracts, indoor air quality.",
            "pricing": "$99 service-call fee. Quotes free on installs.",
            "policies": "Same-day service in metro. 30-day workmanship warranty. After-hours +50%.",
            "brand_voice": "Friendly, plain-English, no upsell pressure.",
        },
        "agents": [
            {"name": "HVAC Service Concierge", "category": "Customer Service", "icon": "Headphones",
             "description": "Books service calls and answers customer questions.",
             "instructions": "You are an HVAC service concierge. Always ask for the customer's ZIP, equipment make/model, and the symptom in plain English. Quote the $99 service-call fee, then collect a preferred 4-hour window. Escalate emergencies (no heat in winter, no AC over 95F) to dispatcher immediately."},
            {"name": "HVAC Sales Specialist", "category": "Sales", "icon": "TrendingUp",
             "description": "Qualifies installation leads and books estimates.",
             "instructions": "You are an HVAC sales specialist. Qualify install leads (age of existing system, square footage, fuel type, budget range). Book a free in-home estimate. Push high-SEER value when budget allows."},
            {"name": "HVAC Dispatch", "category": "Operations", "icon": "Cog",
             "description": "Routes service calls to technicians and rebalances the schedule.",
             "instructions": "You are an HVAC dispatcher. When given a ticket, identify the nearest available certified tech and the next 4-hour window. Surface conflicts. Always confirm parts on the truck before promising same-day."},
        ],
    },
    "plumbing": {
        "name": "Plumbing Workforce",
        "tagline": "From drips to disasters — handled.",
        "company_profile": {
            "audience": "Homeowners and property managers in our service area.",
            "services": "Drain cleaning, leak repair, water heater install/repair, repipe, sewer line.",
            "pricing": "$79 diagnostic fee, waived on accepted work. Flat-rate book.",
            "policies": "24/7 emergency. 90-day repair warranty.",
            "brand_voice": "Confident, calm, never alarmist.",
        },
        "agents": [
            {"name": "Plumbing Triage", "category": "Customer Service", "icon": "Headphones",
             "description": "Triages plumbing emergencies and books regular service.",
             "instructions": "You are a plumbing triage agent. First determine emergency vs scheduled (active leak/sewer back-up = emergency). Capture address, severity, photos if available. Book accordingly and quote the diagnostic fee."},
            {"name": "Plumbing Estimator", "category": "Sales", "icon": "TrendingUp",
             "description": "Books in-home estimates for repipe / water heater / sewer line jobs.",
             "instructions": "You are a plumbing estimator. Confirm scope (repipe / WH replacement / sewer line). Ask about home age, materials, water pressure issues. Book a 60-minute free in-home estimate."},
        ],
    },
    "auto": {
        "name": "Auto Repair Workforce",
        "tagline": "From the front desk to the bay — automated.",
        "company_profile": {
            "audience": "Local drivers needing scheduled maintenance and repair.",
            "services": "Oil change, brakes, suspension, diagnostics, A/C, transmission.",
            "pricing": "Free diagnostic with any repair. $99/hr labor.",
            "policies": "2-year/24k parts-and-labor warranty. ASE-certified techs.",
            "brand_voice": "No-jargon, transparent estimates, photos with every recommendation.",
        },
        "agents": [
            {"name": "Service Advisor", "category": "Customer Service", "icon": "Headphones",
             "description": "Books appointments and explains repairs in plain English.",
             "instructions": "You are an auto service advisor. Capture year/make/model/mileage and the symptom. Explain what a likely diagnosis would involve and quote the diagnostic policy. Book an appointment in the next 3 business days."},
            {"name": "Parts Lookup Agent", "category": "Operations", "icon": "Cog",
             "description": "Confirms part availability before promising same-day work.",
             "instructions": "You are an auto parts lookup agent. Given year/make/model/VIN-last-6, identify required parts and tell the user whether they are on-shelf, next-day, or special-order."},
        ],
    },
    "law": {
        "name": "Law Firm Workforce",
        "tagline": "Intake, triage, and follow-up — without billable time.",
        "company_profile": {
            "audience": "Individuals and small businesses with new matters.",
            "services": "Family, estate planning, personal injury, small business formation.",
            "pricing": "Initial consult $250 (credited against retainer if engaged).",
            "policies": "Conflict check before any case discussion. No legal advice over chat — schedule a consult.",
            "brand_voice": "Professional, warm, careful with legal disclaimers.",
        },
        "agents": [
            {"name": "Client Intake Specialist", "category": "Customer Service", "icon": "Headphones",
             "description": "Runs new-matter intake and books initial consults.",
             "instructions": "You are a legal client intake specialist. Run a conflict check (opposing party name, jurisdiction). Capture matter type, urgency, and a one-paragraph summary. Never give legal advice. Book a paid initial consult."},
            {"name": "Legal Assistant", "category": "Legal", "icon": "Scale",
             "description": "Summarizes documents and answers process FAQs.",
             "instructions": "You are a paralegal-style assistant. Summarize contracts in plain English, flag risk clauses, and explain process timelines. Always add: 'This is general information, not legal advice.'"},
        ],
    },
    "real_estate": {
        "name": "Real Estate Workforce",
        "tagline": "Lead capture, listing inquiries, and showings — covered.",
        "company_profile": {
            "audience": "Buyers and sellers in our local MLS area.",
            "services": "Residential listings, buyer representation, rentals, investment properties.",
            "pricing": "Standard 2.5% listing-side commission, negotiable on dual representation.",
            "policies": "All offers must be in writing. Showings booked 2 hours minimum in advance.",
            "brand_voice": "Knowledgeable, neighborhood-savvy, never pushy.",
        },
        "agents": [
            {"name": "Listing Inquiry Agent", "category": "Sales", "icon": "TrendingUp",
             "description": "Captures buyer leads and books showings.",
             "instructions": "You are a real estate listing inquiry agent. Qualify buyer (pre-approved? budget? must-have features? timeline?). Book a showing for an active listing in our area."},
            {"name": "Seller Concierge", "category": "Customer Service", "icon": "Headphones",
             "description": "Walks sellers through CMA, pricing, and listing prep.",
             "instructions": "You are a seller concierge. Capture the address, condition, and seller's timeline. Offer a free CMA (comparative market analysis) and book a listing appointment."},
        ],
    },
}

@api.get("/industries")
async def list_industries():
    return [{"id": k, "name": v["name"], "tagline": v["tagline"], "agent_count": len(v["agents"])} for k, v in INDUSTRY_TEMPLATES.items()]

@api.post("/industries/{industry_id}/install")
async def install_industry(industry_id: str, user: dict = Depends(get_current_user)):
    tmpl = INDUSTRY_TEMPLATES.get(industry_id)
    if not tmpl:
        raise HTTPException(404, "Industry not found")
    if not is_active(user):
        raise HTTPException(402, "Trial ended — upgrade to install an industry workforce.")

    # Merge industry company profile (don't clobber existing values).
    existing = await db.company_profiles.find_one({"user_id": user["id"]}) or {}
    merged = {**tmpl["company_profile"]}
    for k, v in existing.items():
        if k in merged and (v or "").strip():
            merged[k] = v
    merged["user_id"] = user["id"]
    merged["updated_at"] = now_iso()
    await db.company_profiles.update_one(
        {"user_id": user["id"]}, {"$set": merged, "$setOnInsert": {"created_at": now_iso()}}, upsert=True
    )

    # Create the agents.
    created_ids = []
    for a in tmpl["agents"]:
        res = await db.agents.insert_one({
            "user_id": user["id"],
            "name": a["name"], "role": a["name"],
            "category": a["category"], "icon": a["icon"],
            "description": a["description"], "instructions": a["instructions"],
            "status": "active", "knowledge_text": "", "knowledge_files": [],
            "created_at": now_iso(),
        })
        created_ids.append(str(res.inserted_id))

    await audit_log(user["id"], "industry.install", "industry", industry_id, {"agents_created": len(created_ids)})
    return {"ok": True, "industry_id": industry_id, "agent_ids": created_ids, "agents_created": len(created_ids)}

# ---------------- Team / Org ----------------
class InviteIn(BaseModel):
    email: EmailStr
    role: str = "employee"

@api.get("/team")
async def get_team(user: dict = Depends(get_current_user)):
    org_id = user.get("org_id")
    if not org_id:
        return {"members": [], "org_id": None}
    org = await db.organizations.find_one({"_id": to_object_id(org_id, "org id")})
    if not org:
        return {"members": [], "org_id": org_id}
    return {"org_id": org_id, "name": org.get("name"), "members": org.get("members", [])}

@api.post("/team/invite")
async def invite_member(body: InviteIn, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("owner", "admin"):
        raise HTTPException(403, "Only owners or admins can invite")
    if body.role not in TEAM_ROLES or body.role == "owner":
        raise HTTPException(400, f"Role must be one of: admin, manager, employee")
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(400, "No organization on this account")
    email = body.email.lower()
    org = await db.organizations.find_one({"_id": to_object_id(org_id, "org id")})
    if not org:
        raise HTTPException(404, "Org not found")
    if any(m.get("email") == email for m in org.get("members", [])):
        raise HTTPException(400, "Already a member")
    invite_token = secrets.token_urlsafe(24)
    new_member = {"email": email, "role": body.role, "invited_at": now_iso(),
                  "invited_by": user["id"], "status": "pending", "invite_token": invite_token}
    await db.organizations.update_one(
        {"_id": to_object_id(org_id, "org id")},
        {"$push": {"members": new_member}},
    )
    await audit_log(user["id"], "team.invite", "user", email, {"role": body.role})
    return {"ok": True, "email": email, "role": body.role, "invite_token": invite_token}

@api.delete("/team/{email}")
async def remove_member(email: str, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("owner", "admin"):
        raise HTTPException(403, "Only owners or admins can remove")
    if email.lower() == user["email"]:
        raise HTTPException(400, "Cannot remove yourself")
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(400, "No organization")
    await db.organizations.update_one(
        {"_id": to_object_id(org_id, "org id")},
        {"$pull": {"members": {"email": email.lower()}}},
    )
    await audit_log(user["id"], "team.remove", "user", email)
    return {"ok": True}

# ---------------- Audit Logs ----------------
@api.get("/audit-logs")
async def list_audit_logs(action: Optional[str] = None, target_type: Optional[str] = None, user: dict = Depends(get_current_user)):
    query: dict = {"user_id": user["id"]}
    if action:
        query["action"] = action
    if target_type:
        query["target_type"] = target_type
    cursor = db.audit_logs.find(query).sort("ts", -1).limit(500)
    out = []
    async for log in cursor:
        log["id"] = str(log.pop("_id"))
        log.pop("ts_dt", None)
        out.append(log)
    return {"logs": out, "count": len(out)}

# ---------------- API Keys ----------------
class ApiKeyCreateIn(BaseModel):
    name: str

@api.post("/keys")
async def create_api_key(body: ApiKeyCreateIn, user: dict = Depends(get_current_user)):
    if user.get("auth_via") == "api_key":
        raise HTTPException(403, "Cannot create API keys with an API key — use a session")
    import hashlib
    raw = "qiq_" + secrets.token_urlsafe(32)
    sha = hashlib.sha256(raw.encode()).hexdigest()
    doc = {
        "user_id": user["id"],
        "name": body.name or "Unnamed key",
        "key_sha256": sha,
        "key_prefix": raw[:11],  # qiq_ + 7 chars for display
        "active": True,
        "created_at": now_iso(),
        "last_used_at": None,
    }
    res = await db.api_keys.insert_one(doc)
    await audit_log(user["id"], "api_key.create", "api_key", str(res.inserted_id), {"name": doc["name"]})
    # Return the raw key ONCE — never readable again.
    return {"id": str(res.inserted_id), "name": doc["name"], "key": raw, "prefix": doc["key_prefix"], "created_at": doc["created_at"]}

@api.get("/keys")
async def list_api_keys(user: dict = Depends(get_current_user)):
    cursor = db.api_keys.find({"user_id": user["id"]}).sort("created_at", -1)
    out = []
    async for k in cursor:
        out.append({
            "id": str(k.pop("_id")),
            "name": k.get("name"),
            "prefix": k.get("key_prefix"),
            "active": k.get("active", True),
            "created_at": k.get("created_at"),
            "last_used_at": k.get("last_used_at"),
        })
    return {"keys": out}

@api.delete("/keys/{key_id}")
async def revoke_api_key(key_id: str, user: dict = Depends(get_current_user)):
    if user.get("auth_via") == "api_key":
        raise HTTPException(403, "Cannot revoke keys with an API key — use a session")
    result = await db.api_keys.delete_one({"_id": to_object_id(key_id, "key id"), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Key not found")
    await audit_log(user["id"], "api_key.revoke", "api_key", key_id)
    return {"ok": True}

@api.get("/")
async def root():
    return {"service": "QuotientIQ API", "status": "ok"}

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.agents.create_index("user_id")
    await db.agents.create_index([("user_id", 1), ("parent_agent_id", 1)])
    await db.agents.create_index("embed_token", sparse=True)
    await db.conversations.create_index([("user_id", 1), ("agent_id", 1)])
    await db.company_profiles.create_index("user_id", unique=True)
    # TTL index — expire stale login attempts automatically so the collection can't grow unbounded.
    try:
        await db.login_attempts.create_index("ts_dt", expireAfterSeconds=LOGIN_WINDOW_SECONDS)
    except Exception:
        pass  # index may already exist with different options
    await db.login_attempts.create_index("identifier")
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.payment_transactions.create_index("user_id")
    try:
        await db.embed_hits.create_index("ts_dt", expireAfterSeconds=EMBED_WINDOW_SECONDS)
    except Exception:
        pass
    await db.embed_hits.create_index([("token", 1), ("visitor", 1)])
    await db.audit_logs.create_index([("user_id", 1), ("ts", -1)])
    await db.api_keys.create_index("key_sha256", unique=True)
    await db.api_keys.create_index("user_id")
    await db.organizations.create_index("owner_id")
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@quotientiq.com").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        res = await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_pw),
            "name": "Admin",
            "company": "QuotientIQ",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        # Seed a default agent for admin
        await db.agents.insert_one({
            "user_id": str(res.inserted_id),
            "name": "QuotientIQ Demo Support Agent",
            "role": "Customer Support Agent",
            "category": "Customer Service",
            "icon": "Headphones",
            "description": "Demo agent. Try uploading a PDF and asking questions.",
            "instructions": "You are a friendly demo customer support agent for QuotientIQ.",
            "status": "active",
            "knowledge_text": "",
            "knowledge_files": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})

    # Backfill: any user without an org_id gets a single-member organization.
    async for u in db.users.find({"org_id": {"$exists": False}}):
        uid = str(u["_id"])
        existing_role = u.get("role") or "owner"
        org_res = await db.organizations.insert_one({
            "owner_id": uid,
            "name": (u.get("company") or u.get("name", "Untitled")) + "'s workspace",
            "members": [{"user_id": uid, "role": existing_role, "email": u["email"], "joined_at": now_iso()}],
            "created_at": now_iso(),
        })
        await db.users.update_one(
            {"_id": u["_id"]},
            {"$set": {
                "org_id": str(org_res.inserted_id),
                "plan": u.get("plan", "free"),
                "trial_started_at": u.get("trial_started_at", u.get("created_at", now_iso())),
            }},
        )
    logger.info("QuotientIQ ready.")

@app.on_event("shutdown")
async def shutdown():
    client.close()
