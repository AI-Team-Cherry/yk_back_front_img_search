import pandas as pd
import numpy as np
import faiss
import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import matplotlib.pyplot as plt
import os, math


# 이미지 생성 모델
async def generate_image(prompt: str, top):
    
    caption_csv = "app/img_search/caption(fashion-clip)_embedding.csv"
    image_csv   = "app/img_search/image_embedding.csv"
    image_dir = "app/img_search/only_product_images"  

    caption_df = pd.read_csv(caption_csv)
    image_df   = pd.read_csv(image_csv)

    merged = pd.merge(image_df, caption_df, on="image_file")
    print("병합된 데이터 크기:", merged.shape)


    txt_cols = [c for c in merged.columns if c.startswith("dim_")]  # caption CSV
    img_cols = [str(i) for i in range(1, 513)]                      # image CSV

    merged["text_emb"]  = merged[txt_cols].values.tolist()
    merged["image_emb"] = merged[img_cols].values.tolist()

    merged["text_emb"]  = merged["text_emb"].apply(lambda x: np.array(x, dtype=np.float32))
    merged["image_emb"] = merged["image_emb"].apply(lambda x: np.array(x, dtype=np.float32))

    print("임베딩 변환 완료!")


    # 4. 정규화 함수 정의
    def l2_normalize(v):
        return v / np.linalg.norm(v, axis=1, keepdims=True)


    # # 5. FAISS 인덱스 구축 (Cosine 유사도 기반)
    emb_matrix = np.vstack(merged["image_emb"].values)
    emb_matrix = l2_normalize(emb_matrix)

    dim = emb_matrix.shape[1]
    index = faiss.IndexFlatIP(dim)   # Inner Product = Cosine similarity (정규화된 벡터 기준)
    index.add(emb_matrix)

    print(f"FAISS index (cosine) 구축 완료! (dim={dim}, size={index.ntotal})")


    # # 6. 검색 함수 정의 (텍스트 → 이미지)
    model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
    processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

    def search_and_show(query_text, top_k=10):
        # 텍스트 → 임베딩
        inputs = processor(text=[query_text], return_tensors="pt", padding=True)
        with torch.no_grad():
            query_emb = model.get_text_features(**inputs).cpu().numpy().astype(np.float32)

        # 정규화
        query_emb = l2_normalize(query_emb)

        # FAISS 검색 (넉넉히 뽑고 중복 제거)
        D, I = index.search(query_emb, k=top_k*3)
        unique_results = []
        seen = set()
        for idx in I[0]:
            img_file = merged.iloc[idx]["image_file"]
            if img_file not in seen:
                seen.add(img_file)
                unique_results.append(merged.iloc[idx])
            if len(unique_results) == top_k:
                break

        results = pd.DataFrame(unique_results)[["image_file", "predicted_caption"]]
        return results

    # 검색 실행
    results = search_and_show(prompt, top)
    
    # 결과를 API 응답 형태로 변환 (Frontend 기대 형태)
    image_results = []
    for idx, (_, row) in enumerate(results.iterrows()):
        image_results.append({
            "id": str(idx + 1),
            "filename": row["image_file"],
            "url": f"/api/images/file/{row['image_file']}",
            "title": row["predicted_caption"],
            "description": f"AI 생성 캡션: {row['predicted_caption']}",
            "tags": ["AI추천", "패션"],
            "relevance": max(0.95 - (idx * 0.05), 0.1)
        })
    
    return {
        "query": prompt,
        "totalCount": len(image_results),
        "searchTime": 1.5,
        "images": image_results
    }


