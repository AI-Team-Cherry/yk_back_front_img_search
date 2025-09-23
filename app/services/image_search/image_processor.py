"""
이미지 처리 관련 모듈
"""
import os
import time
import numpy as np
import torch
from PIL import Image
from typing import Dict, List, Any

# 전역 CLIP 모델 변수
_clip_processor = None
_clip_model = None

def set_clip_models(processor, model):
    """CLIP 모델 설정 함수"""
    global _clip_processor, _clip_model
    _clip_processor = processor
    _clip_model = model


class ImageProcessor:
    """이미지 처리 클래스"""
    
    def __init__(self):
        if _clip_processor is None or _clip_model is None:
            raise ValueError("CLIP models not set in ImageProcessor. Call set_clip_models first.")
        self.clip_processor = _clip_processor
        self.clip_model = _clip_model
    
    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """이미지 전처리"""
        # RGB 변환
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        return image

    def get_image_embedding(self, image: Image.Image) -> np.ndarray:
        """CLIP 모델로 이미지 임베딩 생성"""
        if self.clip_processor is None or self.clip_model is None:
            raise ValueError("CLIP 모델이 로드되지 않았습니다")
        
        inputs = self.clip_processor(images=image, return_tensors="pt")
        
        with torch.no_grad():
            image_features = self.clip_model.get_image_features(**inputs)
            embedding = image_features.cpu().numpy().astype(np.float32)
        
        # L2 정규화
        embedding = embedding / np.linalg.norm(embedding)
        return embedding
    
    def crop_clothes_region_top_bottom(self, pil_img: Image.Image, mask: np.ndarray) -> np.ndarray:
        """실제 의류 영역 추출 (마스크 기반 크롭)"""
        np_img = np.array(pil_img)
        
        # 의류 마스크 생성 (인체 분할 마스크 사용)
        clothes_mask = mask.astype(np.uint8)
        if clothes_mask.sum() == 0:
            # 마스크가 없으면 전체 이미지 반환
            return np_img
        
        # 바운딩 박스 계산
        y_idx, x_idx = np.where(clothes_mask)
        if len(y_idx) == 0 or len(x_idx) == 0:
            return np_img
            
        y1, y2 = y_idx.min(), y_idx.max()
        x1, x2 = x_idx.min(), x_idx.max()
        
        # 크롭
        cropped = np_img[y1:y2, x1:x2]
        mask_crop = clothes_mask[y1:y2, x1:x2]
        mask_3c = np.stack([mask_crop]*3, axis=-1)
        
        # 배경을 흰색으로 설정 (의류만 남기고 배경 제거)
        bg = np.ones_like(cropped, dtype=np.uint8) * 255
        masked = np.where(mask_3c, cropped, bg)
        
        return masked
    
    def crop_clothes_region_by_type(self, pil_img: Image.Image, mask: np.ndarray, clothing_type: str) -> np.ndarray:
        """실제 상의/하의 구분 의류 영역 추출"""
        np_img = np.array(pil_img)
        
        # 의류 마스크 생성 (인체 분할 마스크 사용)
        clothes_mask = mask.astype(np.uint8)
        if clothes_mask.sum() == 0:
            # 마스크가 없으면 전체 이미지 반환
            return np_img
        
        # 바운딩 박스 계산
        y_idx, x_idx = np.where(clothes_mask)
        if len(y_idx) == 0 or len(x_idx) == 0:
            return np_img
            
        y1, y2 = y_idx.min(), y_idx.max()
        x1, x2 = x_idx.min(), x_idx.max()
        
        # 상의/하의 구분 로직
        if clothing_type == "top":
            # 상반신만 추출 (상단 60%)
            y_split = y1 + int((y2 - y1) * 0.6)
            y2 = min(y_split, y2)
            print(f"상의 영역 추출: Y축 {y1}-{y2}")
            
        elif clothing_type == "bottom":
            # 하반신만 추출 (하단 60%)
            y_split = y1 + int((y2 - y1) * 0.4)
            y1 = max(y_split, y1)
            print(f"하의 영역 추출: Y축 {y1}-{y2}")
            
        else:  # "all"
            # 전체 영역 사용
            print(f"전체 영역 추출: Y축 {y1}-{y2}")
        
        # 크롭
        cropped = np_img[y1:y2, x1:x2]
        mask_crop = clothes_mask[y1:y2, x1:x2]
        mask_3c = np.stack([mask_crop]*3, axis=-1)
        
        # 배경을 흰색으로 설정 (의류만 남기고 배경 제거)
        bg = np.ones_like(cropped, dtype=np.uint8) * 255
        masked = np.where(mask_3c, cropped, bg)
        
        return masked
    
    def crop_clothes_region_by_mask(self, pil_img: Image.Image, mask: np.ndarray) -> np.ndarray:
        """MediaPipe 마스크를 사용한 의류 영역 추출"""
        np_img = np.array(pil_img)
        
        # 마스크 정보 출력
        print(f"마스크 크기: {mask.shape}, 마스크 픽셀 수: {mask.sum()}")
        
        # 마스크가 없으면 전체 이미지 반환
        if mask.sum() == 0:
            print("마스크가 비어있음 - 전체 이미지 반환")
            return np_img
        
        # 바운딩 박스 계산
        y_idx, x_idx = np.where(mask)
        if len(y_idx) == 0 or len(x_idx) == 0:
            print("마스크에서 유효한 픽셀을 찾을 수 없음 - 전체 이미지 반환")
            return np_img
            
        y1, y2 = y_idx.min(), y_idx.max()
        x1, x2 = x_idx.min(), x_idx.max()
        
        print(f"바운딩 박스: ({x1}, {y1}) ~ ({x2}, {y2}), 크기: {x2-x1}x{y2-y1}")
        
        # 크롭
        cropped = np_img[y1:y2, x1:x2]
        mask_crop = mask[y1:y2, x1:x2]
        mask_3c = np.stack([mask_crop]*3, axis=-1)
        
        # 배경을 흰색으로 설정 (의류만 남기고 배경 제거)
        bg = np.ones_like(cropped, dtype=np.uint8) * 255
        masked = np.where(mask_3c, cropped, bg)
        
        print(f"분리된 이미지 크기: {masked.shape}")
        return masked
    
    
    def _create_separated_images(self, image: Image.Image, clothing_regions: dict, clothing_type: str) -> List[Dict[str, Any]]:
        """분리된 사진을 생성하고 저장하는 메서드"""
        separated_images = []
        
        try:
            print(f"분리된 이미지 생성 시작 - 의류 타입: {clothing_type}")
            print(f"clothing_regions 키: {list(clothing_regions.keys())}")
            
            # 분리된 이미지 저장 디렉토리 생성
            separated_dir = "app/img_search/separated_images"
            os.makedirs(separated_dir, exist_ok=True)
            
            # 타임스탬프로 고유한 파일명 생성
            timestamp = int(time.time() * 1000)
            
            if clothing_type == "all":
                # 전체 옵션: 상의 + 하의 분리 사진 (2장)
                
                # 상의 분리 사진
                top_region = self.crop_clothes_region_by_mask(image, clothing_regions['top'])
                top_image = Image.fromarray(top_region)
                top_filename = f"top_{timestamp}.jpg"
                top_path = os.path.join(separated_dir, top_filename)
                top_image.save(top_path, "JPEG", quality=95)
                
                separated_images.append({
                    "type": "상의",
                    "filename": top_filename,
                    "url": f"/api/images/separated/{top_filename}",
                    "description": "상의 영역 분리된 이미지"
                })
                
                # 하의 분리 사진
                bottom_region = self.crop_clothes_region_by_mask(image, clothing_regions['bottom'])
                bottom_image = Image.fromarray(bottom_region)
                bottom_filename = f"bottom_{timestamp}.jpg"
                bottom_path = os.path.join(separated_dir, bottom_filename)
                bottom_image.save(bottom_path, "JPEG", quality=95)
                
                separated_images.append({
                    "type": "하의",
                    "filename": bottom_filename,
                    "url": f"/api/images/separated/{bottom_filename}",
                    "description": "하의 영역 분리된 이미지"
                })
                
            elif clothing_type == "top":
                # 상의 옵션: 상의 분리 사진 (1장)
                top_region = self.crop_clothes_region_by_mask(image, clothing_regions['top'])
                top_image = Image.fromarray(top_region)
                top_filename = f"top_{timestamp}.jpg"
                top_path = os.path.join(separated_dir, top_filename)
                top_image.save(top_path, "JPEG", quality=95)
                
                separated_images.append({
                    "type": "상의",
                    "filename": top_filename,
                    "url": f"/api/images/separated/{top_filename}",
                    "description": "상의 영역 분리된 이미지"
                })
                
            elif clothing_type == "bottom":
                # 하의 옵션: 하의 분리 사진 (1장)
                bottom_region = self.crop_clothes_region_by_mask(image, clothing_regions['bottom'])
                bottom_image = Image.fromarray(bottom_region)
                bottom_filename = f"bottom_{timestamp}.jpg"
                bottom_path = os.path.join(separated_dir, bottom_filename)
                bottom_image.save(bottom_path, "JPEG", quality=95)
                
                separated_images.append({
                    "type": "하의",
                    "filename": bottom_filename,
                    "url": f"/api/images/separated/{bottom_filename}",
                    "description": "하의 영역 분리된 이미지"
                })
            
            print(f"분리된 이미지 생성 완료: {len(separated_images)}개")
            
        except Exception as e:
            print(f"분리된 이미지 생성 실패: {e}")
        
        return separated_images
