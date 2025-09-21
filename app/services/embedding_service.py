from sentence_transformers import SentenceTransformer
import numpy as np

# 한국어 특화 임베딩 모델
MODEL_NAME = "jhgan/ko-sroberta-multitask"
embedder = SentenceTransformer(MODEL_NAME)

def get_embedding(text: str) -> list:
    """
    입력 텍스트를 벡터로 변환하여 리스트 반환
    """
    vec = embedder.encode([text])[0]
    return vec.tolist()

def cosine_similarity(vec1, vec2) -> float:
    """
    두 벡터 간 코사인 유사도 계산
    """
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))
