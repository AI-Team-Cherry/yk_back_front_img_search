from __future__ import annotations
from typing import List, Tuple
from pathlib import Path
import re
import pandas as pd
import numpy as np
import faiss
from PIL import Image
from .fashion_clip import get_fashion_clip

APP_DIR  = Path(__file__).resolve().parents[1]  # .../app
DATA_DIR = APP_DIR / "img_search"
IMG_DIR  = DATA_DIR / "only_product_images"
IMG_EMB_CSV = DATA_DIR / "image_embedding.csv"
CAP_EMB_CSV = DATA_DIR / "caption(fashion-clip)_embedding.csv"

_idx_img: faiss.Index|None = None
_idx_txt: faiss.Index|None = None
_img_fns: List[str] = []
_txt_fns: List[str] = []

_FILENAME_CANDIDATES = {
    "filename","file","file_name","img","img_name","image","image_name",
    "image_path","filepath","file_path","path","name","title"
}

_EMB_NAME_PATTERNS = [
    re.compile(r"^(emb|embed|embedding)[_\-]?\d+$", re.I),
    re.compile(r"^(dim|d|v)\d+$", re.I),
    re.compile(r"^feat(_|\d)+$", re.I),
]

def _pick_filename_col(df: pd.DataFrame) -> str:
    lowered = {c.lower(): c for c in df.columns}
    for key in _FILENAME_CANDIDATES:
        if key in lowered:
            return lowered[key]
    # 마지막 시도: 확장자 형태가 보이는 컬럼
    for c in df.columns:
        s = df[c].astype(str).head(50).str.lower()
        if s.str.contains(r"\.(jpg|jpeg|png|webp)$", regex=True).any():
            return c
    raise ValueError(f"[CSV] filename 컬럼을 찾지 못했습니다. 후보={sorted(_FILENAME_CANDIDATES)} / 실제 컬럼={list(df.columns)}")

def _pick_embedding_cols(df: pd.DataFrame, fname_col: str) -> List[str]:
    # 1) 명시적 숫자 컬럼
    emb_cols = [c for c in df.columns if c != fname_col and pd.api.types.is_numeric_dtype(df[c])]
    # 2) 이름 패턴 일치 컬럼 추가
    for c in df.columns:
        if c == fname_col: 
            continue
        for pat in _EMB_NAME_PATTERNS:
            if pat.match(str(c)):
                if c not in emb_cols:
                    emb_cols.append(c)
                break
    if len(emb_cols) >= 32:
        return emb_cols

    # 3) 강제 변환 시도(문자열로 저장된 숫자)
    candidates = [c for c in df.columns if c != fname_col]
    coerced: List[str] = []
    for c in candidates:
        try:
            pd.to_numeric(df[c], errors="raise")
            coerced.append(c)
        except Exception:
            continue
    # 숫자/패턴/강제변환 합치기 (중복 제거)
    merged = []
    seen = set()
    for c in (emb_cols + coerced):
        if c not in seen:
            merged.append(c); seen.add(c)
    if len(merged) < 32:
        raise ValueError(f"[CSV] 임베딩 컬럼을 찾지 못했습니다. 숫자/패턴/강제변환 모두 실패. 총 후보={len(merged)}")
    return merged

def _load_csv(path: Path) -> Tuple[np.ndarray, List[str]]:
    if not path.exists():
        raise FileNotFoundError(f"[CSV] 파일 없음: {path}")
    df = pd.read_csv(path, low_memory=False)
    if df.empty:
        raise ValueError(f"[CSV] 비어있는 파일: {path.name}")
    fname_col = _pick_filename_col(df)
    emb_cols   = _pick_embedding_cols(df, fname_col)

    # float32 변환
    try:
        embs = df[emb_cols].astype("float32").to_numpy()
    except Exception as e:
        # 각 컬럼별 개별 변환 재시도
        fixed = []
        for c in emb_cols:
            fixed.append(pd.to_numeric(df[c], errors="coerce").astype("float32"))
        embs = np.stack([col.to_numpy() for col in fixed], axis=1)

    # NaN 처리 & 정규화
    embs = np.nan_to_num(embs, nan=0.0, posinf=0.0, neginf=0.0)
    norms = np.linalg.norm(embs, axis=1, keepdims=True) + 1e-12
    embs = (embs / norms).astype("float32")

    filenames = df[fname_col].astype(str).tolist()
    print(f"[CSV] {path.name}: rows={len(filenames)}, dim={embs.shape[1]}, fname_col={fname_col}, emb_cols={len(emb_cols)}")
    return embs, filenames

def init_indices():
    global _idx_img, _idx_txt, _img_fns, _txt_fns
    # 이미지 임베딩
    img_vecs, _img_fns = _load_csv(IMG_EMB_CSV)
    d_img = img_vecs.shape[1]
    _idx_img = faiss.IndexFlatIP(d_img)
    _idx_img.add(img_vecs)
    print(f"[FAISS] image-index: d={d_img}, n={_idx_img.ntotal}")

    # 텍스트(캡션) 임베딩
    txt_vecs, _txt_fns = _load_csv(CAP_EMB_CSV)
    d_txt = txt_vecs.shape[1]
    _idx_txt = faiss.IndexFlatIP(d_txt)
    _idx_txt.add(txt_vecs)
    print(f"[FAISS] text-index: d={d_txt}, n={_idx_txt.ntotal}")

def _url(fn: str) -> str:
    return f"/api/images/file/{fn}"

def _shrink_topk(topk: int, n: int) -> int:
    if topk > n:
        return max(1, int(min(topk, n)))
    return max(1, topk)

def search_by_text(q: str, topk=9) -> List[dict]:
    assert _idx_txt is not None, "[FAISS] text index not initialized"
    fclip = get_fashion_clip()
    qv = fclip.embed_text(q)[None, :]
    k = _shrink_topk(topk, _idx_txt.ntotal)
    sims, idxs = _idx_txt.search(qv, k)
    res = []
    for rank, (s, i) in enumerate(zip(sims[0], idxs[0])):
        if i < 0: continue
        fn = _txt_fns[i]
        res.append({
            "id": str(i),
            "filename": fn,
            "url": _url(fn),
            "title": f"유사 상품 {rank+1}",
            "description": f"text cosine={float(s):.3f}",
            "tags": [],
            "relevance": float(s)
        })
    return res

def search_by_image(pil: Image.Image, topk=9) -> List[dict]:
    assert _idx_img is not None, "[FAISS] image index not initialized"
    fclip = get_fashion_clip()
    qv = fclip.embed_image(pil)[None, :]
    k = _shrink_topk(topk, _idx_img.ntotal)
    sims, idxs = _idx_img.search(qv, k)
    res = []
    for rank, (s, i) in enumerate(zip(sims[0], idxs[0])):
        if i < 0: continue
        fn = _img_fns[i]
        res.append({
            "id": str(i),
            "filename": fn,
            "url": _url(fn),
            "title": f"유사 상품 {rank+1}",
            "description": f"image cosine={float(s):.3f}",
            "tags": [],
            "relevance": float(s)
        })
    return res
