import os
import base64
import asyncio
import uuid
import json
from typing import List, Optional
from fastapi import HTTPException, UploadFile
import google.generativeai as genai
from google.generativeai import types
from PIL import Image
import io
from dotenv import load_dotenv

class GeminiService:
    def __init__(self):
        # 환경변수 명시적 로드
        load_dotenv()
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")

        # API 키 설정
        genai.configure(api_key=self.api_key)

        # 사용할 모델
        self.model_name = 'gemini-2.5-flash-image-preview'
        self.model = genai.GenerativeModel(self.model_name)

    async def compose_fashion_images(self,
                                     model_image: UploadFile,
                                     clothing_images: List[UploadFile],
                                     custom_prompt: Optional[str] = None) -> dict:
        """
        패션 모델에게 옷을 착용시키는 이미지 합성 (나노바나나용 단순화)
        """
        try:
            # 프롬프트 구성
            if custom_prompt:
                prompt = custom_prompt
            else:
                clothing_count = len(clothing_images)
                if clothing_count <= 2:
                    prompt = """The model from the first image is posing in a professional fashion photoshoot. 
                    They are wearing the clothing items shown in the additional images. 
                    The scene has professional studio lighting with a clean, modern background.
                    
                    IMPORTANT: The model must be the EXACT SAME PERSON from the first image - 
                    same face, same body type, same features. Only the clothing changes. 
                    Create a natural, high-quality fashion photograph."""
                else:
                    prompt = f"""The model from the first image is posing in a professional fashion photoshoot wearing a complete outfit. 
                    They are wearing {clothing_count} items including clothing, accessories, and footwear shown in the additional images. 
                    The scene has professional studio lighting with a clean, modern background.

                    CRITICAL REQUIREMENT: The model must be the EXACT SAME PERSON from the first image - 
                    preserve their face, body type, hair, and all physical features completely. 
                    Only change the outfit and accessories.

                    Create a natural, cohesive fashion photograph where all the items work together as a complete styled look."""

            # 이미지들을 PIL Image로 변환
            images = []

            # 모델 이미지 처리
            model_content = await model_image.read()
            model_img = Image.open(io.BytesIO(model_content))
            images.append(model_img)

            # 의류 이미지들 처리
            for clothing_img in clothing_images:
                clothing_content = await clothing_img.read()
                clothing_pil = Image.open(io.BytesIO(clothing_content))
                images.append(clothing_pil)

            # Gemini API 호출
            def generate_content():
                # 이미지들을 base64로 변환
                image_parts = []

                # 모델 이미지 추가
                model_buffer = io.BytesIO()
                model_img.save(model_buffer, format='JPEG')
                model_data = base64.b64encode(model_buffer.getvalue()).decode()
                image_parts.append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": model_data
                    }
                })

                # 의류 이미지들 추가
                for clothing_img in images[1:]:
                    clothing_buffer = io.BytesIO()
                    clothing_img.save(clothing_buffer, format='JPEG')
                    clothing_data = base64.b64encode(clothing_buffer.getvalue()).decode()
                    image_parts.append({
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": clothing_data
                        }
                    })

                contents = [{
                    "role": "user",
                    "parts": [{"text": prompt}] + image_parts
                }]

                response = self.model.generate_content(
                    contents,
                    generation_config=types.GenerationConfig(
                        temperature=0.0,
                        max_output_tokens=1024,
                        top_p=0.8,
                    )
                )
                return response

            response = await asyncio.get_event_loop().run_in_executor(None, generate_content)

            if response and hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]

                text_response = ""
                generated_image = None

                for part in candidate.content.parts:
                    if getattr(part, "text", None):
                        text_response += part.text
                    elif getattr(part, "inline_data", None):
                        generated_image = part.inline_data.data

                if generated_image:
                    file_url = await self._save_generated_image_bytes(generated_image)
                    return {
                        "image_url": file_url,
                        "analysis": text_response or "나노바나나 모델이 패션 합성을 완료했습니다.",
                        "type": "fashion_nano_generated"
                    }

                if text_response:
                    print("[NANO-BANANA] 이미지 생성 재시도 중...")
                    raise Exception("나노바나나 모델 이미지 생성 재시도 필요")

        except Exception as e:
            print(f"[NANO-BANANA ERROR] {str(e)}")
            raise HTTPException(status_code=500, detail="나노바나나 모델 처리 실패")

    async def _save_generated_image_bytes(self, image_bytes: bytes) -> str:
        """
        생성된 이미지 bytes 데이터를 저장하고 URL 반환
        """
        try:
            output_dir = "app/img_search/generated_images"
            os.makedirs(output_dir, exist_ok=True)

            filename = f"fashion_generated_{uuid.uuid4().hex}.jpg"
            file_path = os.path.join(output_dir, filename)

            image = Image.open(io.BytesIO(image_bytes))
            if image.mode in ('RGBA', 'LA', 'P'):
                image = image.convert('RGB')
            image.save(file_path, 'JPEG', quality=90)

            return f"/api/images/generated/{filename}"

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"이미지 저장 실패: {str(e)}")

# 싱글톤 인스턴스
try:
    gemini_service = GeminiService()
except ValueError as e:
    print(f"Gemini Service 초기화 실패: {e}")
    gemini_service = None