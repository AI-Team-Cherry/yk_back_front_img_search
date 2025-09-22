import torch
from PIL import Image
from transformers import AutoProcessor, AutoModel

# Fashion-CLIP 
MODEL_NAME = "patrickjohncyh/fashion-clip"
device = "cuda" if torch.cuda.is_available() else "cpu"

processor = AutoProcessor.from_pretrained(MODEL_NAME, trust_remote_code=True)
model = AutoModel.from_pretrained(MODEL_NAME, trust_remote_code=True).to(device).eval()

# 상하의 구분만
CATEGORIES = ["Top", "Bottom"]

@torch.no_grad()
def predict_clothing_category(img: Image.Image, topk: int = 2) -> list:
    text_inputs = processor(text=CATEGORIES, return_tensors="pt", padding=True).to(device)
    image_inputs = processor(images=img, return_tensors="pt").to(device)

    image_embeds = model.get_image_features(**image_inputs)
    text_embeds = model.get_text_features(**text_inputs)

    image_embeds = image_embeds / image_embeds.norm(p=2, dim=-1, keepdim=True)
    text_embeds = text_embeds / text_embeds.norm(p=2, dim=-1, keepdim=True)

    similarity = torch.matmul(image_embeds, text_embeds.T)

    topk_scores, topk_indices = torch.topk(similarity[0], k=topk)
    return [
        {"label": CATEGORIES[i], "score": float(topk_scores[j])}
        for j, i in enumerate(topk_indices)
    ]
