# 실제 작동하는 인체 분할 모델 (MediaPipe 기반)
import numpy as np
from PIL import Image
import cv2
import mediapipe as mp
import torch

class HumanSegmentationModel:
    """MediaPipe 기반 인체 분할 모델 (상/하의 구분 가능)"""
    
    def __init__(self):
        """MediaPipe 모델 초기화"""
        try:
            # MediaPipe Selfie Segmentation 모델 로드
            self.mp_selfie_segmentation = mp.solutions.selfie_segmentation
            self.selfie_segmentation = self.mp_selfie_segmentation.SelfieSegmentation(
                model_selection=1  # 0: 일반 모델, 1: 고품질 모델
            )
            
            # MediaPipe Pose 모델 로드 (상/하의 구분용)
            self.mp_pose = mp.solutions.pose
            self.pose = self.mp_pose.Pose(
                static_image_mode=True,
                model_complexity=2,  # 0: 빠름, 1: 균형, 2: 정확함
                enable_segmentation=True,
                min_detection_confidence=0.5
            )
            
            print("MediaPipe 인체 분할 모델 로드 완료 (상/하의 구분 가능)")
        except Exception as e:
            print(f"MediaPipe 모델 로드 실패: {e}")
            self.selfie_segmentation = None
            self.pose = None
    
    def parse_human_parts(self, img: Image.Image) -> np.ndarray:
        """MediaPipe로 인체 분할 수행"""
        if self.selfie_segmentation is None:
            # 모델 로드 실패 시 전체 이미지를 마스크로 반환
            np_img = np.array(img)
            h, w = np_img.shape[:2]
            return np.ones((h, w), dtype=np.uint8)
        
        try:
            # PIL Image를 RGB로 변환 (MediaPipe는 RGB 필요)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # PIL Image를 numpy array로 변환
            img_array = np.array(img)
            h, w = img_array.shape[:2]
            
            # MediaPipe Selfie Segmentation 수행
            results = self.selfie_segmentation.process(img_array)
            
            if results.segmentation_mask is not None:
                # 마스크를 0-1 범위로 정규화
                mask = (results.segmentation_mask > 0.5).astype(np.uint8)
                return mask
            else:
                # 분할 실패 시 전체 이미지를 마스크로 반환
                return np.ones((h, w), dtype=np.uint8)
            
        except Exception as e:
            print(f"MediaPipe 인체 분할 실패: {e}")
            # 실패 시 전체 이미지를 마스크로 반환
            np_img = np.array(img)
            h, w = np_img.shape[:2]
            return np.ones((h, w), dtype=np.uint8)
    
    def get_clothing_regions(self, img: Image.Image) -> dict:
        """상/하의 영역을 구분하여 반환"""
        if self.pose is None or self.selfie_segmentation is None:
            # 모델 로드 실패 시 전체 이미지를 상의로 반환
            np_img = np.array(img)
            h, w = np_img.shape[:2]
            return {
                'top': np.ones((h, w), dtype=np.uint8),
                'bottom': np.zeros((h, w), dtype=np.uint8),
                'full_body': np.ones((h, w), dtype=np.uint8)
            }
        
        try:
            # PIL Image를 RGB로 변환
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            img_array = np.array(img)
            h, w = img_array.shape[:2]
            
            # 1. 전체 인체 분할
            seg_results = self.selfie_segmentation.process(img_array)
            full_body_mask = np.zeros((h, w), dtype=np.uint8)
            
            if seg_results.segmentation_mask is not None:
                full_body_mask = (seg_results.segmentation_mask > 0.5).astype(np.uint8)
                print(f"인체 분할 마스크 크기: {full_body_mask.shape}, 픽셀 수: {full_body_mask.sum()}")
            else:
                print("인체 분할 마스크 생성 실패")
            
            # 2. 포즈 랜드마크 감지
            pose_results = self.pose.process(img_array)
            
            if pose_results.pose_landmarks is not None:
                # 상/하의 구분을 위한 랜드마크 추출
                landmarks = pose_results.pose_landmarks.landmark
                
                # 허리 라인 추정 (엉덩이 랜드마크들 사용)
                waist_landmarks = [
                    landmarks[self.mp_pose.PoseLandmark.LEFT_HIP],
                    landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP]
                ]
                
                # 허리 라인 Y 좌표 계산
                waist_y = int(np.mean([lm.y * h for lm in waist_landmarks if lm.visibility > 0.5]))
                print(f"허리 라인 Y 좌표: {waist_y} (이미지 높이: {h})")
                
                # 상의 마스크 (허리 위쪽)
                top_mask = full_body_mask.copy()
                top_mask[waist_y:, :] = 0
                print(f"상의 마스크 픽셀 수: {top_mask.sum()}")
                
                # 하의 마스크 (허리 아래쪽)
                bottom_mask = full_body_mask.copy()
                bottom_mask[:waist_y, :] = 0
                print(f"하의 마스크 픽셀 수: {bottom_mask.sum()}")
                
                return {
                    'top': top_mask,
                    'bottom': bottom_mask,
                    'full_body': full_body_mask,
                    'waist_line': waist_y
                }
            else:
                # 포즈 감지 실패 시 전체를 상의로 처리
                return {
                    'top': full_body_mask,
                    'bottom': np.zeros((h, w), dtype=np.uint8),
                    'full_body': full_body_mask,
                    'waist_line': h // 2
                }
                
        except Exception as e:
            print(f"상/하의 구분 실패: {e}")
            # 실패 시 전체 이미지를 상의로 반환
            np_img = np.array(img)
            h, w = np_img.shape[:2]
            return {
                'top': np.ones((h, w), dtype=np.uint8),
                'bottom': np.zeros((h, w), dtype=np.uint8),
                'full_body': np.ones((h, w), dtype=np.uint8),
                'waist_line': h // 2
            }

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

def get_clothing_regions(img: Image.Image) -> dict:
    """편의 함수: 상/하의 영역 구분"""
    model = get_segmentation_model()
    return model.get_clothing_regions(img)
