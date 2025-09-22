from __future__ import annotations
from typing import Literal
import torch
import numpy as np
from PIL import Image
from transformers import AutoProcessor, AutoModel

_MODEL = "patrickjohncyh/fashion-clip"

class FashionCLIP:
    def __init__(self, device: Literal["cpu","cuda"]|None=None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.processor = AutoProcessor.from_pretrained(_MODEL, trust_remote_code=True)
        self.model = AutoModel.from_pretrained(_MODEL, trust_remote_code=True).to(self.device)
        self.model.eval()

    @torch.no_grad()
    def embed_text(self, text: str) -> np.ndarray:
        inputs = self.processor(text=[text], return_tensors="pt").to(self.device)
        feats = self.model.get_text_features(**inputs)[0].detach().cpu().numpy().astype("float32")
        feats /= (np.linalg.norm(feats) + 1e-12)
        return feats

    @torch.no_grad()
    def embed_image(self, img: Image.Image) -> np.ndarray:
        img = img.convert("RGB")
        inputs = self.processor(images=[img], return_tensors="pt").to(self.device)
        feats = self.model.get_image_features(**inputs)[0].detach().cpu().numpy().astype("float32")
        feats /= (np.linalg.norm(feats) + 1e-12)
        return feats

_singleton: FashionCLIP|None = None
def get_fashion_clip() -> FashionCLIP:
    global _singleton
    if _singleton is None:
        _singleton = FashionCLIP()
    return _singleton
