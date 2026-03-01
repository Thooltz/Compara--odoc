import { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Issue } from '../types';

// Configurar worker uma única vez
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface PdfPreviewProps {
  file: File | null;
  pageNumber?: number;
  differences?: Issue[];
  selectedIssue?: Issue | null;
  documentStructure?: any;
}

export function PdfPreview({ 
  file, 
  pageNumber = 1, 
  differences = [], 
  selectedIssue,
  documentStructure 
}: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!file || !canvasRef.current) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          canvasRef.current.width = 400;
          canvasRef.current.height = 600;
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          ctx.fillStyle = '#666';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Nenhum arquivo PDF', canvasRef.current.width / 2, canvasRef.current.height / 2);
        }
      }
      return;
    }

    let cancelled = false;

    const renderPage = async () => {
      try {
        if (cancelled) return;

        // Verificar se getDocument existe
        if (!pdfjsLib.getDocument || typeof pdfjsLib.getDocument !== 'function') {
          throw new Error('pdfjs-dist não foi carregado corretamente. getDocument não está disponível.');
        }

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        if (cancelled) return;

        const page = await pdf.getPage(Math.min(pageNumber, pdf.numPages));
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        await page.render(renderContext).promise;
        
        // Desenhar indicadores de diferenças após renderizar a página
        if (differences.length > 0 && documentStructure) {
          // Filtrar issues da página atual
          const pageIssues = differences.filter(issue => {
            if (issue.location.pageNumber) {
              return issue.location.pageNumber === pageNumber;
            }
            return true; // Por enquanto mostrar todas
          });

          if (pageIssues.length > 0) {
            // Obter posições dos textos na página
            page.getTextContent().then((textContent: any) => {
              if (cancelled) return;
              
              const items = textContent.items;
              
              // Agrupar items por posição Y (linhas)
              const lines: Map<number, any[]> = new Map();
              for (const item of items) {
                if ('transform' in item && item.transform && Array.isArray(item.transform)) {
                  const y = item.transform[5] || 0;
                  const normalizedY = viewport.height - y; // Inverter Y (canvas é de cima para baixo)
                  const lineKey = Math.floor(normalizedY / 15) * 15; // Agrupar por 15px
                  if (!lines.has(lineKey)) {
                    lines.set(lineKey, []);
                  }
                  lines.get(lineKey)!.push(item);
                }
              }

              // Desenhar indicadores para cada issue
              pageIssues.forEach((issue) => {
                if (cancelled) return;
                
                const isSelected = selectedIssue?.id === issue.id;
                const severity = issue.severity;
                
                // Cores baseadas na severidade
                let color = '#ffc107'; // yellow para minor
                let lineWidth = 2;
                if (severity === 'critical') {
                  color = '#dc3545'; // red
                  lineWidth = 4;
                } else if (severity === 'major') {
                  color = '#fd7e14'; // orange
                  lineWidth = 3;
                } else if (severity === 'info') {
                  color = '#0dcaf0'; // cyan
                  lineWidth = 1;
                }

                // Se está selecionado, destacar mais
                if (isSelected) {
                  color = '#ffeb3b';
                  lineWidth = 5;
                }

                // Estimar posição Y baseado no blockIndex
                const sortedLines = Array.from(lines.entries()).sort((a, b) => b[0] - a[0]);
                if (sortedLines.length > 0 && issue.location.blockIndex < sortedLines.length) {
                  const lineY = sortedLines[issue.location.blockIndex]?.[0] || 0;
                  
                  // Desenhar linha horizontal indicando diferença
                  context.strokeStyle = color;
                  context.lineWidth = lineWidth;
                  context.setLineDash(isSelected ? [] : [5, 5]);
                  context.beginPath();
                  context.moveTo(0, lineY);
                  context.lineTo(viewport.width, lineY);
                  context.stroke();
                  
                  // Desenhar marcador no início da linha
                  context.fillStyle = color;
                  context.fillRect(0, lineY - 3, 15, 6);
                  
                  // Se está selecionado, adicionar círculo
                  if (isSelected) {
                    context.beginPath();
                    context.arc(viewport.width - 20, lineY, 8, 0, 2 * Math.PI);
                    context.fillStyle = color;
                    context.fill();
                    context.strokeStyle = '#000';
                    context.lineWidth = 2;
                    context.stroke();
                  }
                }
              });
            }).catch((err: any) => {
              console.warn('Erro ao desenhar indicadores:', err);
            });
          }
        }
      } catch (error) {
        console.error('Erro ao renderizar PDF:', error);
        if (cancelled) return;
        
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = 400;
            canvasRef.current.height = 600;
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.fillStyle = '#666';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            const errorMsg = error instanceof Error ? error.message : 'Erro ao carregar PDF';
            ctx.fillText(errorMsg.substring(0, 50), canvasRef.current.width / 2, canvasRef.current.height / 2);
          }
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [file, pageNumber, differences, selectedIssue, documentStructure]);

  if (!file) {
    return <div className="pdf-preview-empty">Nenhum arquivo PDF carregado</div>;
  }

  const hasDifferences = differences.length > 0;

  return (
    <div className="pdf-preview">
      <div className={`pdf-canvas-wrapper ${hasDifferences ? 'has-differences' : ''}`}>
        <canvas ref={canvasRef} className="pdf-canvas" />
      </div>
      {differences.length > 0 && (
        <div className="pdf-differences-legend">
          <div className="legend-item">
            <span className="legend-line critical"></span>
            <span>Crítico</span>
          </div>
          <div className="legend-item">
            <span className="legend-line major"></span>
            <span>Major</span>
          </div>
          <div className="legend-item">
            <span className="legend-line minor"></span>
            <span>Minor</span>
          </div>
          <div className="legend-item">
            <span className="legend-line info"></span>
            <span>Info</span>
          </div>
        </div>
      )}
    </div>
  );
}
