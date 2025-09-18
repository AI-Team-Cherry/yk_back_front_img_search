import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AnalysisResult } from '../types';

// 한글 텍스트를 Canvas로 렌더링하여 이미지로 변환하는 함수
const createKoreanTextImage = (text: string, fontSize: number = 12, maxWidth: number = 500): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve('');
      return;
    }

    // 폰트 설정
    ctx.font = `${fontSize}px "Noto Sans KR", "Malgun Gothic", "맑은 고딕", sans-serif`;
    ctx.fillStyle = '#333333';
    
    // 텍스트 크기 측정
    const lines: string[] = [];
    const words = text.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Canvas 크기 설정
    const lineHeight = fontSize * 1.4;
    canvas.width = maxWidth + 20;
    canvas.height = lines.length * lineHeight + 20;
    
    // 다시 폰트 설정 (Canvas 크기 변경 후 리셋됨)
    ctx.font = `${fontSize}px "Noto Sans KR", "Malgun Gothic", "맑은 고딕", sans-serif`;
    ctx.fillStyle = '#333333';
    ctx.textBaseline = 'top';
    
    // 배경을 흰색으로 설정
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#333333';
    
    // 텍스트 렌더링
    lines.forEach((line, index) => {
      ctx.fillText(line, 10, 10 + index * lineHeight);
    });
    
    resolve(canvas.toDataURL('image/png'));
  });
};

// PDF에 한글 텍스트 이미지를 추가하는 함수
const addKoreanTextAsPNG = async (
  pdf: jsPDF, 
  text: string, 
  x: number, 
  y: number, 
  options?: { 
    fontSize?: number; 
    maxWidth?: number; 
    color?: string;
  }
): Promise<number> => {
  if (!text || text.trim() === '') {
    return y + 6;
  }

  const fontSize = options?.fontSize || 12;
  const maxWidth = options?.maxWidth || 150;

  try {
    const imageData = await createKoreanTextImage(text, fontSize, maxWidth);
    
    if (imageData) {
      // 이미지 크기 계산 (대략적)
      const lines = text.split('\n').length + Math.ceil(text.length / (maxWidth / fontSize * 2));
      const imageHeight = Math.max(6, lines * fontSize * 0.3);
      const imageWidth = Math.min(maxWidth * 0.2, 170);
      
      pdf.addImage(imageData, 'PNG', x, y, imageWidth, imageHeight);
      return y + imageHeight + 3;
    }
  } catch (error) {
    console.warn('Failed to create Korean text image:', error);
  }

  // 폴백: 기본 텍스트 (깨질 수 있음)
  try {
    pdf.text(text, x, y);
    return y + 6;
  } catch (error) {
    console.warn('Failed to add fallback text:', error);
    return y + 6;
  }
};

