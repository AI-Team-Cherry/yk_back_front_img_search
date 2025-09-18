"""
차트 생성기
Vega-Lite 스펙(JSON)을 반환
"""

from typing import List, Dict, Any
from app.viz.chart_types import SUPPORTED_CHARTS
from app.viz.data_processor import normalize_data

def generate_chart(chart_type: str, title: str, results: List[Dict[str, Any]]) -> Dict[str, Any]:
    if chart_type not in SUPPORTED_CHARTS:
        chart_type = "bar"

    spec = SUPPORTED_CHARTS[chart_type]
    values = normalize_data(results)

    if not values:
        return {"status": "empty", "chart": {}}

    fields = list(values[0].keys())
    x_field, y_field = fields[0], fields[1] if len(fields) > 1 else fields[0]

    chart = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "title": title,
        "data": {"values": values},
        "mark": spec["mark"],
        "encoding": {
            "x": {"field": x_field, "type": "nominal"},
            "y": {"field": y_field, "type": "quantitative"}
        }
    }

    if chart_type == "pie":
        chart["encoding"] = {
            "theta": {"field": y_field, "type": "quantitative"},
            "color": {"field": x_field, "type": "nominal"}
        }

    return chart
