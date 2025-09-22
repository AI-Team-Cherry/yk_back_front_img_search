import os
import json

# 현재 파일 위치: app/api/img_search/reset_products.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))   # app/api/img_search
META_PATH = os.path.join(BASE_DIR, "products.json")
IMG_DIR = os.path.join(BASE_DIR, "only_product_images")

if not os.path.exists(META_PATH):
    print(f"[ERROR] products.json not found at {META_PATH}")
    exit(1)

with open(META_PATH, "r", encoding="utf-8") as f:
    meta = json.load(f)

updated = 0
for item_id, m in meta.items():
    filename = f"{item_id}.jpg"
    local_path = os.path.join(IMG_DIR, filename)

    if os.path.exists(local_path):
        # ✅ image_url 을 항상 /images/... 로 덮어쓰기
        meta[item_id]["image_url"] = f"/images/{filename}"
        updated += 1
    else:
        print(f"[WARNING] File not found for {item_id}: {local_path}")

with open(META_PATH, "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)

print(f"[DONE] Updated {updated} entries in {META_PATH}")
