# 사람 영역 segmentation (의류 영역 추출)
import numpy as np
from .cloth_segmentation.predict import get_mask
from PIL import Image

# 이미지에서 사람 부분 segmentation

def parse_human_parts(img: Image.Image) -> np.ndarray:
    np_img = np.array(img)
    mask = get_mask(np_img)  # shape: (H, W)
    return mask
