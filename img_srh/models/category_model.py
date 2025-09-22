import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
import torch.nn.functional as F

# OpenAI CLIP 사용
MODEL_NAME = "openai/clip-vit-base-patch32"
device = "cuda" if torch.cuda.is_available() else "cpu"

processor = CLIPProcessor.from_pretrained(MODEL_NAME)
model = CLIPModel.from_pretrained(MODEL_NAME).to(device).eval()

# 상하의 구분만
CATEGORIES = ["Top", "Bottom"]

@torch.no_grad()
def predict_clothing_category(img: Image.Image, topk: int = 2) -> list:
    inputs = processor(text=CATEGORIES, images=img, return_tensors="pt", padding=True).to(device)
    outputs = model(**inputs)

    # 유사도 계산
    image_embeds = outputs.image_embeds / outputs.image_embeds.norm(p=2, dim=-1, keepdim=True)
    text_embeds = outputs.text_embeds / outputs.text_embeds.norm(p=2, dim=-1, keepdim=True)
    similarity = torch.matmul(image_embeds, text_embeds.T)

    # top-k 추출
    topk_scores, topk_indices = torch.topk(similarity[0], k=topk)
    return [
        {"label": CATEGORIES[i], "score": float(topk_scores[j])}
        for j, i in enumerate(topk_indices)
    ]

