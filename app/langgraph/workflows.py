from typing import Dict, Any
from langgraph.graph import StateGraph, END
from app.langgraph.dsl import classify_intent, classify_complexity, build_prompt
from app.services.mongodb_query_generator import to_pipeline
from app.db.mongodb import run_aggregation, insert_result
from app.services.rag_service import search as rag_search
from app.services.qa_model import answer_question
from app.services.ai_model_service import ai_model_service


def rag_board_workflow():
    from app.services.llm_analysis_service import llm
    
    workflow = StateGraph()

    # 🔹 입력: 질문과 context(답변 후보들)
    def generate_answer(state):
        question = state["question"]
        context = state["context"]

        prompt = f"""
                당신은 회사 신입 직원에게 도움을 주는 선배입니다.
                아래는 여러 선배들이 남긴 답변들입니다.
                - 중복되거나 불필요한 답변은 제거하세요.
                - 신입 직원에게 가장 도움이 되는 핵심 내용만 뽑아서 정리하세요.
                - 답변은 간단명료하고 구체적으로 작성하세요.

                [질문]
                {question}

                [답변 후보]
                {context}
                """
        outputs = llm(prompt, max_new_tokens=300, temperature=0.3)
        return {"answer": outputs[0]["generated_text"]}

    # 🔹 workflow 구성
    workflow.add_node("generate", generate_answer)
    workflow.set_entry_point("generate")
    workflow.set_finish_point("generate")

    return workflow
# 상태는 dict로 단순화
def node_classify(state: Dict[str, Any]) -> Dict[str, Any]:
    q = state["query"]
    state["intent"] = classify_intent(q)
    state["complexity"] = classify_complexity(q)
    return state

def node_plan(state: Dict[str, Any]) -> Dict[str, Any]:
    q = state["query"]
    intent = state.get("intent", "기타")
    complexity = state.get("complexity", "단순")
    plan = to_pipeline(q, intent, complexity)
    state["plan"] = plan
    return state

def node_mongo(state: Dict[str, Any]) -> Dict[str, Any]:
    plan = state["plan"]
    collection = plan["collection"]
    pipeline = plan["pipeline"]
    state["mongo_results"] = {"collection": collection, "pipeline": pipeline}
    # 실제 실행은 async이므로 여기선 그냥 저장
    return state

def node_rag(state: Dict[str, Any]) -> Dict[str, Any]:
    # 자리표시자: 실제 검색은 라우터에서 async로 호출
    state["rag_needed"] = True
    return state

def node_answer(state: Dict[str, Any]) -> Dict[str, Any]:
    # 자리표시자: 실제 LLM 호출은 라우터에서 async로
    return state

graph = StateGraph(dict)
graph.add_node("classify", node_classify)
graph.add_node("plan", node_plan)
graph.add_node("mongo", node_mongo)
graph.add_node("rag", node_rag)
graph.add_node("answer", node_answer)

graph.set_entry_point("classify")
graph.add_edge("classify", "plan")
graph.add_edge("plan", "mongo")
graph.add_edge("mongo", "rag")
graph.add_edge("rag", "answer")
graph.add_edge("answer", END)

workflow = graph.compile()
