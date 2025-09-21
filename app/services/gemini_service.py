import os
import base64
import asyncio
import uuid
import json
from typing import List, Optional
from fastapi import HTTPException, UploadFile
import google.generativeai as genai
from PIL import Image
import io

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")

        # Configure genai with API key
        genai.configure(api_key=self.api_key)

        # Create the model instance
        self.model = genai.GenerativeModel('gemini-2.5-flash-image-preview')

    async def compose_fashion_images(self,
                                   model_image: UploadFile,
                                   clothing_images: List[UploadFile],
                                   custom_prompt: Optional[str] = None) -> dict:
        """
        패션 모델에게 옷을 착용시키는 이미지 합성
        """
        try:
            # 프롬프트 생성
            if custom_prompt:
                prompt = custom_prompt
            else:
                prompt = self._generate_fashion_prompt(len(clothing_images))

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

            # Gemini API 호출을 위한 동기 함수
            def generate_content():
                try:
                    # 이미지들과 프롬프트를 함께 전달
                    content = [prompt] + images

                    response = self.model.generate_content(
                        content,
                        generation_config=genai.types.GenerationConfig(
                            temperature=0.7,
                            top_p=0.95,
                            max_output_tokens=2048,
                        ),
                        safety_settings=[
                            {
                                "category": "HARM_CATEGORY_HARASSMENT",
                                "threshold": "BLOCK_NONE"
                            },
                            {
                                "category": "HARM_CATEGORY_HATE_SPEECH",
                                "threshold": "BLOCK_NONE"
                            },
                            {
                                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                                "threshold": "BLOCK_NONE"
                            },
                            {
                                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                                "threshold": "BLOCK_NONE"
                            }
                        ]
                    )
                    return response
                except Exception as e:
                    if "429" in str(e) or "Too Many Requests" in str(e):
                        raise HTTPException(
                            status_code=429,
                            detail="API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요. (Gemini API 무료 요금제 제한)"
                        )
                    elif "quota" in str(e).lower() or "limit" in str(e).lower():
                        raise HTTPException(
                            status_code=429,
                            detail="API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요."
                        )
                    raise e

            # 비동기 실행
            response = await asyncio.get_event_loop().run_in_executor(None, generate_content)

            if response and hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]

                # 응답에서 텍스트 추출
                if hasattr(candidate.content, 'parts') and candidate.content.parts:
                    text_response = ""
                    generated_image = None

                    for part in candidate.content.parts:
                        if hasattr(part, 'text') and part.text:
                            text_response += part.text
                        elif hasattr(part, 'inline_data') and part.inline_data:
                            # 이미지 데이터가 있는 경우
                            generated_image = part.inline_data.data

                    # 현재 Gemini 2.5 Flash Image는 텍스트 응답만 제공하므로
                    # 텍스트 응답과 함께 합성 이미지 미리보기를 제공
                    if text_response:
                        # 모델 이미지와 의류 이미지들을 조합한 미리보기 생성
                        composite_image_url = await self._create_composite_preview(
                            model_img,
                            [img for img in images[1:]]  # 첫 번째는 모델 이미지이므로 제외
                        )

                        file_url = await self._save_generated_image(text_response)
                        return {
                            "analysis": text_response,
                            "file_url": file_url,
                            "image_url": composite_image_url,  # 합성 미리보기 이미지 URL 추가
                            "type": "fashion_analysis"
                        }
                    # 이미지가 생성된 경우 (향후 지원 시)
                    elif generated_image:
                        file_url = await self._save_generated_image_data(generated_image)
                        return {
                            "image_url": file_url,
                            "analysis": "패션 이미지가 성공적으로 생성되었습니다.",
                            "type": "fashion_image_generation"
                        }
                    else:
                        # 응답이 있지만 텍스트나 이미지가 없는 경우
                        return {
                            "analysis": "패션 분석이 완료되었지만 상세 결과를 가져올 수 없습니다.",
                            "file_url": None,
                            "type": "fashion_analysis"
                        }
                else:
                    raise HTTPException(status_code=500, detail="응답에서 콘텐츠를 찾을 수 없습니다")
            else:
                raise HTTPException(status_code=500, detail="이미지 생성에 실패했습니다")

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"패션 이미지 합성 실패: {str(e)}")

    def _generate_fashion_prompt(self, clothing_count: int) -> str:
        """
        패션 모델링에 최적화된 프롬프트 생성 (한국어와 영어 혼용)
        """
        base_prompt = """
        다음 요구사항에 따라 전문적인 패션 합성 이미지를 만들어주세요:

        패션 모델링 지침:
        1. 첫 번째 이미지의 모델을 기본 인물로 사용하세요
        2. 추가 이미지들에 보여진 의류 아이템들을 모델에게 착용시켜주세요
        3. 옷이 모델의 몸에 자연스럽게 맞도록 해주세요
        4. 모델의 포즈, 얼굴 특징, 체형 비율을 유지해주세요
        5. 원본 모델 사진과 일관된 조명과 배경을 유지해주세요

        기술적 요구사항:
        - 고급 패션 사진의 품질
        - 전문적인 스튜디오 조명
        - 모델에 옷이 자연스럽게 합성되도록
        - 자연스러운 천의 드레이프와 핏
        - 원본 모델의 피부톤과 특징 유지
        - 동일한 카메라 각도와 원근감 유지

        스타일 가이드:
        - 깔끔하고 현대적인 패션 사진 미학
        - 전문적인 모델링 포즈
        - 적절한 의류 비율과 핏
        - 의류에 자연스러운 그림자와 하이라이트
        - 상업적 패션 사진의 품질

        결과물: 제공된 모든 의류 아이템을 착용한 모델을 자연스럽고 전문적인 패션 사진 스타일로 보여주는 단일 합성 이미지를 만들어주세요.

        Please analyze these images and describe how you would create a professional fashion composite image by combining the model with the clothing items, maintaining character consistency and realistic appearance. Focus on color coordination, style compatibility, and overall aesthetic appeal.
        """

        if clothing_count > 1:
            base_prompt += f"\n\n{clothing_count}개의 의류 아이템 조합: 모든 {clothing_count}개의 의류를 조화롭고 스타일리시한 하나의 완성된 의상으로 세련되게 조합해주세요."

        return base_prompt

    async def _save_generated_image_data(self, image_base64: str) -> str:
        """
        생성된 이미지 데이터를 저장하고 URL 반환
        """
        try:
            # 생성된 이미지를 저장할 디렉토리
            output_dir = "app/img_search/generated_images"
            os.makedirs(output_dir, exist_ok=True)

            # 고유한 파일명 생성
            filename = f"fashion_generated_{uuid.uuid4().hex}.jpg"
            file_path = os.path.join(output_dir, filename)

            # Base64 이미지 데이터를 디코딩하여 저장
            image_bytes = base64.b64decode(image_base64)
            with open(file_path, "wb") as f:
                f.write(image_bytes)

            return f"/api/images/generated/{filename}"

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"이미지 저장 실패: {str(e)}")

    async def _create_composite_preview(self, model_img: Image.Image, clothing_imgs: List[Image.Image]) -> str:
        """
        모델 이미지와 의류 이미지들을 조합한 미리보기 생성
        """
        try:
            # 새 캔버스 생성 (모델 이미지와 의류 이미지들을 배치)
            # 모델 이미지 크기를 기준으로 캔버스 크기 결정
            model_width, model_height = model_img.size

            # 캔버스 크기 계산 (모델 이미지 + 의류 이미지들)
            canvas_width = model_width + 200  # 의류 이미지들을 위한 추가 공간
            canvas_height = max(model_height, len(clothing_imgs) * 150)

            # 새 캔버스 생성 (흰색 배경)
            canvas = Image.new('RGB', (canvas_width, canvas_height), 'white')

            # 모델 이미지 배치 (왼쪽)
            model_resized = model_img.copy()
            if model_width > 400:
                # 모델 이미지가 너무 크면 리사이즈
                ratio = 400 / model_width
                new_size = (400, int(model_height * ratio))
                model_resized = model_img.resize(new_size, Image.Resampling.LANCZOS)

            canvas.paste(model_resized, (10, 10))

            # 의류 이미지들 배치 (오른쪽에 작게)
            x_offset = model_resized.width + 30
            y_offset = 10

            for i, clothing_img in enumerate(clothing_imgs):
                # 의류 이미지 리사이즈 (작은 썸네일로)
                clothing_thumb = clothing_img.copy()
                clothing_thumb.thumbnail((150, 150), Image.Resampling.LANCZOS)

                canvas.paste(clothing_thumb, (x_offset, y_offset))
                y_offset += 160  # 다음 이미지 위치

            # 생성된 이미지를 저장할 디렉토리
            output_dir = "app/img_search/generated_images"
            os.makedirs(output_dir, exist_ok=True)

            # 고유한 파일명 생성
            filename = f"fashion_composite_{uuid.uuid4().hex}.jpg"
            file_path = os.path.join(output_dir, filename)

            # 이미지 저장
            canvas.save(file_path, 'JPEG', quality=90)

            return f"/api/images/generated/{filename}"

        except Exception as e:
            print(f"합성 미리보기 생성 실패: {str(e)}")
            # 실패 시 모델 이미지만이라도 반환
            return await self._save_model_image(model_img)

    async def _save_model_image(self, model_img: Image.Image) -> str:
        """
        모델 이미지를 저장하고 URL 반환 (fallback용)
        """
        try:
            output_dir = "app/img_search/generated_images"
            os.makedirs(output_dir, exist_ok=True)

            filename = f"model_{uuid.uuid4().hex}.jpg"
            file_path = os.path.join(output_dir, filename)

            model_img.save(file_path, 'JPEG', quality=90)

            return f"/api/images/generated/{filename}"
        except Exception as e:
            print(f"모델 이미지 저장 실패: {str(e)}")
            return None

    async def _save_generated_image(self, ai_description: str) -> str:
        """
        AI 설명을 바탕으로 한 응답 저장 (현재는 텍스트 응답만 지원)
        """
        try:
            # 생성된 응답을 저장할 디렉토리
            output_dir = "app/img_search/generated_images"
            os.makedirs(output_dir, exist_ok=True)

            # 고유한 파일명 생성
            filename = f"fashion_analysis_{uuid.uuid4().hex}.json"
            file_path = os.path.join(output_dir, filename)

            # AI 분석 결과를 JSON으로 저장
            analysis_result = {
                "timestamp": str(asyncio.get_event_loop().time()),
                "description": ai_description,
                "type": "fashion_modeling_analysis",
                "status": "completed"
            }

            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(analysis_result, f, ensure_ascii=False, indent=2)

            return f"/api/images/generated/{filename}"

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"응답 저장 실패: {str(e)}")


# 싱글톤 인스턴스
try:
    gemini_service = GeminiService()
except ValueError as e:
    print(f"Gemini Service 초기화 실패: {e}")
    gemini_service = None