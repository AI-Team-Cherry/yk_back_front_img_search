# 실제 작동하는 인체 분할 모델 (YOLO 기반)
import numpy as np
from PIL import Image
import cv2
from ultralytics import YOLO
import torch

class HumanSegmentationModel:
    """실제 작동하는 인체 분할 모델"""
    
    def __init__(self):
        """YOLO 모델 초기화"""
        try:
            # YOLOv11 segmentation 모델 로드 (사람 분할용) - 최신 모델
            self.model = YOLO('yolo11s-seg.pt')  # YOLOv8s → YOLOv11s로 업그레이드
            print("YOLOv11s 인체 분할 모델 로드 완료 (최신 모델)")
        except Exception as e:
            print(f"YOLO 모델 로드 실패: {e}")
            self.model = None
    
    def parse_human_parts(self, img: Image.Image) -> np.ndarray:
        """실제 인체 분할 수행"""
        if self.model is None:
            # 모델 로드 실패 시 전체 이미지를 마스크로 반환
            np_img = np.array(img)
            h, w = np_img.shape[:2]
            return np.ones((h, w), dtype=np.uint8)
        
        try:
            # PIL Image를 numpy array로 변환
            img_array = np.array(img)
            
            # YOLO로 사람 감지 및 분할
            results = self.model(img_array, classes=[0])  # class 0 = person
            
            # 마스크 생성
            h, w = img_array.shape[:2]
            mask = np.zeros((h, w), dtype=np.uint8)
            
            if results and len(results) > 0:
                result = results[0]
                if result.masks is not None:
                    # 모든 사람 마스크를 합침
                    for mask_data in result.masks.data:
                        # 마스크를 이미지 크기로 리사이즈
                        mask_resized = cv2.resize(
                            mask_data.cpu().numpy(), 
                            (w, h), 
                            interpolation=cv2.INTER_NEAREST
                        )
                        mask = np.maximum(mask, mask_resized)
            
            # 마스크를 0-1 범위로 정규화
            mask = (mask > 0.5).astype(np.uint8)
            
            return mask
            
        except Exception as e:
            print(f"인체 분할 실패: {e}")
            # 실패 시 전체 이미지를 마스크로 반환
            np_img = np.array(img)
            h, w = np_img.shape[:2]
            return np.ones((h, w), dtype=np.uint8)

# 전역 인스턴스
_segmentation_model = None

def get_segmentation_model():
    """분할 모델 인스턴스 반환 (싱글톤 패턴)"""
    global _segmentation_model
    if _segmentation_model is None:
        _segmentation_model = HumanSegmentationModel()
    return _segmentation_model

def parse_human_parts(img: Image.Image) -> np.ndarray:
    """편의 함수: 인체 분할 수행"""
    model = get_segmentation_model()
    return model.parse_human_parts(img)
