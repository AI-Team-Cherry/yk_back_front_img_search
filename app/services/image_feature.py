# 이미지 피처 처리 (간단 더미)
# TODO: 색상/구도/선명도 등 실제 모델 붙이기
import os

async def analyze_image(file_path: str):
    exists = os.path.exists(file_path)
    return {
        "dominant_color": "blue",
        "composition_score": 0.78,
        "exists": exists
    }
