import os
import numpy as np
import pandas as pd
import faiss
import torch
import time
from transformers import CLIPProcessor, CLIPModel
from typing import Dict, List, Any, Optional

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
                    "relevance": max(0.95 - (len(unique_results) * 0.05), 0.1)
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
            enhanced_result["detailed_analysis"] = await self._analyze_single_product(result)
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
            
            return {
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
            }
            
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
        if rating >= 4.5 and price >= 80800:
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
    service = get_search_service()
    results = await service.search_existing_images(prompt, top)
    
    # 기존 API 응답 형태로 변환 (호환성 유지)
    formatted_images = []
    for result in results:
        formatted_images.append({
            "id": result.get("id", ""),
            "filename": result.get("filename", ""),
            "url": result.get("url", ""),
            "title": result.get("title", ""),
            "description": result.get("description", ""),
            "tags": result.get("tags", []),
            "relevance": result.get("relevance", 0.0),
            # 새로운 분석 정보 추가 (프론트엔드에서 활용 가능)
            "similarity": result.get("similarity", 0.0),
            "product_name": result.get("product_name", ""),
            "price": result.get("price", 0),
            "rating_avg": result.get("rating_avg", 0.0),
            "brand": result.get("brand", ""),
            "detailed_analysis": result.get("detailed_analysis", {})
        })

    return {
        "query": prompt,
        "totalCount": len(formatted_images),
        "searchTime": 1.5,
        "images": formatted_images
    }