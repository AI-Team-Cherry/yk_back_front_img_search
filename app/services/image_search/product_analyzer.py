"""
상품 분석 관련 모듈
"""
import pandas as pd
from typing import Dict, List, Any

# 전역 유틸 함수 변수
_convert_analysis_to_json_safe = None
_format_analysis_for_frontend = None

def set_utils_functions(convert_func, format_func):
    """유틸 함수들 설정"""
    global _convert_analysis_to_json_safe, _format_analysis_for_frontend
    _convert_analysis_to_json_safe = convert_func
    _format_analysis_for_frontend = format_func


class ProductAnalyzer:
    """상품 분석 클래스"""
    
    def __init__(self):
        if _convert_analysis_to_json_safe is None or _format_analysis_for_frontend is None:
            raise ValueError("Utils functions not set in ProductAnalyzer. Call set_utils_functions first.")
        self._convert_analysis_to_json_safe = _convert_analysis_to_json_safe
        self._format_analysis_for_frontend = _format_analysis_for_frontend
    
    def _convert_analysis_to_json_safe(self, data: Any) -> Any:
        """numpy 타입을 JSON 직렬화 가능한 타입으로 변환"""
        return self._convert_analysis_to_json_safe(data)
    
    def _format_analysis_for_frontend(self, product_info: Dict[str, Any], similarity_score: float) -> Dict[str, Any]:
        """프론트엔드가 기대하는 구조로 분석 결과 변환"""
        return self._format_analysis_for_frontend(product_info, similarity_score, self)
    
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
            popularity_score = self.calculate_popularity_score(hearts, views, reviews)
            
            # 2. 가격 분석
            price_analysis = self.analyze_price_segment(price)
            
            # 3. 품질 지표
            quality_indicators = self.analyze_product_quality(rating, reviews, price)
            
            # 4. 트렌드 상태
            trend_status = self.analyze_product_trend(hearts, views, rating)
            
            # 5. 브랜드 분석
            brand_analysis = self.analyze_brand_positioning(brand, price)
            
            # 6. 경쟁력 분석
            competitiveness = self.analyze_competitiveness(similarity, price, rating)
            
            # 7. 추천 이유 생성
            recommendation_reasons = self.generate_recommendation_reasons(
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
                "overall_rating": self.calculate_product_overall_rating(
                    popularity_score, price_analysis, quality_indicators, trend_status
                )
            })
            
        except Exception as e:
            print(f"상품 분석 오류: {e}")
            return {"error": "분석 실패", "message": str(e)}
    
    def calculate_popularity_score(self, hearts: int, views: int, reviews: int) -> Dict[str, Any]:
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
    
    def analyze_price_segment(self, price: int) -> Dict[str, Any]:
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
    
    def analyze_product_quality(self, rating: float, reviews: int, price: int) -> Dict[str, Any]:
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
    
    def analyze_product_trend(self, hearts: int, views: int, rating: float) -> Dict[str, Any]:
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
    
    def analyze_brand_positioning(self, brand: str, price: int) -> Dict[str, Any]:
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
    
    def analyze_competitiveness(self, similarity: float, price: int, rating: float) -> Dict[str, Any]:
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
    
    def generate_recommendation_reasons(self, popularity_score: Dict, price_analysis: Dict, 
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
    
    def calculate_product_overall_rating(self, popularity_score: Dict, price_analysis: Dict,
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