// PDF 내보내기 유틸리티 함수
export const exportAnalysisToPDF = async (
  analysis: {
    query: string;
    result: AnalysisResult;
    title?: string;
    createdAt?: Date;
  },
  elementId?: string
) => {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let yPosition = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);

    // 제목 추가
    const title = analysis.title || analysis.query || '분석 보고서';
    yPosition = await addKoreanTextAsPNG(pdf, title, margin, yPosition, { 
      fontSize: 20, 
      maxWidth: contentWidth * 2.5 
    });
    yPosition += 5;

    // 생성 일시
    const dateText = `생성일시: ${analysis.createdAt ? analysis.createdAt.toLocaleString('ko-KR') : new Date().toLocaleString('ko-KR')}`;
    yPosition = await addKoreanTextAsPNG(pdf, dateText, margin, yPosition, { 
      fontSize: 10, 
      maxWidth: contentWidth * 2.5 
    });
    yPosition += 5;

    // 구분선
    pdf.setLineWidth(0.5);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // 질문 섹션
    yPosition = await addKoreanTextAsPNG(pdf, '질문', margin, yPosition, { 
      fontSize: 16, 
      maxWidth: contentWidth * 2.5 
    });
    yPosition += 2;

    yPosition = await addKoreanTextAsPNG(pdf, `"${analysis.query}"`, margin, yPosition, { 
      fontSize: 12, 
      maxWidth: contentWidth * 2.5 
    });
    yPosition += 8;

    // 분석 결과 섹션
    yPosition = await addKoreanTextAsPNG(pdf, 'AI 분석 결과', margin, yPosition, { 
      fontSize: 16, 
      maxWidth: contentWidth * 2.5 
    });
    yPosition += 5;

    // 마크다운 텍스트를 일반 텍스트로 변환
    let analysisText = analysis.result.analysis || '';
    analysisText = analysisText
      .replace(/#{1,6}\s+/g, '') // 헤딩 제거
      .replace(/\*\*(.+?)\*\*/g, '$1') // 굵은 글씨 제거
      .replace(/\*(.+?)\*/g, '$1') // 기울임 제거
      .replace(/`(.+?)`/g, '$1') // 인라인 코드 제거
      .replace(/^\s*[-*+]\s+/gm, '• ') // 리스트 항목을 불릿으로 변경
      .replace(/^\s*\d+\.\s+/gm, '• ') // 번호 리스트를 불릿으로 변경
      .trim();

    // 분석 텍스트를 청크 단위로 나누어 처리
    const textChunks = analysisText.match(/.{1,200}(\s|$)/g) || [analysisText];
    
    for (const chunk of textChunks) {
      if (yPosition > 240) { // 페이지 하단 근처
        pdf.addPage();
        yPosition = 20;
      }
      yPosition = await addKoreanTextAsPNG(pdf, chunk.trim(), margin, yPosition, { 
        fontSize: 11, 
        maxWidth: contentWidth * 2.5 
      });
      yPosition += 2;
    }

    // 모델 상태 정보 추가
    if (analysis.result.model_status) {
      yPosition += 10;
      if (yPosition > 220) {
        pdf.addPage();
        yPosition = 20;
      }

      yPosition = await addKoreanTextAsPNG(pdf, '모델 정보', margin, yPosition, { 
        fontSize: 16, 
        maxWidth: contentWidth * 2.5 
      });
      yPosition += 3;

      const modelInfo = [
        `상태: ${analysis.result.model_status.status}`,
        `모델: ${analysis.result.model_status.model}`,
        `타입: ${analysis.result.model_status.type}`
      ];
      
      for (const info of modelInfo) {
        yPosition = await addKoreanTextAsPNG(pdf, `• ${info}`, margin, yPosition, { 
          fontSize: 12, 
          maxWidth: contentWidth * 2.5 
        });
        yPosition += 1;
      }
    }

    // 예측 근거 추가
    if (analysis.result.prediction_basis) {
      yPosition += 10;
      if (yPosition > 220) {
        pdf.addPage();
        yPosition = 20;
      }

      yPosition = await addKoreanTextAsPNG(pdf, '예측 근거', margin, yPosition, { 
        fontSize: 16, 
        maxWidth: contentWidth * 2.5 
      });
      yPosition += 3;

      const basisChunks = analysis.result.prediction_basis.match(/.{1,200}(\s|$)/g) || [analysis.result.prediction_basis];
      
      for (const chunk of basisChunks) {
        if (yPosition > 260) {
          pdf.addPage();
          yPosition = 20;
        }
        yPosition = await addKoreanTextAsPNG(pdf, chunk.trim(), margin, yPosition, { 
          fontSize: 11, 
          maxWidth: contentWidth * 2.5 
        });
        yPosition += 2;
      }
    }

    // 시각화가 있는 경우 캡처해서 추가
    if (elementId && analysis.result.visualization) {
      try {
        const element = document.getElementById(elementId);
        if (element) {
          // 새 페이지 추가
          pdf.addPage();
          
          await addKoreanTextAsPNG(pdf, '데이터 시각화', margin, 20, { 
            fontSize: 16, 
            maxWidth: contentWidth * 2.5 
          });
          
          const canvas = await html2canvas(element, {
            backgroundColor: '#1e293b',
            scale: 1,
            useCORS: true,
            allowTaint: true
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // 이미지가 페이지를 넘지 않도록 크기 조정
          const maxHeight = 200;
          const finalHeight = Math.min(imgHeight, maxHeight);
          const finalWidth = (canvas.width * finalHeight) / canvas.height;
          
          pdf.addImage(imgData, 'PNG', margin, 40, finalWidth, finalHeight);
        }
      } catch (error) {
        console.warn('Failed to capture visualization:', error);
      }
    }

    // PDF 다운로드
    const fileName = `분석보고서_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    return true;
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error('PDF 내보내기 중 오류가 발생했습니다.');
  }
};

// 공유 분석용 PDF 내보내기
export const exportSharedAnalysisToPDF = async (
  analysis: {
    query: string;
    result: AnalysisResult;
    title?: string;
    createdAt?: Date;
  },
  sharedInfo?: {
    sharedBy: string;
    department: string;
    rating: number;
    usageCount: number;
  },
  elementId?: string
) => {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let yPosition = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);

    // 공유 분석 배너
    pdf.setFillColor(30, 41, 59);
    pdf.rect(margin, yPosition - 5, contentWidth, 15, 'F');
    
    // 배너 텍스트는 영어로 (폰트 문제 회피)
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text('SHARED ANALYSIS REPORT', margin + 5, yPosition + 5);
    yPosition += 20;

    // 제목
    const title = analysis.title || analysis.query || '분석 보고서';
    yPosition = await addKoreanTextAsPNG(pdf, title, margin, yPosition, { 
      fontSize: 20, 
      maxWidth: contentWidth * 2.5 
    });
    yPosition += 5;

    // 공유 정보
    if (sharedInfo) {
      yPosition = await addKoreanTextAsPNG(pdf, `공유자: ${sharedInfo.sharedBy} (${sharedInfo.department})`, margin, yPosition, { 
        fontSize: 12, 
        maxWidth: contentWidth * 2.5 
      });
      yPosition = await addKoreanTextAsPNG(pdf, `평점: ${'★'.repeat(Math.floor(sharedInfo.rating))} (${sharedInfo.rating.toFixed(1)}/5.0)`, margin, yPosition, { 
        fontSize: 12, 
        maxWidth: contentWidth * 2.5 
      });
      yPosition = await addKoreanTextAsPNG(pdf, `사용 횟수: ${sharedInfo.usageCount}회`, margin, yPosition, { 
        fontSize: 12, 
        maxWidth: contentWidth * 2.5 
      });
    }

    // 생성 일시
    const dateText = `생성일시: ${new Date().toLocaleString('ko-KR')}`;
    yPosition = await addKoreanTextAsPNG(pdf, dateText, margin, yPosition, { 
      fontSize: 10, 
      maxWidth: contentWidth * 2.5 
    });
    yPosition += 10;

    // 나머지는 일반 분석과 동일하게 처리
    return await exportAnalysisContentToPDF(pdf, analysis, yPosition, margin, contentWidth, elementId);
  } catch (error) {
    console.error('Shared analysis PDF export error:', error);
    throw new Error('공유 분석 PDF 내보내기 중 오류가 발생했습니다.');
  }
};

// PDF 내용 생성 헬퍼 함수
const exportAnalysisContentToPDF = async (
  pdf: jsPDF, 
  analysis: any, 
  startY: number, 
  margin: number, 
  contentWidth: number, 
  elementId?: string
) => {
  let yPosition = startY;
  const pageWidth = pdf.internal.pageSize.getWidth();

  // 구분선
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // 질문 섹션
  yPosition = await addKoreanTextAsPNG(pdf, '질문', margin, yPosition, { 
    fontSize: 16, 
    maxWidth: contentWidth * 2.5 
  });
  yPosition += 2;

  yPosition = await addKoreanTextAsPNG(pdf, `"${analysis.query}"`, margin, yPosition, { 
    fontSize: 12, 
    maxWidth: contentWidth * 2.5 
  });
  yPosition += 8;

  // 분석 결과 섹션
  yPosition = await addKoreanTextAsPNG(pdf, 'AI 분석 결과', margin, yPosition, { 
    fontSize: 16, 
    maxWidth: contentWidth * 2.5 
  });
  yPosition += 5;

  let analysisText = analysis.result.analysis || '';
  analysisText = analysisText
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '• ')
    .trim();

  const textChunks = analysisText.match(/.{1,200}(\s|$)/g) || [analysisText];
  
  for (const chunk of textChunks) {
    if (yPosition > 240) {
      pdf.addPage();
      yPosition = 20;
    }
    yPosition = await addKoreanTextAsPNG(pdf, chunk.trim(), margin, yPosition, { 
      fontSize: 11, 
      maxWidth: contentWidth * 2.5 
    });
    yPosition += 2;
  }

  // PDF 저장
  const fileName = `분석보고서_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
  
  return true;
};