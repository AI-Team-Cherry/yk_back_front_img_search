from __future__ import annotations
import re
import threading
from typing import Optional, List, Dict, Set
from functools import lru_cache

try:
    from transformers import pipeline  # type: ignore
except Exception:
    pipeline = None  # type: ignore

# 전역 번역 파이프라인 (m2m100) + 락
#  - 프로세스당 1회 로딩
#  - 동시성 안전
_translator = None
_lock = threading.Lock()

def _init_translator():
    """m2m100 번역 파이프라인을 1회 초기화"""
    global _translator
    if _translator is not None:
        return
    if pipeline is None:
        print("[translate] transformers not available; rule-based only")
        _translator = None
        return
    try:
        _translator = pipeline(
            "translation",
            model="facebook/m2m100_418M",
            tokenizer="facebook/m2m100_418M",
        )
        print("[translate] m2m100 translator loaded")
    except Exception as e:
        _translator = None
        print(f"[translate] m2m100 load failed; rule-based only: {e}")


# 정규식(사전 컴파일) & 정규화 & 텍스트 정리
_RE_DUP_TOKEN   = re.compile(r"(?:\b([\w\[\]가-힣]+)\b[\s]*)\1{2,}")
_RE_LINE_TRIM   = re.compile(r"[ \t]+(\n)")
_RE_HAS_HANGUL  = re.compile(r"[가-힣]")
_RE_TOKENIZE_KO = re.compile(r"[가-힣A-Za-z0-9+-]+")
_RE_MULTI_SPACE = re.compile(r"\s+")

def clean_noise(text: str) -> str:
    """중복 토큰/라인 공백 정리"""
    t = (text or "")
    t = _RE_DUP_TOKEN.sub(r"\1", t)
    t = _RE_LINE_TRIM.sub(r"\1", t)
    return t.strip()

def _normalize_spaces(s: str) -> str:
    return _RE_MULTI_SPACE.sub(" ", (s or "").strip())

def _norm_key(s: str) -> str:
    """캐노니컬 매핑용 key 정규화: 소문자+언더/하이픈→공백+다중공백 축약"""
    s = (s or "").lower().replace("_", " ").replace("-", " ")
    return _normalize_spaces(s)

def tokenize_ko(q: str) -> List[str]:
    """간단 한국어/영문 토크나이저"""
    return _RE_TOKENIZE_KO.findall(q or "")

# m2m100 안전 호출 (src_lang + forced_bos_token_id)
#  - LRU 캐시로 동일 입력 중복 호출 방지
@lru_cache(maxsize=4096)
def _m2m_cached(text: str, src: str, tgt: str, max_len: int) -> str:
    _init_translator()
    if not text:
        return ""
    if _translator is None:
        # 규칙 기반만 가능할 때는 원문 반환 (상위 단계에서 처리)
        return text
    with _lock:
        _translator.tokenizer.src_lang = src
        out = _translator(
            text[:1000],
            forced_bos_token_id=_translator.tokenizer.get_lang_id(tgt),
            max_length=max_len,
        )
    return clean_noise(out[0]["translation_text"])

def _m2m(text: str, src: str, tgt: str, max_len: int = 400) -> str:
    return _m2m_cached(text or "", src, tgt, max_len)


# Canonical vocab 
colors = ["red", "blue", "green", "black", "white", "beige", "gray", "yellow", "pink", "brown",
          "purple", "orange", "navy", "khaki", "ivory", "burgundy", "teal", "mustard", "olive",
          "mint", "lavender", "coral", "peach", "aqua", "charcoal", "cream", "sky blue", "lime", "magenta", "gold"]

categories = ["t-shirt", "shirt", "jacket", "coat", "jeans", "pants", "sweatshirt", "hoodie", "dress",
              "skirt", "shorts", "cardigan", "blazer", "suit", "outerwear", "knitwear", "vest", "tracksuit",
              "sweater", "pullover", "parka", "trench coat", "puffer jacket", "overcoat", "tank top",
              "crop top", "blouse", "long coat", "kimono", "anorak"]

