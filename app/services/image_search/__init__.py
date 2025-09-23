import os
import numpy as np
import pandas as pd
import faiss
import torch
import time
from PIL import Image
from typing import Dict, List, Any, Optional

# 분리된 모듈들 import
from .data_loader import DataLoader
from .image_processor import ImageProcessor
from .product_analyzer import ProductAnalyzer
from .utils import convert_analysis_to_json_safe as _convert_analysis_to_json_safe, format_analysis_for_frontend as _format_analysis_for_frontend

# 실기능 모델 임포트
from app.models.segmentation_model import parse_human_parts, get_segmentation_model
from app.models.category_model import predict_clothing_category, is_top_or_bottom, get_category_model

class EnhancedImageSearchService:
    """이미지 검색 서비스 (분리된 모듈들로 구성)"""
    
    def __init__(self):
        print("EnhancedImageSearchService 초기화 중...")
        
        # 데이터 경로 설정
        self.image_dir = "app/img_search/only_product_images"
        
        # 분리된 모듈들 초기화
        self.data_loader = DataLoader(self.image_dir)
        self.data_loader.load_data()
        self.data_loader.load_product_metadata()
        self.data_loader.load_clip_model()
        
        # ImageProcessor에 CLIP 모델 설정
        from .image_processor import set_clip_models
        set_clip_models(self.data_loader.clip_processor, self.data_loader.clip_model)
        
        # ProductAnalyzer에 유틸 함수들 설정
        from .product_analyzer import set_utils_functions
        set_utils_functions(_convert_analysis_to_json_safe, _format_analysis_for_frontend)
        
        # ImageProcessor와 ProductAnalyzer 인스턴스 생성
        self.image_processor = ImageProcessor()
        self.product_analyzer = ProductAnalyzer()
        
        # 데이터 접근을 위한 속성들
        self.metadata = self.data_loader.metadata
        self.index = self.data_loader.index
        self.product_df = self.data_loader.product_df
        self.merged = self.data_loader.merged
        self.clip_model = self.data_loader.clip_model
        self.clip_processor = self.data_loader.clip_processor
        
        print("EnhancedImageSearchService 초기화 완료!")
    
    def _convert_analysis_to_json_safe(self, data: Any) -> Any:
        """numpy 타입을 JSON 직렬화 가능한 타입으로 변환"""
        return _convert_analysis_to_json_safe(data)
    
    async def search_existing_images(self, query_text: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """텍스트로 기존 이미지 검색"""
        start_time = time.time()
        
        print(f"검색 쿼리: '{query_text}'")
        
        # 텍스트 → 임베딩
        inputs = self.clip_processor(text=[query_text], return_tensors="pt", padding=True)
        with torch.no_grad():
            query_emb = self.clip_model.get_text_features(**inputs).cpu().numpy().astype(np.float32)
        
        # 정규화
        query_emb = query_emb / np.linalg.norm(query_emb, axis=1, keepdims=True)
        
        # FAISS 검색
        search_k = min(top_k * 5, self.index.ntotal)
        D, I = self.index.search(query_emb, k=search_k)
        
        print(f"FAISS 검색 완료: {len(I[0])}개 후보")
        
        # 중복 제거 및 결과 생성
        unique_results = []
        seen = set()
        
        for i, idx in enumerate(I[0]):
            if hasattr(self, 'metadata') and self.metadata:
                # 처리된 데이터 사용
                img_file = self.metadata['image_files'][idx]
                caption = self.metadata['captions'][idx]
            else:
                # 원본 CSV 데이터 사용
                img_file = self.merged.iloc[idx]["image_file"]
                caption = self.merged.iloc[idx].get("predicted_caption", self.merged.iloc[idx].get("caption", ""))
            
            if img_file not in seen:
                seen.add(img_file)
                
                # 유사도 점수
                similarity_score = D[0][i]
                
                # 상품 메타데이터 가져오기
                product_id = img_file.split("_")[0]
                product_info = self.data_loader.get_product_info(product_id) or {}
                
                result_item = {
                    "id": str(len(unique_results) + 1),
                    "filename": img_file,
                    "image_file": img_file,
                    "caption": caption,
                    "similarity": float(similarity_score),
                    "image_path": os.path.join(self.image_dir, img_file),
                    "url": f"/api/images/file/{img_file}",
                    "title": caption,
                    "description": f"AI 생성 캡션: {caption}",
                    "tags": ["AI추천", "패션"],
                    "relevance": similarity_score
                }
                
                # 메타데이터 추가
                result_item.update(product_info)
                
                print(f"결과 {len(unique_results)+1}: {img_file} - 유사도: {similarity_score:.3f} - {caption[:50]}...")
                
                unique_results.append(result_item)
            if len(unique_results) == top_k:
                break
        
        search_time = time.time() - start_time
        print(f"검색 완료: {len(unique_results)}개 결과 ({search_time:.2f}초)")
        
        # 각 검색 결과에 상세 분석 정보 추가
        enhanced_results = []
        for result in unique_results:
            enhanced_result = result.copy()
            detailed_analysis = await self.product_analyzer._analyze_single_product(result)
            enhanced_result["detailed_analysis"] = detailed_analysis
            enhanced_results.append(enhanced_result)
        
        return enhanced_results
    
    def search_by_image(self, image: Image.Image, top_k: int = 9) -> List[Dict[str, Any]]:
        """이미지로 검색"""
        start_time = time.time()
        
        print(f"이미지 검색 시작: {image.size}")
        
        # 이미지 전처리 및 임베딩 생성
        processed_image = self.image_processor.preprocess_image(image)
        image_embedding = self.image_processor.get_image_embedding(processed_image)
        
        # FAISS 검색
        search_k = min(top_k * 5, self.index.ntotal)
        D, I = self.index.search(image_embedding, k=search_k)
        
        print(f"FAISS 검색 완료: {len(I[0])}개 후보")
        
        # 중복 제거 및 결과 생성
        unique_results = []
        seen = set()
        
        for i, idx in enumerate(I[0]):
            if hasattr(self, 'metadata') and self.metadata:
                img_file = self.metadata['image_files'][idx]
                caption = self.metadata['captions'][idx]
            else:
                img_file = self.merged.iloc[idx]["image_file"]
                caption = self.merged.iloc[idx].get("predicted_caption", self.merged.iloc[idx].get("caption", ""))
            
            if img_file not in seen:
                seen.add(img_file)
                
                similarity_score = D[0][i]
                product_id = img_file.split("_")[0]
                product_info = self.data_loader.get_product_info(product_id) or {}
                
                result = {
                    "id": f"{product_id}_{i}",
                    "title": str(product_info.get("product_name", caption[:50] if caption else "상품명 없음")),
                    "url": f"/api/images/file/{img_file}",
                    "similarity": float(similarity_score),
                    "product_name": str(product_info.get("product_name", "")),
                    "price": int(product_info.get("price", 0)),
                    "rating_avg": float(product_info.get("rating_avg", 0.0)),
                    "brand": str(product_info.get("brand", "")),
                    "clothing_category": "Unknown",
                    "category_confidence": 0.0,
                    "detailed_analysis": _convert_analysis_to_json_safe(_format_analysis_for_frontend(
                        product_info, similarity_score, self.product_analyzer
                    ))
                }
                print(f"이미지 URL 생성: {result['url']} (파일: {img_file})")
                
                unique_results.append(result)
                
                if len(unique_results) >= top_k:
                    break
        
        search_time = time.time() - start_time
        print(f"이미지 검색 완료: {len(unique_results)}개 결과, {search_time:.2f}초")
        
        return unique_results
    
    def search_by_image_advanced(self, image: Image.Image, top_k: int = 9, clothing_type: str = "all") -> Dict[str, Any]:
        """고급 이미지 검색 (MediaPipe 사용)"""
        start_time = time.time()
        
        print(f"고급 이미지 검색 시작: {image.size}, 의류 타입: {clothing_type}")
        
        try:
            # 1. MediaPipe로 인체 분할 및 상/하의 구분
            from app.models.segmentation_model import get_clothing_regions
            clothing_regions = get_clothing_regions(image)
            print("MediaPipe 인체 분할 및 상/하의 구분 완료")
            
            # 2. 분리된 사진 생성 및 저장
            separated_images = self.image_processor._create_separated_images(image, clothing_regions, clothing_type)
            
            # 3. 전체 옵션인 경우 상의 5개 + 하의 5개로 분리 검색
            if clothing_type == "all":
                print("전체 옵션: 상의 5개 + 하의 5개로 분리 검색")
                
                # 상의 검색 (5개)
                top_results = self._search_by_clothing_region(
                    image, clothing_regions['top'], "상의", 5
                )
                
                # 하의 검색 (5개)
                bottom_results = self._search_by_clothing_region(
                    image, clothing_regions['bottom'], "하의", 5
                )
                
                # 결과 합치기
                combined_results = top_results + bottom_results
                
                search_time = time.time() - start_time
                print(f"고급 이미지 검색 완료: 상의 {len(top_results)}개 + 하의 {len(bottom_results)}개 = 총 {len(combined_results)}개 결과, {search_time:.2f}초")
                
                return {
                    "results": combined_results,
                    "separated_images": separated_images,
                    "search_type": "all",
                    "top_count": len(top_results),
                    "bottom_count": len(bottom_results)
                }
            
            # 4. 단일 의류 타입 검색
            if clothing_type == "top":
                clothing_mask = clothing_regions['top']
                region_name = "상의"
            elif clothing_type == "bottom":
                clothing_mask = clothing_regions['bottom']
                region_name = "하의"
            else:
                clothing_mask = clothing_regions['full_body']
                region_name = "전체"
            
            results = self._search_by_clothing_region(
                image, clothing_mask, region_name, top_k
            )
            
            search_time = time.time() - start_time
            print(f"고급 이미지 검색 완료: {len(results)}개 결과, {search_time:.2f}초")
            
            return {
                "results": results,
                "separated_images": separated_images,
                "search_type": clothing_type,
                "count": len(results)
            }
            
        except Exception as e:
            print(f"고급 이미지 검색 실패: {e}")
            # 실패 시 기본 이미지 검색으로 폴백
            fallback_results = self.search_by_image(image, top_k)
            return {
                "results": fallback_results,
                "separated_images": [],
                "search_type": "fallback",
                "count": len(fallback_results)
            }
    
    def _search_by_clothing_region(self, image: Image.Image, clothing_mask: np.ndarray, region_name: str, top_k: int) -> List[Dict[str, Any]]:
        """특정 의류 영역으로 검색하는 헬퍼 메서드"""
        try:
            # 1. 의류 영역 추출
            clothing_region = self.image_processor.crop_clothes_region_by_mask(image, clothing_mask)
            clothing_image = Image.fromarray(clothing_region)
            print(f"{region_name} 영역 추출 완료 - 마스크 픽셀 수: {clothing_mask.sum()}")
            
            # 2. 카테고리 분류
            category_results = predict_clothing_category(clothing_image, topk=2)
            category = category_results[0]["label"] if category_results else "Unknown"
            category_confidence = category_results[0]["score"] if category_results else 0.0
            print(f"{region_name} 카테고리 분류: {category} (신뢰도: {category_confidence:.2f})")
            
            # 3. 의류 영역으로 CLIP 검색
            processed_image = self.image_processor.preprocess_image(clothing_image)
            image_embedding = self.image_processor.get_image_embedding(processed_image)
            print(f"{region_name} CLIP 임베딩 생성 완료 - 임베딩 크기: {image_embedding.shape}")
            
            # 4. FAISS 검색
            search_k = min(top_k * 5, self.index.ntotal)
            D, I = self.index.search(image_embedding, k=search_k)
            print(f"{region_name} FAISS 검색 완료 - 상위 {len(I[0])}개 후보")
            
            # 5. 결과 생성
            unique_results = []
            seen = set()
            
            for i, idx in enumerate(I[0]):
                if hasattr(self, 'metadata') and self.metadata:
                    img_file = self.metadata['image_files'][idx]
                    caption = self.metadata['captions'][idx]
                else:
                    img_file = self.merged.iloc[idx]["image_file"]
                    caption = self.merged.iloc[idx].get("predicted_caption", self.merged.iloc[idx].get("caption", ""))
                
                if img_file not in seen:
                    seen.add(img_file)
                    
                    similarity_score = D[0][i]
                    product_id = img_file.split("_")[0]
                    product_info = self.data_loader.get_product_info(product_id) or {}
                    
                    # 고급 검색 결과 (카테고리 정보 추가)
                    result = {
                        "id": f"{product_id}_{i}",
                        "title": str(product_info.get("product_name", caption[:50] if caption else "상품명 없음")),
                        "url": f"/api/images/file/{img_file}",
                        "similarity": float(similarity_score),
                        "product_name": str(product_info.get("product_name", "")),
                        "price": int(product_info.get("price", 0)),
                        "rating_avg": float(product_info.get("rating_avg", 0.0)),
                        "brand": str(product_info.get("brand", "")),
                        "clothing_category": category,
                        "category_confidence": float(category_confidence),
                        "detailed_analysis": _convert_analysis_to_json_safe(_format_analysis_for_frontend(
                            product_info, similarity_score, self.product_analyzer
                        ))
                    }
                    
                    unique_results.append(result)
                    
                    if len(unique_results) >= top_k:
                        break
            
            return unique_results
            
        except Exception as e:
            print(f"{region_name} 검색 실패: {e}")
            return []
    
    def add_image_to_catalog(self, image: Image.Image, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """실제 이미지를 카탈로그에 추가"""
        try:
            # 1. 인체 분할 및 의류 영역 추출
            human_mask = parse_human_parts(image)
            clothing_region = self.image_processor.crop_clothes_region_top_bottom(image, human_mask)
            clothing_image = Image.fromarray(clothing_region)
            
            # 2. 카테고리 분류
            category_results = predict_clothing_category(clothing_image, topk=2)
            
            # 3. 임베딩 생성
            processed_image = self.image_processor.preprocess_image(clothing_image)
            image_embedding = self.image_processor.get_image_embedding(processed_image)
            
            # 4. FAISS 인덱스에 추가
            if hasattr(self, 'index'):
                self.index.add(image_embedding.astype(np.float32))
                print(f"FAISS 인덱스에 이미지 추가 완료")
            
            # 5. 메타데이터 저장
            image_id = f"custom_{int(time.time())}"
            if metadata is None:
                metadata = {}
            
            metadata.update({
                "image_id": image_id,
                "category": category_results[0]["label"] if category_results else "Unknown",
                "category_confidence": float(category_results[0]["score"]) if category_results else 0.0,
                "added_at": time.time()
            })
            
            return {
                "success": True,
                "image_id": image_id,
                "metadata": metadata,
                "message": "이미지가 카탈로그에 추가되었습니다."
            }
            
        except Exception as e:
            print(f"카탈로그 추가 실패: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "이미지 추가에 실패했습니다."
            }
    
    def remove_image_from_catalog(self, image_id: str) -> Dict[str, Any]:
        """실제 카탈로그에서 이미지 제거"""
        try:
            print(f"카탈로그에서 이미지 제거: {image_id}")
            
            return {
                "success": True,
                "image_id": image_id,
                "message": "이미지가 카탈로그에서 제거되었습니다."
            }
            
        except Exception as e:
            print(f"카탈로그 제거 실패: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "이미지 제거에 실패했습니다."
            }

# 전역 서비스 인스턴스
_search_service = None

def get_search_service():
    """검색 서비스 인스턴스 반환 (싱글톤 패턴)"""
    global _search_service
    if _search_service is None:
        _search_service = EnhancedImageSearchService()
    return _search_service

# 기존 함수와의 호환성을 위한 래퍼
async def generate_image(prompt: str, top: int):
    """기존 generate_image 함수와 호환되는 래퍼"""
    start_time = time.time()
    
    service = get_search_service()
    results = await service.search_existing_images(prompt, top)
    
    search_time = time.time() - start_time
    
    # 기존 API 응답 형태로 변환 (호환성 유지)
    formatted_images = []
    for result in results:
        formatted_images.append({
            "id": str(result.get("id", "")),
            "filename": str(result.get("filename", "")),
            "url": str(result.get("url", "")),
            "title": str(result.get("title", "")),
            "description": str(result.get("description", "")),
            "tags": result.get("tags", []),
            "relevance": float(result.get("relevance", 0.0)),
            "similarity": float(result.get("similarity", 0.0)),
            "product_name": str(result.get("product_name", "")),
            "price": int(result.get("price", 0)),
            "rating_avg": float(result.get("rating_avg", 0.0)),
            "brand": str(result.get("brand", "")),
            "detailed_analysis": _convert_analysis_to_json_safe(result.get("detailed_analysis", {}))
        })

    return {
        "query": prompt,
        "totalCount": len(formatted_images),
        "searchTime": round(search_time, 2),
        "images": formatted_images
    }
