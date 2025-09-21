"""
리포트 생성 서비스
"""

from typing import Dict, Any
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
)
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase import pdfmetrics
from reportlab.lib import colors
import io
import vl_convert as vlc  # ✅ Vega-Lite → PNG 변환


# ========================
# 🔹 1. JSON 리포트 생성
# ========================
def generate_report(title: str, analysis_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    JSON 메타 리포트 생성 (API 응답용)
    """
    return {
        "title": title,
        "createdAt": datetime.utcnow(),
        "summary": analysis_result.get("summary", ""),
        "details": {
            "insights": analysis_result.get("insights", ""),
            "recommendations": analysis_result.get("recommendations", []),
        },
    }


# ========================
# 🔹 2. PDF 리포트 생성
# ========================
pdfmetrics.registerFont(UnicodeCIDFont("HYSMyeongJo-Medium"))

def build_analysis_report(result: dict) -> bytes:
    """
    AI 분석 결과(JSON dict)를 PDF 리포트로 변환
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()

    # ✅ 모든 스타일에 한글 폰트 적용
    styles.add(ParagraphStyle(name="Korean", fontName="HYSMyeongJo-Medium", fontSize=10, leading=14))
    normal = styles["Korean"]
    heading = ParagraphStyle(
        name="HeadingK", parent=normal, fontSize=12, leading=16, spaceAfter=6, spaceBefore=12
    )

    story = []

    # ====== 1. 리포트 헤더 ======
    story.append(Paragraph(result.get("report", {}).get("title", "분석 리포트"), heading))
    story.append(Paragraph(f"생성일: {result.get('report', {}).get('createdAt', '')}", normal))
    story.append(Paragraph(f"질문: {result.get('query', '')}", normal))
    story.append(Spacer(1, 12))

    # ====== 2. 요약 & 인사이트 ======
    if result.get("answer"):
        story.append(Paragraph("📌 요약 답변", heading))
        story.append(Paragraph(result["answer"], normal))

    if result.get("insights"):
        story.append(Paragraph("🔍 인사이트", heading))
        story.append(Paragraph(result["insights"].replace("\n", "<br/>"), normal))

    if result.get("recommendations"):
        story.append(Paragraph("💡 추천 액션", heading))
        recs = result["recommendations"]
        if isinstance(recs, list):
            for rec in recs:
                story.append(Paragraph(f"- {rec}", normal))
        else:
            story.append(Paragraph(recs.replace("\n", "<br/>"), normal))
    story.append(Spacer(1, 12))

    # ====== 3. 데이터 샘플 테이블 ======
    data_samples = result.get("mongodb_results", {}).get("data", [])
    if data_samples:
        story.append(Paragraph("📊 MongoDB 데이터 샘플", heading))
        keys = list(data_samples[0].keys())[:6]
        table_data = [[Paragraph(k, normal) for k in keys]]
        for row in data_samples[:5]:
            table_data.append([Paragraph(str(row.get(k, ""))[:30], normal) for k in keys])

        table = Table(table_data, repeatRows=1, colWidths=[70]*len(keys))
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        story.append(table)

    # ====== 4. 기초 통계 ======
    statistics = result.get("statistics", {})
    if statistics:
        story.append(Paragraph("📈 기초 통계", heading))
        for col, stats in statistics.items():
            story.append(Paragraph(f"<b>{col}</b>", normal))
            table_data = [[Paragraph(str(k), normal),
                           Paragraph(f"{v:.2f}" if isinstance(v, (int, float)) else str(v), normal)]
                          for k, v in stats.items()]
            table = Table(table_data, colWidths=[80, 120])
            table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.grey)]))
            story.append(table)

    # ====== 5. 상관관계 ======
    correlations = result.get("correlations", {})
    if correlations:
        story.append(Paragraph("🔗 상관관계", heading))
        fields = list(correlations.keys())[:6]
        table_data = [[""] + fields]
        for row_field in fields:
            row = [row_field]
            for col_field in fields:
                val = correlations[row_field].get(col_field, "")
                row.append(f"{val:.2f}" if isinstance(val, (int, float)) else str(val))
            table_data.append(row)

        table = Table(table_data, repeatRows=1, colWidths=[70]*len(fields))
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        story.append(table)

    # ====== 6. 비선형 패턴 ======
    if result.get("nonlinear_patterns"):
        story.append(Paragraph("🌀 비선형 패턴", heading))
        story.append(Paragraph(result["nonlinear_patterns"], normal))

    # ====== 7. 리포트 요약 ======
    if result.get("report", {}).get("summary"):
        story.append(Paragraph("📄 리포트 요약", heading))
        story.append(Paragraph(result["report"]["summary"], normal))

    # ====== 8. 데이터 클래스 ======
    data_classes = result.get("data_classes", {})
    if data_classes:
        story.append(Paragraph("📂 데이터 클래스", heading))
        for field, values in data_classes.items():
            story.append(Paragraph(f"<b>{field}</b>: {', '.join(map(str, values[:5]))}", normal))

    # ====== 9. Vector 검색 결과 ======
    vector_results = result.get("vector_results", {})
    if vector_results:
        story.append(Paragraph("📂 Vector 검색 결과", heading))
        story.append(Paragraph(str(vector_results), normal))

    # ====== 10. Vega-Lite 시각화 ======
    visualizations = result.get("visualizations", [])
    if visualizations:
        story.append(Paragraph("📈 시각화 결과", heading))
        for viz in visualizations[:2]:
            try:
                # ✅ 차트 종류에 따라 높이 2배 적용
                mark_type = viz.get("mark", "")
                height = 300
                if mark_type in ["bar", "line"]:
                    height = 600  # ✅ 2배
                elif isinstance(mark_type, dict) and mark_type.get("type") in ["bar", "line"]:
                    height = 600

                png_bytes = vlc.vegalite_to_png({**viz, "height": height, "width": 600}, scale=1)
                img_buffer = io.BytesIO(png_bytes)
                story.append(Image(img_buffer, width=500, height=height))
                story.append(Spacer(1, 12))
            except Exception as e:
                story.append(Paragraph(f"⚠️ 시각화 렌더링 실패: {str(e)}", normal))

    doc.build(story)
    pdf_value = buffer.getvalue()
    buffer.close()
    return pdf_value
