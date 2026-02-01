from fastapi import FastAPI, File, UploadFile, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt
import sqlite3
from typing import Optional
import time
import random
from datetime import datetime, timedelta

DATABASE = "./users.db"
SECRET_KEY = "change-me-to-a-secure-random-string"
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
    user = get_user_by_email(payload.email.lower())
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token({"sub": str(user["id"]), "email": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    # mock processing delay
    time.sleep(2)

    fake_results = [
        {
            "item": "Black Hoodie",
            "store": "ASOS",
            "price": "£35"
        },
        {
            "item": "Streetwear Hoodie",
            "store": "ZARA",
            "price": "£29.99"
        },
        {
            "item": "Oversized Hoodie",
            "store": "H&M",
            "price": "£24.99"
        }
    ]

    return {
        "filename": file.filename,
        "prediction": "Hoodie",
        "confidence": round(random.uniform(0.75, 0.95), 2),
        "results": fake_results
    }
