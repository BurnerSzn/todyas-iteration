from fastapi import FastAPI, File, UploadFile, HTTPException, status, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt
import sqlite3
from typing import Optional
import time
import random
from datetime import datetime, timedelta
import os
import requests

DATABASE = "./users.db"
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-to-a-secure-random-string")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()

# frontend backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files from frontend directory
app.mount("/", StaticFiles(directory="../frontend", html=True), name="static")


def init_db():
    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    conn.commit()
    conn.close()

def load_env_file(path: str) -> None:
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)

load_env_file(os.path.join(os.path.dirname(__file__), ".env"))


def get_user_by_email(email: str) -> Optional[dict]:
    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()
    cur.execute("SELECT id, email, password_hash, created_at FROM users WHERE email = ?", (email,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    return {"id": row[0], "email": row[1], "password_hash": row[2], "created_at": row[3]}


def create_user(email: str, password: str) -> dict:
    password_hash = pwd_context.hash(password)
    created_at = datetime.utcnow().isoformat()
    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)", (email, password_hash, created_at))
        conn.commit()
        user_id = cur.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        raise
    conn.close()
    return {"id": user_id, "email": email, "created_at": created_at}


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


class RegisterIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {"status": "AI Clothing Origin Finder backend running"}


@app.post("/auth/register", status_code=201)
def register(payload: RegisterIn):
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if payload.email.lower() == "master@example.com":
        raise HTTPException(status_code=400, detail="Cannot register this email")
    existing = get_user_by_email(payload.email.lower())
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    try:
        user = create_user(payload.email.lower(), payload.password)
    except Exception:
        raise HTTPException(status_code=500, detail="Could not create user")
    return {"id": user["id"], "email": user["email"]}


@app.post("/auth/login", response_model=TokenOut)
def login(payload: LoginIn):
    # Hardcoded master user
    if payload.email.lower() == "master@example.com" and payload.password == "masterpass":
        access_token = create_access_token({"sub": "master", "email": "master@example.com"})
        return {"access_token": access_token, "token_type": "bearer"}
    
    user = get_user_by_email(payload.email.lower())
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token({"sub": str(user["id"]), "email": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}


SERPAPI_KEY = os.getenv("SERPAPI_KEY")
SERPAPI_URL = "https://serpapi.com/search.json"

def search_products(query: str):
    if not SERPAPI_KEY:
        raise HTTPException(status_code=500, detail="Missing SERPAPI_KEY")

    params = {
        "engine": "google_shopping",
        "q": query,
        "hl": "en",
        "gl": "uk",
        "api_key": SERPAPI_KEY
    }

    r = requests.get(SERPAPI_URL, params=params, timeout=30)
    if not r.ok:
        raise HTTPException(status_code=502, detail="Search API error")

    data = r.json()
    results = []

    for item in data.get("shopping_results", [])[:6]:
        results.append({
            "item": item.get("title", "Unknown item"),
            "store": item.get("source", "Unknown"),
            "price": item.get("price", "N/A"),
            "link": item.get("link", ""),
            "thumbnail": item.get("thumbnail", "")
        })

    return results


@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid file type")

    await file.read()  # prove upload works

    query = "black hoodie men"  # fallback keywords
    results = search_products(query)

    return {
        "prediction": "hoodie ",
        "confidence": 85,
        "query_used": query,
        "results": results
    }




