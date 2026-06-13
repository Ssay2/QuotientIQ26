from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

# ---------------- DB ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
JWT_ALGORITHM = "HS256"

# ---------------- Helpers ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))

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
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
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
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
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
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    uid = str(user["_id"])
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": user.get("name", ""), "company": user.get("company", ""), "role": user.get("role", "user"), "access_token": access}

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
    return doc

@api.get("/agents/{agent_id}")
async def get_agent(agent_id: str, user: dict = Depends(get_current_user)):
    a = await db.agents.find_one({"_id": ObjectId(agent_id), "user_id": user["id"]})
    if not a:
        raise HTTPException(404, "Agent not found")
    a["id"] = str(a.pop("_id"))
    return a

@api.patch("/agents/{agent_id}")
async def update_agent(agent_id: str, body: AgentIn, user: dict = Depends(get_current_user)):
    await db.agents.update_one(
        {"_id": ObjectId(agent_id), "user_id": user["id"]},
        {"$set": body.model_dump()}
    )
    return await get_agent(agent_id, user)

@api.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, user: dict = Depends(get_current_user)):
    await db.agents.delete_one({"_id": ObjectId(agent_id), "user_id": user["id"]})
    await db.conversations.delete_many({"agent_id": agent_id, "user_id": user["id"]})
    return {"ok": True}

