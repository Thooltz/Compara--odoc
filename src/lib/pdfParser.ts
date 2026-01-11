import { DocumentStructure, Paragraph, ParagraphRun, ImageInfo, Section } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker uma única vez
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

const HEADER_THRESHOLD = 0.12; // Top 12% da página é considerado header
const FOOTER_THRESHOLD = 0.88; // Bottom 12% da página é considerado footer

function detectAlignment(items: any[]): Paragraph['alignment'] {
  if (items.length === 0) return undefined;
  
  const xCoords = items
    .filter((item: any) => 'transform' in item && item.transform && Array.isArray(item.transform))
    .map((item: any) => item.transform[4] || 0); // Posição X
  
  if (xCoords.length === 0) return undefined;
  
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const firstItem = items[0];
  const pageWidth = firstItem?.width || 612; // Largura padrão A4 em pontos

  // Heurística simples de alinhamento
  if (minX < pageWidth * 0.1 && maxX > pageWidth * 0.9) return 'justify';
  if (minX < pageWidth * 0.1) return 'left';
  if (maxX > pageWidth * 0.9) return 'right';
  return 'center';
}

export async function parsePdf(file: File): Promise<DocumentStructure> {
  // Verificar se getDocument existe
  if (!pdfjsLib.getDocument || typeof pdfjsLib.getDocument !== 'function') {
    throw new Error('pdfjs-dist não foi carregado corretamente. getDocument não está disponível.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  const structure: DocumentStructure = {
    fileType: 'pdf',
    pageCount,
    sections: {
      body: {
        paragraphs: [],
        tables: [],
        images: []
      }
    }
  };

  const allParagraphs: Paragraph[] = [];
  const allImages: ImageInfo[] = [];
  let imageIndex = 0;

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageHeight = viewport.height;

    // Extrair texto
    const textContent = await page.getTextContent();
    const items = textContent.items;

    // Agrupar items em blocos por posição Y
    const blocks: Map<number, any[]> = new Map();
    for (const item of items) {
      if ('transform' in item && item.transform && Array.isArray(item.transform)) {
        const y = item.transform[5] || 0; // Posição Y
        const blockKey = Math.floor(y / 10) * 10; // Agrupar por 10px
        if (!blocks.has(blockKey)) {
          blocks.set(blockKey, []);
        }
        blocks.get(blockKey)!.push(item);
      }
    }

    // Processar blocos
    let blockIndex = 0;
    const sortedBlocks = Array.from(blocks.entries()).sort((a, b) => b[0] - a[0]); // Do topo para baixo

    for (const [yPos, items] of sortedBlocks) {
      const normalizedY = yPos / pageHeight;
      let section: Section = 'body';

      if (normalizedY < HEADER_THRESHOLD) {
        section = 'header';
      } else if (normalizedY > FOOTER_THRESHOLD) {
        section = 'footer';
      }

      // Extrair texto do bloco
      const text = items
        .filter((item: any) => 'str' in item && item.str)
        .map((item: any) => item.str)
        .join(' ');

      if (text.trim()) {
        const firstItem = items.find((item: any) => 'str' in item && item.str);
        const run: ParagraphRun = {
          text: text.trim(),
          fontSize: firstItem?.fontSize || undefined,
          fontFamily: firstItem?.fontName || undefined
        };

        const para: Paragraph = {
          runs: [run],
          index: blockIndex++,
          alignment: detectAlignment(items)
        };

        if (section === 'header') {
          if (!structure.sections.header) {
            structure.sections.header = { paragraphs: [], tables: [], images: [] };
          }
          structure.sections.header.paragraphs.push(para);
        } else if (section === 'footer') {
          if (!structure.sections.footer) {
            structure.sections.footer = { paragraphs: [], tables: [], images: [] };
          }
          structure.sections.footer.paragraphs.push(para);
        } else {
          allParagraphs.push(para);
        }
      }
    }

    // Adicionar parágrafos do body
    structure.sections.body.paragraphs.push(...allParagraphs);

    // Detectar imagens (simplificado - contar operadores de imagem)
    try {
      const operatorList = await page.getOperatorList();
      let imageCount = 0;
      if (operatorList && operatorList.fnArray) {
        for (let i = 0; i < operatorList.fnArray.length; i++) {
          const op = operatorList.fnArray[i];
          try {
            // Tentar acessar OPS de forma segura
            const OPS = (pdfjsLib as any).OPS || {};
            const opName = OPS[op];
            if (opName === 'Do' || opName === 'BI') {
              imageCount++;
            }
          } catch {
            // Ignorar se não conseguir determinar o operador
          }
        }
      }

      if (imageCount > 0) {
        const pageImages: ImageInfo[] = [];
        for (let i = 0; i < imageCount; i++) {
          // Aproximação: assumir que imagens no topo são header
          const isHeader = pageNum === 1 && i === 0;
          const imgInfo: ImageInfo = {
            relationId: `page-${pageNum}-img-${i}`,
            location: isHeader ? 'header' : 'body',
            index: imageIndex++,
            name: `Imagem ${i + 1} - Página ${pageNum}`
          };
          pageImages.push(imgInfo);
          allImages.push(imgInfo);
        }

        // Primeira imagem do header é considerada logo principal
        const headerImages = pageImages.filter(img => img.location === 'header');
        if (headerImages.length > 0 && pageNum === 1) {
          headerImages[0].isMainLogo = true;
        }

        // Adicionar imagens às seções
        for (const img of pageImages) {
          if (img.location === 'header') {
            if (!structure.sections.header) {
              structure.sections.header = { paragraphs: [], tables: [], images: [] };
            }
            structure.sections.header.images.push(img);
          } else {
            structure.sections.body.images.push(img);
          }
        }
      }
    } catch (error) {
      console.warn('Erro ao detectar imagens no PDF:', error);
    }
  }

  return structure;
}
