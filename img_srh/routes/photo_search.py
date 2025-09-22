import os, io, json
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np
import torch
from transformers import AutoProcessor, AutoModel
import faiss
import pandas as pd

from ..models.segmentation_model import parse_human_parts
from ..models.category_model import predict_clothing_category

router = APIRouter()

# 경로 설정
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "img_srh", "data")
IMG_DIR = os.path.join(DATA_DIR, "images")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(IMG_DIR, exist_ok=True)

INDEX_PATH = os.path.join(DATA_DIR, "faiss.index")
IDS_PATH = os.path.join(DATA_DIR, "ids.npy")
META_PATH = os.path.join(DATA_DIR, "products.json")
EMBEDDING_CSV_PATH = os.path.join(DATA_DIR, "image_embedding.csv")

# 모델 로딩 (Fashion-CLIP)
MODEL_NAME = "patrickjohncyh/fashion-clip"
device = "cuda" if torch.cuda.is_available() else "cpu"
processor = AutoProcessor.from_pretrained(MODEL_NAME, trust_remote_code=True)
model = AutoModel.from_pretrained(MODEL_NAME, trust_remote_code=True).to(device).eval()

# FAISS 설정
dim = 512
index = faiss.IndexFlatIP(dim)
ids: List[str] = []
meta = {}

def l2norm(x: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(x, axis=1, keepdims=True) + 1e-12
    return x / n

@torch.no_grad()
def embed_pil(img: Image.Image) -> np.ndarray:
    inp = processor(images=img, return_tensors="pt").to(device)
    feats = model.get_image_features(**inp)
    emb = feats.detach().cpu().numpy().astype(np.float32)
    return l2norm(emb)

def save_index():
    faiss.write_index(index, INDEX_PATH)
    np.save(IDS_PATH, np.array(ids, dtype=object))

def save_meta(meta_dict):
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta_dict, f, ensure_ascii=False, indent=2)

def load_meta():
    if os.path.exists(META_PATH):
        with open(META_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def load_index_from_csv(csv_path: str, img_folder: Optional[str] = None):
    global index, ids, meta

    if not os.path.exists(csv_path):
        return

    df = pd.read_csv(csv_path)
    emb_array = df.drop(columns=["image_file"]).values.astype(np.float32)
    emb_array = emb_array / np.linalg.norm(emb_array, axis=1, keepdims=True)

    index = faiss.IndexFlatIP(emb_array.shape[1])
    index.add(emb_array)

    ids = df["image_file"].tolist()
    meta = load_meta()

    if img_folder:
        for _id in ids:
            if _id not in meta:
                meta[_id] = {}
            meta[_id]["image_url"] = f"/images/{_id}"

    save_index()
    save_meta(meta)
    print(f"[LOAD CSV] vectors={len(ids)}")

# 초기 로딩
load_index_from_csv(EMBEDDING_CSV_PATH, IMG_DIR)

@router.get("/")
def fashion_root():
    return {"message": "패션 이미지 검색 시스템 작동 중", "vectors": len(ids)}

@router.post("/catalog/add")
async def catalog_add(file: UploadFile = File(...), item_id: Optional[str] = None):
    raw = await file.read()
    img = Image.open(io.BytesIO(raw)).convert("RGB")

    mask = parse_human_parts(img)
    cropped = crop_clothes_region_top_bottom(img, mask)

    category_preds = predict_clothing_category(Image.fromarray(cropped), topk=2)
    emb = embed_pil(Image.fromarray(cropped))

    global ids, index
    if index.d != emb.shape[1]:
        index = faiss.IndexFlatIP(emb.shape[1])
    index.add(emb)

    _id = item_id or file.filename
    ids.append(_id)
    save_index()

    save_path = os.path.join(IMG_DIR, f"{_id}.jpg")
    Image.fromarray(cropped).save(save_path)

    meta[_id] = meta.get(_id, {})
    meta[_id]["image_url"] = f"/images/{_id}.jpg"
    save_meta(meta)

    return {
        "ok": True,
        "id": _id,
        "category": category_preds,
        "image_url": meta[_id]["image_url"],
        "meta": meta[_id],
    }

@router.post("/search")
async def search(file: UploadFile = File(...), topk: int = 5):
    if len(ids) == 0:
        return {"ok": False, "msg": "catalog is empty. add images first."}

    raw = await file.read()
    img = Image.open(io.BytesIO(raw)).convert("RGB")

    mask = parse_human_parts(img)
    cropped = crop_clothes_region_top_bottom(img, mask)

    category_preds = predict_clothing_category(Image.fromarray(cropped), topk=2)
    q = embed_pil(Image.fromarray(cropped))

    D, I = index.search(q.astype(np.float32), min(topk * 2, len(ids)))

    seen_ids = set()
    results: List[dict] = []
    for dist, idx in zip(D[0].tolist(), I[0].tolist()):
        if idx == -1:
            continue
        _id = ids[idx]
        if _id in seen_ids:
            continue
        seen_ids.add(_id)
        m = meta.get(_id, {})
        results.append({
            "id": _id,
            "score": round(float(dist), 4),
            "brand": m.get("brand"),
            "title": m.get("title"),
            "price": m.get("price"),
            "url": m.get("url"),
            "image_url": m.get("image_url"),
        })
        if len(results) >= topk:
            break

    return {
        "ok": True,
        "predicted_categories": category_preds,
        "results": results[:topk]
    }

@router.post("/meta/upsert")
def meta_upsert(item_id: str,
                brand: Optional[str] = None,
                title: Optional[str] = None,
                price: Optional[float] = None,
                url: Optional[str] = None):
    old = meta.get(item_id, {})
    meta[item_id] = {
        "brand": brand or old.get("brand"),
        "title": title or old.get("title"),
        "price": price if price is not None else old.get("price"),
        "url": url or old.get("url"),
        "image_url": old.get("image_url"),
    }
    save_meta(meta)
    return {"ok": True, "id": item_id, "meta": meta[item_id]}

@router.delete("/catalog/delete")
def delete_item(item_id: str):
    global ids, index

    if item_id not in ids:
        return JSONResponse(status_code=404, content={"ok": False, "msg": "존재하지 않는 item_id입니다."})

    idx_to_remove = ids.index(item_id)
    index.remove_ids(np.array([idx_to_remove], dtype=np.int64))
    ids.pop(idx_to_remove)

    if item_id in meta:
        del meta[item_id]
        save_meta(meta)

    img_path = os.path.join(IMG_DIR, f"{item_id}.jpg")
    if os.path.exists(img_path):
        os.remove(img_path)

    save_index()
    return {"ok": True, "msg": f"{item_id} 삭제 완료"}

# 상의/하의 마스크 분할 후 크롭
def crop_clothes_region_top_bottom(pil_img: Image.Image, mask: np.ndarray) -> np.ndarray:
    np_img = np.array(pil_img)

    clothes_mask = np.isin(mask, [1, 2, 3]).astype(np.uint8)
    if clothes_mask.sum() == 0:
        return np_img

    y_idx, x_idx = np.where(clothes_mask)
    y1, y2 = y_idx.min(), y_idx.max()
    x1, x2 = x_idx.min(), x_idx.max()

    cropped = np_img[y1:y2, x1:x2]
    mask_crop = clothes_mask[y1:y2, x1:x2]
    mask_3c = np.stack([mask_crop]*3, axis=-1)
    bg = np.ones_like(cropped, dtype=np.uint8) * 255
    masked = np.where(mask_3c, cropped, bg)
    return masked