# ---------------- Knowledge Base ----------------
@api.post("/agents/{agent_id}/upload")
async def upload_pdf(agent_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    a = await db.agents.find_one({"_id": ObjectId(agent_id), "user_id": user["id"]})
    if not a:
        raise HTTPException(404, "Agent not found")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")
    content = await file.read()
    try:
        reader = PdfReader(io.BytesIO(content))
        text = "\n".join((p.extract_text() or "") for p in reader.pages)
    except Exception as e:
        raise HTTPException(400, f"Could not parse PDF: {e}")
    text = text.strip()
    if not text:
        raise HTTPException(400, "PDF appears to contain no extractable text")
    new_text = (a.get("knowledge_text", "") + "\n\n" + f"### {file.filename}\n" + text).strip()
    files = a.get("knowledge_files", []) + [{
        "name": file.filename,
        "size": len(content),
        "chars": len(text),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }]
    await db.agents.update_one(
        {"_id": ObjectId(agent_id)},
        {"$set": {"knowledge_text": new_text[:200000], "knowledge_files": files}}
    )
    return {"ok": True, "filename": file.filename, "chars": len(text), "files": files}

@api.delete("/agents/{agent_id}/files/{filename}")
async def delete_file(agent_id: str, filename: str, user: dict = Depends(get_current_user)):
    a = await db.agents.find_one({"_id": ObjectId(agent_id), "user_id": user["id"]})
    if not a:
        raise HTTPException(404, "Agent not found")
    files = [f for f in a.get("knowledge_files", []) if f["name"] != filename]
    # Rebuild knowledge text without the deleted file's section (simple approach: keep remaining sections)
    text = a.get("knowledge_text", "")
    blocks = text.split("### ")
    keep = [b for b in blocks if not b.startswith(filename)]
    new_text = "### ".join(keep).strip()
    await db.agents.update_one(
        {"_id": ObjectId(agent_id)},
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
    c = await db.conversations.find_one({"_id": ObjectId(conv_id), "user_id": user["id"]})
    if not c:
        raise HTTPException(404, "Conversation not found")
    c["id"] = str(c.pop("_id"))
    return c

# ---------------- Chat (SSE streaming) ----------------
@api.post("/agents/{agent_id}/chat")
async def chat_with_agent(agent_id: str, body: ChatMessageIn, user: dict = Depends(get_current_user)):
    agent = await db.agents.find_one({"_id": ObjectId(agent_id), "user_id": user["id"]})
    if not agent:
        raise HTTPException(404, "Agent not found")

    # Get or create conversation
    if body.conversation_id:
        conv = await db.conversations.find_one({"_id": ObjectId(body.conversation_id), "user_id": user["id"]})
        if not conv:
            raise HTTPException(404, "Conversation not found")
        conv_id = str(conv["_id"])
    else:
        new_conv = {
            "agent_id": agent_id,
            "user_id": user["id"],
            "customer_name": body.customer_name or "Guest",
            "messages": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        res = await db.conversations.insert_one(new_conv)
        conv_id = str(res.inserted_id)
        conv = new_conv

    # Append user message
    user_msg = {"role": "user", "content": body.message, "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.conversations.update_one(
        {"_id": ObjectId(conv_id)},
        {"$push": {"messages": user_msg}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    # Build system message with knowledge base
    kb = (agent.get("knowledge_text") or "").strip()
    system_message = (agent.get("instructions") or "You are a helpful AI assistant.")
    if kb:
        system_message += "\n\n--- KNOWLEDGE BASE ---\n" + kb[:30000] + "\n--- END KNOWLEDGE BASE ---\n\nAnswer based strictly on the knowledge base above when possible. If the answer is not in the knowledge base, say you don't have that information."

    # Build history (last 10)
    history_text = ""
    prev = (conv.get("messages") or [])[-10:]
    for m in prev:
        history_text += f"\n{m['role'].upper()}: {m['content']}"

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=conv_id,
        system_message=system_message,
    ).with_model("openai", "gpt-5.2")

    user_message = UserMessage(text=body.message if not history_text else f"Conversation so far:{history_text}\n\nLatest user message: {body.message}")

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
        # Persist assistant message
        await db.conversations.update_one(
            {"_id": ObjectId(conv_id)},
            {"$push": {"messages": {"role": "assistant", "content": full, "timestamp": datetime.now(timezone.utc).isoformat()}},
             "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        yield f"event: done\ndata: {conv_id}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"})

# Non-streaming variant for simpler testing
@api.post("/agents/{agent_id}/chat-sync")
async def chat_sync(agent_id: str, body: ChatMessageIn, user: dict = Depends(get_current_user)):
    agent = await db.agents.find_one({"_id": ObjectId(agent_id), "user_id": user["id"]})
    if not agent:
        raise HTTPException(404, "Agent not found")

    if body.conversation_id:
        conv = await db.conversations.find_one({"_id": ObjectId(body.conversation_id), "user_id": user["id"]})
        if not conv:
            raise HTTPException(404, "Conversation not found")
        conv_id = str(conv["_id"])
    else:
        new_conv = {
            "agent_id": agent_id, "user_id": user["id"],
            "customer_name": body.customer_name or "Guest",
            "messages": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        res = await db.conversations.insert_one(new_conv)
        conv_id = str(res.inserted_id)
        conv = new_conv

    kb = (agent.get("knowledge_text") or "").strip()
    system_message = (agent.get("instructions") or "You are a helpful AI assistant.")
    if kb:
        system_message += "\n\n--- KNOWLEDGE BASE ---\n" + kb[:30000]

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=conv_id,
        system_message=system_message,
    ).with_model("openai", "gpt-5.2")

    full = ""
    async for ev in chat.stream_message(UserMessage(text=body.message)):
        if isinstance(ev, TextDelta):
            full += ev.content
        elif isinstance(ev, StreamDone):
            break

    now = datetime.now(timezone.utc).isoformat()
    await db.conversations.update_one(
        {"_id": ObjectId(conv_id)},
        {"$push": {"messages": {"$each": [
            {"role": "user", "content": body.message, "timestamp": now},
            {"role": "assistant", "content": full, "timestamp": now},
        ]}}, "$set": {"updated_at": now}}
    )
    return {"conversation_id": conv_id, "reply": full}

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
    await db.conversations.create_index([("user_id", 1), ("agent_id", 1)])
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
    logger.info("QuotientIQ ready.")

@app.on_event("shutdown")
async def shutdown():
    client.close()
