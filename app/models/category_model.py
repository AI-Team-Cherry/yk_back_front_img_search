# 실제 작동하는 의류 카테고리 분류 모델 (CLIP 기반)
import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
import torch.nn.functional as F

class ClothingCategoryModel:
    """실제 작동하는 의류 카테고리 분류 모델"""
    
    def __init__(self):
        """CLIP 모델 초기화"""
        try:
            # OpenAI CLIP 모델 로드
            self.model_name = "openai/clip-vit-base-patch32"
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            
            self.processor = CLIPProcessor.from_pretrained(self.model_name)
            self.model = CLIPModel.from_pretrained(self.model_name).to(self.device).eval()
            
            # 의류 카테고리 정의
            self.categories = ["Top", "Bottom", "Dress", "Outerwear", "Accessories"]
            
            print(f"CLIP 카테고리 분류 모델 로드 완료: {self.model_name}")
            
        except Exception as e:
            print(f"CLIP 모델 로드 실패: {e}")
            self.model = None
            self.processor = None
    
    def predict_clothing_category(self, img: Image.Image, topk: int = 2) -> list:
        """실제 의류 카테고리 분류 수행"""
        if self.model is None or self.processor is None:
            # 모델 로드 실패 시 더미 결과 반환
            return [{"label": "Unknown", "score": 0.0}] * min(topk, len(self.categories))
        
        try:
            # CLIP으로 카테고리 분류
            inputs = self.processor(
                text=self.categories, 
                images=img, 
                return_tensors="pt", 
                padding=True
            ).to(self.device)
            
            with torch.no_grad():
                outputs = self.model(**inputs)
                
                # 유사도 계산 (PyTorch 호환성 수정)
                image_embeds = outputs.image_embeds / outputs.image_embeds.norm(p=2, dim=-1, keepdim=True)
                text_embeds = outputs.text_embeds / outputs.text_embeds.norm(p=2, dim=-1, keepdim=True)
                similarity = torch.matmul(image_embeds, text_embeds.T)
                
                # top-k 추출
                topk_scores, topk_indices = torch.topk(similarity[0], k=min(topk, len(self.categories)))
                
                results = []
                for j, i in enumerate(topk_indices):
                    results.append({
                        "label": self.categories[i.item()], 
                        "score": float(topk_scores[j].item())
                    })
                
                return results
                
        except Exception as e:
            print(f"카테고리 분류 실패: {e}")
            return [{"label": "Unknown", "score": 0.0}] * min(topk, len(self.categories))
    
    def is_top_or_bottom(self, img: Image.Image) -> str:
        """상의/하의 간단 구분"""
        results = self.predict_clothing_category(img, topk=1)
        if results:
            category = results[0]["label"]
            if category in ["Top", "Outerwear"]:
                return "top"
            elif category in ["Bottom", "Dress"]:
                return "bottom"
        return "unknown"

# 전역 인스턴스
_category_model = None

def get_category_model():
    """카테고리 모델 인스턴스 반환 (싱글톤 패턴)"""
    global _category_model
    if _category_model is None:
        _category_model = ClothingCategoryModel()
    return _category_model

def predict_clothing_category(img: Image.Image, topk: int = 2) -> list:
    """편의 함수: 의류 카테고리 분류"""
    model = get_category_model()
    return model.predict_clothing_category(img, topk)

def is_top_or_bottom(img: Image.Image) -> str:
    """편의 함수: 상의/하의 구분"""
    model = get_category_model()
    return model.is_top_or_bottom(img)
