import React, { useMemo } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip } from '@mui/material';
import { VegaEmbed } from 'react-vega';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';
import { 
  Fullscreen, 
  Download, 
  Info,
} from '@mui/icons-material';

// Vega와 VegaLite를 전역으로 등록
(window as any).vega = vega;
(window as any).VegaLite = vegaLite;

interface VegaVisualizationProps {
  spec: any;
  title?: string;
  description?: string;
}

const VegaVisualization: React.FC<VegaVisualizationProps> = ({ spec, title, description }) => {
  // 기본 테마 설정을 추가하여 시각화 개선
  const enhancedSpec = useMemo(() => {
    if (!spec) return null;
    
    // 다크모드 기본 설정
    const baseConfig = {
      background: '#1e293b',
      padding: 20,
      config: {
        // 색상 테마
        range: {
          category: ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#06b6d4', '#ec4899'],
          diverging: ['#dc2626', '#f87171', '#fef3c7', '#a3e635', '#22c55e'],
          heatmap: ['#111827', '#1f2937', '#374151', '#4b5563', '#6b7280'],
        },
        // 축 스타일
        axis: {
          labelFont: 'Inter, system-ui, -apple-system, sans-serif',
          labelFontSize: 12,
          labelColor: '#e5e7eb',
          titleFont: 'Inter, system-ui, -apple-system, sans-serif',
          titleFontSize: 14,
          titleFontWeight: 600,
          titleColor: '#f3f4f6',
          gridColor: '#374151',
          domainColor: '#4b5563',
          tickColor: '#4b5563',
        },
        // 범례 스타일
        legend: {
          labelFont: 'Inter, system-ui, -apple-system, sans-serif',
          labelFontSize: 12,
          labelColor: '#e5e7eb',
          titleFont: 'Inter, system-ui, -apple-system, sans-serif',
          titleFontSize: 14,
          titleFontWeight: 600,
          titleColor: '#f3f4f6',
        },
        // 마크 스타일
        mark: {
          cornerRadius: 4,
          tooltip: true
        },
        // 바 차트 스타일
        bar: {
          cornerRadiusEnd: 4,
        },
      },
    };

    // 기존 spec과 병합
    const mergedSpec = {
      ...spec,
      ...baseConfig,
      width: spec.width || 600,
      height: spec.height || 400,
      autosize: spec.autosize || { type: 'fit', contains: 'padding' },
      config: {
        ...baseConfig.config,
        ...spec.config,
      },
    };

    // 인터랙티브 기능 추가 (Vega-Lite spec인 경우)
    if (spec.$schema && spec.$schema.includes('vega-lite')) {
      // 하이라이트 파라미터 추가
      if (!mergedSpec.params) {
        mergedSpec.params = [{
          name: "highlight",
          select: {type: "point", on: "mouseover"}
        }];
      }
      
      // 조건부 스타일링
      if (mergedSpec.encoding && !mergedSpec.encoding.opacity) {
        mergedSpec.encoding.opacity = {
          condition: {param: "highlight", value: 1},
          value: 0.7
        };
      }
    }

    return mergedSpec;
  }, [spec]);

  const handleFullscreen = () => {
    const chartContainer = document.getElementById('vega-chart-container');
    if (chartContainer && chartContainer.requestFullscreen) {
      chartContainer.requestFullscreen();
    }
  };

  if (!enhancedSpec) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          시각화 데이터가 없습니다.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper
      id="vega-chart-container"
      sx={{
        p: 3,
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: 2,
        position: 'relative',
        '&:fullscreen': {
          background: '#0f172a',
          padding: 4,
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          {title && (
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#f3f4f6' }}>
              {title}
            </Typography>
          )}
          {description && (
            <Typography variant="body2" sx={{ color: '#9ca3af', mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="정보">
            <IconButton size="small" sx={{ color: '#9ca3af' }}>
              <Info fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="전체화면">
            <IconButton size="small" onClick={handleFullscreen} sx={{ color: '#9ca3af' }}>
              <Fullscreen fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Chart Container */}
      <Box
        sx={{
          width: '100%',
          position: 'relative',
          backgroundColor: '#1e293b',
          borderRadius: 2,
          p: 2,
          '& .vega-embed': {
            width: '100%',
          },
          '& .vega-embed canvas': {
            borderRadius: '8px',
          },
          '& .vega-bindings': {
            padding: '8px',
            backgroundColor: '#334155',
            borderRadius: '4px',
            marginTop: '8px',
            fontSize: '12px',
            color: '#e5e7eb',
          },
          '& .vega-embed .vega-actions': {
            top: '10px',
            right: '10px',
          },
          '& .vega-embed .vega-actions a': {
            color: '#9ca3af',
            fontSize: '12px',
            marginLeft: '8px',
            '&:hover': {
              color: '#60a5fa',
              textDecoration: 'none',
            }
          }
        }}
      >
        <VegaEmbed 
          spec={enhancedSpec} 
          options={{
            theme: 'light',
            actions: {
              export: true,
              source: false,
              compiled: false,
              editor: false,
            },
            hover: true,
            tooltip: {
              theme: 'custom'
            }
          }}
        />
      </Box>

      {/* Info Section */}
      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #334155' }}>
        <Typography variant="caption" sx={{ color: '#9ca3af' }}>
          💡 차트에 마우스를 올려 상세 정보를 확인하세요. 우측 상단 메뉴에서 이미지로 저장할 수 있습니다.
        </Typography>
      </Box>
    </Paper>
  );
};

export default VegaVisualization;