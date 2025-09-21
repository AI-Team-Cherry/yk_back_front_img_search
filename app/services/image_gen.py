import os
import numpy as np
import pandas as pd
import faiss
import torch
from transformers import CLIPProcessor, CLIPModel

# 이미지 생성(검색) 모델
async def generate_image(prompt: str, top: int):
    caption_csv = "app/img_search/caption(fashion-clip)_embedding.csv"
    image_csv   = "app/img_search/image_embedding.csv"
    image_dir   = "app/img_search/only_product_images"  

    # 1) CSV 로드
    caption_df = pd.read_csv(caption_csv)
    image_df   = pd.read_csv(image_csv)

    # 2) 디렉터리 존재 파일 집합 (확장자 소문자 통일)
    try:
        available_files = {
            f.lower() for f in os.listdir(image_dir)
            if os.path.isfile(os.path.join(image_dir, f))
        }
    except FileNotFoundError:
        available_files = set()

    # 3) 병합
    merged = pd.merge(image_df, caption_df, on="image_file")
    print("병합된 데이터 크기:", merged.shape)

    # 4) 디렉터리에 실제 존재하는 파일만 유지 
    merged = merged[merged["image_file"].str.lower().isin(available_files)].reset_index(drop=True)
    print("실제 파일 존재 필터링 후:", merged.shape)

    # 5) 임베딩 컬럼 구성
    txt_cols = [c for c in merged.columns if c.startswith("dim_")]  # caption CSV
    img_cols = [str(i) for i in range(1, 513)]                      # image CSV

    merged["text_emb"]  = merged[txt_cols].values.tolist()
    merged["image_emb"] = merged[img_cols].values.tolist()

    merged["text_emb"]  = merged["text_emb"].apply(lambda x: np.array(x, dtype=np.float32))
    merged["image_emb"] = merged["image_emb"].apply(lambda x: np.array(x, dtype=np.float32))
    print("임베딩 변환 완료!")

    # 6) 정규화 함수
    def l2_normalize(v):
        return v / np.linalg.norm(v, axis=1, keepdims=True)

    # 7) FAISS 인덱스 (Cosine: 정규화 + Inner Product)
    emb_matrix = np.vstack(merged["image_emb"].values)
    emb_matrix = l2_normalize(emb_matrix)
    dim = emb_matrix.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(emb_matrix)
    print(f"FAISS index (cosine) 구축 완료! (dim={dim}, size={index.ntotal})")

    # 8) 텍스트 → 임베딩 검색
    model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
    processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

    def search(query_text: str, top_k: int) -> pd.DataFrame:
        inputs = processor(text=[query_text], return_tensors="pt", padding=True)
        with torch.no_grad():
            query_emb = model.get_text_features(**inputs).cpu().numpy().astype(np.float32)
        query_emb = l2_normalize(query_emb)

        # 넉넉히 뽑고(중복 제거 대비) top_k만 남기기
        D, I = index.search(query_emb, k=max(top_k * 3, top_k))
        unique_rows = []
        seen = set()
        for idx in I[0]:
            img_file = merged.iloc[idx]["image_file"]
            if img_file not in seen:
                seen.add(img_file)
                unique_rows.append(merged.iloc[idx])
            if len(unique_rows) == top_k:
                break
        return pd.DataFrame(unique_rows)[["image_file", "predicted_caption"]]

    # 9) 검색 실행
    top = int(top) if isinstance(top, (int, str)) else 9
    top = max(1, min(top, 50))  # 안전 가드
    results = search(prompt, top)

    # 10) 응답 변환 (실제 파일 경로는 image_dir 밑에 존재)
    image_results = []
    for idx, (_, row) in enumerate(results.iterrows()):
        fn = row["image_file"]
        # 디스크 경로 (HSV 등 후처리 시 사용할 수 있음)
        abs_path = os.path.join(image_dir, fn)

        image_results.append({
            "id": str(idx + 1),
            "filename": fn,
            "url": f"/api/images/file/{fn}",  # FileResponse 라우터가 이 경로에서 서빙
            "title": row["predicted_caption"],
            "description": f"AI 생성 캡션: {row['predicted_caption']}",
            "tags": ["AI추천", "패션"],
            "relevance": max(0.95 - (idx * 0.05), 0.1),
        })

    return {
        "query": prompt,
        "totalCount": len(image_results),
        "searchTime": 1.5,
        "images": image_results
    }