fits = ["slim fit", "regular fit", "loose fit", "oversized", "skinny fit", "relaxed fit",
        "straight fit", "bootcut", "wide fit", "flare fit", "athletic fit", "tapered fit"]

patterns = ["plain", "striped", "checked", "dotted", "floral", "graphic", "camouflage", "animal print",
            "houndstooth", "paisley", "argyle", "tie-dye", "marble", "ombré", "color-block"]

prints = ["with logo", "graphic print", "minimal branding", "embroidered logo",
          "all-over print", "no print", "retro logo", "monogram print", "slogan print", "metallic print"]

necklines = ["crew neck", "v-neck", "round neck", "collared", "polo neck", "turtle neck", "boat neck", "hooded",
             "henley neck", "mock neck", "sweetheart neckline", "off-shoulder", "halter neck", "square neck", "deep v-neck"]

sleeves = ["short sleeves", "long sleeves", "sleeveless", "half sleeves", "rolled hem", "cuffed hem",
           "cap sleeves", "puffed sleeves", "balloon sleeves", "bishop sleeves", "flutter sleeves",
           "raglan sleeves", "kimono sleeves", "cropped sleeves", "asymmetrical hem"]

details = ["zipper", "buttons", "pockets", "embroidery", "lace", "belted", "ruffled", "drawstring",
           "fringe", "pleated", "sequins", "studs", "beads", "cut-out", "patchwork"]

CANON: Dict[str, List[str]] = {
    "color": colors,
    "category": categories,
    "fit": fits,
    "pattern": patterns,
    "print": prints,
    "neckline": necklines,
    "sleeve": sleeves,
    "detail": details,
}


# 규칙 기반 사전(ko → en) 
KO2EN_RULES: Dict[str, str] = {
    # colors
    "파란": "blue", "파란색": "blue", "블루": "blue", "하늘색": "sky blue",
    "빨간": "red", "빨간색": "red", "레드": "red",
    "흰색": "white", "화이트": "white",
    "검정": "black", "검은색": "black", "블랙": "black",
    "초록": "green", "녹색": "green", "그린": "green",
    "겨자": "mustard", "민트": "mint", "보라색": "purple", "퍼플": "purple",
    "자홍": "magenta", "네이비": "navy", "곤색": "navy", "카키": "khaki",
    # categories
    "셔츠": "shirt", "남방": "shirt", "티": "t-shirt", "티셔츠": "t-shirt",
    "자켓": "jacket", "재킷": "jacket", "코트": "coat", "롱코트": "long coat",
    "청바지": "jeans", "바지": "pants", "후드": "hoodie", "맨투맨": "sweatshirt",
    "원피스": "dress", "스커트": "skirt", "숏츠": "shorts", "반바지": "shorts",
    "가디건": "cardigan", "블레이저": "blazer", "조끼": "vest",
    # fits
    "슬림핏": "slim fit", "레귤러핏": "regular fit", "루즈핏": "loose fit", "오버사이즈": "oversized",
    "스키니핏": "skinny fit", "와이드핏": "wide fit", "부츠컷": "bootcut", "플레어핏": "flare fit",
    "테이퍼드핏": "tapered fit", "스트레이트핏": "straight fit",
    # patterns / prints
    "무지": "plain", "스트라이프": "striped", "체크": "checked", "도트": "dotted",
    "꽃무늬": "floral", "그래픽": "graphic", "카모": "camouflage", "호피": "animal print",
    "페이즐리": "paisley", "아가일": "argyle", "타이다이": "tie-dye", "마블": "marble",
    "그라데이션": "ombré", "컬러블록": "color-block",
    "로고": "with logo", "로고프린트": "graphic print", "자수로고": "embroidered logo",
    "올오버프린트": "all-over print", "무프린트": "no print", "레트로로고": "retro logo",
    "모노그램": "monogram print", "슬로건프린트": "slogan print", "메탈릭프린트": "metallic print",
    # necklines
    "라운드넥": "crew neck", "브이넥": "v-neck", "라운드": "round neck", "카라": "collared",
    "폴로넥": "polo neck", "터틀넥": "turtle neck", "보트넥": "boat neck", "후드": "hooded",
    "헨리넥": "henley neck", "목넥": "mock neck", "스퀘어넥": "square neck",
    "오프숄더": "off-shoulder", "홀터넥": "halter neck", "딥브이넥": "deep v-neck",
    # sleeves
    "반팔": "short sleeves", "긴팔": "long sleeves", "민소매": "sleeveless", "5부": "half sleeves",
    "캡소매": "cap sleeves", "퍼프소매": "puffed sleeves", "벌룬소매": "balloon sleeves",
    "비숍슬리브": "bishop sleeves", "플러터슬리브": "flutter sleeves", "래글런": "raglan sleeves",
    "기모노슬리브": "kimono sleeves", "크롭소매": "cropped sleeves", "비대칭밑단": "asymmetrical hem",
    "롤업밑단": "rolled hem", "커프스밑단": "cuffed hem",
    # details
    "지퍼": "zipper", "버튼": "buttons", "포켓": "pockets", "자수": "embroidery",
    "레이스": "lace", "벨티드": "belted", "러플": "ruffled", "스트링": "drawstring",
    "프린지": "fringe", "플리츠": "pleated", "시퀸": "sequins", "스터드": "studs",
    "비즈": "beads", "컷아웃": "cut-out", "패치워크": "patchwork",
}


