import { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker uma única vez
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface PdfPreviewProps {
  file: File | null;
  pageNumber?: number;
}

export function PdfPreview({ file, pageNumber = 1 }: PdfPreviewProps) {
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
  }, [file, pageNumber]);

  if (!file) {
    return <div className="pdf-preview-empty">Nenhum arquivo PDF carregado</div>;
  }

  return (
    <div className="pdf-preview">
      <canvas ref={canvasRef} className="pdf-canvas" />
    </div>
  );
}
