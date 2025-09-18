"""
벡터 DB 초기화 서비스
"""

import os
from app.core.config import VECTOR_DB_DIR

def initialize_vector_db():
    os.makedirs(VECTOR_DB_DIR, exist_ok=True)
    # TODO: 실제 ChromaDB 초기화 로직 연결
    return {"status": "ok", "path": VECTOR_DB_DIR}
