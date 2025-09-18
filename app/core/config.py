import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://cherry:1234@panguin5225.m6oav.mongodb.net/?retryWrites=true&w=majority&appName=Panguin5225")
DB_NAME = os.getenv("DB_NAME", "musinsa_db")

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# === Added settings ===
VECTOR_DB_DIR = os.getenv("VECTOR_DB_DIR", "chroma_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "intfloat/multilingual-e5-small")