# RAG 검색 서비스 (ChromaDB 기반, 없으면 더미)
from typing import List, Dict, Any
import os

async def search(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    # TODO: 실제 chromadb / faiss 붙이기
    # 빈 결과 반환 (실제 RAG 구현 전까지)
    return []
