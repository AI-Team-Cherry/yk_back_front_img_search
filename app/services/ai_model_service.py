from transformers import GPT2LMHeadModel, GPT2Tokenizer, pipeline
import torch
import warnings
warnings.filterwarnings("ignore")

class AIModelService:
    def __init__(self):
        self.device = -1  # CPU 전용
        self.models = {}
        self.tokenizers = {}

    def load_models(self):
        model_name = "gpt2"   #  원래 yunki_master.zip 에 있던 기본 모델
        tok = GPT2Tokenizer.from_pretrained(model_name)
        model = GPT2LMHeadModel.from_pretrained(model_name)

        qa_pipe = pipeline(
            "text-generation",
            model=model,
            tokenizer=tok,
            device=self.device
        )

        self.models["qa_generator"] = qa_pipe
        self.tokenizers["qa_generator"] = tok

        print(f"[OK] Q&A model loaded: {model_name}")

    def generate_answer(self, prompt: str, max_new_tokens: int = 200):
        pipe = self.models["qa_generator"]
        tok = self.tokenizers["qa_generator"]

        #  토큰 길이 제한
        tokens = tok.encode(prompt, truncation=True, max_length=900)
        prompt_truncated = tok.decode(tokens, skip_special_tokens=True)

        out = pipe(
            prompt_truncated,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            top_p=0.9,
            temperature=0.7,
            repetition_penalty=1.05,
            pad_token_id=tok.eos_token_id
        )
        return out

ai_model_service = AIModelService()
