from __future__ import annotations
from typing import List, Dict, Any, Optional
import os
import re

from app.services.ai_model_service import ai_model_service
from app.utils.translate import (
    translate_ko2en,
    translate_en2ko,
    clean_noise,
)

# ---------- 유틸 ----------
def _tok():
    return ai_model_service.tokenizers["qa_generator"]

def _truncate_by_tokens(text: str, max_tokens: int = 750) -> str:
    ids = _tok().encode(text, truncation=True, max_length=max_tokens)
    return _tok().decode(ids, skip_special_tokens=True)

def _detect_numeric_key(row: Dict[str, Any]) -> Optional[str]:
    for k, v in row.items():
        if isinstance(v, (int, float)):
            return k
    return None

def _detect_label_key(row: Dict[str, Any], value_key: str) -> Optional[str]:
    for k in row.keys():
        if k != value_key:
            return k
    return None

def _derive_sales_metrics(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not rows:
        return {}
    vk = _detect_numeric_key(rows[0]) or "value"
    lk = _detect_label_key(rows[0], vk) or "label"
    ranked = sorted(rows, key=lambda r: float(r.get(vk, 0) or 0), reverse=True)
    total = sum(float(r.get(vk, 0) or 0) for r in ranked)
    top1 = ranked[0]
    top2 = ranked[1] if len(ranked) > 1 else None
    head3 = ranked[:3]
    head3_sum = sum(float(r.get(vk, 0) or 0) for r in head3)
    avg = total / len(ranked) if ranked else 0.0
    median_list = sorted(float(r.get(vk, 0) or 0) for r in ranked)
    mid = len(median_list) // 2
    median = (median_list[mid] if len(median_list) % 2 == 1 else (median_list[mid - 1] + median_list[mid]) / 2.0) if median_list else 0.0

    top_share = (float(top1.get(vk, 0)) / total) if total else 0.0
    diff12 = float(top1.get(vk, 0)) - (float(top2.get(vk, 0)) if top2 else 0.0)
    gap12_pct_of_top1 = (diff12 / float(top1.get(vk, 0))) if float(top1.get(vk, 0)) else 0.0
    head3_share = (head3_sum / total) if total else 0.0

    return dict(
        value_key=vk,
        label_key=lk,
        total=total,
        top1_brand=top1.get(lk),
        top1_sales=float(top1.get(vk, 0)),
        top2_brand=(top2.get(lk) if top2 else None),
        top2_sales=(float(top2.get(vk, 0)) if top2 else 0.0),
        top_share=top_share,
        diff12=diff12,
        gap12_pct_of_top1=gap12_pct_of_top1,
        head3_share=head3_share,
        avg=avg,
        median=median,
        n=len(ranked),
        ranked=ranked,
    )

def _format_facts(rows: List[Dict[str, Any]], metrics: Dict[str, Any], topn: int = 10) -> str:
    if not rows:
        return "None"
    vk, lk = metrics["value_key"], metrics["label_key"]
    ranked = sorted(rows, key=lambda r: float(r.get(vk, 0) or 0), reverse=True)[:topn]
    lines = []
    for i, r in enumerate(ranked, 1):
        label, val = r.get(lk, ""), float(r.get(vk, 0) or 0)
        lines.append(f"{i}. {label} — {val:,.0f}")
    return "\n".join(lines)

def _format_metrics(metrics: Dict[str, Any]) -> str:
    if not metrics:
        return "None"
    m = metrics
    return (
        f"- Total sales (top {m['n']}): {m['total']:,.0f}\n"
        f"- Top brand: {m['top1_brand']} ({m['top1_sales']:,.0f}) — share {m['top_share']*100:.1f}%\n"
        f"- Gap top1-top2: {m['diff12']:,.0f} ({m['gap12_pct_of_top1']*100:.1f}% of top1)\n"
        f"- Top3 concentration: {m['head3_share']*100:.1f}%\n"
        f"- Average per brand: {m['avg']:,.0f}, Median: {m['median']:,.0f}"
    )

def _condense_contexts(contexts: Optional[List[str]], max_items: int = 3, max_chars: int = 180) -> List[str]:
    if not contexts:
        return []
    trimmed = []
    for c in contexts[:max_items]:
        c = (c or "").strip()
        if len(c) > max_chars:
            c = c[:max_chars] + "..."
        if c:
            trimmed.append(c)
    return trimmed

def _parse_sections_en(text_en: str) -> Dict[str, str]:
    def _grab(start, end=None):
        if end:
            m = re.search(rf"{start}:(.*?){end}:", text_en, re.S | re.I)
        else:
            m = re.search(rf"{start}:(.*)$", text_en, re.S | re.I)
        return (m.group(1).strip() if m else "").strip()
    answer = _grab("Answer", "Insights")
    insights = _grab("Insights", "Recommendations")
    recs = _grab("Recommendations", None)
    return {"Answer": answer, "Insights": insights, "Recommendations": recs}

def _generate_en(prompt: str, max_new_tokens: int = 140) -> str:
    pipe = ai_model_service.models["qa_generator"]
    safe_prompt = _truncate_by_tokens(prompt, max_tokens=750)
    out = pipe(
        safe_prompt,
        max_new_tokens=max_new_tokens,
        do_sample=True,
        top_p=0.9,
        temperature=0.7,
        repetition_penalty=1.1,
        pad_token_id=_tok().eos_token_id,
    )
    raw = out[0]["generated_text"]
    return raw.replace(safe_prompt, "").strip()

# ---------- 메인 ----------
async def answer_question(
    query: str,
    mongo_summary: str = "",
    contexts: Optional[List[str]] = None,
    mongo_results: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, str]:
    """
    단계형 분석:
      1) Mongo 결과로 메트릭 계산
      2) 영어 요약(STRICT RULES)
      3) 섹션 파싱 → 영→한 번역
      4) 비거나 이상하면 한국어 템플릿 Fallback
    항상 {"answer": "..."} 반환
    """
    # 원문(한국어 키워드 판별용)
    original_query = query
    is_return_analysis = any(k in original_query for k in ["반품률", "반품", "환불", "공통점"])

    # 이후 파이프라인 입력은 영어로 (ko→en)
    query = translate_ko2en(query)


    if "qa_generator" not in ai_model_service.models:
        return {"answer": "⚠️ Q&A 모델이 아직 로딩되지 않았습니다.", "insights": "", "recommendations": ""}

    metrics = _derive_sales_metrics(mongo_results or [])
    facts = _format_facts(mongo_results or [], metrics)
    ctxs = _condense_contexts(contexts, max_items=3, max_chars=180)

    if is_return_analysis:
        prompt_en = f"""
You are a professional data analyst for Musinsa, a Korean fashion e-commerce platform.
You are analyzing products with potential quality or satisfaction issues (using low ratings and low sales as proxy for high return rates).

STRICT RULES:
- Use ONLY the FACTS below. Analyze patterns in the data.
- Output must contain ONLY these three sections:
Answer:
Insights: 
Recommendations:

QUESTION:
{query}

DATA ANALYSIS (Products with potential issues):
{facts}

CONTEXT:
{chr(10).join(['- ' + c for c in ctxs]) if ctxs else 'None'}

Focus on patterns in categories, price ranges, brands, or other characteristics.
Style: English, concise, business tone, <= 110 words total.

Answer:
"""
    else:
        prompt_en = f"""
You are a professional data analyst for Musinsa, a Korean fashion e-commerce platform selling clothing and accessories.
Your mission is to support Musinsa employees by analyzing the provided internal dataset.

STRICT RULES:
- Use ONLY the FACTS and CONTEXT below. Do NOT invent any external info or mention any websites.
- Output must contain ONLY these three sections in this exact order:
Answer:
Insights:
Recommendations:
- If facts exist, do NOT say "Insufficient data". Be concise.

QUESTION:
{query}

FACTS (from MongoDB, Top-N):
{facts}

DERIVED METRICS:
{_format_metrics(metrics)}

CONTEXT (optional):
{chr(10).join(['- ' + c for c in ctxs]) if ctxs else 'None'}

STYLE:
- English
- Concise, business tone
- <= 110 words total

Now produce the three sections:
Answer:
"""
    try:
        gen_en = clean_noise(_generate_en(prompt_en, max_new_tokens=140))
        parts = _parse_sections_en(gen_en)
        full_en = f"Answer: {parts['Answer']}\nInsights: {parts['Insights']}\nRecommendations: {parts['Recommendations']}".strip()

        # 외부 사이트/의심 패턴 차단
        if re.search(r"(http|www\.|\.com|\.co\.|Musingsa)", full_en, re.I):
            fallback_answer = _fallback_ko(metrics)
            ins = _extract_korean_section(fallback_answer, "인사이트:")
            rec = _extract_korean_section(fallback_answer, "추천사항:")
            return {"answer": fallback_answer, "insights": ins, "recommendations": rec}

        # 섹션 비면 Fallback
        if not (parts["Answer"] or parts["Insights"] or parts["Recommendations"]):
            fallback_answer = _fallback_ko(metrics)
            ins = _extract_korean_section(fallback_answer, "인사이트:")
            rec = _extract_korean_section(fallback_answer, "추천사항:")
            return {"answer": fallback_answer, "insights": ins, "recommendations": rec}

        # 영→한 변환 (공용 유틸 사용)
        ans_ko = translate_en2ko(parts["Answer"])
        ins_ko = translate_en2ko(parts["Insights"])
        rec_ko = translate_en2ko(parts["Recommendations"])

        # 번역 없거나 빈 경우 보정
        if not ans_ko or not ins_ko or not rec_ko:
            fallback_answer = _fallback_ko(metrics)
            ins = _extract_korean_section(fallback_answer, "인사이트:")
            rec = _extract_korean_section(fallback_answer, "추천사항:")
            return {"answer": fallback_answer, "insights": ins, "recommendations": rec}

        final_ko = clean_noise(f"답변: {ans_ko}\n인사이트: {ins_ko}\n추천사항: {rec_ko}")
        return {"answer": final_ko, "insights": ins_ko, "recommendations": rec_ko}

    except Exception:
        metrics = _derive_sales_metrics(mongo_results or [])
        fallback_answer = _fallback_ko(metrics)
        ins = _extract_korean_section(fallback_answer, "인사이트:")
        rec = _extract_korean_section(fallback_answer, "추천사항:")
        return {"answer": fallback_answer, "insights": ins, "recommendations": rec}

# ---------- 보조 ----------
def _extract_korean_section(full: str, prefix: str) -> str:
    for line in full.splitlines():
        if line.startswith(prefix):
            return line.replace(prefix, "").strip()
    return ""

def _fallback_ko(metrics: Dict[str, Any]) -> str:
    if not metrics:
        return "답변: 데이터가 부족합니다.\n인사이트: 추가 데이터 수집이 필요합니다.\n추천사항: 데이터 품질/범위 점검을 권장합니다."
    m = metrics
    total = m["total"]
    top1, top2 = m["top1_brand"], m["top2_brand"]
    top1_sales = m["top1_sales"]
    share = m["top_share"] * 100
    gap = m["diff12"]
    gap_pct = m["gap12_pct_of_top1"] * 100
    head3 = m["head3_share"] * 100
    avg, median = m["avg"], m["median"]
    n = m["n"]
    return clean_noise(
        f"답변: 상위 {n}개 브랜드 기준 총매출은 {total:,.0f}이며 1위는 {top1} {top1_sales:,.0f}(점유 {share:.1f}%)입니다."
        f"\n인사이트: 1~2위 격차는 {gap:,.0f}({gap_pct:.1f}%)로 {('상대적으로 큼' if gap_pct>=20 else '보통 수준')}."
        f" Top3 집중도는 {head3:.1f}%로 상위 브랜드 쏠림 {('높음' if head3>=60 else '보통')}."
        f" 브랜드당 평균은 {avg:,.0f}, 중앙값은 {median:,.0f}입니다."
        f"\n추천사항: (1) {top1} 중심 재고/프로모션 최적화 (2) {top2 or '2위 브랜드'}와의 격차 축소 전략 (공동 캠페인/가격전략)"
        f" (3) 중하위권 롱테일 테스트로 SKU 효율 검증을 권장합니다."
    )
