"""
데이터 로딩 관련 모듈
"""
import os
import numpy as np
import pandas as pd
import faiss
import pickle
from transformers import CLIPProcessor, CLIPModel
from typing import Dict, Any, Optional


class DataLoader:
    """데이터 로딩 클래스"""
    
    def __init__(self, image_dir: str = "app/img_search/only_product_images"):
        self.image_dir = image_dir
        self.metadata = None
        self.index = None
        self.merged = None
        self.product_df = None
        self.clip_model = None
        self.clip_processor = None
    
    def load_data(self):
        """데이터 로드"""
        try:
            # 처리된 데이터가 있는지 확인
            processed_dir = "app/img_search/processed"
            if os.path.exists(os.path.join(processed_dir, "metadata.pkl")):
                print("처리된 데이터 로드 중...")
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
                self.build_faiss_index()
                
        except Exception as e:
            print(f"데이터 로드 실패: {e}")
            raise e
    
    def build_faiss_index(self):
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
    
    def load_product_metadata(self):
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
    
    def load_clip_model(self):
        """CLIP 모델 로드"""
        try:
            model_name = "openai/clip-vit-base-patch32"
            self.clip_model = CLIPModel.from_pretrained(model_name)
            self.clip_processor = CLIPProcessor.from_pretrained(model_name)
            print(f"CLIP 모델 로드 완료: {model_name}")
        except Exception as e:
            print(f"CLIP 모델 로드 실패: {e}")
            raise e
    
    def get_product_info(self, product_id: str) -> Dict[str, Any]:
        """특정 상품 정보 조회"""
        if self.product_df is None:
            return {}
        
        try:
            product_row = self.product_df[self.product_df["product_id"].astype(str) == product_id]
            if not product_row.empty:
                row = product_row.iloc[0]
                return {
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
            print(f"상품 정보 조회 실패 {product_id}: {e}")
        
        return {}
    
    def get_image_file_info(self, idx: int) -> Dict[str, Any]:
        """인덱스로 이미지 파일 정보 조회"""
        if hasattr(self, 'metadata') and self.metadata:
            return {
                "img_file": self.metadata['image_files'][idx],
                "caption": self.metadata['captions'][idx]
            }
        elif self.merged is not None:
            return {
                "img_file": self.merged.iloc[idx]["image_file"],
                "caption": self.merged.iloc[idx].get("predicted_caption", self.merged.iloc[idx].get("caption", ""))
            }
        else:
            return {"img_file": "", "caption": ""}
