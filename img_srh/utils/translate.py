from __future__ import annotations
import re
import threading
from typing import Optional, List, Dict, Set
from functools import lru_cache

try:
    from transformers import pipeline  # type: ignore
except Exception:
    pipeline = None  # type: ignore

# 번역 파이프라인 초기화
_translator = None
_lock = threading.Lock()

def _init_translator():
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
        print(f"[translate] m2m100 load failed: {e}")

# 텍스트 정리 & 정규화
_RE_DUP_TOKEN   = re.compile(r"(?:\b([\w\[\]가-힣]+)\b[\s]*)\1{2,}")
_RE_LINE_TRIM   = re.compile(r"[ \t]+(\n)")
_RE_HAS_HANGUL  = re.compile(r"[가-힣]")
_RE_TOKENIZE_KO = re.compile(r"[가-힣A-Za-z0-9+-]+")
_RE_MULTI_SPACE = re.compile(r"\s+")

def clean_noise(text: str) -> str:
    t = (text or "")
    t = _RE_DUP_TOKEN.sub(r"\1", t)
    t = _RE_LINE_TRIM.sub(r"\1", t)
    return t.strip()

def _normalize_spaces(s: str) -> str:
    return _RE_MULTI_SPACE.sub(" ", (s or "").strip())

def tokenize_ko(q: str) -> List[str]:
    return _RE_TOKENIZE_KO.findall(q or "")

# M2M100 번역
@lru_cache(maxsize=4096)
def _m2m_cached(text: str, src: str, tgt: str, max_len: int) -> str:
    _init_translator()
    if not text:
        return ""
    if _translator is None:
        return text
    with _lock:
        tokenizer = _translator.tokenizer
        tokenizer.src_lang = src
        tokenizer.tgt_lang = tgt
        forced_bos_token_id = tokenizer.convert_tokens_to_ids(
            tokenizer._convert_id_to_token(tokenizer.get_lang_id(tgt))
        )
        out = _translator(
            text[:1000],
            max_length=max_len,
            forced_bos_token_id=forced_bos_token_id
        )
    return clean_noise(out[0]["translation_text"])

def _m2m(text: str, src: str, tgt: str, max_len: int = 400) -> str:
    return _m2m_cached(text or "", src, tgt, max_len)

# 공개 번역 API
def translate_ko2en(text: str, max_len: int = 200) -> str:
    if not text:
        return ""
    if _RE_HAS_HANGUL.search(text):
        return _m2m(text, "ko", "en", max_len=max_len)
    return text

def translate_en2ko(text: str, max_len: int = 400) -> str:
    if not text:
        return ""
    return _m2m(text, "en", "ko", max_len=max_len)

# 패션 쿼리 전용 규칙 기반 번역
KO2EN_RULES = {
    "파란색": "blue", "빨간색": "red", "화이트": "white", "블랙": "black", "베이지": "beige",
    "티셔츠": "t-shirt", "셔츠": "shirt", "자켓": "jacket", "아우터": "outerwear", "후드": "hoodie",
    "루즈핏": "loose fit", "오버핏": "oversized", "스트라이프": "striped", "체크": "checked",
    "무지": "plain", "그래픽": "graphic", "자수": "embroidery"
}

CANON = {
    "color": ["blue", "red", "white", "black", "beige"],
    "category": ["t-shirt", "shirt", "jacket", "outerwear", "hoodie"],
    "fit": ["loose fit", "oversized"],
    "pattern": ["plain", "striped", "checked"],
    "print": ["graphic", "embroidery"]
}

def _normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower().strip())

def _make_index(values: List[str]) -> Dict[str, str]:
    return {_normalize(v): v for v in values}

CANON_INDEX = {k: _make_index(v) for k, v in CANON.items()}

def map_to_canonical(s: str, group: str) -> Optional[str]:
    key = _normalize(s)
    idx = CANON_INDEX[group]
    if key in idx:
        return idx[key]
    key2 = key.replace(" ", "")
    for k in idx:
        if k.replace(" ", "") == key2:
            return idx[k]
    return None

def translate_ko_token(token: str) -> str:
    return KO2EN_RULES.get(token, token)

def translate_and_canonicalize(tokens_ko: List[str]) -> Dict[str, List[str]]:
    out: Dict[str, Set[str]] = {k: set() for k in CANON}
    for t in tokens_ko:
        en = translate_ko_token(t)
        for group in CANON:
            m = map_to_canonical(en, group)
            if m:
                out[group].add(m)
                break
    return {k: sorted(list(v)) for k, v in out.items() if v}

def _fashion_rule_ko2en(q: str) -> Optional[str]:
    toks = tokenize_ko(q)
    translated = translate_and_canonicalize(toks)
    if not translated:
        return None
    ordered = []
    for g in ["color", "category", "fit", "pattern", "print"]:
        ordered += translated.get(g, [])
    return " ".join(ordered) if ordered else None

# 최종 검색용 번역 함수
def translate_fashion_query_ko2en(q: str) -> str:
    q = _normalize_spaces(q or "")
    if not q:
        return ""
    if not _RE_HAS_HANGUL.search(q):
        return q

    rule = _fashion_rule_ko2en(q)
    if rule:
        print(f"[translate] rule-based: '{q}' -> '{rule}'")
        return rule

    out = translate_ko2en(q, max_len=120)
    print(f"[translate] m2m: '{q}' -> '{out}'")

    tokens_en = tokenize_ko(out)
    snapped = translate_and_canonicalize(tokens_en)
    if snapped:
        ordered = []
        for g in ["color", "category", "fit", "pattern", "print"]:
            ordered += snapped.get(g, [])
        if ordered:
            return " ".join(ordered)
    return out