# 정규화·인덱스 
def _normalize(s: str) -> str:
    s = s.strip().lower()
    s = s.replace("_", " ").replace("-", " ")
    s = re.sub(r"\s+", " ", s)
    return s

def _make_index(values: List[str]) -> Dict[str, str]:
    idx = {}
    for v in values:
        idx[_normalize(v)] = v  # key: 정규화, value: 캐노니컬
    return idx

CANON_INDEX: Dict[str, Dict[str, str]] = {k: _make_index(v) for k, v in CANON.items()}


# 매핑 함수들 
def map_to_canonical(s: str, group: str) -> Optional[str]:
    """
    입력 문자열 s를 해당 그룹(CANON 키)에 맞는 캐노니컬 값으로 스냅.
    완전 일치/하이픈/공백 변형을 흡수. 없으면 None.
    """
    key = _normalize(s)
    idx = CANON_INDEX[group]
    # 완전/근사(공백/하이픈/복수형 약변형) 일치
    if key in idx:
        return idx[key]
    # 간단 근사: 공백 제거, v neck vs v-neck vs vneck
    key2 = key.replace(" ", "")
    for k in idx.keys():
        if k.replace(" ", "") == key2:
            return idx[k]
    return None

def translate_ko_token(token: str) -> str:
    """ko 토큰을 규칙 사전으로 영문 토큰으로 변환(없으면 그대로)."""
    return KO2EN_RULES.get(token, token)

def translate_and_canonicalize(tokens_ko: List[str]) -> Dict[str, List[str]]:
    """
    한국어 토큰 목록 → 영문 후보 → 각 그룹 캐노니컬 값으로 스냅.
    동일 그룹에서 여러 개 매칭되면 중복 제거.
    """
    out: Dict[str, Set[str]] = {k: set() for k in CANON.keys()}
    for t in tokens_ko:
        en = translate_ko_token(t)
        # 그룹별 매핑 시도 (우선순위: color→category→fit→pattern→print→neckline→sleeve→detail)
        for group in ["color", "category", "fit", "pattern", "print", "neckline", "sleeve", "detail"]:
            m = map_to_canonical(en, group)
            if m:
                out[group].add(m)
                break
    return {k: sorted(list(v)) for k, v in out.items() if v}


