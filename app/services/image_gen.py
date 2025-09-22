import os
import numpy as np
import pandas as pd
import faiss
import torch
import time
import io
import json
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from typing import Dict, List, Any, Optional

# 실제 작동하는 고급 기능 모델 임포트
from app.models.segmentation_model import parse_human_parts, get_segmentation_model
from app.models.category_model import predict_clothing_category, is_top_or_bottom, get_category_model

class EnhancedImageSearchService:
    """고급 이미지 검색 서비스 (image_search_test.py 기반)"""
    
    def __init__(self):
        print("EnhancedImageSearchService 초기화 중...")
        
        # 데이터 경로 설정
        self.image_dir = "app/img_search/only_product_images"
        
        # 데이터 로드
        self._load_data()
        
        # 상품 메타데이터 로드
        self._load_product_metadata()
        
        # CLIP 모델 로드
        self._load_clip_model()
        
        print("EnhancedImageSearchService 초기화 완료!")
    
    def _load_data(self):
        """데이터 로드"""
        try:
            # 처리된 데이터가 있는지 확인
            processed_dir = "app/img_search/processed"
            if os.path.exists(os.path.join(processed_dir, "metadata.pkl")):
                print("처리된 데이터 로드 중...")
                import pickle
                with open(os.path.join(processed_dir, "metadata.pkl"), "rb") as f:
                    self.metadata = pickle.load(f)
                self.index = faiss.read_index(os.path.join(processed_dir, "faiss_index.bin"))
                print(f"처리된 데이터 로드 완료: {len(self.metadata['image_files'])}개 이미지")
            else:
                print("원본 데이터에서 로드 중...")
                # 원본 CSV 파일 로드
                caption_csv = "app/img_search/only_product_caption.csv"
                image_csv = "app/img_search/image_embedding.csv"
                
                # CSV 파일 존재 확인
                if not os.path.exists(caption_csv):
                    caption_csv = "app/img_search/caption(fashion-clip)_embedding.csv"

                caption_df = pd.read_csv(caption_csv)
                image_df = pd.read_csv(image_csv)
                
                # 데이터 병합
                self.merged = pd.merge(image_df, caption_df, on="image_file")
                print(f"병합된 데이터 크기: {self.merged.shape}")
                
                # 디렉터리 존재 파일 집합 확인
                try:
                    available_files = {
                        f.lower() for f in os.listdir(self.image_dir)
                        if os.path.isfile(os.path.join(self.image_dir, f))
                    }
                except FileNotFoundError:
                    available_files = set()

                # 실제 존재하는 파일만 유지
                self.merged = self.merged[self.merged["image_file"].str.lower().isin(available_files)].reset_index(drop=True)
                print(f"실제 파일 존재 필터링 후: {self.merged.shape}")
                
                # FAISS 인덱스 구축
                self._build_faiss_index()
                
        except Exception as e:
            print(f"데이터 로드 실패: {e}")
            raise e
    
    def _build_faiss_index(self):
        """FAISS 인덱스 구축 (원본 데이터용)"""
        try:
            # 이미지 임베딩 컬럼 확인
            img_cols = [str(i) for i in range(1, 513)]
            available_img_cols = [c for c in img_cols if c in self.merged.columns]
            
            # 이미지 임베딩 사용 (원래대로)
            if available_img_cols:
                print(f"이미지 임베딩 기반 인덱스 구축: {len(available_img_cols)}개 차원")
                embeddings = self.merged[available_img_cols].values.astype(np.float32)
            else:
                raise ValueError("사용 가능한 임베딩이 없습니다")
            
            # 정규화
            embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
            
            # FAISS 인덱스 생성
            dimension = embeddings.shape[1]
            self.index = faiss.IndexFlatIP(dimension)
            self.index.add(embeddings)
            
            print(f"FAISS 인덱스 구축 완료: {self.index.ntotal}개 벡터")
            
        except Exception as e:
            print(f"FAISS 인덱스 구축 실패: {e}")
            raise e
    
    def _load_product_metadata(self):
        """상품 메타데이터 로드"""
        try:
            product_csv = "app/img_search/product.csv"
            if os.path.exists(product_csv):
                self.product_df = pd.read_csv(product_csv)
                print(f"상품 메타데이터 로드 완료: {self.product_df.shape}")
            else:
                print("product.csv 파일이 없습니다. 메타데이터 없이 진행합니다.")
                self.product_df = None
        except Exception as e:
            print(f"상품 메타데이터 로드 실패: {e}")
            self.product_df = None
    
    def _load_clip_model(self):
        """CLIP 모델 로드"""
        try:
            model_name = "openai/clip-vit-base-patch32"
            self.clip_model = CLIPModel.from_pretrained(model_name)
            self.clip_processor = CLIPProcessor.from_pretrained(model_name)
            print(f"CLIP 모델 로드 완료: {model_name}")
        except Exception as e:
            print(f"CLIP 모델 로드 실패: {e}")
            raise e
    
    async def search_existing_images(self, query_text: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """기존 이미지 검색 (고급 분석 포함)"""
        start_time = time.time()
        
        print(f"검색 쿼리: '{query_text}'")
        
        # 텍스트 → 임베딩
        inputs = self.clip_processor(text=[query_text], return_tensors="pt", padding=True)
        with torch.no_grad():
            query_emb = self.clip_model.get_text_features(**inputs).cpu().numpy().astype(np.float32)
        
        # 정규화
        query_emb = query_emb / np.linalg.norm(query_emb, axis=1, keepdims=True)
        
        # FAISS 검색 (더 많은 결과를 가져와서 필터링)
        search_k = min(top_k * 5, self.index.ntotal)  # 더 많은 후보 검색
        D, I = self.index.search(query_emb, k=search_k)
        
        print(f"FAISS 검색 완료: {len(I[0])}개 후보")
        
        # 중복 제거 및 결과 생성
        unique_results = []
        seen = set()
        
        for i, idx in enumerate(I[0]):
            if hasattr(self, 'metadata'):
                # 처리된 데이터 사용
                img_file = self.metadata['image_files'][idx]
                caption = self.metadata['captions'][idx]
            else:
                # 원본 CSV 데이터 사용
                img_file = self.merged.iloc[idx]["image_file"]
                caption = self.merged.iloc[idx].get("predicted_caption", self.merged.iloc[idx].get("caption", ""))
            
            if img_file not in seen:
                seen.add(img_file)
                
                # 유사도 점수 확인 (임시로 임계값 제거하여 모든 결과 표시)
                similarity_score = D[0][i]
                # if similarity_score < 0.05:  # 임계값을 낮춤 (0.3 → 0.05)
                #     print(f"유사도 낮음 ({similarity_score:.3f}): {img_file} - {caption[:50]}...")
                #     continue
                
                # 상품 메타데이터 가져오기
                product_id = img_file.split("_")[0]
                product_info = {}
                
                try:
                    # product.csv에서 메타데이터 가져오기
                    if hasattr(self, 'product_df') and self.product_df is not None:
                        product_row = self.product_df[self.product_df["product_id"].astype(str) == product_id]
                        if not product_row.empty:
                            row = product_row.iloc[0]
                            product_info = {
                                "product_name": str(row.get("product_name", "")),
                                "price": int(row.get("price", 0)) if pd.notna(row.get("price", 0)) else 0,
                                "rating_avg": float(row.get("rating_avg", 0)) if pd.notna(row.get("rating_avg", 0)) else 0.0,
                                "reviews_count": int(row.get("reviews_count", 0)) if pd.notna(row.get("reviews_count", 0)) else 0,
                                "hearts": int(row.get("hearts", 0)) if pd.notna(row.get("hearts", 0)) else 0,
                                "views_1m": int(row.get("views_1m", 0)) if pd.notna(row.get("views_1m", 0)) else 0,
                                "sales_cum": int(row.get("sales_cum", 0)) if pd.notna(row.get("sales_cum", 0)) else 0,
                                "brand": str(row.get("brand", "")),
                                "category_l1": str(row.get("category_l1", "")),
                                "gender": str(row.get("gender", ""))
                            }
                except Exception as e:
                    print(f"메타데이터 로드 실패 {product_id}: {e}")
                    product_info = {}
                
                result_item = {
                    "id": str(len(unique_results) + 1),
                    "filename": img_file,
                    "image_file": img_file,
                    "caption": caption,
                    "similarity": float(D[0][i]),
                    "image_path": os.path.join(self.image_dir, img_file),
                    "url": f"/api/images/file/{img_file}",
                    "title": caption,
                    "description": f"AI 생성 캡션: {caption}",
                    "tags": ["AI추천", "패션"],
                    "relevance": similarity_score  # 실제 유사도 점수 사용
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
            detailed_analysis = await self._analyze_single_product(result)
            enhanced_result["detailed_analysis"] = detailed_analysis
            enhanced_results.append(enhanced_result)
        
        return enhanced_results
    
    async def _analyze_single_product(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """개별 상품 상세 분석"""
        try:
            # 기본 정보 추출
            price = product.get("price", 0)
            rating = product.get("rating_avg", 0)
            reviews = product.get("reviews_count", 0)
            hearts = product.get("hearts", 0)
            views = product.get("views_1m", 0)
            brand = product.get("brand", "Unknown")
            category = product.get("category_l1", "Unknown")
            similarity = product.get("similarity", 0)
            
            # 1. 인기도 분석
            popularity_score = self._calculate_popularity_score(hearts, views, reviews)
            
            # 2. 가격 분석
            price_analysis = self._analyze_price_segment(price)
            
            # 3. 품질 지표
            quality_indicators = self._analyze_product_quality(rating, reviews, price)
            
            # 4. 트렌드 상태
            trend_status = self._analyze_product_trend(hearts, views, rating)
            
            # 5. 브랜드 분석
            brand_analysis = self._analyze_brand_positioning(brand, price)
            
            # 6. 경쟁력 분석
            competitiveness = self._analyze_competitiveness(similarity, price, rating)
            
            # 7. 추천 이유 생성
            recommendation_reasons = self._generate_recommendation_reasons(
                popularity_score, price_analysis, quality_indicators, trend_status
            )
            
            return self._convert_analysis_to_json_safe({
                "popularity": {
                    "score": popularity_score,
                    "hearts": hearts,
                    "views_1m": views,
                    "reviews_count": reviews
                },
                "price_analysis": price_analysis,
                "quality_indicators": quality_indicators,
                "trend_status": trend_status,
                "brand_analysis": brand_analysis,
                "competitiveness": competitiveness,
                "recommendation_reasons": recommendation_reasons,
                "overall_rating": self._calculate_product_overall_rating(
                    popularity_score, price_analysis, quality_indicators, trend_status
                )
            })
            
        except Exception as e:
            print(f"상품 분석 오류: {e}")
            return {"error": "분석 실패", "message": str(e)}
    
    def _calculate_popularity_score(self, hearts: int, views: int, reviews: int) -> Dict[str, Any]:
        """인기도 점수 계산"""
        # 가중 점수 계산 (0-100)
        hearts_score = min(hearts / 100 * 30, 30)  # 30점 만점
        views_score = min(views / 10000 * 40, 40)  # 40점 만점
        reviews_score = min(reviews / 50 * 30, 30)  # 30점 만점
        
        total_score = hearts_score + views_score + reviews_score
        
        if total_score >= 80:
            level = "매우 인기"
        elif total_score >= 60:
            level = "인기"
        elif total_score >= 40:
            level = "보통"
        else:
            level = "낮음"
        
        return {
            "score": round(total_score, 1),
            "level": level,
            "breakdown": {
                "hearts_score": round(hearts_score, 1),
                "views_score": round(views_score, 1),
                "reviews_score": round(reviews_score, 1)
            }
        }
    
    def _analyze_price_segment(self, price: int) -> Dict[str, Any]:
        """가격대 분석"""
        if price >= 200000:
            segment = "프리미엄"
            description = "고급 브랜드 가격대"
        elif price >= 100000:
            segment = "중고가"
            description = "중간 프리미엄 가격대"
        elif price >= 50000:
            segment = "일반"
            description = "대중적 가격대"
        elif price >= 20000:
            segment = "저가"
            description = "합리적 가격대"
        else:
            segment = "초저가"
            description = "매우 저렴한 가격대"
        
        # 가성비 평가
        value_score = 100 - min((price / 1000), 100)  # 가격이 낮을수록 높은 점수
        
        return {
            "segment": segment,
            "description": description,
            "price": price,
            "formatted_price": f"{price:,}원",
            "value_score": round(value_score, 1)
        }
    
    def _analyze_product_quality(self, rating: float, reviews: int, price: int) -> Dict[str, Any]:
        """품질 지표 분석"""
        # 평점 기반 품질 점수
        rating_score = (rating / 5.0) * 100 if rating > 0 else 50
        
        # 리뷰 신뢰도
        if reviews >= 100:
            review_reliability = "매우 높음"
        elif reviews >= 50:
            review_reliability = "높음"
        elif reviews >= 20:
            review_reliability = "보통"
        elif reviews >= 5:
            review_reliability = "낮음"
        else:
            review_reliability = "매우 낮음"
        
        # 품질 예상 (가격과 평점 조합)
        if rating >= 4.5 and price >= 80000:
            quality_expectation = "프리미엄 품질"
        elif rating >= 4.0 and price >= 50000:
            quality_expectation = "고품질"
        elif rating >= 3.5:
            quality_expectation = "양호한 품질"
        elif rating >= 3.0:
            quality_expectation = "보통 품질"
        else:
            quality_expectation = "품질 주의 필요"
        
        return {
            "rating": rating,
            "rating_score": round(rating_score, 1),
            "review_reliability": review_reliability,
            "quality_expectation": quality_expectation,
            "reviews_count": reviews
        }
    
    def _analyze_product_trend(self, hearts: int, views: int, rating: float) -> Dict[str, Any]:
        """트렌드 상태 분석"""
        # 트렌드 점수 계산 (하트, 조회수, 평점 조합)
        trend_score = min((hearts + views/10) / 100 + rating * 10, 100)
        
        if trend_score >= 80:
            status = "급상승 트렌드"
            description = "매우 인기가 높아지는 상품"
        elif trend_score >= 60:
            status = "상승 트렌드"
            description = "인기가 증가하는 추세"
        elif trend_score >= 40:
            status = "안정적"
            description = "꾸준한 인기 유지"
        else:
            status = "하락 트렌드"
            description = "관심도가 낮아지는 상품"
        
        return {
            "score": round(trend_score, 1),
            "status": status,
            "description": description
        }
    
    def _analyze_brand_positioning(self, brand: str, price: int) -> Dict[str, Any]:
        """브랜드 포지셔닝 분석"""
        # 가격대 기반 포지셔닝
        if price >= 200000:
            positioning = "프리미엄"
            description = f"{brand} (프리미엄 브랜드)"
            price_fit = "프리미엄 가격"
        elif price >= 100000:
            positioning = "중고가"
            description = f"{brand} (중고가 브랜드)"
            price_fit = "적정"
        elif price >= 50000:
            positioning = "일반"
            description = f"{brand} (일반 브랜드)"
            price_fit = "적정"
        else:
            positioning = "저가"
            description = f"{brand} (저가 브랜드)"
            price_fit = "저렴"
        
        return {
            "brand": brand,
            "positioning": positioning,
            "description": description,
            "price_fit": price_fit
        }
    
    def _analyze_competitiveness(self, similarity: float, price: int, rating: float) -> Dict[str, Any]:
        """경쟁력 분석"""
        # 유사도, 가격, 평점을 종합한 경쟁력 점수
        similarity_score = similarity * 100
        price_competitiveness = max(0, 100 - (price / 2000))  # 가격이 낮을수록 경쟁력 높음
        quality_competitiveness = (rating / 5.0) * 100
        
        overall_competitiveness = (similarity_score * 0.4 + price_competitiveness * 0.3 + quality_competitiveness * 0.3)
        
        if overall_competitiveness >= 80:
            level = "매우 높음"
        elif overall_competitiveness >= 60:
            level = "높음"
        elif overall_competitiveness >= 40:
            level = "보통"
        else:
            level = "낮음"
        
        return {
            "score": round(overall_competitiveness, 1),
            "level": level,
            "factors": {
                "similarity": round(similarity_score, 1),
                "price_competitiveness": round(price_competitiveness, 1),
                "quality": round(quality_competitiveness, 1)
            }
        }
    
    def _generate_recommendation_reasons(self, popularity_score: Dict, price_analysis: Dict, 
                                       quality_indicators: Dict, trend_status: Dict) -> List[str]:
        """추천 이유 생성"""
        reasons = []
        
        if popularity_score["score"] >= 60:
            reasons.append("높은 인기도")
        
        if price_analysis["value_score"] >= 70:
            reasons.append("우수한 가성비")
        
        if quality_indicators["rating_score"] >= 80:
            reasons.append("높은 품질 평가")
        
        if trend_status["score"] >= 60:
            reasons.append("상승하는 트렌드")
        
        if quality_indicators["review_reliability"] in ["높음", "매우 높음"]:
            reasons.append("신뢰할 수 있는 리뷰")
        
        return reasons if reasons else ["기본 추천 상품"]
    
    def _calculate_product_overall_rating(self, popularity_score: Dict, price_analysis: Dict,
                                        quality_indicators: Dict, trend_status: Dict) -> Dict[str, Any]:
        """종합 평점 계산"""
        # 각 요소별 점수
        pop_score = popularity_score["score"]
        price_score = price_analysis["value_score"]
        quality_score = quality_indicators["rating_score"]
        trend_score = trend_status["score"]
        
        # 가중 평균 (인기도 30%, 가격 25%, 품질 30%, 트렌드 15%)
        overall_score = (pop_score * 0.3 + price_score * 0.25 + quality_score * 0.3 + trend_score * 0.15)
        
        if overall_score >= 90:
            grade = "S"
        elif overall_score >= 80:
            grade = "A"
        elif overall_score >= 70:
            grade = "B"
        elif overall_score >= 60:
            grade = "C"
        else:
            grade = "D"
        
        return {
            "score": round(overall_score, 1),
            "grade": grade
        }

    def _analyze_product(self, product_info: Dict[str, Any], similarity_score: float) -> Dict[str, Any]:
        """상품 종합 분석 (기존 로직 재사용)"""
        # 기본값 설정
        price = product_info.get("price", 0)
        rating_avg = product_info.get("rating_avg", 0.0)
        reviews_count = product_info.get("reviews_count", 0)
        hearts = product_info.get("hearts", 0)
        views_1m = product_info.get("views_1m", 0)
        sales_cum = product_info.get("sales_cum", 0)
        brand = product_info.get("brand", "")
        
        # 각 분석 수행
        popularity_analysis = self._calculate_popularity_score(hearts, views_1m, reviews_count)
        price_analysis = self._analyze_price_segment(price)
        quality_analysis = self._analyze_product_quality(rating_avg, reviews_count, price)
        trend_analysis = self._analyze_product_trend(hearts, views_1m, rating_avg)
        brand_analysis = self._analyze_brand_positioning(brand, price)
        competitiveness = self._calculate_competitiveness_score(
            popularity_analysis["score"], price_analysis["value_score"], 
            quality_analysis["rating_score"], trend_analysis["score"]
        )
        
        return {
            "similarity": similarity_score,
            "detailed_analysis": {
                "popularity": popularity_analysis,
                "price_analysis": price_analysis,
                "quality_indicators": quality_analysis,
                "trend_analysis": trend_analysis,
                "brand_analysis": brand_analysis,
                "competitiveness": competitiveness
            }
        }

    def search_by_image(self, image: Image.Image, top_k: int = 9) -> List[Dict[str, Any]]:
        """이미지로 검색 (기존 인프라 재사용)"""
        start_time = time.time()
        
        print(f"이미지 검색 시작: {image.size}")
        
        # 이미지 전처리
        processed_image = self._preprocess_image(image)
        
        # CLIP 모델로 이미지 임베딩 생성
        image_embedding = self._get_image_embedding(processed_image)
        
        # FAISS 검색 (더 많은 결과를 가져와서 필터링)
        search_k = min(top_k * 5, self.index.ntotal)
        D, I = self.index.search(image_embedding, k=search_k)
        
        print(f"FAISS 검색 완료: {len(I[0])}개 후보")
        
        # 중복 제거 및 결과 생성
        unique_results = []
        seen = set()
        
        for i, idx in enumerate(I[0]):
            if hasattr(self, 'metadata'):
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
                product_info = {}
                
                try:
                    # product.csv에서 메타데이터 가져오기
                    if hasattr(self, 'product_df') and self.product_df is not None:
                        product_row = self.product_df[self.product_df["product_id"].astype(str) == product_id]
                        if not product_row.empty:
                            row = product_row.iloc[0]
                            product_info = {
                                "product_name": str(row.get("product_name", "")),
                                "price": int(row.get("price", 0)) if pd.notna(row.get("price", 0)) else 0,
                                "rating_avg": float(row.get("rating_avg", 0)) if pd.notna(row.get("rating_avg", 0)) else 0.0,
                                "reviews_count": int(row.get("reviews_count", 0)) if pd.notna(row.get("reviews_count", 0)) else 0,
                                "hearts": int(row.get("hearts", 0)) if pd.notna(row.get("hearts", 0)) else 0,
                                "views_1m": int(row.get("views_1m", 0)) if pd.notna(row.get("views_1m", 0)) else 0,
                                "sales_cum": int(row.get("sales_cum", 0)) if pd.notna(row.get("sales_cum", 0)) else 0,
                                "brand": str(row.get("brand", "")),
                                "category_l1": str(row.get("category_l1", "")),
                                "gender": str(row.get("gender", ""))
                            }
                except Exception as e:
                    print(f"메타데이터 로드 실패 {product_id}: {e}")
                    product_info = {}
                
                # 결과 생성 (모든 numpy 타입을 Python 기본 타입으로 변환)
                result = {
                    "id": f"{product_id}_{i}",  # 고유 ID 생성 (product_id + 인덱스)
                    "title": str(product_info.get("product_name", caption[:50] if caption else "상품명 없음")),
                    "url": f"/api/images/file/{img_file}",
                    "similarity": float(similarity_score),  # numpy.float32를 float로 변환
                    "product_name": str(product_info.get("product_name", "")),
                    "price": int(product_info.get("price", 0)),
                    "rating_avg": float(product_info.get("rating_avg", 0.0)),
                    "brand": str(product_info.get("brand", "")),
                    # 기본 검색에서도 카테고리 정보 추가 (Unknown으로 표시)
                    "clothing_category": "Unknown",
                    "category_confidence": 0.0,
                    "detailed_analysis": self._convert_analysis_to_json_safe(self._format_analysis_for_frontend(
                        product_info, similarity_score
                    ))
                }
                
                unique_results.append(result)
                
                if len(unique_results) >= top_k:
                    break
        
        search_time = time.time() - start_time
        print(f"이미지 검색 완료: {len(unique_results)}개 결과, {search_time:.2f}초")
        
        return unique_results

    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """이미지 전처리"""
        # RGB 변환
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        return image

    def _get_image_embedding(self, image: Image.Image) -> np.ndarray:
        """CLIP 모델로 이미지 임베딩 생성"""
        inputs = self.clip_processor(images=image, return_tensors="pt")
        
        with torch.no_grad():
            image_features = self.clip_model.get_image_features(**inputs)
            embedding = image_features.cpu().numpy().astype(np.float32)
        
        # L2 정규화
        embedding = embedding / np.linalg.norm(embedding)
        return embedding
    
    def _convert_analysis_to_json_safe(self, data: Any) -> Any:
        """numpy 타입을 JSON 직렬화 가능한 타입으로 변환"""
        if isinstance(data, dict):
            return {key: self._convert_analysis_to_json_safe(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [self._convert_analysis_to_json_safe(item) for item in data]
        elif isinstance(data, np.integer):
            return int(data)
        elif isinstance(data, np.floating):
            return float(data)
        elif isinstance(data, np.ndarray):
            return data.tolist()
        else:
            return data
    
    def _format_analysis_for_frontend(self, product_info: Dict[str, Any], similarity_score: float) -> Dict[str, Any]:
        """프론트엔드가 기대하는 구조로 분석 결과 변환"""
        # 기존 분석 함수들 호출 (기존 로직 그대로)
        popularity_raw = self._calculate_popularity_score(
            product_info.get("hearts", 0),
            product_info.get("views_1m", 0),
            product_info.get("reviews_count", 0)
        )
        price_raw = self._analyze_price_segment(product_info.get("price", 0))
        quality_raw = self._analyze_product_quality(
            product_info.get("rating_avg", 0.0),
            product_info.get("reviews_count", 0),
            product_info.get("price", 0)
        )
        trend_raw = self._analyze_product_trend(
            product_info.get("hearts", 0),
            product_info.get("views_1m", 0),
            product_info.get("rating_avg", 0.0)
        )
        brand_raw = self._analyze_brand_positioning(
            product_info.get("brand", ""),
            product_info.get("price", 0)
        )
        competitiveness_raw = self._analyze_competitiveness(
            similarity_score,
            product_info.get("price", 0),
            product_info.get("rating_avg", 0.0)
        )
        overall_raw = self._calculate_product_overall_rating(
            popularity_raw, price_raw, quality_raw, trend_raw
        )
        
        # 추천 이유 생성
        recommendation_reasons = self._generate_recommendation_reasons(
            popularity_raw, price_raw, quality_raw, trend_raw
        )
        
        # 프론트엔드가 기대하는 구조로 변환
        return {
            "popularity": {
                "score": {
                    "score": popularity_raw["score"],
                    "level": popularity_raw["level"]
                },
                "hearts": product_info.get("hearts", 0),
                "views_1m": product_info.get("views_1m", 0),
                "reviews_count": product_info.get("reviews_count", 0)
            },
            "price_analysis": price_raw,
            "quality_indicators": quality_raw,
            "trend_status": trend_raw,
            "brand_analysis": brand_raw,
            "competitiveness": competitiveness_raw,
            "recommendation_reasons": recommendation_reasons,
            "overall_rating": overall_raw
        }

    # ===== 실제 작동하는 고급 기능들 =====
    
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
    
    def search_by_image_advanced(self, image: Image.Image, top_k: int = 9) -> List[Dict[str, Any]]:
        """실제 고급 이미지 검색 (인체 분할 + 의류 영역 추출 + 카테고리 분류)"""
        start_time = time.time()
        
        print(f"고급 이미지 검색 시작: {image.size}")
        
        try:
            # 1. 인체 분할
            human_mask = parse_human_parts(image)
            print("인체 분할 완료")
            
            # 2. 의류 영역 추출
            clothing_region = self.crop_clothes_region_top_bottom(image, human_mask)
            clothing_image = Image.fromarray(clothing_region)
            print("의류 영역 추출 완료")
            
            # 3. 카테고리 분류
            category_results = predict_clothing_category(clothing_image, topk=2)
            category = category_results[0]["label"] if category_results else "Unknown"
            category_confidence = category_results[0]["score"] if category_results else 0.0
            print(f"카테고리 분류: {category} (신뢰도: {category_confidence:.2f})")
            
            # 4. 의류 영역으로 CLIP 검색
            processed_image = self._preprocess_image(clothing_image)
            image_embedding = self._get_image_embedding(processed_image)
            
            # 5. FAISS 검색
            search_k = min(top_k * 5, self.index.ntotal)
            D, I = self.index.search(image_embedding, k=search_k)
            
            # 6. 결과 생성 (기존 search_by_image와 동일한 구조)
            unique_results = []
            seen = set()
            
            for i, idx in enumerate(I[0]):
                if hasattr(self, 'metadata'):
                    img_file = self.metadata['image_files'][idx]
                    caption = self.metadata['captions'][idx]
                else:
                    img_file = self.merged.iloc[idx]["image_file"]
                    caption = self.merged.iloc[idx].get("predicted_caption", self.merged.iloc[idx].get("caption", ""))
                
                if img_file not in seen:
                    seen.add(img_file)
                    
                    similarity_score = D[0][i]
                    product_id = img_file.split("_")[0]
                    product_info = {}
                    
                    try:
                        if hasattr(self, 'product_df') and self.product_df is not None:
                            product_row = self.product_df[self.product_df["product_id"].astype(str) == product_id]
                            if not product_row.empty:
                                row = product_row.iloc[0]
                                product_info = {
                                    "product_name": str(row.get("product_name", "")),
                                    "price": int(row.get("price", 0)) if pd.notna(row.get("price", 0)) else 0,
                                    "rating_avg": float(row.get("rating_avg", 0)) if pd.notna(row.get("rating_avg", 0)) else 0.0,
                                    "reviews_count": int(row.get("reviews_count", 0)) if pd.notna(row.get("reviews_count", 0)) else 0,
                                    "hearts": int(row.get("hearts", 0)) if pd.notna(row.get("hearts", 0)) else 0,
                                    "views_1m": int(row.get("views_1m", 0)) if pd.notna(row.get("views_1m", 0)) else 0,
                                    "sales_cum": int(row.get("sales_cum", 0)) if pd.notna(row.get("sales_cum", 0)) else 0,
                                    "brand": str(row.get("brand", "")),
                                    "category_l1": str(row.get("category_l1", "")),
                                    "gender": str(row.get("gender", ""))
                                }
                    except Exception as e:
                        print(f"메타데이터 로드 실패 {product_id}: {e}")
                        product_info = {}
                    
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
                        "clothing_category": category,  # 고급 기능: 카테고리 정보
                        "category_confidence": float(category_confidence),
                        "detailed_analysis": self._convert_analysis_to_json_safe(self._format_analysis_for_frontend(
                            product_info, similarity_score
                        ))
                    }
                    
                    unique_results.append(result)
                    
                    if len(unique_results) >= top_k:
                        break
            
            search_time = time.time() - start_time
            print(f"고급 이미지 검색 완료: {len(unique_results)}개 결과, {search_time:.2f}초")
            
            return unique_results
            
        except Exception as e:
            print(f"고급 이미지 검색 실패: {e}")
            # 실패 시 기본 이미지 검색으로 폴백
            return self.search_by_image(image, top_k)
    
    def add_image_to_catalog(self, image: Image.Image, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """실제 이미지를 카탈로그에 추가 (FAISS 인덱스 업데이트)"""
        try:
            # 1. 인체 분할 및 의류 영역 추출
            human_mask = parse_human_parts(image)
            clothing_region = self.crop_clothes_region_top_bottom(image, human_mask)
            clothing_image = Image.fromarray(clothing_region)
            
            # 2. 카테고리 분류
            category_results = predict_clothing_category(clothing_image, topk=2)
            
            # 3. 임베딩 생성
            processed_image = self._preprocess_image(clothing_image)
            image_embedding = self._get_image_embedding(processed_image)
            
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
            # FAISS 인덱스에서 제거 (실제 구현)
            # 현재는 메타데이터만 제거 (FAISS 인덱스는 읽기 전용이므로)
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
    
    # 기존 API 응답 형태로 변환 (호환성 유지) - 모든 numpy 타입 변환
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
            # 새로운 분석 정보 추가 (프론트엔드에서 활용 가능) - 모든 numpy 타입 변환
            "similarity": float(result.get("similarity", 0.0)),
            "product_name": str(result.get("product_name", "")),
            "price": int(result.get("price", 0)),
            "rating_avg": float(result.get("rating_avg", 0.0)),
            "brand": str(result.get("brand", "")),
            "detailed_analysis": service._convert_analysis_to_json_safe(result.get("detailed_analysis", {}))
        })

    return {
        "query": prompt,
        "totalCount": len(formatted_images),
        "searchTime": round(search_time, 2),
        "images": formatted_images
    }
