# app/services/llm_analysis_service.py
import os, json, base64, io, pandas as pd, matplotlib.pyplot as plt
import pymongo, torch
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

# Mongo 연결
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://cherry:1234@panguin5225.m6oav.mongodb.net/?retryWrites=true&w=majority&appName=Panguin5225")
MONGO_DB = os.getenv("MONGO_DB", "musinsa_db")
client = pymongo.MongoClient(MONGO_URI)
db = client[MONGO_DB]

# Phi-3 Medium 로딩
MODEL_NAME = "microsoft/Phi-3-medium-128k-instruct"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.bfloat16,
    device_map="auto",
    trust_remote_code=True
)
llm = pipeline("text-generation", model=model, tokenizer=tokenizer,
               torch_dtype=torch.bfloat16, device_map="auto", return_full_text=False)

# 스키마 요약
schema_summary = {
  "buyers": ["_id","buyer_id","gender","email","phone","address","postal_code","marketing_opt_in","age"],
  "orders": ["_id","order_id","buyer_id","seller_id","brand_name","product_id","quantity","price","total_amount","order_date"],
  "product": ["_id","product_id","name","brand","category_l1","gender","price","views_1m","sales_cum","hearts","reviews_count","rating_avg","main_image","image_files"],
  "reviews": ["_id","product_id","user_id","score","text","photos","review_created_at","overall_sentiment","overall_confidence","detected_attributes","sentiment_analysis"],
  "sellers": ["_id","seller_id","brand_name","email","categories"],
  "users": ["_id","employeeId","name","department","role","password","lastLogin"]
}
schema_json = json.dumps(schema_summary, ensure_ascii=False, indent=2)

MQL_SYSTEM_PROMPT = """You are an assistant that converts Korean natural language questions into MongoDB Aggregation Pipelines.
Schema:
{schema}

Rules:
- Output valid JSON object with keys:
  - "target_collection": <collection name>
  - "pipeline": <aggregation pipeline array>
- Use only fields from schema.
- Never output text, only JSON.
"""

def generate_mql(question: str):
    prompt = MQL_SYSTEM_PROMPT.format(schema=schema_json) + f"\n\nQuestion: {question}"
    out = llm(prompt, max_new_tokens=700, temperature=0.0, do_sample=False)[0]["generated_text"].strip()
    return json.loads(out)

def run_mql(mql_obj):
    target = mql_obj["target_collection"]
    pipeline = mql_obj["pipeline"]
    results = list(db[target].aggregate(pipeline, allowDiskUse=True))
    df = pd.DataFrame(results)
    return df, results

def df_to_base64(df, x, y, title="Chart"):
    fig, ax = plt.subplots(figsize=(6,4))
    ax.bar(df[x].astype(str), df[y])
    ax.set_title(title); ax.set_xlabel(x); ax.set_ylabel(y)
    plt.xticks(rotation=45, ha="right")
    buf = io.BytesIO()
    plt.savefig(buf, format="png")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")

# ✅ 여기가 반드시 존재해야 함
def analyze_query(question: str):
    mql = generate_mql(question)
    df, raw_results = run_mql(mql)

    viz = None
    if not df.empty:
        str_cols = [c for c in df.columns if df[c].dtype == object]
        num_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
        if str_cols and num_cols:
            b64 = df_to_base64(df, str_cols[0], num_cols[0], title=question)
            viz = {
                "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
                "title": f"{question} 결과",
                "data": {"values": df.to_dict(orient="records")},
                "mark": "bar",
                "encoding": {
                    "x": {"field": str_cols[0], "type": "nominal"},
                    "y": {"field": num_cols[0], "type": "quantitative"}
                },
                "image_base64": b64
            }

    return {
      "status": "success",
      "query": question,
      "mongodb_results": {
        "collection": mql["target_collection"],
        "pipeline": mql["pipeline"],
        "data": raw_results[:20],
        "summary": f"{len(raw_results)}건 결과 반환"
      },
      "ai_analysis": {
        "answer": f"'{question}'에 대한 분석 결과입니다.",
        "insights": "간단한 통계 인사이트 예시",
        "recommendations": "추천 액션 예시"
      },
      "visualizations": [viz] if viz else []
    }