# 공개 번역 API (기존 인터페이스 유지) 
def translate_ko2en(text: str, max_len: int = 200) -> str:
    """한국어 포함 시 m2m100으로 영어 번역, 아니면 원문 그대로"""
    if not text:
        return ""
    if _RE_HAS_HANGUL.search(text):
        return _m2m(text, "ko", "en", max_len=max_len)
    return text

def translate_en2ko(text: str, max_len: int = 400) -> str:
    """영어 → 한국어 번역"""
    if not text:
        return ""
    return _m2m(text, "en", "ko", max_len=max_len)

def _fashion_rule_ko2en(q: str) -> Optional[str]:
    """간단 토크나이즈 후 색상/아이템 규칙에 매칭되면 영문 조합 반환"""
    if not _RE_HAS_HANGUL.search(q or ""):
        return None
    toks = tokenize_ko(q)
    colors = [KO2EN_RULES[t] for t in toks if t in KO2EN_RULES and KO2EN_RULES[t] in CANON_INDEX["color"]]
    items  = [KO2EN_RULES[t] for t in toks if t in KO2EN_RULES and KO2EN_RULES[t] in CANON_INDEX["category"]]
    if colors or items:
        # 캐노니컬 스냅으로 최종 정리
        snapped = []
        for c in colors:
            m = map_to_canonical(c, "color")
            if m: snapped.append(m)
        for it in items:
            m = map_to_canonical(it, "category")
            if m: snapped.append(m)
        return " ".join(snapped) if snapped else None
    return None

def translate_fashion_query_ko2en(q: str) -> str:
    """
    패션 쿼리 전용 번역(규칙 우선 → m2m 백업) + 캐노니컬 스냅.
    반환: 영어 검색문 (예: "blue hoodie tie-dye")
    """
    q = _normalize_spaces(q or "")
    if not q:
        return ""
    if not _RE_HAS_HANGUL.search(q):
        # 이미 영어면 최소 정규화 후 캐노니컬 키워드만 추출해 재구성 가능
        return q

    # 1) 규칙 기반 
    rule = _fashion_rule_ko2en(q)
    if rule:
        print(f"[translate] rule-based: '{q}' -> '{rule}'")
        return rule

    # 2) 모델 번역 (ko→en)
    out = translate_ko2en(q, max_len=120)
    print(f"[translate] m2m: '{q}' -> '{out}'")

    # 3) 모델 번역 결과에서 캐노니컬 키워드만 추출해 재조합(검색 일관성↑)
    tokens_en = tokenize_ko(out)  # 영문도 동일 토크나이저로 단순 분리
    snapped_dict = translate_and_canonicalize(tokens_en)  # 이미 영문이므로 rule은 거의 통과되지만 스냅만 수행
    if snapped_dict:
        # 우선순위대로 영어 검색문을 재구성
        ordered = []
        for g in ["color", "category", "fit", "pattern", "print", "neckline", "sleeve", "detail"]:
            if g in snapped_dict:
                ordered += snapped_dict[g]
        if ordered:
            return " ".join(ordered)
    return out

# 보조: 캐노니컬 키워드 → 검색문 생성 
def snap_keywords_to_query_en(tokens_ko_or_en: List[str]) -> str:
    """
    (ko/en 혼합 토큰) → 캐노니컬 키워드 사출 → 빈도 순(우선순위)으로 영어 검색문 생성
    """
    # ko 토큰을 en으로 치환 시도(없으면 그대로 유지)
    en_tokens = [translate_ko_token(t) for t in tokens_ko_or_en]
    snapped = translate_and_canonicalize(en_tokens)
    if not snapped:
        return " ".join(tokens_ko_or_en)
    ordered = []
    for g in ["color", "category", "fit", "pattern", "print", "neckline", "sleeve", "detail"]:
        if g in snapped:
            ordered += snapped[g]
    return " ".join(ordered)
