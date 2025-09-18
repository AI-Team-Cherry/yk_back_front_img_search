# CTR/매력도 점수 모델 (간단 규칙 기반 더미)
# TODO: 실제 학습 모델로 교체
def score_from_features(img_features: dict) -> float:
    base = 0.5
    comp = float(img_features.get("composition_score", 0.5))
    color_bonus = 0.05 if img_features.get("dominant_color") in {"blue","red"} else 0.0
    score = max(0.0, min(1.0, base * 0.4 + comp * 0.6 + color_bonus))
    return round(score, 4)
